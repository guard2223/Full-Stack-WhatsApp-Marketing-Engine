const http = require('http');

const data = JSON.stringify({ sessionId: 'test-session-1' });

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/whatsapp/connect',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  console.log(`Response Status: ${res.statusCode}`);
  res.on('data', d => {
    console.log('\nResponse Data:', d.toString());
    console.log('\n✅ Request sent successfully! Check your other terminal where the server is running to scan the QR code.');
  });
});

req.on('error', error => {
  console.error('Error connecting to Server:', error.message);
  console.log('Did you forget to start the server using `npm run dev`?');
});

req.write(data);
req.end();
