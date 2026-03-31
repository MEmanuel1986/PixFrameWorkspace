/**
 * scripts/check-services.js
 *
 * Schnelle Diagnostic: Sind Backend/Frontend bereit?
 * Aufruf: npm run check
 */

const http = require('http');

function checkURL(url, name) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      console.log(`✅ ${name}: ${url} → ${res.statusCode}`);
      resolve(true);
    }).on('error', (err) => {
      console.log(`❌ ${name}: ${url} → ${err.message}`);
      resolve(false);
    });
  });
}

async function check() {
  console.log('🔍 Prüfe Services...\n');
  
  const backend = await checkURL('http://127.0.0.1:3001/api/health', 'Backend');
  const frontend = await checkURL('http://127.0.0.1:5173/', 'Frontend');
  
  console.log('\n📊 Status:');
  console.log(`   Backend:  ${backend ? '🟢 OK' : '🔴 DOWN'}`);
  console.log(`   Frontend: ${frontend ? '🟢 OK' : '🔴 DOWN'}`);
  
  if (backend && frontend) {
    console.log('\n✅ Bereit für Electron!');
    console.log('   npm run dev:electron\n');
  } else {
    console.log('\n⚠️  Services starten:');
    console.log('   npm run dev\n');
  }
}

check();