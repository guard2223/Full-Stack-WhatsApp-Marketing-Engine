import fs from 'fs';
import path from 'path';

// ==========================================
// 🗄️ Multiwa Micro-DB (Zero Dependencies)
// ==========================================

const DATABASE_FILE = path.join(__dirname, '..', '..', 'data', 'database.json');

// Define our types
export interface User {
    id: string;
    email: string;
    password: string;
    credits: number;
    role: 'admin' | 'client';
    createdAt: number;
}

export interface Device {
    id: string;
    sessionId: string;
    userId: string;
    name: string;
    phone: string;
    status: 'connected' | 'disconnected';
    createdAt: number;
}

export interface Campaign {
    id: string;
    name: string;
    userId: string;
    targetGroup: string;
    targetCount: number;
    deviceSessions: string[]; // Support multiple sessions
    messageText: string;
    minDelay: number;
    maxDelay: number;
    status: 'draft' | 'running' | 'completed' | 'paused';
    progress: number;
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    sourceType?: 'database' | 'whatsapp_group' | 'manual';
    sourceId?: string; // category name or group Jid
    manualNumbers?: string[];
    createdAt: number;
}

export interface PaymentRequest {
    id: string;
    userId: string;
    amount: number;
    walletNumber: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: number;
}

export interface Contact {
    id: string;
    name: string;
    phone: string;
    group: string;
    userId: string;
    createdAt: number;
}

export interface ChatbotRule {
    id: string;
    userId: string;
    deviceId: string;
    keyword: string;
    matchType: 'exact' | 'contains';
    replyMessage: string;
    mediaUrl?: string; // Optional media
    delay?: number; // Delay in seconds
    startTime?: string; // e.g. "09:00"
    endTime?: string; // e.g. "17:00"
    isGroupEnabled?: boolean; // Enable for groups
    isActive: boolean;
    createdAt: number;
}

export interface WarmingTask {
    id: string;
    userId: string;
    devices: string[];
    minDelay: number;
    maxDelay: number;
    status: 'running' | 'stopped';
    createdAt: number;
}

export interface ScheduledMessage {
    id: string;
    userId: string;
    sessionId: string;
    targets: string[]; // phone numbers
    message: string;
    mediaPath?: string;
    mediaType?: string;
    scheduledAt: number; // Unix timestamp
    status: 'pending' | 'sent' | 'failed';
    createdAt: number;
}

export interface AppSettings {
    installDate: number;
    licenseKey: string | null;
    isActivated: boolean;
    activatedAt?: number;
}

export interface DatabaseSchema {
    users: User[];
    devices: Device[];
    campaigns: Campaign[];
    contacts: Contact[];
    payments: PaymentRequest[];
    chatbotRules: ChatbotRule[];
    warmingTasks: WarmingTask[];
    scheduledMessages: ScheduledMessage[];
    settings: AppSettings;
}

// Initial default data
const defaultData: DatabaseSchema = {
    users: [],
    devices: [],
    campaigns: [],
    contacts: [],
    payments: [],
    chatbotRules: [],
    warmingTasks: [],
    scheduledMessages: [],
    settings: {
        installDate: Date.now(),
        licenseKey: null,
        isActivated: false
    }
};

// Initialize database file
export function initDB() {
    const dir = path.dirname(DATABASE_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DATABASE_FILE)) {
        fs.writeFileSync(DATABASE_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
        console.log('✅ Micro-DB Initialized at', DATABASE_FILE);
    } else {
        // Migration: ensure arrays exist
        const db = readDB();
        if (!db.users) {
            db.users = [];
        }
        if (!db.devices) {
            db.devices = [];
        }
        if (!db.campaigns) {
            db.campaigns = [];
        }
        if (!db.contacts) {
            db.contacts = [];
        }
        if (!db.payments) {
            db.payments = [];
        }
        if (!db.chatbotRules) {
            db.chatbotRules = [];
        }
        if (!db.warmingTasks) {
            db.warmingTasks = [];
        }
        if (!db.scheduledMessages) {
            db.scheduledMessages = [];
        }
        if (!db.settings) {
            db.settings = {
                installDate: Date.now(),
                licenseKey: null,
                isActivated: false
            };
        }
        writeDB(db);
    }
}

// --- LICENSE HELPERS ---
export const getSettings = () => readDB().settings;

export const getTrialStatus = () => {
    const settings = getSettings();
    if (settings.isActivated) return { expired: false, daysLeft: 9999, isActivated: true };
    
    const oneDay = 24 * 60 * 60 * 1000;
    const trialDuration = 7 * oneDay;
    const elapsed = Date.now() - settings.installDate;
    const daysLeft = Math.max(0, Math.ceil((trialDuration - elapsed) / oneDay));
    
    return {
        expired: elapsed > trialDuration,
        daysLeft,
        isActivated: false
    };
};

export const activateLicense = (key: string) => {
    // Basic validation for now - can be more complex
    const validKey = "SADEN-WA-777-2024"; // Example master key
    if (key === validKey) {
        const db = readDB();
        db.settings.licenseKey = key;
        db.settings.isActivated = true;
        db.settings.activatedAt = Date.now();
        writeDB(db);
        return true;
    }
    return false;
};

// Read whole DB
export function readDB(): DatabaseSchema {
    try {
        const data = fs.readFileSync(DATABASE_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        return {
            users: parsed.users || [],
            devices: parsed.devices || [],
            campaigns: parsed.campaigns || [],
            contacts: parsed.contacts || [],
            payments: parsed.payments || [],
            chatbotRules: parsed.chatbotRules || [],
            warmingTasks: parsed.warmingTasks || [],
            scheduledMessages: parsed.scheduledMessages || []
        } as DatabaseSchema;
    } catch(err) {
        console.error('❌ Failed to read DB, returning default:', err);
        return defaultData;
    }
}

// Write whole DB
export function writeDB(data: DatabaseSchema) {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ==========================================
// 🛠️ DB Helper Functions
// ==========================================

// --- USERS ---
export const getUsers = () => readDB().users;
export const getUserByEmail = (email: string) => readDB().users.find(u => u.email === email);
export const getUserById = (id: string) => readDB().users.find(u => u.id === id);

export const addUser = (user: Omit<User, 'id' | 'createdAt'>) => {
    const db = readDB();
    const newUser: User = { ...user, id: Date.now().toString(), createdAt: Date.now() };
    db.users.push(newUser);
    writeDB(db);
    return newUser;
};

export const updateUserCredits = (userId: string, credits: number) => {
    const db = readDB();
    const idx = db.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
        db.users[idx].credits = credits;
        writeDB(db);
    }
};

// --- DEVICES ---
export const getDevices = (userId: string) => {
    const devices = readDB().devices;
    return devices.filter(d => d.userId === userId);
};

export const getAllDevices = () => readDB().devices; // For system auto-restore only

export const getDeviceById = (id: string) => readDB().devices.find(d => d.id === id);
export const getDeviceBySession = (sessionId: string) => readDB().devices.find(d => d.sessionId === sessionId);

export const addDevice = (device: Omit<Device, 'id' | 'createdAt'>) => {
    const db = readDB();
    const newDevice: Device = { ...device, id: Date.now().toString(), createdAt: Date.now() };
    db.devices.push(newDevice);
    writeDB(db);
    return newDevice;
};

export const updateDeviceStatus = (sessionId: string, status: 'connected' | 'disconnected', phone?: string) => {
    const db = readDB();
    const idx = db.devices.findIndex(d => d.sessionId === sessionId);
    if (idx !== -1) {
        db.devices[idx].status = status;
        if (phone) db.devices[idx].phone = phone;
        writeDB(db);
    }
};

export const deleteDevice = (sessionId: string, userId: string) => {
    const db = readDB();
    const device = db.devices.find(d => d.sessionId === sessionId);
    if (device && device.userId !== userId) {
        console.warn(`[DB] ⚠️ Unauthorized delete attempt for ${sessionId} by user ${userId}`);
        return false;
    }
    db.devices = db.devices.filter(d => d.sessionId !== sessionId);
    writeDB(db);
    return true;
};

// --- CAMPAIGNS ---
export const getCampaigns = (userId?: string) => {
    const campaigns = readDB().campaigns;
    return userId ? campaigns.filter(c => c.userId === userId) : campaigns;
};
export const addCampaign = (campaign: Omit<Campaign, 'id' | 'createdAt' | 'status' | 'progress' | 'totalSent' | 'totalDelivered' | 'totalFailed'>) => {
    const db = readDB();
    const newCampaign: Campaign = { 
        ...campaign, 
        id: Date.now().toString(), 
        targetCount: campaign.targetCount,
        deviceSessions: campaign.deviceSessions || [campaign.deviceSessions as unknown as string], // Fallback for safety
        messageText: campaign.messageText,
        minDelay: campaign.minDelay || 20,
        maxDelay: campaign.maxDelay || 60,
        status: 'draft',
        progress: 0,
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        sourceType: campaign.sourceType || 'database',
        sourceId: campaign.sourceId || campaign.targetGroup,
        manualNumbers: campaign.manualNumbers || [],
        createdAt: Date.now() 
    };
    db.campaigns.push(newCampaign);
    writeDB(db);
    return newCampaign;
};

export const updateCampaignStatus = (id: string, status: Campaign['status']) => {
    const db = readDB();
    const idx = db.campaigns.findIndex(c => c.id === id);
    if (idx !== -1) {
        db.campaigns[idx].status = status;
        writeDB(db);
    }
};

export const incrementCampaignProgress = (id: string, result: 'success' | 'failed') => {
    const db = readDB();
    const idx = db.campaigns.findIndex(c => c.id === id);
    if (idx !== -1) {
        db.campaigns[idx].totalSent = Number(db.campaigns[idx].totalSent) || 0;
        db.campaigns[idx].totalDelivered = Number(db.campaigns[idx].totalDelivered) || 0;
        db.campaigns[idx].totalFailed = Number(db.campaigns[idx].totalFailed) || 0;
        db.campaigns[idx].targetCount = Number(db.campaigns[idx].targetCount) || 1;

        if (result === 'success') {
            db.campaigns[idx].totalSent += 1;
            db.campaigns[idx].totalDelivered += 1;
        } else {
            db.campaigns[idx].totalFailed += 1;
        }
        
        db.campaigns[idx].progress = Math.floor(
            ((db.campaigns[idx].totalSent + db.campaigns[idx].totalFailed) / db.campaigns[idx].targetCount) * 100
        );
        writeDB(db);
    }
};

// --- CONTACTS ---
export const getContacts = (userId?: string) => {
    const contacts = readDB().contacts;
    return userId ? contacts.filter(c => c.userId === userId) : contacts;
};
export const addContact = (contact: Omit<Contact, 'id' | 'createdAt'>) => {
    const db = readDB();
    const newContact: Contact = { ...contact, id: Date.now().toString(), createdAt: Date.now() };
    db.contacts.push(newContact);
    writeDB(db);
    return newContact;
};

export const addContactsBulk = (contacts: Omit<Contact, 'id' | 'createdAt'>[]) => {
    const db = readDB();
    const newContacts: Contact[] = contacts.map((c, index) => ({
        ...c,
        id: (Date.now() + index).toString(),
        createdAt: Date.now()
    }));
    db.contacts.push(...newContacts);
    writeDB(db);
    return newContacts;
};

export const deleteContact = (id: string) => {
    const db = readDB();
    db.contacts = db.contacts.filter(c => c.id !== id);
    writeDB(db);
};
// --- PAYMENTS ---
export const getPayments = (userId?: string) => {
    const payments = readDB().payments;
    return userId ? payments.filter(p => p.userId === userId) : payments;
};

export const addPaymentRequest = (payment: Omit<PaymentRequest, 'id' | 'createdAt' | 'status'>) => {
    const db = readDB();
    const newRequest: PaymentRequest = { 
        ...payment, 
        id: Date.now().toString(), 
        status: 'pending',
        createdAt: Date.now() 
    };
    db.payments.push(newRequest);
    writeDB(db);
    return newRequest;
};

export const updatePaymentStatus = (id: string, status: 'approved' | 'rejected') => {
    const db = readDB();
    const idx = db.payments.findIndex(p => p.id === id);
    if (idx !== -1) {
        db.payments[idx].status = status;
        writeDB(db);
        return db.payments[idx];
    }
    return null;
};

// --- CHATBOT RULES ---
export const getChatbotRules = (userId?: string) => {
    const rules = readDB().chatbotRules || [];
    return userId ? rules.filter(r => r.userId === userId) : rules;
};

export const addChatbotRule = (rule: Omit<ChatbotRule, 'id' | 'createdAt'>) => {
    const db = readDB();
    if (!db.chatbotRules) db.chatbotRules = [];
    const newRule: ChatbotRule = { ...rule, id: Date.now().toString(), createdAt: Date.now() };
    db.chatbotRules.push(newRule);
    writeDB(db);
    return newRule;
};

export const updateChatbotRule = (id: string, updates: Partial<ChatbotRule>) => {
    const db = readDB();
    if (!db.chatbotRules) db.chatbotRules = [];
    const idx = db.chatbotRules.findIndex(r => r.id === id);
    if (idx !== -1) {
        db.chatbotRules[idx] = { ...db.chatbotRules[idx], ...updates };
        writeDB(db);
        return db.chatbotRules[idx];
    }
    return null;
};

export const deleteChatbotRule = (id: string) => {
    const db = readDB();
    if (!db.chatbotRules) db.chatbotRules = [];
    db.chatbotRules = db.chatbotRules.filter(r => r.id !== id);
    writeDB(db);
};

// --- WARMING TASKS ---
export const getWarmingTasks = (userId?: string) => {
    const tasks = readDB().warmingTasks || [];
    return userId ? tasks.filter(t => t.userId === userId) : tasks;
};

export const addWarmingTask = (task: Omit<WarmingTask, 'id' | 'createdAt'>) => {
    const db = readDB();
    if (!db.warmingTasks) db.warmingTasks = [];
    const newTask: WarmingTask = { ...task, id: Date.now().toString(), createdAt: Date.now() };
    db.warmingTasks.push(newTask);
    writeDB(db);
    return newTask;
};

export const updateWarmingTaskStatus = (id: string, status: 'running' | 'stopped') => {
    const db = readDB();
    if (!db.warmingTasks) db.warmingTasks = [];
    const idx = db.warmingTasks.findIndex(t => t.id === id);
    if (idx !== -1) {
        db.warmingTasks[idx].status = status;
        writeDB(db);
        return db.warmingTasks[idx];
    }
    return null;
};

export const deleteWarmingTask = (id: string) => {
    const db = readDB();
    if (!db.warmingTasks) db.warmingTasks = [];
    db.warmingTasks = db.warmingTasks.filter(t => t.id !== id);
    writeDB(db);
};

// --- SCHEDULED MESSAGES ---
export const getScheduledMessages = (userId: string) => {
    const db = readDB();
    if (!db.scheduledMessages) return [];
    return db.scheduledMessages.filter(s => s.userId === userId);
};

export const getAllPendingScheduledMessages = () => {
    const db = readDB();
    if (!db.scheduledMessages) return [];
    return db.scheduledMessages.filter(s => s.status === 'pending');
};

export const createScheduledMessage = (message: ScheduledMessage) => {
    const db = readDB();
    if (!db.scheduledMessages) db.scheduledMessages = [];
    db.scheduledMessages.push(message);
    writeDB(db);
    return message;
};

export const updateScheduledMessageStatus = (id: string, status: 'pending' | 'sent' | 'failed') => {
    const db = readDB();
    if (!db.scheduledMessages) return;
    const idx = db.scheduledMessages.findIndex(s => s.id === id);
    if (idx !== -1) {
        db.scheduledMessages[idx].status = status;
        writeDB(db);
    }
};

export const deleteScheduledMessage = (id: string) => {
    const db = readDB();
    if (!db.scheduledMessages) return;
    db.scheduledMessages = db.scheduledMessages.filter(s => s.id !== id);
    writeDB(db);
};
