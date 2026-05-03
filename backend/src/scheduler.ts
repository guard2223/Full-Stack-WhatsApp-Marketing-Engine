import { getAllPendingScheduledMessages, updateScheduledMessageStatus } from './db';
import { getSession } from './whatsapp/sessionManager';

let schedulerInterval: NodeJS.Timeout | null = null;

export const initScheduler = () => {
    console.log('📅 Initiating Background Message Scheduler Engine...');
    
    // Check every 60 seconds
    schedulerInterval = setInterval(async () => {
        try {
            const now = Date.now();
            const pendingTasks = getAllPendingScheduledMessages().filter(t => t.scheduledAt <= now);
            
            if (pendingTasks.length > 0) {
                console.log(`[Scheduler] 🚀 Found ${pendingTasks.length} pending tasks ready to be sent.`);
            }

            for (const task of pendingTasks) {
                const session = getSession(task.sessionId);
                
                if (!session || !session.user) {
                    console.log(`[Scheduler] ⚠️ Session ${task.sessionId} is offline. Skipping task ${task.id} for now.`);
                    continue; // Leave it pending for next iteration
                }

                try {
                    let successCount = 0;
                    // Execute sending
                    for (const target of task.targets) {
                        try {
                            const jid = target.includes('@s.whatsapp.net') || target.includes('@g.us') 
                                ? target 
                                : `${target}@s.whatsapp.net`;
                            
                            await session.sendMessage(jid, { text: task.message });
                            successCount++;
                            
                            // Anti-Ban minor sleep between messages in the same task
                            await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
                        } catch (err) {
                            console.error(`[Scheduler] ❌ Failed to send to ${target}:`, err);
                        }
                    }
                    
                    if (successCount > 0) {
                        console.log(`[Scheduler] ✅ Task ${task.id} finished successfully.`);
                        updateScheduledMessageStatus(task.id, 'sent');
                    } else {
                        console.log(`[Scheduler] ❌ Task ${task.id} failed for all targets.`);
                        updateScheduledMessageStatus(task.id, 'failed');
                    }
                    
                } catch (err) {
                    console.error(`[Scheduler] ❌ Critical failure on task ${task.id}:`, err);
                    updateScheduledMessageStatus(task.id, 'failed');
                }
            }
        } catch (error) {
            console.error('[Scheduler] Engine Error:', error);
        }
    }, 60000); // Check every minute
};

export const stopScheduler = () => {
    if (schedulerInterval) clearInterval(schedulerInterval);
};
