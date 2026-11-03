// Writes assets/sounds/new-order.wav: a short two-note chime for new orders and waiter calls.
// We make it here instead of downloading one, so we own it and can tune it.
// Run: node scripts/gen-chime.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 22050; // Plenty for a chime, and keeps the file small (about 30 KB).
// Two rising notes (E5 then A5) read as "something arrived", not as an error buzz.
const NOTES = [
  { hz: 659.25, start: 0, length: 0.22 },
  { hz: 880.0, start: 0.16, length: 0.5 },
];
const seconds = 0.7;
const samples = new Float32Array(Math.round(RATE * seconds));

for (const note of NOTES) {
  const from = Math.round(note.start * RATE);
  const count = Math.round(note.length * RATE);
  for (let i = 0; i < count && from + i < samples.length; i += 1) {
    const t = i / RATE;
    // 5 ms fade-in avoids a click; the exponential tail sounds like a struck bell.
    const attack = Math.min(1, t / 0.005);
    const decay = Math.exp(-t * 6);
    // A quiet octave on top makes it bell-like rather than a pure beep.
    const wave = Math.sin(2 * Math.PI * note.hz * t) + 0.3 * Math.sin(4 * Math.PI * note.hz * t);
    samples[from + i] += 0.35 * attack * decay * wave;
  }
}

const data = Buffer.alloc(samples.length * 2);
samples.forEach((value, i) => {
  const clipped = Math.max(-1, Math.min(1, value));
  data.writeInt16LE(Math.round(clipped * 32767), i * 2);
});
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16); // fmt chunk size
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(RATE, 24);
header.writeUInt32LE(RATE * 2, 28); // bytes per second
header.writeUInt16LE(2, 32); // bytes per sample
header.writeUInt16LE(16, 34); // bits per sample
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

mkdirSync('assets/sounds', { recursive: true });
writeFileSync('assets/sounds/new-order.wav', Buffer.concat([header, data]));
console.log('wrote assets/sounds/new-order.wav');
