/**
 * Configures Roamies to use Google Gemini AI and Google Gemini Voice (Charon / JARVIS).
 * Reads the GEMINI_API_KEY from .env and registers it in Roamies auth & secrets.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SIDECAR_DIR = path.join(ROOT, 'showcase', 'tauri', 'sidecar');

// 1. Read GEMINI_API_KEY from .env
function getApiKey() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`Could not find .env at ${envPath}`);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('GEMINI_API_KEY=')) {
      return trimmed.slice('GEMINI_API_KEY='.length).trim();
    }
  }
  throw new Error('GEMINI_API_KEY not found in .env');
}

async function configure() {
  const apiKey = getApiKey();
  console.log(`[Roamies Setup] Found Gemini API key: ${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);

  // Use createRequire based in SIDECAR_DIR to resolve packages from sidecar's node_modules
  const sidecarRequire = createRequire(path.join(SIDECAR_DIR, 'package.json'));
  const ggCorePath = sidecarRequire.resolve('@kenkaiiii/gg-core');
  const { AuthStorage } = await import(pathToFileURL(ggCorePath).href);
  const { createSecrets } = await import(pathToFileURL(path.join(SIDECAR_DIR, 'secrets.mjs')).href);
  const { DATA_DIR, CONFIG_PATH } = await import(pathToFileURL(path.join(SIDECAR_DIR, 'datadir.mjs')).href);

  // 2. Set credentials for Gemini in ~/.gg/auth.json
  const auth = new AuthStorage();
  await auth.setCredentials('gemini', {
    accessToken: apiKey,
    refreshToken: '',
    expiresAt: Date.now() + 100 * 365 * 864e5,
  });
  console.log('[Roamies Setup] ✓ Configured Google Gemini AI in ~/.gg/auth.json');

  // 3. Set voice secret in Roamies DPAPI secrets
  const secrets = createSecrets({ dataDir: DATA_DIR });
  await secrets.set('gemini-tts', apiKey);
  console.log('[Roamies Setup] ✓ Configured Google Gemini TTS voice key in Roamies DPAPI secrets');

  // 4. Update Roamies settings to use JARVIS and Gemini Voice
  fs.mkdirSync(DATA_DIR, { recursive: true });
  let settings = {};
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      settings = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch {}
  }

  settings = {
    ...settings,
    look: 'jarvis',
    tts: 'gemini',
    replies: 'voice',
    geminiModel: 'gemini-3.8-flash-lite-tts',
    geminiVoices: {
      ...(settings.geminiVoices || {}),
      jarvis: 'Charon',
      classic: 'Puck',
      anime: 'Leda',
      sarah: 'Sulafat',
      adrian: 'Achird',
    },
    onboarded: true,
    sound: true,
    volume: 100,
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(settings, null, 2), 'utf8');
  console.log('[Roamies Setup] ✓ Configured Roamies settings:');
  console.log('   - Character Look: JARVIS (glowing LED point sphere)');
  console.log('   - Voice Engine: Google Gemini Live TTS (no Fish Audio key needed!)');
  console.log('   - Voice Model: Charon (deep, calm, measured JARVIS voice)');
  console.log('   - Mode: Voice replies enabled');
  console.log('\n[Roamies Setup] Setup complete! Roamies is ready to run with Google Gemini.');
}

configure().catch((err) => {
  console.error('[Roamies Setup] Error:', err);
  process.exit(1);
});
