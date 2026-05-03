const https = require('http');

// ==========================================
// سكربت إرسال رسالة واتساب تجريبية 🚀
// ==========================================

// 1. ضع رقم الهاتف الذي تريد الإرسال إليه هنا (مسبوقاً بمفتاح الدولة بدون أصفار أو +)
const TARGET_PHONE = '201280102040'; // مثال: 201122334455

// 2. محتوى الرسالة
const MESSAGE_TEXT = 'أهلاً بك يا بطل! 🚀\nهذه أول رسالة حية من منصتك الاحترافية للتسويق عبر الواتساب (Multiwa) 🔥';

const postData = JSON.stringify({
  sessionId: 'test-session', // نفس اسم الجلسة في ملف test_connect.js
  to: TARGET_PHONE,
  text: MESSAGE_TEXT
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/whatsapp/send',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('📬 سيرفر الواتساب يقول:', data);
  });
});

req.on('error', (e) => {
  console.error('❌ خطأ في الاتصال بالسيرفر! تأكد أن سيرفر الباك إند يعمل على بورت 3001:', e.message);
});

req.write(postData);
req.end();
