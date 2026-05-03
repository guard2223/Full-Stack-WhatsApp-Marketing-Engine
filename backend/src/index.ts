import express from 'express';
console.log('🚀 [Saden WA] CORE SERVER STARTING - VSYNC_4.1');
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { 
    initWhatsAppSession, 
    getSession, 
    getQR, 
    getCachedGroups, 
    getLidMap, 
    resolveLids,
    getConnectionStatus,
    stopWhatsAppSession 
} from './whatsapp/sessionManager';
import { sendMessage } from './whatsapp/sender';
import { 
    initDB, 
    getDevices, 
    getContacts, 
    addContact, 
    getCampaigns, 
    addCampaign, 
    getUserByEmail, 
    addUser, 
    updateUserCredits,
    getUserById,
    updateCampaignStatus,
    incrementCampaignProgress,
    deleteDevice,
    getDeviceBySession
} from './db';
import { 
    hashPassword, 
    comparePassword, 
    generateToken, 
    authMiddleware, 
    adminMiddleware,
    AuthRequest 
} from './auth';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Global logger
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.path} - ${req.headers.origin || 'No Origin'}`);
    next();
});

// =====================================
// LICENSE ENFORCEMENT
// =====================================
const { getTrialStatus, activateLicense } = require('./db');

const licenseMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Exempt license-related routes
    if (req.path === '/api/license/status' || req.path === '/api/license/activate') {
        return next();
    }

    const status = getTrialStatus();
    if (status.expired) {
        return res.status(402).json({ 
            error: 'SOFTWARE_LOCKED', 
            message: 'انتهت فترة التجربة المجانية. يرجى تفعيل النسخة للمتابعة.' 
        });
    }
    next();
};

app.use('/api', licenseMiddleware);

app.get('/api/license/status', (req, res) => {
    res.json(getTrialStatus());
});

app.post('/api/license/activate', (req, res) => {
    const { key } = req.body;
    const success = activateLicense(key);
    if (success) {
        res.json({ success: true, message: 'تم تفعيل النسخة بنجاح! استمتع بكامل المميزات.' });
    } else {
        res.status(400).json({ success: false, error: 'كود التفعيل غير صحيح.' });
    }
});

// =====================================
// AUTH ROUTES
// =====================================

app.post('/api/auth/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = getUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashed = await hashPassword(password);
    // First user is admin, others are clients
    const isFirstUser = (require('./db').getUsers().length === 0);
    const newUser = addUser({
        email,
        password: hashed,
        credits: isFirstUser ? 999999 : 100, // Admin gets lots, clients get 100 free
        role: isFirstUser ? 'admin' : 'client'
    });

    const token = generateToken({ id: newUser.id, email: newUser.email, role: newUser.role });
    res.json({ token, user: { id: newUser.id, email: newUser.email, role: newUser.role, credits: newUser.credits } });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = getUserByEmail(email);
    if (!user || !(await comparePassword(password, user.password))) {
        return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, credits: user.credits } });
});

app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res) => {
    const user = getUserById(req.user!.id);
    res.json({ user: { id: user?.id, email: user?.email, role: user?.role, credits: user?.credits } });
});

// =====================================
// ADMIN ROUTES
// =====================================

app.post('/api/admin/credits', authMiddleware, adminMiddleware, (req, res) => {
    const { userId, credits } = req.body;
    if (!userId || credits === undefined) return res.status(400).json({ error: 'UserID and credits required' });
    updateUserCredits(userId, Number(credits));
    res.json({ success: true });
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
    const users = require('./db').getUsers().map((u: any) => ({
        id: u.id,
        email: u.email,
        credits: u.credits,
        role: u.role,
        createdAt: u.createdAt
    }));
    res.json(users);
});

app.get('/api/admin/campaigns', authMiddleware, adminMiddleware, (req, res) => {
    const { getCampaigns } = require('./db');
    res.json(getCampaigns()); // Returns all campaigns
});

app.get('/api/admin/payments', authMiddleware, adminMiddleware, (req, res) => {
    const { getPayments, getUsers } = require('./db');
    const payments = getPayments();
    const users = getUsers();
    
    // Enrich with user email
    const enriched = payments.map((p: any) => {
        const u = users.find((user: any) => user.id === p.userId);
        return { ...p, userEmail: u?.email || 'Unknown' };
    });
    res.json(enriched);
});

app.post('/api/admin/payments/approve', authMiddleware, adminMiddleware, (req, res) => {
    const { id, status } = req.body; // id is paymentRequest ID, status is 'approved' or 'rejected'
    if (!id || !status) return res.status(400).json({ error: 'ID and status required' });

    const { updatePaymentStatus, getUserById, updateUserCredits } = require('./db');
    
    const request = updatePaymentStatus(id, status);
    if (request && status === 'approved') {
        const user = getUserById(request.userId);
        if (user) {
            updateUserCredits(user.id, user.credits + request.amount);
            console.log(`[Admin] ✅ Approved ${request.amount} credits for ${user.email}`);
        }
    }
    res.json({ success: true });
});

// =====================================
// PROTECTED API ROUTES
// =====================================

app.post('/api/whatsapp/connect', authMiddleware, (req: AuthRequest, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Session ID is required' });
  
  initWhatsAppSession(sessionId, io, req.user!.id);
  res.json({ message: `Session ${sessionId} initialization started` });
});

app.get('/api/whatsapp/status/:sessionId', authMiddleware, (req, res) => {
  const session = getSession(req.params.sessionId);
  res.json({ connected: !!(session && session.user) });
});

app.get('/api/whatsapp/qr/:sessionId', authMiddleware, (req, res) => {
  const { sessionId } = req.params;
  const qr = getQR(sessionId);
  console.log(`[API] 🔍 QR requested for ${sessionId}: ${qr ? 'Found' : 'Not Found'}`);
  res.json({ qr });
});

// --- User Payment Routes ---
app.post('/api/payments/request', authMiddleware, (req: AuthRequest, res) => {
    const { amount, walletNumber } = req.body;
    if (!amount || !walletNumber) return res.status(400).json({ error: 'Amount and wallet number required' });

    const { addPaymentRequest } = require('./db');
    const newRequest = addPaymentRequest({
        userId: req.user!.id,
        amount: Number(amount),
        walletNumber
    });
    res.json(newRequest);
});

app.get('/api/payments/my', authMiddleware, (req: AuthRequest, res) => {
    const { getPayments } = require('./db');
    res.json(getPayments(req.user!.id));
});

app.get('/api/devices', authMiddleware, (req: AuthRequest, res) => {
  res.json(getDevices(req.user!.id));
});

app.delete('/api/devices/:sessionId', authMiddleware, async (req: AuthRequest, res) => {
    const { sessionId } = req.params;
    console.log(`[API] 🗑️ DELETE Request received for session: ${sessionId}`);

    const device = getDeviceBySession(sessionId);
    if (!device) {
        console.log(`[API] ❌ Device ${sessionId} not found in DB`);
        return res.status(404).json({ error: 'Device not found' });
    }
    
    if (device.userId !== req.user!.id) {
        console.log(`[API] ❌ Unauthorized delete attempt for ${sessionId} by ${req.user!.email}`);
        return res.status(403).json({ error: 'Unauthorized' });
    }

    console.log(`[API] ⚙️ Stopping session and deleting: ${sessionId} for user ${req.user!.id}`);
    await stopWhatsAppSession(sessionId);
    const success = deleteDevice(sessionId, req.user!.id);

    if (!success) return res.status(403).json({ error: 'Unauthorized deletion' });
    res.json({ success: true });
});

app.get('/api/contacts', authMiddleware, (req: AuthRequest, res) => {
  res.json(getContacts(req.user!.id));
});

app.post('/api/contacts', authMiddleware, (req: AuthRequest, res) => {
  if (!req.body.name || !req.body.phone) return res.status(400).json({ error: 'Missing fields' });
  const newContact = addContact({ 
      name: req.body.name, 
      phone: req.body.phone, 
      group: req.body.group || 'عام',
      userId: req.user!.id
  });
  res.json(newContact);
});

app.post('/api/contacts/bulk', authMiddleware, (req: AuthRequest, res) => {
  const { contacts } = req.body;
  if (!Array.isArray(contacts)) return res.status(400).json({ error: 'Contacts must be an array' });
  
  const { addContactsBulk } = require('./db');
  const newContacts = addContactsBulk(contacts.map((c: any) => ({
    name: c.name || 'عميل',
    phone: c.phone,
    group: c.group || 'عام',
    userId: req.user!.id
  })));
  
  res.json(newContacts);
});

app.delete('/api/contacts/:id', authMiddleware, (req, res) => {
  const { deleteContact } = require('./db');
  deleteContact(req.params.id);
  res.json({ success: true });
});

app.get('/api/campaigns', authMiddleware, (req: AuthRequest, res) => {
  res.json(getCampaigns(req.user!.id));
});

app.post('/api/campaigns', authMiddleware, (req: AuthRequest, res) => {
  const { name, targetGroup, targetCount, deviceSessions, messageText, minDelay, maxDelay, sourceType, sourceId, manualNumbers } = req.body;
  if (!name || (!targetGroup && !sourceId && !manualNumbers) || !deviceSessions || !messageText) return res.status(400).json({ error: 'Missing required campaign fields' });
  
  const newCampaign = addCampaign({ 
    name, 
    userId: req.user!.id,
    targetGroup, 
    targetCount: Number(targetCount) || 0, 
    deviceSessions: Array.isArray(deviceSessions) ? deviceSessions : [deviceSessions], 
    messageText,
    minDelay: Number(minDelay),
    maxDelay: Number(maxDelay),
    sourceType: sourceType || 'database',
    sourceId: sourceId || targetGroup,
    manualNumbers: manualNumbers || []
  });
  res.json(newCampaign);
});

// --- CHATBOT RULES ---
app.get('/api/chatbot', authMiddleware, (req: AuthRequest, res) => {
    const { getChatbotRules } = require('./db');
    res.json(getChatbotRules(req.user!.id));
});

app.post('/api/chatbot', authMiddleware, (req: AuthRequest, res) => {
    const { keyword, matchType, replyMessage, deviceId } = req.body;
    if (!keyword || !matchType || !replyMessage || !deviceId) {
        return res.status(400).json({ error: 'Missing required chatbot fields' });
    }
    const { addChatbotRule } = require('./db');
    const newRule = addChatbotRule({
        userId: req.user!.id,
        keyword,
        matchType,
        replyMessage,
        deviceId,
        isActive: true
    });
    res.json(newRule);
});

app.put('/api/chatbot/:id', authMiddleware, (req: AuthRequest, res) => {
    const { id } = req.params;
    const { updateChatbotRule } = require('./db');
    const updated = updateChatbotRule(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Rule not found' });
    res.json(updated);
});

app.delete('/api/chatbot/:id', authMiddleware, (req: AuthRequest, res) => {
    const { id } = req.params;
    const { deleteChatbotRule } = require('./db');
    deleteChatbotRule(id);
    res.json({ success: true });
});

// =====================================
// ADVANCED TOOLS (GROUP EXTRACTOR, FILTER, ETC)
// =====================================

app.get('/api/whatsapp/:sessionId/groups', authMiddleware, async (req, res) => {
    const { sessionId } = req.params;
    const session = getSession(sessionId);
    
    if (!session || !session.user) {
        return res.status(404).json({ error: 'Session not connected' });
    }

    try {
        console.log(`[Tools] 📂 Fetching groups for ${sessionId}...`);
        
        let groups: any = {};
        try {
            groups = await session.groupFetchAllParticipating();
        } catch (e: any) {
            console.warn(`[Tools] ⚠️ groupFetchAllParticipating failed, using cache fallback.`);
        }

        const list: any[] = [];
        const seenIds = new Set();

        Object.values(groups).forEach((g: any) => {
            list.push({
                id: g.id,
                name: g.subject,
                participantsCount: g.participants?.length || 0,
                owner: g.owner
            });
            seenIds.add(g.id);
        });

        // Add from cache if not already added
        const cachedGroups = getCachedGroups(sessionId);
        cachedGroups.forEach((cg: any) => {
            if (!seenIds.has(cg.id)) {
                list.push({
                    id: cg.id,
                    name: cg.name || cg.subject || 'Unknown Group (Cache)',
                    participantsCount: cg.participants?.length || 0,
                    owner: cg.owner || null
                });
            }
        });

        console.log(`[Tools] ✅ Total unique groups found: ${list.length}`);
        res.json(list);
    } catch (err: any) {
        console.error(`[Tools] ❌ Group fetch error:`, err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/whatsapp/:sessionId/groups/:groupId/participants', authMiddleware, async (req, res) => {
    const { sessionId, groupId } = req.params;
    const session = getSession(sessionId);
    
    const status = getConnectionStatus(sessionId);
    if (status !== 'open') {
        return res.status(428).json({ error: 'الجهاز غير متصل حالياً. يرجى التأكد من حالة الاتصال في لوحة التحكم.' });
    }

    try {
        console.log(`[Tools] 👥 Fetching participants for group: ${groupId} in ${sessionId}...`);
        
        let metadata;
        try {
            metadata = await session.groupMetadata(groupId);
        } catch (err: any) {
            console.error(`[Tools] ❌ Metadata fetch failed:`, err);
            return res.status(500).json({ error: 'فشل جلب بيانات الجروب. تأكد أنك لا تزال عضواً فيه.' });
        }
        
        if (!metadata) throw new Error('Failed to fetch group metadata');
        
        const lidMap = getLidMap(sessionId);
        const unresolvedLids = (metadata.participants || [])
            .filter((p: any) => p.id.includes('@lid') && (!lidMap || !lidMap.has(p.id)))
            .map((p: any) => p.id);

        if (unresolvedLids.length > 0) {
            console.log(`[LID] 🔍 Triggering resolution for ${unresolvedLids.length} strange numbers...`);
            resolveLids(sessionId, unresolvedLids).catch(e => console.error("[LID-ERR]", e));
        }

        const participants = (metadata.participants || []).map((p: any) => {
            const rawId = p.id || p.jid || '';
            let phone = rawId.split('@')[0].split(':')[0];
            
            // If it's a LID, try to resolve it from the map
            if (rawId.includes('@lid') && lidMap && lidMap.has(rawId)) {
                phone = lidMap.get(rawId)!;
            } else if (rawId.includes('@lid') && p.jid) {
                phone = p.jid.split('@')[0].split(':')[0];
            }
            
            return {
                id: rawId,
                phone: phone,
                admin: p.admin || null,
                type: rawId.includes('@lid') ? 'LID (Private)' : 'Phone'
            };
        });
        
        console.log(`[Tools] ✅ Extracted ${participants.length} participants. (LIDs detected: ${unresolvedLids.length})`);
        res.json({
            id: metadata.id,
            subject: metadata.subject,
            participants: participants
        });
    } catch (err: any) {
        console.error(`[Tools] ❌ Error fetching participants for group ${groupId}:`, err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/whatsapp/:sessionId/filter', authMiddleware, async (req, res) => {
    const { sessionId } = req.params;
    const { numbers } = req.body; // Array of numbers
    const session = getSession(sessionId);

    if (!session || !session.user) {
        return res.status(404).json({ error: 'Session not connected' });
    }

    if (!Array.isArray(numbers)) return res.status(400).json({ error: 'Numbers must be an array' });

    try {
        console.log(`[Tools] 🧪 Filtering ${numbers.length} numbers for ${sessionId}...`);
        const results = [];
        // Baileys onWhatsApp can take multiple but it's safer to chunk or loop
        // Let's do a simple loop for now (Baileys onWhatsApp is fast)
        for(let num of numbers) {
             let clean = num.replace(/\D/g, '');
             
             // Smart Correction Logic
             if (clean.startsWith('01') && clean.length === 11) {
                 clean = '2' + clean; // Egypt
             } else if (clean.startsWith('05') && clean.length === 10) {
                 clean = '966' + clean.substring(1); // Saudi (replace leading 0 with 966)
             } else if (clean.startsWith('5') && clean.length === 9) {
                 clean = '966' + clean; // Saudi (add 966 to 9 digits starting with 5)
             }

             const [result] = await session.onWhatsApp(clean);
             results.push({
                 phone: num,
                 exists: !!result?.exists,
                 jid: result?.jid || null
             });
        }
        res.json(results);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get(['/api/whatsapp/:sessionId/contacts', '/api/whatsapp/:sessionId/all-contacts'], authMiddleware, async (req, res) => {
    const { sessionId } = req.params;
    const { getCachedContacts } = require('./whatsapp/sessionManager');
    const contacts = getCachedContacts(sessionId);

    console.log(`[API] 👤 Contacts requested for ${sessionId}. Found in cache: ${contacts.length}`);

    // Filter and format actual contacts
    const formatted = contacts
        .filter((c: any) => c.id && !c.id.endsWith('@g.us') && c.id !== 'status@broadcast')
        .map((c: any) => {
            const rawId = c.id || '';
            const phone = rawId.split(':')[0].split('@')[0];
            return {
                id: rawId,
                phone: phone,
                name: c.name || c.notify || c.pushName || c.shortName || 'غير مسجل',
                isBusiness: c.isBusiness || false
            };
        });

    res.json(formatted);
});

app.get('/api/whatsapp/:sessionId/chats', authMiddleware, async (req, res) => {
    const { sessionId } = req.params;
    const session = getSession(sessionId);

    if (!session || !session.user) {
        return res.status(404).json({ error: 'Session not connected' });
    }

    try {
        // Baileys doesn't have a direct 'fetchAllChats' that works instantly without sync
        // But we can check the store if we implement it. 
        // For now, let's return a simple message or use the internal store if added.
        res.status(501).json({ error: 'Chat extraction requires Store integration (Coming soon)' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// The Rocket Engine: Anti-Ban Dispatcher Loop
async function runCampaign(campaignId: string) {
    const { getCampaigns, updateCampaignStatus, getContacts, incrementCampaignProgress, getUserById, updateUserCredits } = require('./db');
    const { sendMessage } = require('./whatsapp/sender');
    const { getSession } = require('./whatsapp/sessionManager');

    let campaign = getCampaigns().find((c: any) => c.id === campaignId);
    if (!campaign || (campaign.status !== 'draft' && campaign.status !== 'paused')) return;
    
    // Check credits
    const user = getUserById(campaign.userId);
    if (!user || user.credits <= 0) {
        console.log(`[Engine] ❌ لا يوجد رصيد كافي للمستخدم ${user?.email || 'Unknown'}`);
        updateCampaignStatus(campaignId, 'paused');
        return;
    }

    const sessions: any[] = [];
    for (const sId of (campaign.deviceSessions || [])) {
        let session = getSession(sId);
        let attempts = 0;
        while ((!session || !session.user) && attempts < 10) {
            await new Promise(r => setTimeout(r, 1000));
            session = getSession(sId);
            attempts++;
        }
        if (session && session.user) {
            sessions.push({ id: sId, session });
        }
    }

    if (sessions.length === 0) {
        console.log(`[Engine] ❌ لا يوجد أي جهاز متصل حالياً من الأجهزة المختارة.`);
        updateCampaignStatus(campaignId, 'paused');
        return;
    }

    console.log(`[Engine] Starting campaign using ${sessions.length} devices...`);

    let targetContacts = [];
    if (campaign.sourceType === 'whatsapp_group') {
        const primarySession = sessions[0].session;
        console.log(`[Engine] 👥 Fetching live participants for group ${campaign.sourceId}...`);
        try {
            const metadata = await primarySession.groupMetadata(campaign.sourceId);
            console.log(`[Engine] 📁 Group Metadata Fetched: Name=${metadata.subject} | Participants=${metadata.participants?.length || 0}`);
            targetContacts = (metadata.participants || []).map((p: any) => ({
                id: p.id,
                phone: p.id.split('@')[0],
                name: 'عضو جروب'
            }));
        } catch (e: any) {
            console.log(`[Engine] ❌ Failed to fetch group metadata: ${e.message}`);
            updateCampaignStatus(campaignId, 'paused');
            return;
        }
    } else if (campaign.sourceType === 'manual' && campaign.manualNumbers) {
        targetContacts = campaign.manualNumbers.map((p: string) => ({
            phone: p.trim().replace('+', '').replace(/ /g, ''),
            name: 'عميل'
        }));
    } else {
        const category = campaign.sourceId || campaign.targetGroup;
        targetContacts = getContacts(campaign.userId).filter((c: any) => (c.group || 'عام') === category);
    }

    console.log(`[Engine] Found ${targetContacts.length} target contacts`);

    if (targetContacts.length === 0) {
        console.log(`[Engine] ⚠️ لا يوجد جهات اتصال في هذه المجموعة: ${campaign.sourceId || campaign.targetGroup} (Type: ${campaign.sourceType})`);
        updateCampaignStatus(campaignId, 'completed');
        return;
    }

    console.log(`[Engine] 🚀 انطلق الصاروخ! حملة المستخدم: ${user.email} | العدد: ${targetContacts.length} عميل`);
    updateCampaignStatus(campaignId, 'running');
    
    for (let i = 0; i < targetContacts.length; i++) {
        const contact = targetContacts[i];

        // Fresh check for pause/stop or credits
        const currentCampaign = getCampaigns().find((c: any) => c.id === campaignId);
        if (currentCampaign?.status !== 'running') {
            console.log(`[Engine] 🛑 تمت مقاطعة الحملة أو إيقافها.`);
            break;
        }

        const currentUser = getUserById(campaign.userId);
        if (currentUser.credits <= 0) {
            console.log(`[Engine] 🛑 نفذ الرصيد! توقف الإرسال.`);
            updateCampaignStatus(campaignId, 'paused');
            break;
        }

        const sessionPair = sessions[i % sessions.length];
        
        try {
            console.log(`[Engine] ✉️ إرسال (${i+1}/${targetContacts.length}) عبر جهاز ${sessionPair.id} إلى الرقم: ${contact.phone}...`);
            await sendMessage({ 
                sessionId: sessionPair.id, 
                to: contact.id || contact.phone, 
                text: campaign.messageText 
            });
            incrementCampaignProgress(campaignId, 'success');
            
            // Deduct credits (New Pricing: 10 Credits per success)
            // BUGFIX: Always fetch the LATEST balance before deducting
            const latestUser = getUserById(campaign.userId);
            if (latestUser) {
                updateUserCredits(campaign.userId, latestUser.credits - 10);
            }
            
            console.log(`[Engine] ✅ [SUCCESS] Device: ${sessionPair.id} | To: ${contact.phone} | Campaign: ${campaign.name}`);
        } catch (e: any) {
            console.error(`[Engine] ❌ [FAILED] Device: ${sessionPair.id} | To: ${contact.phone} | Error: ${e.message}`);
            incrementCampaignProgress(campaignId, 'failed');
        }
        
        // Anti-Ban Dynamic Delay
        if (i < targetContacts.length - 1) {
            const min = (campaign.minDelay || 5) * 1000;
            const max = (campaign.maxDelay || 15) * 1000;
            const delay = Math.floor(Math.random() * (max - min + 1) + min);
            console.log(`[Engine] ⏳ انتظار ${delay/1000} ثانية للحماية من الحظر...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    console.log(`[Engine] ✨ اكتملت الحملة بنجاح!`);
    updateCampaignStatus(campaignId, 'completed');
}

app.post('/api/campaigns/:id/start', authMiddleware, (req, res) => {
    runCampaign(req.params.id); 
    res.json({ success: true, message: 'Campaign background engine started' });
});

app.post('/api/whatsapp/send', authMiddleware, async (req, res) => {
  const { sessionId, to, text, mediaUrl, caption } = req.body;
  if (!sessionId || !to || (!text && !mediaUrl)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await sendMessage({ sessionId, to, text, mediaUrl, caption });
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Group Invite Logic (10 Credits per attempt) ---
app.post('/api/whatsapp/:sessionId/groups/:groupId/invite-bulk', authMiddleware, async (req: AuthRequest, res) => {
    const { sessionId, groupId } = req.params;
    const { participants, delay = 10 } = req.body; // participants is array of JIDs
    const session = getSession(sessionId);

    if (!session || !session.user) return res.status(404).json({ error: 'Session not connected' });
    if (!Array.isArray(participants)) return res.status(400).json({ error: 'Participants must be an array' });

    console.log(`[Inviter] 🚀 Starting bulk invite for ${participants.length} users to group ${groupId}...`);

    // Run in background
    (async () => {
        const { getUserById, updateUserCredits } = require('./db');
        const userId = req.user!.id;

        for (let jid of participants) {
            // Robust JID handling
            if (!jid.includes('@')) {
                jid = `${jid.replace(/\D/g, '')}@s.whatsapp.net`;
            }

            const user = getUserById(userId);
            if (!user || user.credits < 10) {
                console.log(`[Inviter] 🛑 Insufficient credits for user ${user?.email}`);
                break;
            }

            try {
                console.log(`[Inviter] ➕ Inviting ${jid} to ${groupId}...`);
                // Attempt to add
                const response = await session.groupParticipantsUpdate(groupId, [jid], "add");
                
                // Deduct 10 credits per "attempt"
                updateUserCredits(userId, user.credits - 10);
                console.log(`[Inviter] ✅ Processed ${jid} (-10 Credits). Response:`, response);
            } catch (err) {
                console.error(`[Inviter] ❌ Failed to invite ${jid}:`, err);
            }

            // Delay
            const sleepTime = (Number(delay) + Math.random() * 5) * 1000;
            await new Promise(r => setTimeout(r, sleepTime));
        }
        console.log(`[Inviter] ✨ Bulk invite task finished.`);
    })();

    res.json({ success: true, message: 'Bulk invite task started in background' });
});

app.post('/api/whatsapp/:sessionId/groups/join-bulk', authMiddleware, async (req: AuthRequest, res) => {
    const { sessionId } = req.params;
    const { links, delay = 15 } = req.body; // array of full invite links
    const session = getSession(sessionId);

    if (!session || !session.user) return res.status(404).json({ error: 'Session not connected' });
    if (!Array.isArray(links)) return res.status(400).json({ error: 'Links must be an array' });

    console.log(`[Inviter] 🚀 Starting auto-join for ${links.length} groups on session ${sessionId}...`);

    // Run in background
    (async () => {
        for (let link of links) {
            try {
                // Extract code from https://chat.whatsapp.com/CODE
                let code = link;
                if (link.includes('chat.whatsapp.com/')) {
                    code = link.split('chat.whatsapp.com/')[1].split('/')[0].split('?')[0];
                }

                if (!code || code.trim() === '') continue;

                console.log(`[Inviter] 🔗 Attempting to join group with code: ${code}`);
                const response = await session.groupAcceptInvite(code);
                console.log(`[Inviter] ✅ Successfully joined group via ${code}. Response:`, response);
            } catch (err) {
                console.error(`[Inviter] ❌ Failed to join group via ${link}:`, err);
            }

            // Anti-Ban Delay
            const sleepTime = (Number(delay) + Math.random() * 5) * 1000;
            await new Promise(r => setTimeout(r, sleepTime));
        }
        console.log(`[Inviter] ✨ Auto-join task finished.`);
    })();

    res.json({ success: true, message: 'Auto-join task started in background' });
});

app.get('/api/whatsapp/:sessionId/groups/links', authMiddleware, async (req: AuthRequest, res) => {
    const { sessionId } = req.params;
    const session = getSession(sessionId);

    if (!session || !session.user) return res.status(404).json({ error: 'Session not connected' });

    try {
        console.log(`[Tools] 🔗 Fetching group links for ${sessionId}...`);
        
        let groups: any = {};
        try {
            groups = await session.groupFetchAllParticipating();
        } catch (e: any) {
             return res.status(500).json({ error: 'Failed to fetch groups' });
        }

        const myJid = session.user.id.split(':')[0] + '@s.whatsapp.net';
        const myPhone = myJid.split('@')[0];
        const links = [];

        console.log(`[Tools] 🔍 My Phone: ${myPhone} | Groups: ${Object.keys(groups).length}`);

        const groupIds = Object.keys(groups);
        
        for (const id of groupIds) {
            let g = groups[id];
            
            // Fetch metadata if missing
            if (!g.participants || g.participants.length === 0) {
                try {
                    await new Promise(r => setTimeout(r, 300)); // Slight delay
                    const metadata = await session.groupMetadata(id);
                    g = { ...g, ...metadata };
                } catch (e) { continue; }
            }

            // Check if user is admin - very flexible check
            const me = g.participants?.find((p: any) => {
                const pid = (p.id || p.jid || "").split('@')[0].split(':')[0];
                return pid === myPhone;
            });
            
            if (me && (me.admin === 'admin' || me.admin === 'superadmin')) {
                try {
                    const code = await session.groupInviteCode(id);
                    links.push({
                        id: id,
                        name: g.subject || 'Unnamed Group',
                        link: `https://chat.whatsapp.com/${code}`,
                        participantsCount: g.participants?.length || 0
                    });
                } catch (err) { }
            }
        }

        console.log(`[Tools] ✅ Extracted ${links.length} links.`);
        res.json(links);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/whatsapp/:sessionId/groups/invite-code', authMiddleware, async (req: AuthRequest, res) => {
    const { sessionId } = req.params;
    const { groupId } = req.query;
    if (!groupId) return res.status(400).json({ error: 'groupId is required' });

    const session = getSession(sessionId);
    if (!session || !session.user) return res.status(404).json({ error: 'Session not connected' });

    try {
        const metadata = await session.groupMetadata(groupId as string);
        const myJid = session.user.id.split(':')[0];
        
        const me = metadata.participants?.find((p: any) => p.id.startsWith(myJid));
        
        if (!me || (me.admin !== 'admin' && me.admin !== 'superadmin')) {
            return res.status(403).json({ error: 'يجب أن تكون مشرفاً في الجروب لاستخراج الرابط' });
        }

        const code = await session.groupInviteCode(groupId as string);
        res.json({ link: `https://chat.whatsapp.com/${code}` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/tools/search-groups', authMiddleware, async (req: AuthRequest, res) => {
    const { keyword } = req.query;
    if (!keyword) return res.status(400).json({ error: 'Keyword is required' });

    try {
        console.log(`[Tools] 🕵️ Professional Dork Search for: ${keyword}`);
        
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        ];

        // Advanced Dorks
        const dorks = [
            `intext:"chat.whatsapp.com" "${keyword}"`,
            `intitle:"whatsapp group" "${keyword}"`,
            `site:facebook.com "chat.whatsapp.com" "${keyword}"`
        ];

        const sources = dorks.flatMap(d => [
            `https://www.bing.com/search?q=${encodeURIComponent(d)}`,
            `https://search.yahoo.com/search?p=${encodeURIComponent(d)}`
        ]);

        const fetchResults = await Promise.allSettled(sources.map(async (url) => {
            // Random delay to mimic human behavior
            await new Promise(r => setTimeout(r, Math.random() * 2000));
            return fetch(url, {
                headers: {
                    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Cache-Control': 'max-age=0'
                },
                signal: AbortSignal.timeout(15000)
            }).then(r => r.text());
        }));

        const allHtml = fetchResults.map(r => r.status === 'fulfilled' ? r.value : '').join('\n');
        const regex = /chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]{18,32})/gi;
        const matches = [];
        let m;
        while ((m = regex.exec(allHtml)) !== null) {
            matches.push(`https://chat.whatsapp.com/${m[1]}`);
        }
        
        const uniqueLinks = [...new Set(matches)];
        console.log(`[Tools] 🎯 Stealth Result: ${uniqueLinks.length} groups.`);

        res.json({ keyword, count: uniqueLinks.length, links: uniqueLinks });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- ACCOUNT WARMING ---
app.get('/api/warming', authMiddleware, (req: AuthRequest, res) => {
    const { getWarmingTasks } = require('./db');
    res.json(getWarmingTasks(req.user!.id));
});

app.post('/api/warming', authMiddleware, (req: AuthRequest, res) => {
    const { devices, minDelay, maxDelay } = req.body;
    if (!devices || devices.length < 2) return res.status(400).json({ error: 'At least 2 devices are required for warming' });
    const { addWarmingTask } = require('./db');
    const newTask = addWarmingTask({
        userId: req.user!.id,
        devices,
        minDelay: Number(minDelay) || 15,
        maxDelay: Number(maxDelay) || 45,
        status: 'running'
    });
    res.json(newTask);
});

app.put('/api/warming/:id/status', authMiddleware, (req: AuthRequest, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { updateWarmingTaskStatus } = require('./db');
    const updated = updateWarmingTaskStatus(id, status);
    if (!updated) return res.status(404).json({ error: 'Task not found' });
    res.json(updated);
});

app.delete('/api/warming/:id', authMiddleware, (req: AuthRequest, res) => {
    const { deleteWarmingTask } = require('./db');
    deleteWarmingTask(req.params.id);
    res.json({ success: true });
});

// --- MESSAGE SCHEDULING ---
app.get('/api/schedule', authMiddleware, (req: AuthRequest, res) => {
    const { getScheduledMessages } = require('./db');
    res.json(getScheduledMessages(req.user!.id));
});

app.post('/api/schedule', authMiddleware, (req: AuthRequest, res) => {
    const { sessionId, targets, message, scheduledAt } = req.body;
    if (!sessionId || !targets || !message || !scheduledAt) return res.status(400).json({ error: 'Missing required fields' });
    
    const { createScheduledMessage } = require('./db');
    const newTask = createScheduledMessage({
        id: 'sched_' + Date.now(),
        userId: req.user!.id,
        sessionId,
        targets,
        message,
        scheduledAt: Number(scheduledAt),
        status: 'pending',
        createdAt: Date.now()
    });
    res.json(newTask);
});

app.delete('/api/schedule/:id', authMiddleware, (req: AuthRequest, res) => {
    const { deleteScheduledMessage } = require('./db');
    deleteScheduledMessage(req.params.id);
    res.json({ success: true });
});

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    initDB();
    const { getAllDevices } = require('./db');
    const devices = getAllDevices();
    for (const dev of devices) {
        if (dev.status === 'connected') {
            console.log(`[Multiwa Core] ♻️ Auto-restoring saved session: ${dev.sessionId}`);
            await new Promise(r => setTimeout(r, 2000)); // Staggered start
            initWhatsAppSession(dev.sessionId, io, dev.userId);
        }
    }

    const { initWarmer } = require('./whatsapp/warmer');
    initWarmer();

    const { initScheduler } = require('./scheduler');
    initScheduler();

    app.get('/api/tools/extract-links-from-url', authMiddleware, async (req: AuthRequest, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        console.log(`[Tools] 🔗 Extracting links from URL: ${url}`);
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
        
        const response = await fetch(url as string, {
            headers: { 'User-Agent': userAgent },
            signal: AbortSignal.timeout(20000)
        });
        
        if (!response.ok) throw new Error(`Failed to fetch URL: ${response.statusText}`);
        
        const html = await response.text();
        
        // 1. Extract Group Links
        const groupRegex = /chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]{18,35})/gi;
        const groupMatches = [];
        let gm;
        while ((gm = groupRegex.exec(html)) !== null) {
            groupMatches.push(`https://chat.whatsapp.com/${gm[1]}`);
        }

        // 2. Extract Contact Links (wa.me)
        const waRegex = /(?:wa\.me|api\.whatsapp\.com\/send\?phone=)([0-9]{8,15})/gi;
        const waMatches = [];
        let wm;
        while ((wm = waRegex.exec(html)) !== null) {
            waMatches.push(`https://wa.me/${wm[1]}`);
        }

        const uniqueGroups = [...new Set(groupMatches)];
        const uniqueContacts = [...new Set(waMatches)];

        console.log(`[Tools] ✅ Extracted ${uniqueGroups.length} groups and ${uniqueContacts.length} contacts.`);
        res.json({ groups: uniqueGroups, contacts: uniqueContacts });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/tools/super-hunter', authMiddleware, async (req: AuthRequest, res) => {
    const { keyword } = req.query;
    if (!keyword) return res.status(400).json({ error: 'Keyword is required' });

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

    try {
        console.log(`[Tools] 🏹 FINAL HUNTER STARTING for: ${keyword}`);
        
        // Use more reliable listing sites
        const directTargets = [
            `https://whatsapsgrouplinks.com/search?q=${encodeURIComponent(keyword as string)}`,
            `https://groupsor.link/search/groups/${encodeURIComponent(keyword as string)}`,
            `https://www.bing.com/search?q=site:chat.whatsapp.com+"${keyword}"`
        ];

        let allLinks: string[] = [];

        for (const url of directTargets) {
            try {
                const sRes = await fetch(url, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(10000) });
                const sHtml = await sRes.text();
                const gRegex = /chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]{18,35})/gi;
                const matches = [...sHtml.matchAll(gRegex)].map(m => `https://chat.whatsapp.com/${m[1]}`);
                allLinks = allLinks.concat(matches);
            } catch (e) {}
        }

        const uniqueGroups = [...new Set(allLinks)];
        console.log(`[Tools] 🎯 SUCCESS: Found ${uniqueGroups.length} groups!`);
        res.json({ groups: uniqueGroups, contacts: [], pagesHunted: directTargets.length });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

    server.listen(PORT, () => {
        console.log(`Saden WA Core Server running on port ${PORT} 🚀`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

start();
