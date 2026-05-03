const axios = require('axios');

async function testFlow() {
  const sessionId = 'test-session';
  const targetPhone = '201280102040'; // الرقم الذي قمت أنت بتحديده
  
  console.log('====================================================');
  console.log('🚀 [1] جاري ارسال امر توليد كود الـ QR للسيرفر...');
  console.log('====================================================');
  
  try {
    await axios.post('http://localhost:3001/api/whatsapp/connect', { sessionId });
    console.log('✅ تم ارسال الامر بنجاح!');
    console.log('\n⚠️⚠️ انتبه! ⚠️⚠️');
    console.log('افتح الشاشة الخاصة بـ npm run dev الان ستجد كود QR كبير قد ظهر');
    console.log('قم بفتح هاتفك (واتساب -> الاجهزة المرتبطة -> ربط جهاز) وامسح الكود');
  } catch(e) {
    console.log('❌ السيرفر لا يعمل! هل نسيت تشغيل npm run dev؟');
    return;
  }
  
  console.log('\n⏳ [2] جاري انتظارك لمسح الكود... (هذه الشاشة ستراقب السيرفر بالنيابة عنك)');
  
  let isConnected = false;
  while (!isConnected) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await axios.get(`http://localhost:3001/api/whatsapp/status/${sessionId}`);
      if (res.data.connected) {
         isConnected = true;
         console.log('\n🎉 ممتاز! تم ربط الرقم بنجاح ونحن متصلون بالواتساب الان!');
      } else {
         process.stdout.write('.');
      }
    } catch(e) {
         process.stdout.write('?');
    }
  }
  
  console.log(`\n\n🚀 [3] جاري اطلاق صاروخ التجربة الى الرقم: ${targetPhone}`);
  try {
     const sendRes = await axios.post('http://localhost:3001/api/whatsapp/send', {
       sessionId,
       to: targetPhone,
       text: 'أهلاً بك يا بطل! 🚀\nهذه الرسالة تم اطلاقها بشكل اوتوماتيكي سحري بمجرد مسحك للكود، من ذكائي الاصطناعي لتجربة منصتك الاحترافية (Multiwa)! 😎🔥'
     });
     console.log('\n✅ النتيجة:', sendRes.data);
     console.log('🎊 مبروووك! راجع هاتفك الان، الرسالة قد وصلتك!');
  } catch(e) {
     console.error('\n❌ فشل الارسال:', e.response ? e.response.data : e.message);
  }
}

testFlow();
