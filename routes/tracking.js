// routes/tracking.js - VERSION EPCI VRAIES DONNÉES BREVO UNIQUEMENT
const express = require('express');
const SibApiV3Sdk = require('@getbrevo/brevo');
const db = require('../db.config');
const router = express.Router();

// Configuration Brevo
let defaultClient, apiKey, campaignsApi, transactionalEmailsApi, contactsApi;

try {
    defaultClient = SibApiV3Sdk.ApiClient.instance;
    apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;
    
    campaignsApi = new SibApiV3Sdk.EmailCampaignsApi();
    transactionalEmailsApi = new SibApiV3Sdk.TransactionalEmailsApi();
    contactsApi = new SibApiV3Sdk.ContactsApi();
    
    console.log('✅ Configuration Brevo OK');
} catch (error) {
    console.error('❌ Erreur configuration Brevo:', error.message);
}

// ✅ FONCTION: Récupérer SEULEMENT les vrais emails EPCI depuis Brevo
async function getAllEPCIEmailsFromBrevo(campaignId, debugLogs) {
    // ❌ SUPPRIMÉ: Mode test - on force l'utilisation de Brevo
    if (!campaignsApi || !contactsApi) {
        throw new Error('APIs Brevo non disponibles - impossible de continuer sans vraies données');
    }

    try {
        const campaign = await campaignsApi.getEmailCampaign(campaignId);
        debugLogs.push(`📧 Campagne EPCI: "${campaign.name}"`);
        
        let allEmails = [];

        // ✅ MÉTHODE 1: Récupérer directement via les listes Brevo
        if (campaign.recipients?.lists?.length > 0) {
            debugLogs.push(`🔄 Récupération via ${campaign.recipients.lists.length} listes EPCI Brevo...`);
            
            for (let listId of campaign.recipients.lists) {
                try {
                    debugLogs.push(`  📋 Liste EPCI Brevo ${listId}...`);
                    
                    // ✅ D'abord, essayer de récupérer les infos de la liste
                    let listInfo;
                    try {
                        listInfo = await contactsApi.getList(listId);
                        debugLogs.push(`  📋 Info liste: "${listInfo.name}" - ${listInfo.totalSubscribers || 0} contacts`);
                    } catch (listInfoError) {
                        debugLogs.push(`  ⚠️ Impossible d'accéder aux infos de la liste ${listId}: ${listInfoError.message}`);
                        continue; // Passer à la liste suivante
                    }
                    
                    let listOffset = 0;
                    const listLimit = 500; // Réduire la limite pour éviter les timeouts
                    let hasMore = true;
                    let listEmails = [];
                    
                    while (hasMore && listOffset < 5000) { // Limiter à 5000 contacts max par liste
                        try {
                            const contacts = await contactsApi.getContactsFromList(listId, {
                                limit: listLimit,
                                offset: listOffset,
                                sort: 'desc'
                            });
                            
                            if (contacts.contacts && contacts.contacts.length > 0) {
                                const emails = contacts.contacts
                                    .map(c => ({
                                        email: c.email,
                                        opened: false,
                                        openCount: 0,
                                        clicked: false,
                                        firstOpen: null,
                                        lastOpen: null,
                                        type: 'epci',
                                        brevo_contact_id: c.id,
                                        brevo_list_id: listId,
                                        contact_created: c.createdAt,
                                        contact_modified: c.modifiedAt
                                    }))
                                    .filter(item => item.email && 
                                           item.email.includes('@') && 
                                           !item.email.includes('example.com') &&
                                           !item.email.includes('test@') &&
                                           !item.email.includes('noreply@'));
                                
                                listEmails = listEmails.concat(emails);
                                debugLogs.push(`    📧 +${emails.length} vrais emails Brevo (offset: ${listOffset}, total liste: ${listEmails.length})`);
                                
                                hasMore = contacts.contacts.length === listLimit;
                                listOffset += listLimit;
                            } else {
                                debugLogs.push(`    📭 Aucun contact à l'offset ${listOffset}`);
                                hasMore = false;
                            }
                            
                            // Pause pour éviter rate limiting
                            if (hasMore) {
                                await new Promise(resolve => setTimeout(resolve, 100));
                            }
                            
                        } catch (pageError) {
                            debugLogs.push(`    ❌ Erreur page offset ${listOffset}: ${pageError.message}`);
                            
                            // Si c'est une erreur de permission ou Bad Request, arrêter cette liste
                            if (pageError.message.includes('Bad Request') || 
                                pageError.message.includes('Forbidden') || 
                                pageError.message.includes('Unauthorized')) {
                                debugLogs.push(`    🛑 Accès refusé à la liste ${listId} - passage à la suivante`);
                                break;
                            }
                            
                            hasMore = false;
                        }
                    }
                    
                    allEmails = allEmails.concat(listEmails);
                    debugLogs.push(`  ✅ Liste ${listId} terminée: ${listEmails.length} vrais emails Brevo`);
                    
                } catch (listError) {
                    debugLogs.push(`❌ Erreur générale liste ${listId}: ${listError.message}`);
                    // Ne pas faire d'erreur fatale, continuer avec les autres listes
                    continue;
                }
            }
        }

        // ✅ MÉTHODE 2: Si pas d'emails via les listes, essayer d'autres approches
        if (allEmails.length === 0) {
            debugLogs.push(`🔄 Aucun email trouvé via les listes, tentative d'autres méthodes...`);
            
            // Essayer de récupérer les statistiques de la campagne pour voir s'il y a des destinataires
            try {
                // ✅ CORRECTION: Utiliser getEmailCampaign au lieu de getEmailCampaignStats
                const campaignDetails = await campaignsApi.getEmailCampaign(campaignId);
                
                if (campaignDetails.statistics) {
                    debugLogs.push(`📊 Stats campagne: envoyés=${campaignDetails.statistics.delivered || 0}, ouverts=${campaignDetails.statistics.uniqueOpened || 0}, clics=${campaignDetails.statistics.uniqueClicked || 0}`);
                    
                    if (campaignDetails.statistics.delivered && campaignDetails.statistics.delivered > 0) {
                        debugLogs.push(`📧 ${campaignDetails.statistics.delivered} emails délivrés selon Brevo - mais impossible d'accéder aux destinataires`);
                        debugLogs.push(`💡 Suggestion: Vérifiez les permissions de votre API key Brevo pour accéder aux listes/contacts`);
                    }
                } else {
                    debugLogs.push(`📊 Pas de statistiques disponibles pour cette campagne`);
                }
            } catch (statsError) {
                debugLogs.push(`❌ Impossible de récupérer les détails de campagne: ${statsError.message}`);
            }
            
            // Essayer les segments si ils existent
            if (campaign.recipients?.segments?.length > 0) {
                debugLogs.push(`🔄 Tentative via ${campaign.recipients.segments.length} segments Brevo...`);
                
                for (let segmentId of campaign.recipients.segments) {
                    try {
                        const segmentContacts = await contactsApi.getContactsFromList(segmentId, {
                            limit: 500,
                            offset: 0
                        });
                        
                        if (segmentContacts.contacts) {
                            const segmentEmails = segmentContacts.contacts
                                .map(c => ({
                                    email: c.email,
                                    opened: false,
                                    openCount: 0,
                                    clicked: false,
                                    firstOpen: null,
                                    lastOpen: null,
                                    type: 'epci',
                                    brevo_contact_id: c.id,
                                    brevo_segment_id: segmentId
                                }))
                                .filter(item => item.email && 
                                       item.email.includes('@') && 
                                       !item.email.includes('example.com') &&
                                       !item.email.includes('test@') &&
                                       !item.email.includes('noreply@'));
                            
                            allEmails = allEmails.concat(segmentEmails);
                            debugLogs.push(`  ✅ Segment ${segmentId}: ${segmentEmails.length} vrais emails`);
                        }
                    } catch (segmentError) {
                        debugLogs.push(`❌ Erreur segment ${segmentId}: ${segmentError.message}`);
                    }
                }
            }
            
            // Si toujours rien, essayer de récupérer tous les contacts récents
            if (allEmails.length === 0) {
                debugLogs.push(`🔄 Dernière tentative: récupération de contacts récents...`);
                
                try {
                    const recentContacts = await contactsApi.getContacts({
                        limit: 50,
                        offset: 0,
                        sort: 'desc',
                        modifiedSince: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 derniers jours
                    });
                    
                    if (recentContacts.contacts && recentContacts.contacts.length > 0) {
                        const recentEmails = recentContacts.contacts
                            .map(c => ({
                                email: c.email,
                                opened: false,
                                openCount: 0,
                                clicked: false,
                                firstOpen: null,
                                lastOpen: null,
                                type: 'epci',
                                brevo_contact_id: c.id,
                                from_recent_contacts: true
                            }))
                            .filter(item => item.email && 
                                   item.email.includes('@') && 
                                   !item.email.includes('example.com') &&
                                   !item.email.includes('test@') &&
                                   !item.email.includes('noreply@'));
                        
                        allEmails = allEmails.concat(recentEmails.slice(0, 20)); // Limiter à 20
                        debugLogs.push(`  📧 ${recentEmails.length} contacts récents trouvés (limité à 20)`);
                    }
                } catch (recentError) {
                    debugLogs.push(`❌ Erreur contacts récents: ${recentError.message}`);
                }
            }
        }

        // ❌ SUPPRIMÉ: Fallback avec stats de campagne générant des emails fictifs

        // ✅ Si aucun email trouvé, donner des informations utiles plutôt qu'une erreur
        if (allEmails.length === 0) {
            debugLogs.push(`⚠️ Aucun destinataire accessible dans la campagne ${campaignId}`);
            debugLogs.push(`💡 Causes possibles:`);
            debugLogs.push(`   - API key Brevo n'a pas les permissions pour accéder aux listes de contacts`);
            debugLogs.push(`   - Les listes de la campagne ont été supprimées ou sont inaccessibles`);
            debugLogs.push(`   - La campagne n'a pas de destinataires configurés`);
            debugLogs.push(`   - Problème temporaire avec l'API Brevo`);
            
            return []; // Retourner un tableau vide au lieu d'une erreur
        }

        // ✅ MÉTHODE 3: Récupérer les vraies stats d'ouverture Brevo pour les emails récupérés
        debugLogs.push(`📊 Récupération stats d'ouverture Brevo pour ${allEmails.length} emails EPCI...`);
        
        // Limiter à 100 emails maximum pour éviter les timeouts
        const emailsToProcess = allEmails.slice(0, 100);
        const batchSize = 10;
        let processed = 0;
        
        for (let i = 0; i < emailsToProcess.length; i += batchSize) {
            const batch = emailsToProcess.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (emailData) => {
                try {
                    // ✅ Récupérer les vraies stats depuis Brevo
                    const contactInfo = await contactsApi.getContactInfo(emailData.email);
                    
                    if (contactInfo.statistics?.opened) {
                        const targetOpening = contactInfo.statistics.opened.find(
                            openEvent => openEvent.campaignId?.toString() === campaignId.toString()
                        );
                        
                        if (targetOpening) {
                            emailData.opened = true;
                            emailData.openCount = targetOpening.count || 1;
                            emailData.firstOpen = targetOpening.eventTime;
                            emailData.lastOpen = targetOpening.eventTime;
                            emailData.brevo_stats = true;
                        }
                    }
                    
                    // Vérifier les clics depuis Brevo
                    if (contactInfo.statistics?.clicked) {
                        const targetClick = contactInfo.statistics.clicked.find(
                            clickEvent => clickEvent.campaignId?.toString() === campaignId.toString()
                        );
                        
                        if (targetClick) {
                            emailData.clicked = true;
                            emailData.brevo_clicks = true;
                        }
                    }
                    
                } catch (statsError) {
                    // Ignorer seulement les erreurs 404 (contact non trouvé)
                    if (!statsError.message.includes('404')) {
                        debugLogs.push(`  ⚠️ Stats Brevo non disponibles pour ${emailData.email}: ${statsError.message}`);
                    }
                }
            }));
            
            processed += batch.length;
            if (processed % 20 === 0) {
                debugLogs.push(`  📊 ${processed}/${emailsToProcess.length} emails EPCI Brevo traités...`);
            }
            
            // Pause entre les batches
            if (i + batchSize < emailsToProcess.length) {
                await new Promise(resolve => setTimeout(resolve, 150));
            }
        }
        
        // Mettre à jour le tableau complet avec les stats
        for (let i = 0; i < Math.min(emailsToProcess.length, allEmails.length); i++) {
            if (i < emailsToProcess.length) {
                allEmails[i] = emailsToProcess[i];
            }
        }

        // Dédoublonnage final
        const uniqueEmails = allEmails.filter((email, index, arr) => 
            arr.findIndex(e => e.email === email.email) === index
        );
        
        debugLogs.push(`✅ RÉSULTAT FINAL BREVO: ${uniqueEmails.length} emails EPCI uniques`);
        
        return uniqueEmails;

    } catch (error) {
        debugLogs.push(`❌ Erreur générale Brevo: ${error.message}`);
        // ❌ SUPPRIMÉ: Retour d'emails de fallback
        throw error;
    }
}

// ✅ FONCTION: Récupérer données EPCI depuis BDD + Brevo (au clic)
async function getEPCIDataFromDB(email, campaignId = null) {
    try {
        let result = {
            email: email,
            type: 'epci',
            generated_at: new Date().toISOString()
        };

        // ✅ PARTIE 1: Données depuis la BDD
        if (!db.sequelize) {
            result.database = {
                nom_epci: 'BDD non disponible',
                nom_structure: 'N/A',
                code: 'N/A',
                telephone: 'N/A',
                data_source: 'database_unavailable'
            };
        } else {
            try {
                const dbResult = await db.sequelize.query(`
                    SELECT 
                        ec.id, ec.nom_epci as nom_structure, ec.email, ec.telephone, 
                        ec.horaires, ec.notes, ec.code,
                        e.nom as nom_epci_officiel, e.mail1, e.mail2, e.telephone1, e.telephone2,
                        e.responsable_nom1, e.responsable_nom2, e.rib
                    FROM epci_contacts ec
                    LEFT JOIN epcis e ON ec.code = e.code
                    WHERE ec.email = :email
                    LIMIT 1
                `, {
                    replacements: { email: email },
                    type: db.sequelize.QueryTypes.SELECT
                });
                
                if (dbResult && dbResult.length > 0) {
                    const epci = dbResult[0];
                    result.database = {
                        id: epci.id,
                        nom_epci: epci.nom_epci_officiel || epci.nom_structure,
                        nom_structure: epci.nom_structure,
                        code: epci.code,
                        telephone: epci.telephone,
                        horaires: epci.horaires,
                        notes: epci.notes,
                        mail1: epci.mail1,
                        mail2: epci.mail2,
                        telephone1: epci.telephone1,
                        telephone2: epci.telephone2,
                        responsable_nom1: epci.responsable_nom1,
                        responsable_nom2: epci.responsable_nom2,
                        rib: epci.rib,
                        linked: !!epci.nom_epci_officiel,
                        data_source: 'database_found'
                    };
                } else {
                    result.database = {
                        nom_epci: 'EPCI non référencé',
                        nom_structure: 'Non trouvé en base',
                        code: null,
                        telephone: 'Non disponible',
                        data_source: 'database_not_found'
                    };
                }
                
            } catch (tableError) {
                result.database = {
                    nom_epci: 'Table EPCI non disponible',
                    nom_structure: 'Accès BDD limité',
                    data_source: 'table_error',
                    error: tableError.message
                };
            }
        }

        // ✅ PARTIE 2: Données depuis Brevo (si campaignId fourni)
        if (campaignId && contactsApi) {
            try {
                console.log(`📊 Récupération détails Brevo pour ${email} (campagne ${campaignId})`);
                
                const contactInfo = await contactsApi.getContactInfo(email);
                
                result.brevo = {
                    contact_id: contactInfo.id,
                    email: contactInfo.email,
                    created_at: contactInfo.createdAt,
                    modified_at: contactInfo.modifiedAt,
                    email_blacklisted: contactInfo.emailBlacklisted,
                    sms_blacklisted: contactInfo.smsBlacklisted,
                    attributes: contactInfo.attributes || {},
                    list_ids: contactInfo.listIds || [],
                    data_source: 'brevo_found'
                };

                // Stats spécifiques à la campagne
                if (contactInfo.statistics) {
                    result.brevo.campaign_stats = {};
                    
                    // Stats d'ouverture pour cette campagne
                    if (contactInfo.statistics.opened) {
                        const campaignOpens = contactInfo.statistics.opened.filter(
                            open => open.campaignId?.toString() === campaignId.toString()
                        );
                        
                        if (campaignOpens.length > 0) {
                            result.brevo.campaign_stats.opened = {
                                count: campaignOpens.reduce((sum, open) => sum + (open.count || 1), 0),
                                first_open: campaignOpens[0].eventTime,
                                last_open: campaignOpens[campaignOpens.length - 1].eventTime,
                                all_opens: campaignOpens
                            };
                        }
                    }
                    
                    // Stats de clics pour cette campagne
                    if (contactInfo.statistics.clicked) {
                        const campaignClicks = contactInfo.statistics.clicked.filter(
                            click => click.campaignId?.toString() === campaignId.toString()
                        );
                        
                        if (campaignClicks.length > 0) {
                            result.brevo.campaign_stats.clicked = {
                                count: campaignClicks.length,
                                first_click: campaignClicks[0].eventTime,
                                last_click: campaignClicks[campaignClicks.length - 1].eventTime,
                                all_clicks: campaignClicks
                            };
                        }
                    }
                    
                    // Stats globales
                    result.brevo.global_stats = {
                        total_opened: contactInfo.statistics.opened?.length || 0,
                        total_clicked: contactInfo.statistics.clicked?.length || 0,
                        total_bounced: contactInfo.statistics.bounced?.length || 0,
                        total_delivered: contactInfo.statistics.delivered?.length || 0
                    };
                }
                
            } catch (brevoError) {
                result.brevo = {
                    error: brevoError.message,
                    data_source: 'brevo_error'
                };
                
                if (brevoError.message.includes('404')) {
                    result.brevo.data_source = 'brevo_not_found';
                    result.brevo.message = 'Contact non trouvé dans Brevo';
                }
            }
        } else {
            result.brevo = {
                message: 'Pas de campaign ID fourni ou API Brevo non disponible',
                data_source: 'brevo_not_requested'
            };
        }

        // ✅ PARTIE 3: Données combinées pour affichage
        result.display = {
            nom_epci: result.database.nom_epci || 'EPCI non identifié',
            nom_structure: result.database.nom_structure || 'Structure inconnue',
            telephone: result.database.telephone || result.database.telephone1 || 'Non disponible',
            code: result.database.code || 'N/A',
            notes: result.database.notes || '',
            
            // Stats Brevo pour affichage
            opened: result.brevo?.campaign_stats?.opened ? true : false,
            open_count: result.brevo?.campaign_stats?.opened?.count || 0,
            clicked: result.brevo?.campaign_stats?.clicked ? true : false,
            click_count: result.brevo?.campaign_stats?.clicked?.count || 0,
            
            // Statut global
            contact_status: result.brevo?.email_blacklisted ? 'Blacklisté' : 'Actif',
            data_sources: {
                database: result.database.data_source,
                brevo: result.brevo?.data_source || 'not_requested'
            }
        };
        
        return result;
        
    } catch (error) {
        return {
            email: email,
            type: 'epci',
            error: error.message,
            database: {
                nom_epci: 'Erreur de récupération',
                nom_structure: 'Erreur BDD',
                data_source: 'database_error'
            },
            brevo: {
                data_source: 'brevo_error',
                error: error.message
            },
            display: {
                nom_epci: 'Erreur de récupération',
                nom_structure: 'Erreur système',
                telephone: 'Non disponible',
                opened: false,
                open_count: 0,
                clicked: false,
                click_count: 0
            }
        };
    }
}

// ============================================
// ENDPOINT: CAMPAGNES EPCI UNIQUEMENT
// ============================================
router.get('/campaigns', async (req, res) => {
    try {
        console.log('🔍 Début récupération campagnes EPCI...');
        
        // ✅ DIAGNOSTIC INITIAL
        if (!campaignsApi) {
            console.error('❌ campaignsApi non initialisée');
            return res.status(500).json({
                success: false,
                error: 'API Brevo non disponible - campaignsApi non initialisée',
                diagnostic: {
                    brevo_api_key: process.env.BREVO_API_KEY ? 'Configurée' : 'Manquante',
                    brevo_api_key_length: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.length : 0,
                    campaigns_api_initialized: !!campaignsApi,
                    contacts_api_initialized: !!contactsApi,
                    default_client: !!defaultClient,
                    api_key_auth: !!apiKey
                }
            });
        }

        console.log('✅ campaignsApi initialisée, tentative récupération...');

        // ✅ TEST SIMPLE D'ABORD
        let campaigns;
        try {
            console.log('📡 Appel getEmailCampaigns...');
            
            // Essayer avec des paramètres minimaux d'abord
            campaigns = await campaignsApi.getEmailCampaigns({ 
                limit: 10,
                offset: 0
            });
            
            console.log(`✅ Récupération réussie: ${campaigns.campaigns?.length || 0} campagnes`);
            
        } catch (apiError) {
            console.error('❌ Erreur getEmailCampaigns:', apiError);
            
            // ✅ DIAGNOSTIC DÉTAILLÉ DE L'ERREUR
            let errorDetails = {
                message: apiError.message,
                status: apiError.status || 'unknown',
                response: apiError.response?.status || 'no_response',
                api_endpoint: 'getEmailCampaigns'
            };
            
            // ✅ ANALYSE DU TYPE D'ERREUR
            if (apiError.message.includes('Bad Request') || apiError.status === 400) {
                return res.status(400).json({
                    success: false,
                    error: 'Requête invalide vers l\'API Brevo',
                    technical_error: apiError.message,
                    diagnostic: {
                        error_type: 'bad_request_400',
                        possible_causes: [
                            'API key Brevo invalide ou malformée',
                            'Paramètres de requête incorrects',
                            'Format de requête non accepté par Brevo',
                            'Version d\'API obsolète'
                        ],
                        suggestions: [
                            'Vérifiez le format de votre API key Brevo',
                            'Vérifiez que l\'API key a les bonnes permissions',
                            'Testez votre API key sur le dashboard Brevo',
                            'Vérifiez la version du SDK @getbrevo/brevo'
                        ],
                        api_key_info: {
                            configured: !!process.env.BREVO_API_KEY,
                            length: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.length : 0,
                            starts_with: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.substring(0, 10) + '...' : 'N/A'
                        }
                    }
                });
            } else if (apiError.message.includes('Unauthorized') || apiError.status === 401) {
                return res.status(401).json({
                    success: false,
                    error: 'API key Brevo non autorisée',
                    technical_error: apiError.message,
                    diagnostic: {
                        error_type: 'unauthorized_401',
                        possible_causes: [
                            'API key Brevo expirée',
                            'API key Brevo révoquée',
                            'API key incorrecte',
                            'Variable d\'environnement BREVO_API_KEY mal configurée'
                        ],
                        suggestions: [
                            'Générez une nouvelle API key sur votre dashboard Brevo',
                            'Vérifiez la variable d\'environnement BREVO_API_KEY',
                            'Vérifiez que l\'API key n\'est pas expirée'
                        ]
                    }
                });
            } else if (apiError.message.includes('Forbidden') || apiError.status === 403) {
                return res.status(403).json({
                    success: false,
                    error: 'Accès refusé par l\'API Brevo',
                    technical_error: apiError.message,
                    diagnostic: {
                        error_type: 'forbidden_403',
                        possible_causes: [
                            'API key sans permissions pour lire les campagnes',
                            'Compte Brevo suspendu ou limité',
                            'Plan Brevo ne permettant pas l\'accès API',
                            'Restrictions géographiques'
                        ],
                        suggestions: [
                            'Vérifiez les permissions de votre API key sur Brevo',
                            'Vérifiez le statut de votre compte Brevo',
                            'Contactez le support Brevo'
                        ]
                    }
                });
            } else {
                return res.status(500).json({
                    success: false,
                    error: `Erreur technique API Brevo: ${apiError.message}`,
                    diagnostic: {
                        error_type: 'technical_error',
                        details: errorDetails,
                        suggestions: [
                            'Vérifiez votre connexion internet',
                            'Vérifiez le statut de l\'API Brevo',
                            'Réessayez dans quelques minutes'
                        ]
                    }
                });
            }
        }

        // ✅ FILTRER SEULEMENT LES CAMPAGNES CONTENANT "EPCI"
        if (!campaigns.campaigns || campaigns.campaigns.length === 0) {
            console.log('⚠️ Aucune campagne trouvée');
            return res.json({
                success: true,
                campaigns: [],
                stats: {
                    total: 0,
                    epci: 0,
                    total_brevo_campaigns: 0,
                    filter_applied: 'name_or_subject_contains_epci'
                },
                debug: {
                    message: 'Aucune campagne trouvée sur Brevo'
                }
            });
        }

        console.log(`📋 Filtrage EPCI parmi ${campaigns.campaigns.length} campagnes...`);
        
        const epciCampaigns = campaigns.campaigns
            .filter(campaign => {
                // Vérifier si "epci" est présent dans le nom (insensible à la casse)
                const nameContainsEpci = campaign.name && 
                    campaign.name.toLowerCase().includes('epci');
                
                // Optionnel : vérifier aussi dans le subject
                const subjectContainsEpci = campaign.subject && 
                    campaign.subject.toLowerCase().includes('epci');
                
                return nameContainsEpci || subjectContainsEpci;
            })
            .map(campaign => ({
                id: campaign.id,
                name: campaign.name,
                subject: campaign.subject,
                status: campaign.status,
                sentDate: campaign.sentDate,
                statistics: campaign.statistics,
                type: 'epci'
            }));
        
        console.log(`✅ Filtrage EPCI: ${epciCampaigns.length} campagnes EPCI trouvées sur ${campaigns.campaigns.length} total`);
        console.log('📋 Campagnes EPCI filtrées:', epciCampaigns.map(c => c.name));
        
        res.json({
            success: true,
            campaigns: epciCampaigns,
            stats: {
                total: epciCampaigns.length,
                epci: epciCampaigns.length,
                total_brevo_campaigns: campaigns.campaigns.length,
                filter_applied: 'name_or_subject_contains_epci'
            },
            debug: {
                total_campaigns_brevo: campaigns.campaigns.length,
                epci_campaigns_found: epciCampaigns.length,
                filter_criteria: 'nom ou sujet contient "epci" (insensible à la casse)',
                epci_campaign_names: epciCampaigns.map(c => c.name),
                all_campaign_names: campaigns.campaigns.map(c => ({ id: c.id, name: c.name }))
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur générale récupération campagnes EPCI:', error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            diagnostic: {
                error_type: 'general_error',
                stack: error.stack,
                brevo_config: {
                    api_key_configured: !!process.env.BREVO_API_KEY,
                    campaigns_api: !!campaignsApi,
                    contacts_api: !!contactsApi
                }
            }
        });
    }
});

// ============================================
// ENDPOINT: STATS EPCI - VRAIES DONNÉES BREVO UNIQUEMENT
// ============================================
router.get('/campaign/:campaignId/stats', async (req, res) => {
    try {
        const campaignId = req.params.campaignId;
        const searchQuery = req.query.search || '';
        
        let debugLogs = [];
        debugLogs.push(`🏢 CHARGEMENT VRAIES DONNÉES BREVO - EPCI CAMPAGNE ${campaignId}`);

        // ✅ DIAGNOSTIC INITIAL
        if (!campaignsApi || !contactsApi) {
            return res.status(500).json({
                success: false,
                error: 'APIs Brevo non initialisées - vérifiez la configuration',
                debug_logs: [...debugLogs, '❌ APIs Brevo non disponibles'],
                diagnostic: {
                    brevo_api_key: process.env.BREVO_API_KEY ? 'Configurée' : 'Manquante',
                    campaigns_api: !!campaignsApi,
                    contacts_api: !!contactsApi
                }
            });
        }

        // ✅ VÉRIFICATION DE LA CAMPAGNE
        let campaignExists = false;
        try {
            debugLogs.push(`🔍 Vérification de l'existence de la campagne ${campaignId}...`);
            const campaignDetails = await campaignsApi.getEmailCampaign(campaignId);
            campaignExists = true;
            debugLogs.push(`✅ Campagne trouvée: "${campaignDetails.name}" (statut: ${campaignDetails.status})`);
            
            // Vérifier si c'est bien une campagne EPCI
            const isEpciCampaign = (campaignDetails.name && campaignDetails.name.toLowerCase().includes('epci')) ||
                                  (campaignDetails.subject && campaignDetails.subject.toLowerCase().includes('epci'));
            
            if (!isEpciCampaign) {
                debugLogs.push(`⚠️ ATTENTION: Cette campagne ne semble pas être une campagne EPCI`);
                debugLogs.push(`   Nom: "${campaignDetails.name}"`);
                debugLogs.push(`   Sujet: "${campaignDetails.subject}"`);
            }
            
        } catch (campaignError) {
            debugLogs.push(`❌ Erreur accès campagne ${campaignId}: ${campaignError.message}`);
            
            if (campaignError.message.includes('Bad Request')) {
                return res.status(400).json({
                    success: false,
                    error: `Campagne ${campaignId} introuvable ou accès refusé`,
                    debug_logs: debugLogs,
                    diagnostic: {
                        campaign_id: campaignId,
                        error_type: 'campaign_access_denied',
                        possible_causes: [
                            'ID de campagne incorrect',
                            'Campagne supprimée',
                            'API key sans permissions pour cette campagne',
                            'Campagne appartient à un autre compte Brevo'
                        ],
                        suggestions: [
                            'Vérifiez que l\'ID de campagne est correct',
                            'Vérifiez les permissions de votre API key',
                            'Testez avec une autre campagne'
                        ]
                    }
                });
            }
            
            return res.status(500).json({
                success: false,
                error: `Erreur technique: ${campaignError.message}`,
                debug_logs: debugLogs
            });
        }

        // ✅ RÉCUPÉRATION DE TOUS LES VRAIS EPCI DEPUIS BREVO
        let allEmails;
        try {
            allEmails = await getAllEPCIEmailsFromBrevo(campaignId, debugLogs);
        } catch (brevoError) {
            debugLogs.push(`❌ Erreur récupération contacts: ${brevoError.message}`);
            
            return res.status(500).json({
                success: false,
                error: `Impossible de récupérer les données Brevo: ${brevoError.message}`,
                emails: [],
                statistics: { total: 0, opened: 0, notOpened: 0, clicked: 0, openRate: 0, clickRate: 0 },
                debug_logs: debugLogs,
                campaign_type: 'epci',
                diagnostic: {
                    campaign_exists: campaignExists,
                    error_stage: 'contact_retrieval',
                    error_details: brevoError.message
                }
            });
        }
        
        if (allEmails.length === 0) {
            return res.json({
                success: true,
                emails: [],
                statistics: { total: 0, opened: 0, notOpened: 0, clicked: 0, openRate: 0, clickRate: 0 },
                debug_logs: [...debugLogs, '⚠️ Aucun EPCI accessible dans cette campagne - voir logs pour diagnostic'],
                campaign_type: 'epci',
                diagnostic: {
                    campaign_id: campaignId,
                    campaign_exists: campaignExists,
                    possible_issues: [
                        'API key Brevo sans permissions suffisantes',
                        'Listes de contacts inaccessibles ou supprimées', 
                        'Campagne sans destinataires configurés',
                        'Problème temporaire API Brevo'
                    ],
                    suggestions: [
                        'Vérifiez les permissions de votre API key Brevo',
                        'Testez avec une autre campagne',
                        'Contactez le support Brevo si le problème persiste'
                    ]
                }
            });
        }

        // ✅ FILTRAGE PAR RECHERCHE
        let filteredEmails = allEmails;
        if (searchQuery && searchQuery.trim()) {
            const search = searchQuery.toLowerCase().trim();
            filteredEmails = allEmails.filter(email =>
                email.email?.toLowerCase().includes(search)
            );
            debugLogs.push(`🔍 Recherche "${searchQuery}": ${filteredEmails.length}/${allEmails.length} EPCI Brevo`);
        }

        // ✅ PRÉPARATION DES DONNÉES EPCI AVEC VRAIES DONNÉES BREVO
        const epciWithBrevoData = filteredEmails.map(emailData => ({
            ...emailData,
            nom_epci: 'Cliquez sur Détails →',
            nom_structure: 'Données en BDD →',
            code: null,
            telephone: 'Voir détails →',
            notes: null,
            data_source: 'brevo_real_data',
            need_database_lookup: true,
            type: 'epci'
        }));

        // ✅ RÉCUPÉRATION DES VRAIES STATISTIQUES DEPUIS BREVO
        let realBrevoStats = null;
        try {
            // ✅ MÉTHODE 1: Essayer via getEmailCampaign
            const campaignDetails = await campaignsApi.getEmailCampaign(campaignId);
            
            if (campaignDetails.statistics) {
                realBrevoStats = {
                    delivered: campaignDetails.statistics.delivered || 0,
                    uniqueOpened: campaignDetails.statistics.uniqueOpened || 0,
                    opened: campaignDetails.statistics.opened || 0,
                    uniqueClicked: campaignDetails.statistics.uniqueClicked || 0,
                    clicked: campaignDetails.statistics.clicked || 0,
                    unsubscribed: campaignDetails.statistics.unsubscribed || 0,
                    complaints: campaignDetails.statistics.complaints || 0,
                    hardBounces: campaignDetails.statistics.hardBounces || 0,
                    softBounces: campaignDetails.statistics.softBounces || 0
                };
                debugLogs.push(`📊 Stats Brevo officielles: ${realBrevoStats.uniqueOpened}/${realBrevoStats.delivered} ouverts (${Math.round((realBrevoStats.uniqueOpened / realBrevoStats.delivered) * 100 * 10) / 10}%)`);
            } else {
                debugLogs.push(`⚠️ Pas de statistiques disponibles dans les détails de campagne`);
                
                // ✅ MÉTHODE 2: Fallback - essayer de récupérer via la liste des campagnes
                try {
                    const campaigns = await campaignsApi.getEmailCampaigns({ 
                        limit: 50, 
                        offset: 0,
                        sort: 'desc'
                    });
                    
                    const targetCampaign = campaigns.campaigns.find(c => c.id.toString() === campaignId.toString());
                    
                    if (targetCampaign && targetCampaign.statistics) {
                        realBrevoStats = {
                            delivered: targetCampaign.statistics.delivered || 0,
                            uniqueOpened: targetCampaign.statistics.uniqueOpened || 0,
                            opened: targetCampaign.statistics.opened || 0,
                            uniqueClicked: targetCampaign.statistics.uniqueClicked || 0,
                            clicked: targetCampaign.statistics.clicked || 0,
                            unsubscribed: targetCampaign.statistics.unsubscribed || 0,
                            complaints: targetCampaign.statistics.complaints || 0,
                            hardBounces: targetCampaign.statistics.hardBounces || 0,
                            softBounces: targetCampaign.statistics.softBounces || 0
                        };
                        debugLogs.push(`📊 Stats Brevo (fallback): ${realBrevoStats.uniqueOpened}/${realBrevoStats.delivered} ouverts`);
                    } else {
                        debugLogs.push(`⚠️ Campagne ${campaignId} non trouvée dans la liste ou sans stats`);
                    }
                } catch (fallbackError) {
                    debugLogs.push(`⚠️ Erreur fallback liste campagnes: ${fallbackError.message}`);
                }
            }
        } catch (statsError) {
            debugLogs.push(`⚠️ Impossible de récupérer les stats Brevo: ${statsError.message}`);
        }

        // ✅ CALCUL DES STATISTIQUES COMBINÉES
        const statistics = {
            // Stats depuis les contacts individuels (notre récupération)
            total_contacts_retrieved: epciWithBrevoData.length,
            individual_opened: epciWithBrevoData.filter(e => e.opened).length,
            individual_not_opened: epciWithBrevoData.filter(e => !e.opened).length,
            individual_clicked: epciWithBrevoData.filter(e => e.clicked).length,
            
            // Stats officielles Brevo (plus fiables)
            brevo_delivered: realBrevoStats?.delivered || 0,
            brevo_unique_opened: realBrevoStats?.uniqueOpened || 0,
            brevo_total_opened: realBrevoStats?.opened || 0,
            brevo_unique_clicked: realBrevoStats?.uniqueClicked || 0,
            brevo_total_clicked: realBrevoStats?.clicked || 0,
            brevo_unsubscribed: realBrevoStats?.unsubscribed || 0,
            
            // Stats pour affichage (priorise Brevo si disponible)
            total: realBrevoStats?.delivered || epciWithBrevoData.length,
            opened: realBrevoStats?.uniqueOpened || epciWithBrevoData.filter(e => e.opened).length,
            notOpened: (realBrevoStats?.delivered || epciWithBrevoData.length) - (realBrevoStats?.uniqueOpened || epciWithBrevoData.filter(e => e.opened).length),
            clicked: realBrevoStats?.uniqueClicked || epciWithBrevoData.filter(e => e.clicked).length,
            openRate: 0,
            clickRate: 0,
            
            // Indicateur de source
            stats_source: realBrevoStats ? 'brevo_official' : 'individual_contacts'
        };
        
        if (statistics.total > 0) {
            statistics.openRate = Math.round((statistics.opened / statistics.total) * 100 * 10) / 10;
            statistics.clickRate = Math.round((statistics.clicked / statistics.total) * 100 * 10) / 10;
        }

        debugLogs.push(`✅ STATS COMPARAISON:`);
        debugLogs.push(`   📊 Brevo officiel: ${statistics.opened}/${statistics.total} ouverts (${statistics.openRate}%)`);
        debugLogs.push(`   👥 Contacts récupérés: ${statistics.individual_opened}/${statistics.total_contacts_retrieved} ouverts`);
        debugLogs.push(`   🔍 Source utilisée: ${statistics.stats_source}`);
        
        res.json({
            success: true,
            emails: epciWithBrevoData,
            statistics: statistics,
            debug_logs: debugLogs,
            campaign_type: 'epci',
            brevo_comparison: {
                dashboard_stats: realBrevoStats,
                individual_contact_stats: {
                    total: statistics.total_contacts_retrieved,
                    opened: statistics.individual_opened,
                    clicked: statistics.individual_clicked
                },
                explanation: realBrevoStats ? 
                    `Les stats dashboard Brevo (${realBrevoStats.uniqueOpened} ouverts) incluent Apple Mail Privacy Protection. Les stats individuelles (${statistics.individual_opened} ouverts) ne comptent que les vraies ouvertures détectées.` :
                    'Stats Brevo non disponibles - utilisation des données contacts individuels'
            },
            performance: {
                mode: 'brevo_real_data_with_official_stats',
                database_queries: 0,
                total_emails: epciWithBrevoData.length,
                note: 'Stats officielles Brevo + contacts individuels'
            }
        });
        
    } catch (error) {
        console.error('Erreur endpoint EPCI:', error);
        
        // ✅ DIAGNOSTIC DÉTAILLÉ DES ERREURS
        let errorDiagnostic = {
            error_type: 'unknown',
            stage: 'general',
            technical_details: error.message
        };
        
        if (error.message.includes('Bad Request')) {
            errorDiagnostic.error_type = 'bad_request';
            errorDiagnostic.possible_causes = [
                'API key Brevo invalide ou expirée',
                'Campaign ID incorrect',
                'Permissions insuffisantes',
                'Campagne supprimée ou inaccessible'
            ];
        } else if (error.message.includes('Unauthorized')) {
            errorDiagnostic.error_type = 'unauthorized';
            errorDiagnostic.possible_causes = [
                'API key Brevo manquante ou invalide',
                'Permissions insuffisantes'
            ];
        } else if (error.message.includes('Forbidden')) {
            errorDiagnostic.error_type = 'forbidden';
            errorDiagnostic.possible_causes = [
                'API key sans permissions pour cette ressource',
                'Compte Brevo suspendu'
            ];
        }
        
        res.status(500).json({
            success: false,
            error: error.message,
            emails: [],
            statistics: { total: 0, opened: 0, notOpened: 0, clicked: 0, openRate: 0, clickRate: 0 },
            debug_logs: [`❌ Erreur: ${error.message}`],
            diagnostic: errorDiagnostic
        });
    }
});

// ============================================
// ENDPOINT: DÉTAILS EPCI COMPLETS (BDD + Brevo au clic)
// ============================================
router.get('/epci/email-details', async (req, res) => {
    try {
        const email = req.query.email;
        const campaignId = req.query.campaignId; // Nouveau paramètre
        
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email EPCI requis'
            });
        }
        
        console.log(`📋 Récupération détails COMPLETS EPCI pour: ${email} ${campaignId ? `(campagne ${campaignId})` : ''}`);
        
        const epciData = await getEPCIDataFromDB(email, campaignId);
        
        res.json({
            success: true,
            ...epciData,
            performance: {
                mode: 'epci_complete_lookup',
                database_queries: 1,
                brevo_queries: campaignId ? 1 : 0,
                includes_brevo_stats: !!campaignId
            }
        });
        
    } catch (error) {
        console.error('Erreur détails EPCI:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            email: req.query.email,
            type: 'epci'
        });
    }
});

// ============================================
// ENDPOINT: SAUVEGARDE NOTES EPCI
// ============================================
router.post('/epci/email-notes', async (req, res) => {
    try {
        const { email, notes } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email EPCI requis'
            });
        }

        try {
            await db.sequelize.query(`SELECT 1 FROM epci_contacts LIMIT 1`);
            
            const result = await db.sequelize.query(`
                UPDATE epci_contacts 
                SET notes = :notes
                WHERE email = :email
            `, {
                replacements: { email, notes: notes || null },
                type: db.sequelize.QueryTypes.UPDATE
            });

            if (result[1] > 0) {
                res.json({
                    success: true,
                    message: 'Notes EPCI sauvegardées',
                    email,
                    notes,
                    updated: true
                });
            } else {
                try {
                    await db.sequelize.query(`
                        INSERT INTO epci_contacts (email, notes, nom_epci) 
                        VALUES (:email, :notes, :nom_epci)
                    `, {
                        replacements: { 
                            email, 
                            notes: notes || null, 
                            nom_epci: `EPCI ${email.split('@')[0]}` 
                        },
                        type: db.sequelize.QueryTypes.INSERT
                    });

                    res.json({
                        success: true,
                        message: 'Nouveau contact EPCI créé avec notes',
                        email,
                        notes,
                        created: true
                    });
                } catch (insertError) {
                    res.status(404).json({
                        success: false,
                        error: 'Email EPCI non trouvé et impossible de créer',
                        details: insertError.message
                    });
                }
            }
            
        } catch (tableError) {
            res.json({
                success: true,
                message: 'Notes EPCI sauvegardées (mode simulation)',
                email,
                notes,
                warning: 'Table epci_contacts non disponible',
                simulated: true
            });
        }
        
    } catch (error) {
        console.error('Erreur sauvegarde notes EPCI:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;