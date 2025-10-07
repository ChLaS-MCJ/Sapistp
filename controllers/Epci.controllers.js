const db = require('../db.config');
const EPCI = db.Epci;
const Commune = db.Commune;

exports.GetAllEpci = async (req, res) => {
    try {
        const epcis = await EPCI.findAll();
        return res.json({ data: epcis });
    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error });
    }
};



exports.GetOneEpci = async (req, res) => {
    const epciId = parseInt(req.params.id);

    try {
        const epci = await EPCI.findOne({
            where: { id: epciId },
        });

        if (!epci) {
            return res.status(404).json({ message: 'EPCI not found' });
        }

        return res.json({ data: epci });
    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.CreateEpci = async (req, res) => {
    const epciData = req.body;

    try {
        const newEpci = await EPCI.create({
            code: epciData.code,
            nom: epciData.nom,
            rib: epciData.rib,
            telephone1: epciData.telephone1,
            telephone2: epciData.telephone2,
            mail1: epciData.mail1,
            mail2: epciData.mail2,
            responsable_nom1: epciData.responsable_nom1,
            responsable_nom2: epciData.responsable_nom2,
            datedebutpaiment: epciData.datedebutpaiment ? new Date(epciData.datedebutpaiment).toISOString() : null,
            datefinpaiment: epciData.datefinpaiment ? new Date(epciData.datefinpaiment).toISOString() : null,
        });

        if (epciData.pubIds && Array.isArray(epciData.pubIds)) {
            await newEpci.setPubs(epciData.pubIds);
        }

        return res.status(201).json({ message: 'EPCI added successfully', data: newEpci });
    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.UpdateEpci = async (req, res) => {
    const updatedData = req.body;
    const epciId = parseInt(req.params.id);

    try {
        const epci = await EPCI.findOne({ where: { code: epciId } });

        if (!epci) {
            return res.status(404).json({ message: 'EPCI not found' });
        }

        let objectEpci = {
            code: updatedData.code !== undefined ? updatedData.code : epci.code,
            nom: updatedData.nom !== undefined ? updatedData.nom : epci.nom,
            datedebutpaiment: updatedData.datedebutpaiment !== undefined ? new Date(updatedData.datedebutpaiment).toISOString() : epci.datedebutpaiment,
            datefinpaiment: updatedData.datefinpaiment !== undefined ? new Date(updatedData.datefinpaiment).toISOString() : epci.datefinpaiment,
            rib: updatedData.rib !== undefined ? updatedData.rib : epci.rib,
            telephone1: updatedData.telephone1 !== undefined ? updatedData.telephone1 : epci.telephone1,
            telephone2: updatedData.telephone2 !== undefined ? updatedData.telephone2 : epci.telephone2,
            mail1: updatedData.mail1 !== undefined ? updatedData.mail1 : epci.mail1,
            mail2: updatedData.mail2 !== undefined ? updatedData.mail2 : epci.mail2,
            responsable_nom1: updatedData.responsable_nom1 !== undefined ? updatedData.responsable_nom1 : epci.responsable_nom1,
            responsable_nom2: updatedData.responsable_nom2 !== undefined ? updatedData.responsable_nom2 : epci.responsable_nom2
        };

        await epci.update(objectEpci);

        if (updatedData.pubIds && Array.isArray(updatedData.pubIds)) {
            await epci.setPubs(updatedData.pubIds);
        }

        return res.json({ message: 'EPCI updated successfully', data: epci });
    } catch (error) {
        console.error('Database Error:', error);
        return res.status(500).json({ message: 'Database Error', error });
    }
};

exports.DeleteEpci = async (req, res) => {

    try {
        const epci = await EPCI.findOne({ where: { code: req.params.id } });

        if (!epci) {
            return res.status(404).json({ message: 'EPCI not found' });
        }

        await epci.destroy();

        return res.json({ message: 'EPCI deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Database Error', error });
    }
};


exports.Aggregated = async (req, res) => {
   try {
    // 1) Récupérer la liste de tous les EPCI
    const epcis = await EPCI.findAll();
    
    // 2) Pour chaque EPCI, on va récupérer ses communes et faire la somme
    const results = [];

    for (const epci of epcis) {
      // Par hypothèse, 'epci.code' est la clé utilisée par 'communes'
      const communes = await Commune.findAll({
        where: { codeEpci: epci.code },
      });

      const nbCommunes = communes.length;
      // On additionne la population de chaque commune
      const populationTotale = communes.reduce(
        (acc, commune) => acc + (commune.population_commune || 0),
        0
      );

      // On prépare un objet de résultat
      results.push({
        codeEpci: epci.code,
        nomEpci: epci.nom,
        nbCommunes: nbCommunes,
        populationTotale: populationTotale,
      });
    }

    // 3) On renvoie un tableau d'objets { codeEpci, nomEpci, nbCommunes, populationTotale }
    return res.json({ data: results });
  } catch (error) {
    console.error('Erreur Aggregated EPCI:', error);
    return res.status(500).json({ message: 'Database Error', error });
  }
};

