import { getSession } from './sessionManager';

interface SendMessageOptions {
    sessionId: string;
    to: string; // The phone number
    text?: string;
    mediaUrl?: string;
    caption?: string;
}

export const sendMessage = async ({ sessionId, to, text, mediaUrl, caption }: SendMessageOptions) => {
    const session = getSession(sessionId);
    if (!session) {
        throw new Error(`Session ${sessionId} not found or disconnected`);
    }

    // Format phone number to WhatsApp JID with Smart Correction (Egypt & Saudi)
    let clean = to.replace(/\D/g, '');
    if (clean.startsWith('01') && clean.length === 11) {
        clean = '2' + clean; // Egypt
    } else if (clean.startsWith('05') && clean.length === 10) {
        clean = '966' + clean.substring(1); // Saudi
    } else if (clean.startsWith('5') && clean.length === 9) {
        clean = '966' + clean; // Saudi
    }

    const jid = to.includes('@s.whatsapp.net') || to.includes('@g.us') || to.includes('@lid') 
        ? to 
        : `${clean}@s.whatsapp.net`;

    try {
        let result;
        if (mediaUrl) {
            result = await session.sendMessage(jid, {
                image: { url: mediaUrl },
                caption: caption || text
            });
        } else if (text) {
            result = await session.sendMessage(jid, { text });
        } else {
            throw new Error('No content to send');
        }
        
        console.log(`[Sender] ✅ Message sent to ${jid}. Result ID: ${result?.key?.id}`);
        // Log the full result for debugging purposes (hidden in production usually)
        // console.log('[Sender] Full Result:', JSON.stringify(result));
        
        return result;
    } catch (error) {
        console.error(`[Sender] ❌ Failed to send message to ${to} via session ${sessionId}:`, error);
        throw error;
    }
};
