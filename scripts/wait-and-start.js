/**
 * scripts/wait-and-start.js
 * 
 * Wartet auf Backend/Frontend mit HTTP-Requests statt wait-on
 * Löst das localhost/127.0.0.1 Problem auf Windows
 * WINDOWS-KOMPATIBEL: Nutzt npx statt spawn('electron')
 */

const http = require('http');
const { execSync } = require('child_process');
const path = require('path');

async function waitForService(url, name, maxRetries = 120) {
  console.log(`⏳ Warte auf ${name}...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        http.get(url, (res) => {
          if (res.statusCode < 500) resolve();
          else reject();
        }).on('error', reject);
      });
      console.log(`✅ ${name} ist bereit!`);
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
      if (i % 10 === 0) process.stdout.write('.');
    }
  }
  
  console.error(`❌ ${name} antwortet nicht nach 120 Sekunden`);
  return false;
}

async function start() {
  console.log('\n🔍 Prüfe Services...\n');
  
  const backend = await waitForService('http://localhost:3001/api/health', 'Backend');
  const frontend = await waitForService('http://localhost:5173/', 'Frontend');
  
  if (!backend || !frontend) {
    console.error('\n❌ Services nicht bereit!');
    process.exit(1);
  }
  
  console.log('\n✅ Alle Services bereit! Starte Electron...\n');
  
  // WINDOWS-KOMPATIBEL: Verwende npx statt spawn
  try {
    execSync('npx electron .', {
      stdio: 'inherit',
      shell: true,
    });
  } catch (err) {
    console.error('Fehler beim Starten von Electron:', err.message);
    process.exit(1);
  }
}

start();