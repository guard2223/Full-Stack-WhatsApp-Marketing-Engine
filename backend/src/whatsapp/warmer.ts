import { getWarmingTasks, getDeviceBySession, updateWarmingTaskStatus } from '../db';
import { getSession } from './sessionManager';

// Standard warming phrases
const WARMING_PHRASES = [
    "السلام عليكم",
    "وعليكم السلام",
    "مرحباً",
    "أهلاً بالتواصل معكم",
    "كيف الحال؟",
    "بخير الحمدلله",
    "تمام الموعد مناسب",
    "شكراً لك",
    "العفو",
    "يعطيك العافية",
    "الله يعافيك",
    "بصراحة عرض ممتاز",
    "ممكن تفاصيل أكثر؟",
    "تم الاستلام",
    "سأقوم بمراجعة التفاصيل قريباً",
    "متى يمكننا التحدث؟",
    "وقت لاحق إن شاء الله"
];

// In-memory state tracking when the next message should be sent for a task
const nextTickMap = new Map<string, number>();

export const initWarmer = () => {
    console.log('[🔥 Warmer] Engine initialized.');
    
    // The main loop checks tasks every 5 seconds
    setInterval(async () => {
        const tasks = getWarmingTasks().filter(t => t.status === 'running');
        
        for (const task of tasks) {
            const now = Date.now();
            const nextTick = nextTickMap.get(task.id) || 0;

            // If it's time to send the next message for this task
            if (now >= nextTick) {
                try {
                    await processWarmingTask(task);
                } catch (e: any) {
                    console.error(`[🔥 Warmer] Error in task ${task.id}:`, e.message);
                }

                // Schedule the next message
                const minDelayMs = (task.minDelay || 15) * 1000;
                const maxDelayMs = (task.maxDelay || 45) * 1000;
                const randomDelay = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1) + minDelayMs);
                
                nextTickMap.set(task.id, Date.now() + randomDelay);
                console.log(`[🔥 Warmer] Task ${task.id} sleeping for ${randomDelay/1000}s...`);
            }
        }
    }, 5000);
};

async function processWarmingTask(task: any) {
    if (!task.devices || task.devices.length < 2) {
        console.log(`[🔥 Warmer] Task ${task.id} paused: Not enough devices (needs at least 2).`);
        updateWarmingTaskStatus(task.id, 'stopped');
        return;
    }

    // Pick random sender and receiver
    const senderId = task.devices[Math.floor(Math.random() * task.devices.length)];
    const possibleReceivers = task.devices.filter((d: string) => d !== senderId);
    if (possibleReceivers.length === 0) return;
    
    const receiverId = possibleReceivers[Math.floor(Math.random() * possibleReceivers.length)];

    const senderSock = getSession(senderId);
    if (!senderSock || !senderSock.user) {
        console.log(`[🔥 Warmer] Sender device ${senderId} not connected.`);
        return;
    }

    const receiverDevice = getDeviceBySession(receiverId);
    if (!receiverDevice || !receiverDevice.phone || receiverDevice.status !== 'connected') {
        console.log(`[🔥 Warmer] Receiver device ${receiverId} not available or missing phone.`);
        return;
    }

    // Format JID
    let phoneStr = receiverDevice.phone.replace(/\D/g, '');
    if (!phoneStr) return;
    const jid = `${phoneStr}@s.whatsapp.net`;

    const randomPhrase = WARMING_PHRASES[Math.floor(Math.random() * WARMING_PHRASES.length)];

    console.log(`[🔥 Warmer] 💬 ${senderId} -> ${receiverDevice.phone}: "${randomPhrase}"`);
    await senderSock.sendMessage(jid, { text: randomPhrase });
}
