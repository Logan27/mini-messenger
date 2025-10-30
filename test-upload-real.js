const FormData = require('form-data');
const fs = require('fs');
const https = require('http');

async function testFileUpload() {
  try {
    const form = new FormData();
    form.append('files', fs.createReadStream('test-files/test-image.png'), 'test-image.png');

    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYTVmNzkwZC05NmQ4LTQwMzMtOGUxMi0zOTM4NzVjOTkwZWIiLCJlbWFpbCI6ImFsaWNlQGV4YW1wbGUuY29tIiwidXNlcm5hbWUiOiJhbGljZSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzMyNDg5NzI1LCJleHAiOjE3MzI1NzYxMjV9.5hA_HKF2UG9aZhTlrYKdxsF7PjdJcKW1y21GHPO2Fx4';

    console.log('Uploading test-files/test-image.png...');
    
    form.submit({
      protocol: 'http:',
      host: 'localhost',
      port: 4000,
      path: '/api/files/upload',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (err, res) => {
      if (err) {
        console.error('Error:', err.message);
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
          const result = JSON.parse(data);
          console.log('Response:', JSON.stringify(result, null, 2));
        } catch (e) {
          console.log('Raw response:', data);
        }
      });
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFileUpload();
