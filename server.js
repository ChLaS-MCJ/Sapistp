require('dotenv').config();
const connectMongoDB = require('./mongoose.config');

/**
 * Starts the server and connects to databases using Sequelize and Mongoose.
 * It checks the version of Node.js and exits if it is below version 14.0.
 * It then authenticates the database connections and starts the server on the specified port.
 *
 * @param {Object} db - The Sequelize database configuration.
 * @param {Object} app - The server configuration.
 * @returns {void}
 */
let startServer = async (db, app) => {
  const [major, minor] = process.versions.node.split('.').map(parseFloat);
  if (major < 14 || (major === 14 && minor <= 0)) {
    console.log('Veuillez vous rendre sur nodejs.org et télécharger la version 14 ou une version ultérieure. 👌\n ');
    process.exit();
  }

  try {

    await connectMongoDB();

    await db.sequelize.authenticate();
    console.log('✔️ Connexion à la base de données relationnelle réussie.');

    app.listen(process.env.SERVER_PORT, () => {
      console.log(`🚀 Express running → On PORT : ${process.env.SERVER_PORT}.⭐️`);
    });
  } catch (err) {
    console.log(`1. 🔥 Erreur: server.js`);
    console.error(`🚫 Error → : ${err.message}`);
    process.exit(1);
  }
};

startServer(require('./db.config'), require('./app'));
