const multer = require("multer");
const fs = require("fs");
const path = require("path");

const ALLOWED_IMAGE_TYPES = ["image/jpg", "image/jpeg", "image/png"];

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        let uploadPath = "Assets/Images";
        
        // Vérifie explicitement le paramètre `logoType`
        if (req.query.logoType === "company") {
            uploadPath = "Assets/Images/LogoCompanies";
            console.log("logoType détecté comme 'company'. Enregistrement dans :", uploadPath);
        } else {
            console.log("logoType non spécifié ou différent de 'company'. Utilisation du chemin par défaut :", uploadPath);
        }

        // Crée le dossier si nécessaire
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log("Chemin final d'enregistrement :", uploadPath);
        callback(null, uploadPath);
    },
    filename: (req, file, callback) => {
        const originalname = file.originalname.replace(/\s+/g, "_");
        const extension = file.mimetype.split("/")[1];
        const filename = `${originalname.replace(/\.[^/.]+$/, "")}_${Date.now()}.${extension}`;

        // Ajouter un log pour le nom du fichier
        if (!req.uploadLogs) req.uploadLogs = [];  // Initialiser les logs s'ils n'existent pas
        req.uploadLogs.push(`Nom du fichier enregistré : ${filename}`);
        console.log("Nom du fichier enregistré :", filename);
        callback(null, filename);
    },
});

const fileFilter = (req, file, callback) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        callback(null, true);
    } else {
        callback(new Error("Seuls les fichiers image sont autorisés."), false);
    }
};

const limits = {
    fileSize: 5 * 1024 * 1024, // Limite de taille : 5 MB
};

const upload = multer({ storage, fileFilter, limits }).single("image");

// Middleware pour gérer les erreurs de téléchargement et les logs
const uploadWithLogs = (req, res, next) => {
    req.uploadLogs = []; // Initialiser les logs pour chaque requête

    upload(req, res, (err) => {
        if (err) {
            req.uploadLogs.push(`Erreur : ${err.message}`);
            return res.status(400).json({ message: "Erreur lors du téléchargement de l'image", logs: req.uploadLogs });
        }

        req.uploadLogs.push("Fichier téléchargé avec succès.");
        next();
    });
};

module.exports = uploadWithLogs;
