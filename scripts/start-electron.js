/**
 * scripts/start-electron.js
 * 
 * Dynamisch Backend-IP auslesen und Electron starten
 * Vorbereitung für NAS/Server-Deployment
 */

const http = require('http');
const { spawn } = require('child_process');

async function getBackendInfo() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:3001/api/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.network?.url) {
            console.log(`🌐 Backend entdeckt: ${json.network.url}`);
            resolve(json.network);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
    
    setTimeout(() => req.abort(), 5000);
  });
}

async function start() {
  console.log('⏳ Hole Backend-Netzwerk-Informationen...');
  const network = await getBackendInfo();
  
  if (network) {
    console.log(`✅ Backend läuft auf: ${network.url}`);
    console.log(`✅ Starte Electron...`);
  } else {
    console.log('⚠️  Konnte Backend-IP nicht auslesen, nutze localhost');
  }
  
  // Electron starten
  const electron = spawn('electron', ['.'], {
    stdio: 'inherit',
    env: { ...process.env, PIXFRAME_BACKEND_IP: network?.host || '127.0.0.1' }
  });
  
  electron.on('close', (code) => {
    console.log(`Electron beendet (Exit Code: ${code})`);
    process.exit(code);
  });
}

start().catch(err => {
  console.error('Fehler beim Starten von Electron:', err.message);
  process.exit(1);
});