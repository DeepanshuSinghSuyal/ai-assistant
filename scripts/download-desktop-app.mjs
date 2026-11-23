/**
 * Downloads the official prebuilt Roamies Windows Desktop App installer.
 */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INSTALLER_URL = 'https://github.com/KenKaiii/Roamies/releases/download/v0.1.50/Roamies_0.1.50_x64-setup.exe';
const DEST_PATH = path.join(ROOT, 'Roamies_Windows_Setup.exe');

console.log(`[Download] Downloading prebuilt Roamies Windows installer from:`);
console.log(`   ${INSTALLER_URL}`);
console.log(`   Saving to: ${DEST_PATH} ...\n`);

function download(url, dest) {
  const file = fs.createWriteStream(dest);
  https.get(url, (response) => {
    // Handle redirect
    if (response.statusCode === 302 || response.statusCode === 301) {
      return download(response.headers.location, dest);
    }
    const total = parseInt(response.headers['content-length'] || '0', 10);
    let downloaded = 0;

    response.on('data', (chunk) => {
      downloaded += chunk.length;
      if (total) {
        const pct = Math.round((downloaded / total) * 100);
        process.stdout.write(`\rDownloading: ${pct}% (${Math.round(downloaded / 1e6)} MB / ${Math.round(total / 1e6)} MB)`);
      }
    });

    response.pipe(file);

    file.on('finish', () => {
      file.close();
      console.log('\n\n✓ Download complete! You can run Roamies_Windows_Setup.exe to install the floating desktop app.');
    });
  }).on('error', (err) => {
    fs.unlink(dest, () => {});
    console.error('[Download] Error downloading installer:', err.message);
  });
}

download(INSTALLER_URL, DEST_PATH);
