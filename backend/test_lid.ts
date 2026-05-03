
import { 
    makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import path from 'path';
import P from 'pino';

async function testLid() {
    const sessionId = 'session-1774404138700-1774406154557'; // Use one of the user's sessions
    const sessionDir = path.join(process.cwd(), 'sessions', sessionId);
    const { state } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();
    const logger = P({ level: 'silent' });

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        logger
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log('✅ Connected for test');
            const testLid = '165236149608459@lid'; // One from the user's list
            console.log(`🔍 Testing onWhatsApp for ${testLid}...`);
            try {
                // onWhatsApp usually takes strings
                const result = await sock.onWhatsApp(testLid);
                console.log('RESULT:', JSON.stringify(result, null, 2));
            } catch (e: any) {
                console.log('FAILED:', e.message);
            }
            process.exit(0);
        }
    });
}

testLid();
