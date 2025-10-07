const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adresseSchema = new Schema({
    type: String,
    codeTypeVoie: String,
    typeVoie: String,
    codeRivoli: String,
    cleRivoli: String,
    id: String,
    libelleVoieComplet: String,
    code_commune_INSEE: String
}, { collection: 'adressespostal' });

const Adresse = mongoose.model('Adresse', adresseSchema);
module.exports = Adresse;
