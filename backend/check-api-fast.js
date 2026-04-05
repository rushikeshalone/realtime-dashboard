const http = require('http');
const req = http.get('http://localhost:5000/api/dashboard/top-cards?apiKey=Trust@2026', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    require('fs').writeFileSync('api-check-result.txt', data);
    console.log('Saved to api-check-result.txt');
  });
});
req.on('error', (e) => {
  require('fs').writeFileSync('api-check-result.txt', 'ERROR: ' + e.message);
});
