const express = require('express');
const path = require('path');
const cors = require('cors');
const GuardAuth = require('./middlewares/GuardAuth');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const corsOptions = {
  // origin: function (origin, callback) {
  //   if (!origin || allowedOrigins.includes(origin)) {
  //     callback(null, true);
  //   } else {
  //     callback(new Error('Not allowed by CORS'));
  //   }
  // },
	origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: "Origin, X-Requested-With, x-access-token, role, Content, Accept, Content-Type, Authorization",
  credentials: true,
  optionsSuccessStatus: 204
};

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});



app.use(cors(corsOptions));

const user_router = require('./routes/Users.routes');
const auth_router = require('./routes/Auth.routes');
const country_router = require('./routes/Country.routes');
const roles_router = require('./routes/Roles.routes');
const company_router = require('./routes/Company.routes');
const epci_router = require('./routes/Epci.routes');
const commune_router = require('./routes/Commune.routes');
const epcitarification_router = require('./routes/EpciTarification.routes');
const stats_router = require('./routes/Stats.routes');
const pub_router = require('./routes/Pub.routes');
const communetarification_router = require('./routes/CommuneTarification.routes');
const collecteadresse_router = require('./routes/CollecteAdresse.routes');
const search_router = require('./routes/Search.routes');

app.use('/api/users', GuardAuth, user_router);
app.use('/api/auth', auth_router);
app.use('/api/country', country_router);
app.use('/api/roles', roles_router);
app.use('/api/company', company_router);
app.use('/api/epci', epci_router);
app.use('/api/commune', commune_router);
app.use('/api/collecteadresse', collecteadresse_router);
app.use('/api/epcitarification', epcitarification_router);
app.use('/api/stats', stats_router);
app.use('/api/pubs', pub_router);
app.use('/api/communetarification', communetarification_router);
app.use('/api/search', search_router);


const appuser_router = require('./routes/App_User.routes');
app.use('/api/mango/users', appuser_router);

const notificationRouter = require('./routes/Notification.routes');
app.use('/api/notification', notificationRouter);

app.use('/api/images', express.static(path.join(__dirname, 'Assets/Images')));
app.use('/api/images/LogoCompanies', express.static(path.join(__dirname, 'Assets/Images/LogoCompanies')));

const trackingRoutes = require('./routes/tracking');
app.use('/api/tracking', trackingRoutes);

const individualmailRoutes = require('./routes/individual-email');
app.use('/api/mailing', individualmailRoutes);

router.get('/status', async (req, res) => {
    try {
        const mariaCount = await AppUser.count();
        
        // Connexion MongoDB temporaire
        await mongoose.connect(process.env.MONGODB_URI);
        const UserModel = require('../models/mangodb/user.models');
        const mongoCount = await UserModel.countDocuments();
        await mongoose.connection.close();
        
        res.json({
            mongodb: mongoCount,
            mariadb: mariaCount,
            migrated: mariaCount,
            remaining: mongoCount - mariaCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


module.exports = app;
