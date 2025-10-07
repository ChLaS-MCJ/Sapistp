const jwt = require('jsonwebtoken');

/**
 * Middleware function to check the presence and validity of a JWT token in the request headers.
 * @param {object} req - The request object containing the headers.
 * @param {object} res - The response object used to send the response.
 * @param {function} next - The next function to be called in the middleware chain.
 */
const checkTokenMiddleware = (req, res, next) => {
    /**
     * Extracts the JWT token from the Authorization header.
     * @param {string} authorization - The Authorization header value.
     * @returns {string|boolean} - The extracted token or false if not present.
     */
    const extractBearer = authorization => {
        if (typeof authorization !== 'string') return false;
        const matches = authorization.match(/(bearer)\s+(\S+)/i);
        return matches && matches[2];
    };

    const token = req.headers.authorization && extractBearer(req.headers.authorization);
    if (!token) return res.status(401).json({ message: 'Token non présent!' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
        if (!err) {
            req.user = decodedToken;
            return next();
        }

        jwt.verify(token, process.env.JWT_SECRET_REFRESH, (errRefresh, decodedRefreshToken) => {
            if (errRefresh) {
                console.error('Error verifying JWT token:', errRefresh);
                return res.status(401).json({ message: 'Bad token' });
            }

            req.user = decodedRefreshToken;
            return next();
        });
    });
};

module.exports = checkTokenMiddleware;
