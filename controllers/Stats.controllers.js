const db = require('../db.config');
const { Op, Sequelize } = require('sequelize');
const sequelize = db.sequelize;
const fs = require('fs');
const path = require('path');

// Import des modèles
const Company = db.Company;
const Commune = db.Commune;
const EpciTarification = db.EpciTarification;

const CollecteAdresse = db.CollecteAdresse;
const Collecte = db.Collecte;
const Adresse = require('../models/mangodb/Adresse.models');

const logFilePath = path.join(__dirname, '../ca_log.json');

// Fonction pour lire le fichier de log
const readLogFile = () => {
    if (!fs.existsSync(logFilePath)) {
        return [];
    }
    const data = fs.readFileSync(logFilePath, 'utf8');
    return JSON.parse(data);
};

// Fonction pour écrire dans le fichier de log
const writeLogFile = (data) => {
    fs.writeFileSync(logFilePath, JSON.stringify(data, null, 2), 'utf8');
};

// Fonction pour journaliser le CA actuel, le CA en défaut et le CA annuel prévisionnel
const logCurrentCA = (currentCA, defaultCA, annualCA) => {
    const logs = readLogFile();
    const currentDate = new Date();
    const month = currentDate.toISOString().slice(0, 7); // Format YYYY-MM

    // Vérifier si une entrée pour le mois en cours existe déjà
    const existingLogIndex = logs.findIndex(log => log.month === month);

    if (existingLogIndex !== -1) {
        logs[existingLogIndex].currentCA = currentCA;
        logs[existingLogIndex].defaultCA = defaultCA;
        logs[existingLogIndex].annualCA = annualCA;
    } else {
        const newLog = {
            month,
            currentCA,
            defaultCA,
            annualCA
        };
        logs.push(newLog);
    }

    writeLogFile(logs);
};

// Fonction pour obtenir les CA du mois précédent
const getPreviousMonthData = (currentMonth) => {
    const logs = readLogFile();
    const previousMonth = new Date(currentMonth);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const previousMonthStr = previousMonth.toISOString().slice(0, 7);

    const previousLog = logs.find(log => log.month === previousMonthStr);
    return previousLog ? { currentCA: previousLog.currentCA || 0, defaultCA: previousLog.defaultCA || 0, annualCA: previousLog.annualCA || 0 } : { currentCA: 0, defaultCA: 0, annualCA: 0 };
};

// Fonction pour calculer la variation en pourcentage
const calculatePercentageChange = (newValue, oldValue) => {
    if (oldValue === 0) {
        return newValue > 0 ? 200 : 0;
    }
    return ((newValue - oldValue) / oldValue) * 100;
};

// Contrôleur pour récupérer les communes avec des collectes
exports.getCommunesWithCollectes = async (req, res) => {
    try {
        const totalCommunes = await Commune.count();
        const communesWithCollectes = await Commune.findAll({
            include: [{
                model: db.Collecte,
                required: true
            }],
            group: ['Commune.id']
        });

        res.status(200).json({
            totalCommunes,
            communesWithCollectes: communesWithCollectes.length
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des communes avec collectes :', error);
        res.status(500).json({ message: error.message });
    }
};

// Contrôleur pour calculer le revenu potentiel
exports.getPotentialRevenue = async (req, res) => {
    try {
        const tarifications = await EpciTarification.findAll();
        const totalRevenue = { monthly: 0, yearly: 0 };

        for (const tarification of tarifications) {
            const communeCount = await Commune.count({
                where: {
                    deletedAt: null,
                    number_of_communes: {
                        [Op.between]: [tarification.minCommuneCount, tarification.maxCommuneCount]
                    }
                }
            });

            const monthlyRevenue = communeCount * tarification.price;
            const yearlyRevenue = monthlyRevenue * 12;

            totalRevenue.monthly += monthlyRevenue;
            totalRevenue.yearly += yearlyRevenue;
        }

        res.status(200).json(totalRevenue);
    } catch (error) {
        console.error('Erreur lors du calcul du revenu potentiel :', error);
        res.status(500).json({ message: error.message });
    }
};

// Contrôleur pour récupérer les entreprises en défaut de paiement et en règle
exports.getDefaultCompanies = async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);

        const defaultCompanies = await Company.findAll({
            where: {
                datefinpaiment: {
                    [Op.lt]: today,
                },
                datedebutpaiment: {
                    [Op.ne]: null,
                }
            }
        });

        const inGoodStandingCompanies = await Company.findAll({
            where: {
                datefinpaiment: {
                    [Op.gte]: today,
                },
                datedebutpaiment: {
                    [Op.ne]: null,
                }
            }
        });

        res.status(200).json({
            defaultCompaniesCount: defaultCompanies.length,
            inGoodStandingCompaniesCount: inGoodStandingCompanies.length,
            defaultCompanies,
            inGoodStandingCompanies
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des entreprises en défaut de paiement :', error);
        res.status(500).json({
            message: 'Erreur de base de données',
            error: error.message || 'Une erreur inattendue est survenue.'
        });
    }
};

// Contrôleur pour récupérer les statistiques de CA
exports.getStats = async (req, res) => {
    try {
        const currentDate = new Date();
        const currentMonthStr = currentDate.toISOString().slice(0, 7);

        // Requête pour le CA actuel
        const currentCAQuery = `
            SELECT SUM(monthly_revenue) AS currentCA
            FROM companies
            WHERE datedebutpaiment <= :currentDate
              AND datefinpaiment >= :currentDate
        `;
        const currentCAResult = await sequelize.query(currentCAQuery, {
            replacements: { currentDate },
            type: Sequelize.QueryTypes.SELECT
        });
        const currentCA = parseFloat(currentCAResult[0].currentCA) || 0;

        // Requête pour les entreprises en défaut de paiement
        const defaultCompaniesQuery = `
            SELECT company_name, monthly_revenue
            FROM companies
            WHERE datefinpaiment < :currentDate
              AND datedebutpaiment IS NOT NULL
        `;
        const defaultCompanies = await sequelize.query(defaultCompaniesQuery, {
            replacements: { currentDate },
            type: Sequelize.QueryTypes.SELECT
        });
        const defaultCA = defaultCompanies.reduce((sum, company) => sum + parseFloat(company.monthly_revenue), 0);

        // Récupérer les CA du mois précédent
        const { currentCA: previousMonthCA, defaultCA: previousMonthDefaultCA, annualCA: previousMonthAnnualCA } = getPreviousMonthData(currentMonthStr);

        // Calcul du pourcentage d'augmentation pour le CA actuel
        const percentageIncrease = calculatePercentageChange(currentCA, previousMonthCA);

        // Calcul du pourcentage d'augmentation pour le CA en défaut
        const percentageDefaultIncrease = calculatePercentageChange(defaultCA, previousMonthDefaultCA);

        // Requête pour le CA annuel basé sur les entreprises en règle
        const goodStandingCompaniesQuery = `
            SELECT company_name, monthly_revenue
            FROM companies
            WHERE datefinpaiment >= :currentDate
              AND datedebutpaiment IS NOT NULL
        `;
        const goodStandingCompanies = await sequelize.query(goodStandingCompaniesQuery, {
            replacements: { currentDate },
            type: Sequelize.QueryTypes.SELECT
        });
        const goodStandingCA = goodStandingCompanies.reduce((sum, company) => sum + parseFloat(company.monthly_revenue), 0);

        const monthsRemaining = 12 - currentDate.getMonth(); // Mois restants dans l'année
        const annualCA = goodStandingCA * monthsRemaining; // Prévisionnel annuel

        // Journaliser le CA annuel prévisionnel
        logCurrentCA(currentCA, defaultCA, annualCA);

        // Calcul du pourcentage d'augmentation pour le CA annuel prévisionnel
        const percentageAnnualIncrease = calculatePercentageChange(annualCA, previousMonthAnnualCA);

        // Lire les logs pour l'historique des CA
        const logs = readLogFile();

        // Nombre total d'entreprises
        const totalCompaniesQuery = `
            SELECT COUNT(*) AS totalCompanies
            FROM companies
        `;
        const totalCompaniesResult = await sequelize.query(totalCompaniesQuery, {
            type: Sequelize.QueryTypes.SELECT
        });
        const totalCompanies = totalCompaniesResult[0].totalCompanies || 0;

        res.json({
            currentCA,
            previousMonthCA,
            percentageIncrease,
            defaultCA,
            percentageDefaultIncrease,
            annualCA,
            percentageAnnualIncrease,
            totalCompanies,
            logs
        });
    } catch (error) {
        console.error('Erreur de base de données lors de la récupération des statistiques :', error);
        res.status(500).json({ error: 'Erreur de base de données lors de la récupération des statistiques' });
    }
};

exports.getReportedCollects = async (req, res) => {
    try {
        // Fetch reported CollecteAdresse instances
        const reportedCollectsAdresse = await CollecteAdresse.findAll({
            where: {
                report: {
                    [Op.ne]: null,
                    [Op.ne]: ''
                }
            }
        });

        // Fetch associated addresses from MongoDB and add postal code
        for (let collecte of reportedCollectsAdresse) {
            const adresse = await Adresse.findOne({
                code_commune_INSEE: collecte.insee,
                codeRivoli: collecte.rivoli
            });

            // Fetch the postal code for this commune
            const commune = await Commune.findOne({
                where: { code_commune_INSEE: collecte.insee }
            });

            collecte.dataValues.adresse = adresse;
            collecte.dataValues.code_postal = commune ? commune.code_postal : null; // Ajout du code postal
        }

        res.status(200).json(reportedCollectsAdresse);
    } catch (error) {
        console.error('Error fetching reported collects:', error);
        res.status(500).json({ message: 'Error fetching reported collects', error: error.message || error });
    }
};
