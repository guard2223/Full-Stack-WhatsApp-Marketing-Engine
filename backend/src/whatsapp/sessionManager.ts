import { 
    makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    getBinaryNodeChild,
    getBinaryNodeChildren,
    Browsers 
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
// @ts-ignore
import qrcode from 'qrcode-terminal';
import P from 'pino';
import { addDevice, updateDeviceStatus, getDeviceBySession, deleteDevice } from '../db';

const logger = P({ level: 'silent' });
const sessions = new Map<string, any>();
const connectionStatus = new Map<string, 'open' | 'connecting' | 'close'>();
const qrs = new Map<string, string>();
const lidPhoneMaps = new Map<string, Map<string, string>>(); // sessionId -> (LID -> Phone)
const SESSIONS_DIR = path.join(__dirname, '..', '..', 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// Internal groups cache: sessionId -> current list of groups
const groupsCache = new Map<string, any[]>();
const contactsCache = new Map<string, any[]>();
const chatsCache = new Map<string, any[]>();

export const getQR = (sessionId: string) => qrs.get(sessionId) || null;
export const getSession = (sessionId: string) => sessions.get(sessionId);
export const getConnectionStatus = (sessionId: string) => connectionStatus.get(sessionId) || 'close';
export const getCachedGroups = (sessionId: string) => groupsCache.get(sessionId) || [];
export const getCachedContacts = (sessionId: string) => contactsCache.get(sessionId) || [];
export const getCachedChats = (sessionId: string) => chatsCache.get(sessionId) || [];
export const getLidMap = (sessionId: string) => lidPhoneMaps.get(sessionId);

const getLidMapPath = (sessionId: string) => path.join(SESSIONS_DIR, `${sessionId}_lids.json`);
const getContactsCachePath = (sessionId: string) => path.join(SESSIONS_DIR, `${sessionId}_contacts.json`);

const loadLidMap = (sessionId: string): Map<string, string> => {
    const filePath = getLidMapPath(sessionId);
    if (fs.existsSync(filePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            return new Map(Object.entries(data));
        } catch (e) {
            console.error(`[LID] Error loading map for ${sessionId}:`, e);
        }
    }
    return new Map();
};

const saveLidMap = (sessionId: string, map: Map<string, string>) => {
    const filePath = getLidMapPath(sessionId);
    try {
        const obj = Object.fromEntries(map);
        fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
    } catch (e) {
        console.error(`[LID] Error saving map for ${sessionId}:`, e);
    }
};

const loadContactsCache = (sessionId: string): any[] => {
    const filePath = getContactsCachePath(sessionId);
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (e) {
            console.error(`[Contacts] Error loading cache for ${sessionId}:`, e);
        }
    }
    return [];
};

const saveContactsCache = (sessionId: string, contacts: any[]) => {
    const filePath = getContactsCachePath(sessionId);
    try {
        fs.writeFileSync(filePath, JSON.stringify(contacts, null, 2));
    } catch (e) {
        console.error(`[Contacts] Error saving cache for ${sessionId}:`, e);
    }
};

export const initWhatsAppSession = async (sessionId: string, io: Server, userId: string) => {
    if (sessions.has(sessionId)) return sessions.get(sessionId);
    
    // Load persistent LID map
    if (!lidPhoneMaps.has(sessionId)) {
        lidPhoneMaps.set(sessionId, loadLidMap(sessionId));
    }
    const lidMap = lidPhoneMaps.get(sessionId)!;

    const triggerSave = () => saveLidMap(sessionId, lidMap);

    // Register device in DB if it's the first time
    if (!getDeviceBySession(sessionId)) {
        addDevice({ sessionId, name: sessionId, phone: 'Pending...', status: 'disconnected', userId });
    }

    const sessionDir = path.join(SESSIONS_DIR, sessionId);
    
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Clear existing QR if any
    qrs.delete(sessionId);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    let version: any = [2, 3000, 1015901307];
    try {
        const latest = await fetchLatestBaileysVersion();
        version = latest.version;
    } catch (e) {}

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
        },
        browser: ['Ubuntu', 'Chrome', '110.0.5481.178'],
        printQRInTerminal: true,
        logger: P({ level: 'info' }),
        syncFullHistory: true,
        markOnlineOnConnect: true,
        connectTimeoutMs: 90000,
        retryRequestDelayMs: 5000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 30000,
        generateHighQualityLinkPreview: false
    });

    sessions.set(sessionId, sock);
    if (!groupsCache.has(sessionId)) groupsCache.set(sessionId, []);
    
    // Load persistent contacts
    if (!contactsCache.has(sessionId)) {
        contactsCache.set(sessionId, loadContactsCache(sessionId));
    }

    sock.ev.on('creds.update', saveCreds);

    // Detailed debug logs
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log(`[${sessionId}] ✨ New QR Code Generated! Scan now.`);
            qrs.set(sessionId, qr);
            io.emit('qr', { sessionId, qr });
        }
        
        if(connection === 'connecting') console.log(`[${sessionId}] ⏳ Connecting to WhatsApp...`);
        if(connection === 'open') console.log(`[${sessionId}] ✅ Connected! Phone: ${sock.user?.id}`);

        if (connection) {
            connectionStatus.set(sessionId, connection);
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[${sessionId}] Connection closed (Reason: ${lastDisconnect?.error}), reconnecting: ${shouldReconnect}`);
            
            // CRITICAL: Clear the old session from the map so the retry creates a fresh one
            sessions.delete(sessionId);

            if (shouldReconnect) {
                const device = getDeviceBySession(sessionId);
                setTimeout(() => initWhatsAppSession(sessionId, io, device?.userId || userId), 5000);
            } else {
                if(fs.existsSync(sessionDir)) {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                }
                sessions.delete(sessionId);
                connectionStatus.delete(sessionId);
                lidPhoneMaps.delete(sessionId);
                deleteDevice(sessionId, userId); 
                io.emit('disconnected', { sessionId });
            }
        } else if (connection === 'open') {
            qrs.delete(sessionId);
            console.log(`\n✅ [${sessionId}] Connection opened successfully!\n`);
            
            const phone = sock.user?.id?.split(':')[0].split('@')[0] || 'Unknown';
            updateDeviceStatus(sessionId, 'connected', phone); 
            
            // Proactive Group Sync
            try {
                sock.groupFetchAllParticipating().then((groups: any) => {
                    groupsCache.set(sessionId, Object.values(groups));
                });
            } catch (e) {}
            
            io.emit('connected', { sessionId, phone });
        }
    });

    sock.ev.on('messaging-history.set', ({ chats, contacts }: any) => {
        if (chats) {
            const groups = chats.filter((c: any) => c.id.endsWith('@g.us'));
            groupsCache.set(sessionId, groups);
            
            // Collect all chats
            chatsCache.set(sessionId, chats);
            
            // FALLBACK: Extract contacts from chats if contacts array is missing or small
            if (!contacts || contacts.length < 5) {
                console.log(`[Contacts] 🔄 Fallback: Extracting contacts from ${chats.length} chats...`);
                const extracted: any[] = [];
                chats.forEach((chat: any) => {
                    if (chat.id && !chat.id.endsWith('@g.us') && chat.id !== 'status@broadcast') {
                        extracted.push({
                            id: chat.id,
                            name: chat.name || chat.verifiedName || chat.notify || 'عميل (من الشات)'
                        });
                    }
                });
                if (extracted.length > 0) {
                    const current = contactsCache.get(sessionId) || [];
                    extracted.forEach(e => {
                        if (!current.find((c: any) => c.id === e.id)) current.push(e);
                    });
                    contactsCache.set(sessionId, current);
                    saveContactsCache(sessionId, current);
                }
            }
        }
        if (contacts) {
            let changed = false;
            const currentContacts = contactsCache.get(sessionId) || [];
            contacts.forEach((c: any) => {
                const idx = currentContacts.findIndex((cx: any) => cx.id === c.id);
                if (idx !== -1) currentContacts[idx] = { ...currentContacts[idx], ...c };
                else currentContacts.push(c);

                if (c.id && c.id.includes('@lid') && c.phoneNumber) {
                    lidMap.set(c.id, c.phoneNumber);
                    changed = true;
                }
            });
            contactsCache.set(sessionId, currentContacts);
            saveContactsCache(sessionId, currentContacts);
            console.log(`[Contacts] 📂 Synced ${contacts.length} contacts from history for ${sessionId}. Total: ${currentContacts.length}`);
            if (contacts.length > 0) {
                console.log(`[Contacts-Sample] First Contact:`, JSON.stringify(contacts[0]));
            }
            if (changed) triggerSave();
        }
    });

    sock.ev.on('contacts.upsert', (contacts: any[]) => {
        let changed = false;
        const currentContacts = contactsCache.get(sessionId) || [];
        contacts.forEach(c => {
            const idx = currentContacts.findIndex((cx: any) => cx.id === c.id);
            if (idx !== -1) currentContacts[idx] = { ...currentContacts[idx], ...c };
            else currentContacts.push(c);

            if (c.id && c.id.includes('@lid') && c.phoneNumber) {
                lidMap.set(c.id, c.phoneNumber);
                changed = true;
            }
        });
        contactsCache.set(sessionId, currentContacts);
        saveContactsCache(sessionId, currentContacts);
        console.log(`[Contacts] 🆙 Upserted ${contacts.length} contacts for ${sessionId}. Total: ${currentContacts.length}`);
        if (changed) triggerSave();
    });

    sock.ev.on('groups.upsert', (newGroups: any[]) => {
        const current = groupsCache.get(sessionId) || [];
        newGroups.forEach((g: any) => {
            if (!current.find((c: any) => c.id === g.id)) current.push(g);
        });
        groupsCache.set(sessionId, current);
    });

    sock.ev.on('groups.update', (updates: any[]) => {
        const current = groupsCache.get(sessionId) || [];
        updates.forEach((u: any) => {
            const idx = current.findIndex((c: any) => c.id === u.id);
            if (idx !== -1) current[idx] = { ...current[idx], ...u };
        });
        groupsCache.set(sessionId, current);
    });

    sock.ev.on('chats.upsert', (chats: any[]) => {
        const groups = chats.filter((c: any) => c.id.endsWith('@g.us'));
        if (groups.length > 0) {
            const current = groupsCache.get(sessionId) || [];
            groups.forEach((g: any) => {
                if (!current.find((c: any) => c.id === g.id)) current.push(g);
            });
            groupsCache.set(sessionId, current);
        }

        const currentChats = chatsCache.get(sessionId) || [];
        chats.forEach((c: any) => {
            const idx = currentChats.findIndex((cx: any) => cx.id === c.id);
            if (idx !== -1) currentChats[idx] = { ...currentChats[idx], ...c };
            else currentChats.push(c);
        });
        chatsCache.set(sessionId, currentChats);
    });

    sock.ev.on('messages.upsert', async (m: any) => {
        try {
            const msg = m.messages[0];
            if (!msg || !msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') return;

            // Only respond to direct messages for now (no groups)
            if (msg.key.remoteJid?.endsWith('@g.us')) return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            if (!text) return;

            const { getChatbotRules } = require('../db');
            const rules = getChatbotRules(userId).filter((r: any) => r.isActive && (r.deviceId === 'all' || r.deviceId === sessionId));
            
            for (const rule of rules) {
                // 1. Group Support Check
                const isGroup = msg.key.remoteJid?.endsWith('@g.us');
                if (isGroup && !rule.isGroupEnabled) continue;

                // 2. Working Hours Check
                if (rule.startTime && rule.endTime) {
                    const now = new Date();
                    const currentTime = now.getHours() * 60 + now.getMinutes();
                    const [startH, startM] = rule.startTime.split(':').map(Number);
                    const [endH, endM] = rule.endTime.split(':').map(Number);
                    const startTotal = startH * 60 + startM;
                    const endTotal = endH * 60 + endM;

                    if (currentTime < startTotal || currentTime > endTotal) {
                        console.log(`[🤖 Chatbot] Outside working hours (${rule.startTime}-${rule.endTime}). Skipping.`);
                        continue;
                    }
                }

                // 3. Keyword Match Logic
                const keywords = rule.keyword.split(/[,\n]/).map((k: string) => k.trim()).filter((k: string) => k !== '');
                const isMatch = keywords.some((k: string) => {
                    return rule.matchType === 'exact' 
                        ? text.trim().toLowerCase() === k.toLowerCase() 
                        : text.toLowerCase().includes(k.toLowerCase());
                });
                
                if (isMatch) {
                    // 4. Personalization ({name})
                    const senderName = msg.pushName || 'عميلنا العزيز';
                    const replies = rule.replyMessage.split('|').map((r: string) => r.trim()).filter((r: string) => r !== '');
                    let randomReply = replies[Math.floor(Math.random() * replies.length)];
                    randomReply = randomReply.replace(/{name}/g, senderName);

                    // 5. Human-like Delay
                    const delayMs = (rule.delay || 0) * 1000;
                    if (delayMs > 0) console.log(`[🤖 Chatbot] Waiting ${rule.delay}s before replying...`);

                    setTimeout(async () => {
                        try {
                            console.log(`[🤖 Chatbot] Triggered. Match: "${text}". Reply: "${randomReply}"`);
                            
                            // 6. Media Support
                            if (rule.mediaUrl) {
                                const isImage = /\.(jpg|jpeg|png|webp)$/i.test(rule.mediaUrl);
                                const isVideo = /\.(mp4|avi|mov)$/i.test(rule.mediaUrl);
                                
                                if (isImage) {
                                    await sock.sendMessage(msg.key.remoteJid!, { image: { url: rule.mediaUrl }, caption: randomReply });
                                } else if (isVideo) {
                                    await sock.sendMessage(msg.key.remoteJid!, { video: { url: rule.mediaUrl }, caption: randomReply });
                                } else {
                                    const extension = rule.mediaUrl.split('.').pop()?.toLowerCase();
                                    const mimeType = extension === 'pdf' ? 'application/pdf' : 
                                                   extension === 'zip' ? 'application/zip' :
                                                   extension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                                                   'application/octet-stream';
                                    await sock.sendMessage(msg.key.remoteJid!, { 
                                        document: { url: rule.mediaUrl }, 
                                        mimetype: mimeType,
                                        fileName: `file.${extension || 'bin'}`, 
                                        caption: randomReply 
                                    });
                                }
                            } else {
                                await sock.sendMessage(msg.key.remoteJid!, { text: randomReply });
                            }
                            
                            io.emit('chatbot_log', { sessionId, to: msg.key.remoteJid, keyword: text, reply: randomReply });
                        } catch (err) {
                            console.error(`[🤖 Chatbot Send Error]`, err);
                        }
                    }, delayMs);
                    
                    break; // Rule found, stop searching for this message
                }
            }
        } catch (e) {
            console.error(`[🤖 Chatbot Error]`, e);
        }
    });

    return sock;
};

export const stopWhatsAppSession = async (sessionId: string) => {
    const sock = sessions.get(sessionId);
    if (sock) {
        try {
            await sock.logout();
            sock.end(undefined);
        } catch (e) {
            console.error(`[Session] Error during logout/end for ${sessionId}:`, e);
            sock.end(undefined);
        }
        sessions.delete(sessionId);
    }
    connectionStatus.delete(sessionId);
    qrs.delete(sessionId);
    groupsCache.delete(sessionId);
    contactsCache.delete(sessionId);
    chatsCache.delete(sessionId);
    // lidPhoneMaps.delete(sessionId); // Keep LID maps in memory or clear? Clear for total deletion.
    lidPhoneMaps.delete(sessionId);

    // Delete session files
    const sessionDir = path.join(SESSIONS_DIR, sessionId);
    const lidMapFile = getLidMapPath(sessionId);
    const contactsCacheFile = getContactsCachePath(sessionId);
    
    try {
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            console.log(`[Session] 🗑️ Deleted directory for ${sessionId}`);
        }
        if (fs.existsSync(lidMapFile)) {
            fs.unlinkSync(lidMapFile);
            console.log(`[Session] 🗑️ Deleted LID map for ${sessionId}`);
        }
        if (fs.existsSync(contactsCacheFile)) {
            fs.unlinkSync(contactsCacheFile);
            console.log(`[Session] 🗑️ Deleted contacts cache for ${sessionId}`);
        }
    } catch (err) {
        console.error(`[Session] Error deleting hardware files for ${sessionId}:`, err);
    }
};

export const resolveLids = async (sessionId: string, lids: string[]) => {
    const sock = sessions.get(sessionId);
    if (!sock || lids.length === 0) return;

    const lidMap = lidPhoneMaps.get(sessionId)!;

    try {
        console.log(`[LID] 🔍 USync resolving ${lids.length} LIDs...`);
        const result = await sock.query({
            tag: 'iq',
            attrs: {
                to: '@s.whatsapp.net',
                type: 'get',
                xmlns: 'usync',
            },
            content: [
                {
                    tag: 'usync',
                    attrs: {
                        sid: sock.generateMessageTag(),
                        mode: 'query',
                        last: 'true',
                        index: '0',
                        context: 'interactive',
                    },
                    content: [
                        {
                            tag: 'query',
                            attrs: {},
                            content: [
                                { tag: 'contact', attrs: {} },
                                { tag: 'lid', attrs: {} }
                            ]
                        },
                        {
                            tag: 'list',
                            attrs: {},
                            content: lids.map(lid => ({
                                tag: 'user',
                                attrs: { jid: lid },
                            }))
                        }
                    ]
                }
            ]
        });

        console.log(`[LID-DEBUG] Raw USync Result:`, JSON.stringify(result, null, 2));

        // Parse result manually for MSISDN mappings
        const usyncNode = getBinaryNodeChild(result, 'usync');
        const listNode = getBinaryNodeChild(usyncNode, 'list');
        const userNodes = getBinaryNodeChildren(listNode, 'user');

        let discovered = 0;
        for (const user of userNodes) {
            const lid = user.attrs.jid;
            const contactNode = getBinaryNodeChild(user, 'contact');
            const phone = contactNode?.attrs?.type === 'msisdn' ? contactNode.attrs.jid : null;
            if (lid && phone) {
                const cleanPhone = phone.split('@')[0];
                lidMap.set(lid, cleanPhone);
                discovered++;
            }
        }
        
        if (discovered > 0) {
            console.log(`[LID] ✅ Successfully resolved ${discovered} new LID mappings!`);
            saveLidMap(sessionId, lidMap);
        } else {
            console.log(`[LID] ⚠️ USync query finished but no new mappings were found in response.`);
        }
    } catch (err: any) {
        console.error(`[LID] ❌ USync Resolution failed:`, err.message);
    }
};
