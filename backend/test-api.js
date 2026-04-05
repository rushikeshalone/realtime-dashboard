fetch('http://localhost:5000/api/dashboard/top-cards', { headers: { 'x-api-key': 'Trust@2026' } })
  .then(res => res.json())
  .then(data => {
    require('fs').writeFileSync('api-test.txt', JSON.stringify(data, null, 2));
    console.log('Done!', data);
  })
  .catch(err => console.error(err));
