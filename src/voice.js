// Reads a story aloud.
//   piper       open-source neural TTS, runs offline (pip install piper-tts)
//   elevenlabs  hosted voices, set ELEVENLABS_API_KEY
// The browser's own speech synthesis is the third option, handled client-side.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PYTHON } from './anomaly/index.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PIPER_VOICE = process.env.PIPER_VOICE || 'en_GB-alan-medium';
const PIPER_DIR = process.env.PIPER_DATA_DIR || join(ROOT, 'voices');
const ELEVEN_VOICE = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
const ELEVEN_MODEL = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
const MAX_CHARS = 9000;

export function voiceStatus() {
  return {
    piper: existsSync(join(PIPER_DIR, `${PIPER_VOICE}.onnx`)),
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
  };
}

const NUMBERS = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'];
const TEENS = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];

function minutesInWords(m) {
  if (m === 0) return "o'clock";
  if (m < 10) return `oh ${NUMBERS[m]}`;
  if (m < 20) return TEENS[m - 10];
  return m % 10 ? `${TENS[Math.floor(m / 10)]}-${NUMBERS[m % 10]}` : TENS[m / 10];
}

// "# Title\n\nAt 02:19 the door…" → "Title.\n\nAt two nineteen the door…"
export function speakable(markdown) {
  return markdown
    .replace(/^#+\s*(.+)$/gm, '$1.')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, (_, h, m) => `${NUMBERS[Number(h) % 12]} ${minutesInWords(Number(m))}`)
    .replace(/CO₂/g, 'C O two')
    .trim()
    .slice(0, MAX_CHARS);
}

export async function speak(story, { provider = 'piper' } = {}) {
  const text = speakable(story);
  if (!text) throw new Error('Nothing to read');
  if (provider === 'elevenlabs') return elevenLabs(text);
  if (provider === 'piper') return piper(text);
  throw new Error(`Unknown voice provider: ${provider}`);
}

async function piper(text) {
  if (!voiceStatus().piper) {
    throw new Error(`Piper voice ${PIPER_VOICE} not found in ${PIPER_DIR}. See README: Voice.`);
  }
  const dir = await mkdtemp(join(tmpdir(), 'ghost-voice-'));
  const out = join(dir, 'story.wav');
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(PYTHON, [
        '-m', 'piper', '--data-dir', PIPER_DIR, '-m', PIPER_VOICE, '-f', out,
        '--length-scale', process.env.PIPER_LENGTH_SCALE || '1.15', // a slower, graver delivery
        '--sentence-silence', '0.45',
      ]);
      let err = '';
      child.stderr.on('data', (d) => (err += d));
      child.on('error', reject);
      child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.trim().split('\n').at(-1) || `piper exited with ${code}`))));
      child.stdin.end(text);
    });
    return { contentType: 'audio/wav', extension: 'wav', audio: await readFile(out) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function elevenLabs(text) {
  if (!process.env.ELEVENLABS_API_KEY) throw new Error('Set ELEVENLABS_API_KEY to use ElevenLabs.');
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: ELEVEN_MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.35 },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return { contentType: 'audio/mpeg', extension: 'mp3', audio: Buffer.from(await res.arrayBuffer()) };
}
