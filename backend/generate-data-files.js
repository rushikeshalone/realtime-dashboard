const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const xml2js = require('xml2js');
const { getPool } = require('./db');
const { CHANNELS, FETCHERS } = require('./worker');

const filesDir = path.join(__dirname, 'files');
const dirs = ['json', 'csv', 'xml', 'excel', 'config'];

dirs.forEach(d => {
  const dirPath = path.join(filesDir, d);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

const configPath = path.join(filesDir, 'config', 'datasource.txt');
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, 'SQL\n# Options: SQL, JSON, CSV, XML, EXCEL\n', 'utf8');
}

const generateCSV = (data) => {
  if (!data || !data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(h => {
      let val = row[h];
      if (val instanceof Date) val = val.toISOString();
      if (val === null || val === undefined) val = '';
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
};

const generateXML = (data, channel) => {
  const builder = new xml2js.Builder({ rootName: 'Rows', itemStruct: 'Row' });
  const cleanedData = data.map(row => {
    const newRow = {};
    for (let k in row) {
      newRow[k] = row[k] instanceof Date ? row[k].toISOString() : (row[k] ?? '');
    }
    return newRow;
  });
  return builder.buildObject({ Row: cleanedData });
};

async function run() {
  await getPool();
  
  for (const [key, channel] of Object.entries(CHANNELS)) {
    const data = await FETCHERS[channel]();
    if (!data || !data.length) {
      console.log(`No data for ${channel}, skipping.`);
      continue;
    }
    
    // JSON
    fs.writeFileSync(path.join(filesDir, 'json', `${channel}.json`), JSON.stringify(data, null, 2), 'utf8');
    
    // CSV
    fs.writeFileSync(path.join(filesDir, 'csv', `${channel}.csv`), generateCSV(data), 'utf8');
    
    // XML
    fs.writeFileSync(path.join(filesDir, 'xml', `${channel}.xml`), generateXML(data, channel), 'utf8');
    
    // EXCEL
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data.map(r => {
      const newR = { ...r };
      for (const k in newR) {
        if (newR[k] instanceof Date) newR[k] = newR[k].toISOString();
      }
      return newR;
    }));
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    xlsx.writeFile(wb, path.join(filesDir, 'excel', `${channel}.xlsx`));
    
    console.log(`✅ Generated files for ${channel}`);
  }
  
  console.log('🎉 Dump complete. Files are in /files directory!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
