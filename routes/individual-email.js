// routes/email-tracking.js - Version propre avec API séparée
const express = require('express');
const SibApiV3Sdk = require('@getbrevo/brevo');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// 🆕 Import des modèles Sequelize
const db = require('../db.config.js'); // Ajustez le chemin
const { Op } = require('sequelize');

// ============================================
// CONFIGURATION BREVO
// ============================================
let defaultClient, apiKey, transactionalEmailsApi;
let configErrors = [];
let configSuccess = [];

try {
    defaultClient = SibApiV3Sdk.ApiClient.instance;
    apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    
    transactionalEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();
    
    console.log('✅ Configuration Brevo transactionnel OK');
    configSuccess.push('Configuration Brevo initialisée');
} catch (error) {
    console.error('❌ Erreur configuration Brevo transactionnel:', error.message);
    configErrors.push('Erreur configuration Brevo: ' + error.message);
}

const DEFAULT_SENDER = {
    email: process.env.SENDER_EMAIL || 'contact@applitwo.com',
    name: process.env.SENDER_NAME || 'APPLITWO'
};

// ============================================
// FONCTIONS HELPER POUR TEMPLATES
// ============================================

// Fonction pour remplacer les variables dans le template
function renderTemplate(htmlContent, variables, contactData, trackingId) {
    let renderedHtml = htmlContent;
    const baseUrl = 'https://mcjdevsubb.fr/api/mailing';
    
    console.log('=== RENDER TEMPLATE DEBUG ===');
    console.log('Variables du template:', variables);
    console.log('Contact data reçu:', contactData);
    console.log('nom_commune AVANT traitement:', contactData.nom_commune);
    
    // Traitement spécial pour nom_commune (enlever "Mairie - ")
    if (contactData.nom_commune) {
        const original = contactData.nom_commune;
        contactData.nom_commune = contactData.nom_commune
            .replace(/^Mairie\s*-\s*/i, '')
            .trim();
        console.log('nom_commune APRÈS nettoyage:', original, '→', contactData.nom_commune);
    }
    
    // Remplacer les variables personnalisées
    if (variables && Array.isArray(variables)) {
        console.log('Variables à traiter:', variables);
        variables.forEach(variable => {
            const placeholder = new RegExp(`{{${variable}}}`, 'g');
            const value = contactData[variable] || '';
            console.log(`Remplacement: {{${variable}}} → "${value}"`);
            renderedHtml = renderedHtml.replace(placeholder, value);
        });
    } else {
        console.log('⚠️ Aucune variable définie dans le template ou variables n\'est pas un tableau');
        // Forcer le remplacement de nom_commune même sans variables définies
        const placeholder = new RegExp(`{{nom_commune}}`, 'g');
        const value = contactData.nom_commune || '';
        console.log(`Remplacement forcé: {{nom_commune}} → "${value}"`);
        renderedHtml = renderedHtml.replace(placeholder, value);
    }
    
    // Variables système avec tracking
    renderedHtml = renderedHtml.replace(/{{logo_url}}/g, `${baseUrl}/assets/logo/${trackingId}`);
    renderedHtml = renderedHtml.replace(/{{logo_footer_url}}/g, `${baseUrl}/assets/logo-footer`);
    renderedHtml = renderedHtml.replace(/{{qr_code_url}}/g, `${baseUrl}/assets/qrcode`);
    renderedHtml = renderedHtml.replace(/{{unsubscribe_url}}/g, `${baseUrl}/track-click/${trackingId}/unsubscribe`);
    
    console.log('=== FIN DEBUG ===');
    
    return renderedHtml;
}

// Fonction pour remplacer les variables dans le sujet
function renderSubject(subject, contactData) {
    let renderedSubject = subject;
    
    // Remplacer toutes les variables {{variable}} dans le sujet
    const variableRegex = /{{(\w+)}}/g;
    renderedSubject = renderedSubject.replace(variableRegex, (match, variable) => {
        return contactData[variable] || match;
    });
    
    return renderedSubject;
}

// ============================================
// ROUTES ASSETS (identiques à avant)
// ============================================

router.get('/assets/logo/:trackingId', async (req, res) => {
    const { trackingId } = req.params;
    
    console.log(`🎯 LOGO CHARGÉ (= EMAIL OUVERT): ${trackingId}`);
    
    try {
        const email = await db.EmailTracking.findOne({
            where: { tracking_id: trackingId }
        });
        
        if (email && !email.opened) {
            await email.update({
                status: 'opened',
                opened: true,
                opened_at: new Date(),
                opened_via: 'logo_applitwo',
                user_agent: req.get('User-Agent'),
                ip_address: req.ip,
                engagement_score: (email.engagement_score || 0) + 15,
                updated_at: new Date()
            });
            
            console.log(`✅ EMAIL OUVERT via logo: ${email.recipient_email}`);
        }
    } catch (error) {
        console.error('❌ Erreur mise à jour ouverture:', error);
    }
    
    const logoPath = path.join(__dirname, '../Assets/logo-applitwo.png');
    if (fs.existsSync(logoPath)) {
        res.sendFile(logoPath);
    } else {
        res.redirect('https://via.placeholder.com/200x120/2D5A8B/ffffff?text=APPLITWO');
    }
});

router.get('/assets/qrcode', (req, res) => {
    const qrcodePath = path.join(__dirname, '../Assets/qrcode-applitwo.png');
    if (fs.existsSync(qrcodePath)) {
        res.sendFile(qrcodePath);
    } else {
        res.redirect('https://via.placeholder.com/150x150/4CAF50/ffffff?text=QR');
    }
});

router.get('/assets/logo-footer', (req, res) => {
    const logoPath = path.join(__dirname, '../Assets/logo-applitwo-small.png');
    if (fs.existsSync(logoPath)) {
        res.sendFile(logoPath);
    } else {
        const mainLogoPath = path.join(__dirname, '../Assets/logo-applitwo.png');
        if (fs.existsSync(mainLogoPath)) {
            res.sendFile(mainLogoPath);
        } else {
            res.redirect('https://via.placeholder.com/80x60/2D5A8B/ffffff?text=APPLITWO');
        }
    }
});

// ============================================
// API TEMPLATES - CRUD COMPLET
// ============================================

// Récupérer tous les templates
router.get('/templates', async (req, res) => {
    try {
        const templates = await db.EmailTemplate.findAll({
            attributes: [
                'id', 
                'name', 
                'description', 
                'subject', 
                'variables', 
                'category', 
                'is_active',
                'html_content',    // ← Important pour la preview HTML
                'preview_image',
                'created_by',
                'createdAt',
                'updatedAt'
            ],
            where: { is_active: true },
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            templates: templates,
            total: templates.length
        });
    } catch (error) {
        console.error('❌ Erreur récupération templates:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Récupérer un template spécifique
router.get('/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const template = await db.EmailTemplate.findByPk(id);
        
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template non trouvé'
            });
        }
        
        res.json({
            success: true,
            template: template
        });
    } catch (error) {
        console.error('❌ Erreur récupération template:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Créer un nouveau template
router.post('/templates', async (req, res) => {
    try {
        const { name, description, subject, html_content, variables, category, preview_image, created_by } = req.body;
        
        if (!name || !subject || !html_content) {
            return res.status(400).json({
                success: false,
                error: 'Nom, sujet et contenu HTML requis'
            });
        }
        
        const template = await db.EmailTemplate.create({
            name,
            description: description || '',
            subject,
            html_content,
            variables: variables || [],
            category: category || 'commercial',
            preview_image: preview_image || '',
            created_by: created_by || null,
            is_active: true
        });
        
        res.status(201).json({
            success: true,
            message: 'Template créé avec succès',
            template: template
        });
    } catch (error) {
        console.error('❌ Erreur création template:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Mettre à jour un template
router.put('/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        const template = await db.EmailTemplate.findByPk(id);
        
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template non trouvé'
            });
        }
        
        await template.update(updateData);
        
        res.json({
            success: true,
            message: 'Template mis à jour avec succès',
            template: template
        });
    } catch (error) {
        console.error('❌ Erreur mise à jour template:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Supprimer un template (soft delete - désactiver)
router.delete('/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const template = await db.EmailTemplate.findByPk(id);
        
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template non trouvé'
            });
        }
        
        await template.update({ is_active: false });
        
        res.json({
            success: true,
            message: 'Template désactivé avec succès'
        });
    } catch (error) {
        console.error('❌ Erreur suppression template:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// ENVOI D'EMAIL AVEC TEMPLATE SÉLECTIONNÉ
// ============================================
router.post('/send-with-template', async (req, res) => {
    try {
        const { to, template_id, contact_data, campaign_name } = req.body;
        
        if (!to || !template_id) {
            return res.status(400).json({
                success: false,
                error: 'Destinataire et template_id requis'
            });
        }
        
        // Récupérer le template depuis la BDD
        const template = await db.EmailTemplate.findOne({
            where: { 
                id: template_id, 
                is_active: true 
            }
        });
        
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template non trouvé ou inactif'
            });
        }
        
        // Générer un tracking ID unique
        const trackingId = `template_${template_id}_${Date.now()}_${Buffer.from(to).toString('base64').slice(0, 8)}`;
        
        // Rendre le template avec les données du contact
        const renderedSubject = renderSubject(template.subject, contact_data || {});
        const renderedHtml = renderTemplate(
            template.html_content, 
            template.variables, 
            contact_data || {}, 
            trackingId
        );
        
        // Envoi via Brevo
        const sendSmtpEmail = {
            to: [{ email: to }],
            sender: DEFAULT_SENDER,
            subject: renderedSubject,
            htmlContent: renderedHtml,
            tags: [template.category, 'template-' + template_id],
            headers: {
                'X-Tracking-ID': trackingId,
                'X-Template-ID': template_id.toString()
            }
        };
        
        const result = await transactionalEmailsApi.sendTransacEmail(sendSmtpEmail);
        
        // Enregistrer en BDD
        await db.EmailTracking.create({
            tracking_id: trackingId,
            message_id: result.messageId,
            recipient_email: to,
            recipient_structure: contact_data?.nom_structure || contact_data?.structure || '',
            subject: renderedSubject,
            campaign_name: campaign_name || template.name,
            template_id: template_id,
            template_name: template.name,
            status: 'sent',
            user_data: contact_data || {},
            sent_at: new Date(),
            updated_at: new Date()
        });
        
        console.log(`✅ Email envoyé avec template "${template.name}" vers ${to}`);
        
        res.json({
            success: true,
            message: `Email envoyé avec template "${template.name}"`,
            messageId: result.messageId,
            trackingId: trackingId,
            template_used: {
                id: template.id,
                name: template.name,
                category: template.category
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur envoi avec template:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// WEBHOOK BREVO
// ============================================
router.post('/brevo-webhook', async (req, res) => {
    try {
        const event = req.body;
        const messageId = event['message-id'];
        const emailAddress = event.email;
        
        console.log('🎯 WEBHOOK REÇU:', event.event, emailAddress);
        
        // Chercher l'email en BDD
        let email = await db.EmailTracking.findOne({
            where: { message_id: messageId }
        });
        
        if (!email && emailAddress) {
            // Chercher par email si pas trouvé par message_id
            email = await db.EmailTracking.findOne({
                where: {
                    recipient_email: {
                        [Op.like]: `%${emailAddress}%`
                    }
                },
                order: [['sent_at', 'DESC']]
            });
        }
        
        if (email) {
            const updateData = {
                user_agent: event['user-agent'],
                ip_address: event.ip,
                updated_at: new Date()
            };
            
            switch (event.event) {
                case 'delivered':
                    updateData.status = email.status === 'sent' ? 'delivered' : email.status;
                    break;
                    
                case 'opened':
                case 'proxy_open':
                    updateData.status = 'opened';
                    updateData.opened = true;
                    updateData.opened_at = new Date(event.ts * 1000);
                    updateData.opened_via = event.event === 'proxy_open' ? 'proxy' : 'webhook';
                    updateData.engagement_score = (email.engagement_score || 0) + 10;
                    break;
                    
                case 'click':
                    updateData.status = 'clicked';
                    updateData.clicked = true;
                    updateData.clicked_at = new Date(event.ts * 1000);
                    updateData.engagement_score = (email.engagement_score || 0) + 20;
                    
                    // Gérer les liens cliqués
                    const existingLinks = email.clicked_links || [];
                    existingLinks.push({
                        url: event.link,
                        clicked_at: updateData.clicked_at
                    });
                    updateData.clicked_links = existingLinks;
                    break;
                    
                case 'bounce':
                    updateData.status = 'bounced';
                    updateData.bounced = true;
                    updateData.bounced_at = new Date(event.ts * 1000);
                    updateData.bounce_reason = event.reason;
                    break;
            }
            
            await email.update(updateData);
            console.log(`✅ Email mis à jour en BDD: ${emailAddress} - ${event.event}`);
        }
        
        res.status(200).send('OK');
        
    } catch (error) {
        console.error('❌ Erreur webhook BDD:', error);
        res.status(200).send('ERROR_LOGGED');
    }
});

// ============================================
// API STATISTIQUES ET TRACKING
// ============================================

// Statistiques générales
router.get('/stats', async (req, res) => {
    try {
        const totalSent = await db.EmailTracking.count();
        const totalDelivered = await db.EmailTracking.count({ 
            where: { status: { [Op.in]: ['delivered', 'opened', 'clicked'] } } 
        });
        // ✅ Correction: opened est stocké comme '1'/'0' dans votre BDD
        const totalOpened = await db.EmailTracking.count({ 
            where: { opened: '1' } // ou { opened: 1 } selon votre type de colonne
        });
        const totalClicked = await db.EmailTracking.count({ 
            where: { clicked: '1' } // ou { clicked: 1 }
        });
        const totalBounced = await db.EmailTracking.count({ 
            where: { bounced: '1' } // ou { bounced: 1 }
        });
        
        const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) + '%' : '0%';
        const clickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) + '%' : '0%';
        
        // ✅ Stats par template CORRIGÉES - sans template_name
        const templateStats = await db.EmailTracking.findAll({
            attributes: [
                'template_id',
                'campaign_name', // ✅ Utiliser campaign_name au lieu de template_name
                [db.sequelize.fn('COUNT', '*'), 'total_sent'],
                // ✅ Correction pour les colonnes opened/clicked
                [db.sequelize.fn('SUM', 
                    db.sequelize.where(db.sequelize.col('opened'), '1')
                ), 'total_opened'],
                [db.sequelize.fn('SUM', 
                    db.sequelize.where(db.sequelize.col('clicked'), '1')
                ), 'total_clicked']
            ],
            where: { 
                template_id: { [Op.not]: null },
                campaign_name: { [Op.not]: null }
            },
            group: ['template_id', 'campaign_name'], // ✅ Grouper par les colonnes qui existent
            raw: true
        });
        
        res.json({
            success: true,
            stats: {
                total_sent: totalSent,
                total_delivered: totalDelivered,
                total_opened: totalOpened,
                total_clicked: totalClicked,
                total_bounced: totalBounced,
                open_rate: openRate,
                click_rate: clickRate,
                template_performance: templateStats
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Emails trackés avec filtres
router.get('/tracked-emails', async (req, res) => {
    try {
        const { email, status, template_id, limit = 50, offset = 0 } = req.query;
        
        let whereClause = {};
        
        if (email) {
            whereClause[Op.or] = [
                { recipient_email: { [Op.like]: `%${email}%` } },
                { subject: { [Op.like]: `%${email}%` } },
                { recipient_structure: { [Op.like]: `%${email}%` } }
            ];
        }
        
        if (status && status !== 'all') {
            whereClause.status = status;
        }
        
        if (template_id) {
            whereClause.template_id = template_id;
        }
        
        const { count, rows } = await db.EmailTracking.findAndCountAll({
            where: whereClause,
            order: [['sent_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
        res.json({
            success: true,
            emails: rows,
            total: count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération emails:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Prospects chauds
router.get('/hot-prospects', async (req, res) => {
    try {
        const hotProspects = await db.EmailTracking.findAll({
            where: {
                [Op.or]: [
                    { clicked: true, opened: false }, // Cliqué sans ouverture = protection anti-tracking
                    { engagement_score: { [Op.gte]: 20 } }
                ]
            },
            order: [['engagement_score', 'DESC']],
            limit: 20
        });
        
        res.json({
            success: true,
            hot_prospects: hotProspects.map(prospect => ({
                email: prospect.recipient_email,
                structure: prospect.recipient_structure,
                template_used: prospect.template_name,
                engagement_score: prospect.engagement_score,
                opened: prospect.opened,
                clicked: prospect.clicked,
                last_activity: prospect.clicked_at || prospect.opened_at || prospect.sent_at,
                priority: prospect.engagement_score >= 30 ? '🔥 URGENCE' : 
                         prospect.engagement_score >= 20 ? '📞 PRIORITÉ' : 
                         '📧 RELANCE',
                recommendation: prospect.clicked && !prospect.opened ? 
                    'CLIENT INTÉRESSÉ - Protection anti-tracking - APPELER !' :
                    'Contact engagé - Poursuivre la relation'
            })),
            total: hotProspects.length
        });
        
    } catch (error) {
        console.error('❌ Erreur récupération prospects:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================
// ROUTE DE TEST
// ============================================
router.get('/test', async (req, res) => {
    try {
        // Test connexion BDD
        await db.sequelize.authenticate();
        
        const emailCount = await db.EmailTracking.count();
        const templateCount = await db.EmailTemplate.count();
        
        res.json({ 
            success: true, 
            message: 'API propre - BDD et templates OK',
            config: {
                database_connected: true,
                brevo_configured: !!transactionalEmailsApi,
                sender: DEFAULT_SENDER,
                emails_in_db: emailCount,
                templates_in_db: templateCount
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/preview-template', async (req, res) => {
    try {
        const { template_id, contact_data } = req.body;
        
        // ✅ Utiliser db.EmailTemplate au lieu de db.Template
        const template = await db.EmailTemplate.findByPk(template_id);
        if (!template) {
            return res.status(404).json({ success: false, error: 'Template non trouvé' });
        }
        
        // Remplacer les variables dans le contenu HTML
        let htmlContent = template.html_content;
        
        // Ajouter les URLs d'images par défaut
        const extendedContactData = {
            ...contact_data,
            logo_url: 'https://mcjdevsubb.fr/Assets/logo-applitwo.png',
            qr_code_url: 'https://mcjdevsubb.fr/Assets/qrcode-applitwo.png',
            logo_footer_url: 'https://mcjdevsubb.fr/Assets/logo-applitwo-small.png'
        };
        
        Object.keys(extendedContactData).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            htmlContent = htmlContent.replace(regex, extendedContactData[key] || `[${key}]`);
        });
        
        res.json({
            success: true,
            html_content: htmlContent,
            subject: template.subject
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;