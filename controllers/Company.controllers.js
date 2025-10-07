const db = require('../db.config');
const fs = require('fs');
const path = require('path');

const Company = db.Company;
const CompanyAdresse = db.CompanyAdresse;
const Country = db.Country;
const Pub = db.Pub;

exports.GetAllCompany = async (req, res) => {
    try {
        const companies = await Company.findAll({
            include: [CompanyAdresse, Country, Pub],
        });
        return res.json({ data: companies });
    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.GetOneCompany = async (req, res) => {
    const companyId = parseInt(req.params.id);

    try {
        const company = await Company.findOne({
            where: { id: companyId },
            include: [CompanyAdresse],
        });

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        return res.json({ data: company });
    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.AddCompany = async (req, res) => {
    const companyData = req.body;

    try {
        const newCompany = await Company.create({
            company_name: companyData.company_name,
            company_telephone: companyData.company_telephone,
            company_num_siret: companyData.company_num_siret,
            code_naf: companyData.code_naf,
            pays_id: companyData.pays_id,
            rib: companyData.rib,
            mail: companyData.mail,
            activite: companyData.activite,
        });

        const companyId = newCompany.id;

        await CompanyAdresse.create({
            company_adresse: companyData.company_adresse,
            company_ville: companyData.company_ville,
            company_codepostal: companyData.company_codepostal,
            company_id: companyId,
        });

        return res.status(201).json({ message: 'Company added successfully', data: newCompany });

    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.UpdateCompany = async (req, res) => {
    const updatedData = req.body;
    const companyId = parseInt(req.params.id);

    try {
        const company = await Company.findOne({ where: { id: companyId } });

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        let objectcompany = {
            company_name: updatedData.company_name !== undefined ? updatedData.company_name : company.company_name,
            company_telephone: updatedData.company_telephone !== undefined ? updatedData.company_telephone : company.company_telephone,
            company_num_siret: updatedData.company_num_siret !== undefined ? updatedData.company_num_siret : company.company_num_siret,
            code_naf: updatedData.code_naf !== undefined ? updatedData.code_naf : company.code_naf,
            pays_id: updatedData.pays_id !== undefined ? updatedData.pays_id : company.pays_id,
            datedebutpaiment: updatedData.datedebutpaiment !== undefined ? new Date(updatedData.datedebutpaiment).toISOString() : company.datedebutpaiment,
            datefinpaiment: updatedData.datefinpaiment !== undefined ? new Date(updatedData.datefinpaiment).toISOString() : company.datefinpaiment,
            rib: updatedData.rib !== undefined ? updatedData.rib : company.rib,
            mail: updatedData.mail !== undefined ? updatedData.mail : company.mail,
            activite: updatedData.activite !== undefined ? updatedData.activite : company.activite,
            monthly_revenue: updatedData.monthly_revenue !== undefined ? updatedData.monthly_revenue : company.monthly_revenue,
        };

        await company.update(objectcompany);

        if (updatedData.idAdresse !== undefined) {
            let objectcompanyAdresse = {};
            if (updatedData.company_adresse !== undefined) objectcompanyAdresse.company_adresse = updatedData.company_adresse;
            if (updatedData.company_ville !== undefined) objectcompanyAdresse.company_ville = updatedData.company_ville;
            if (updatedData.company_codepostal !== undefined) objectcompanyAdresse.company_codepostal = updatedData.company_codepostal;

            await CompanyAdresse.update(objectcompanyAdresse, { where: { id: updatedData.idAdresse } });
        }

        return res.json({ message: 'Company updated successfully', data: company });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ message: 'Database Error', error });
    }
};


exports.DeleteCompany = async (req, res) => {
    const companyId = parseInt(req.params.id);

    try {
        const company = await Company.findOne({ where: { id: companyId } });
        const companyadresse = await CompanyAdresse.findOne({ where: { company_id: companyId } });

        if (!company) {
            return res.status(404).json({ message: 'Company not found' });
        }

        await company.destroy();
        await companyadresse.destroy();

        return res.json({ message: 'Company deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.UpdateCompanyAddPub = async (req, res) => {
    const companyId = parseInt(req.params.id);

    if (!companyId) {
        return res.status(400).json({ message: 'Missing parameter' });
    }

    try {
        let company = await Company.findOne({ where: { id: companyId } });

        if (!company) {
            return res.status(404).json({ message: 'This company does not exist!' });
        }

        let existingPub = await Pub.findOne({ where: { company_id: companyId } });

        if (req.file) {
			const imagePath = `https://${req.get("host")}/api/images/${req.file.filename}`;
            const pubData = {
                pub_image: imagePath,
                company_id: companyId,
                pub_link: req.body.pub_link
            };

            if (existingPub) {
                const pathInfo = path.parse(existingPub.pub_image);
                const oldImagePath = path.join(__dirname, '..', 'Assets', 'Images', pathInfo.base);

                fs.unlink(oldImagePath, async (err) => {
                    if (err) {
                        console.error('Error deleting old image:', err);
                    } else {
                        console.log('Old image deleted successfully');
                    }

                    await Pub.update(pubData, { where: { company_id: companyId } });

                    let updatedPub = await Pub.findOne({ where: { company_id: companyId } });
                    return res.json({ message: 'Company ad updated successfully', pub: updatedPub });
                });
            } else {
                let newPub = await Pub.create(pubData);
                return res.json({ message: 'Company ad created successfully', pub: newPub });
            }
        } else if (req.body.pub_link) {
            if (existingPub) {
                await Pub.update(
                    { pub_link: req.body.pub_link },
                    { where: { company_id: companyId } }
                );

                let updatedPub = await Pub.findOne({ where: { company_id: companyId } });
                return res.json({ message: 'Company ad updated successfully', pub: updatedPub });
            } else {
                return res.status(404).json({ message: 'No existing ad found for this company.' });
            }
        } else {
            return res.status(400).json({ message: 'No file uploaded and no link provided' });
        }
    } catch (err) {
        console.error('Database Error:', err);
        return res.status(500).json({ message: 'Database Error', error: err });
    }
};

exports.updateCompanyLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Aucun fichier téléchargé" });
        }

        const companyId = req.params.id;
        const logoPath = `https://${req.get("host")}/api/images/LogoCompanies/${req.file.filename}`;

        // Vérifier si l'ID de la compagnie est valide
        if (isNaN(companyId)) {
            return res.status(400).json({ message: "ID de compagnie invalide" });
        }

        // Rechercher la compagnie dans la base de données
        const company = await Company.findByPk(companyId);
        if (!company) {
            return res.status(404).json({ message: "Compagnie non trouvée" });
        }

        // Supprimer l'ancien logo s'il existe
        if (company.logo) {
            const oldLogoPath = path.join(__dirname, '..', 'Assets', 'Images', 'LogoCompanies', path.basename(company.logo));
            fs.unlink(oldLogoPath, (err) => {
                if (err) {
                    console.error("Erreur lors de la suppression de l'ancien logo :", err);
                } else {
                    console.log("Ancien logo supprimé avec succès.");
                }
            });
        }

        // Mise à jour du logo dans la base de données
        await Company.update({ logo: logoPath }, { where: { id: companyId } });

        res.status(200).json({ logoUrl: logoPath });
    } catch (error) {
        console.error("Erreur lors de la mise à jour du logo :", error);
        res.status(500).json({ message: "Erreur serveur lors de la mise à jour du logo" });
    }
};

