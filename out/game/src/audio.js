// Procedural audio using Web Audio API. All sounds synthesized at runtime, no assets needed.
// Agent-authored: complete audio system with footsteps, alerts, ambient hum, and synthesized effects.

let audioCtx = null;
let masterGain = null;

export function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.3;
  masterGain.connect(audioCtx.destination);
  // Resume on first user interaction (browser autoplay policy)
  document.body.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }, { once: true });
  document.body.addEventListener('keydown', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }, { once: true });
}

function playTone(freq, duration, type = 'sine', gain = 0.1, startTime = 0) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gainNode.gain.value = gain;
  osc.connect(gainNode).connect(masterGain);
  const t = audioCtx.currentTime + startTime;
  osc.start(t);
  osc.stop(t + duration);
}

function playNoise(duration, gain = 0.05, filterFreq = 2000, filterType = 'lowpass') {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = gain;
  source.connect(filter).connect(gainNode).connect(masterGain);
  source.start(audioCtx.currentTime);
  source.stop(audioCtx.currentTime + duration);
}

// Footstep sounds
export function playFootstep(sneaking) {
  initAudio();
  if (sneaking) {
    playTone(180, 0.06, 'sine', 0.04);
    playTone(120, 0.08, 'triangle', 0.02, 0.02);
  } else {
    playTone(220, 0.05, 'square', 0.06);
    playNoise(0.08, 0.04, 800, 'bandpass');
  }
}

// Guard alert sound
export function playGuardAlert() {
  initAudio();
  playTone(440, 0.15, 'sawtooth', 0.08);
  playTone(880, 0.1, 'sawtooth', 0.05, 0.05);
  playTone(660, 0.2, 'square', 0.04, 0.1);
}

// Artifact pickup
export function playArtifactPickup() {
  initAudio();
  playTone(660, 0.1, 'sine', 0.08);
  playTone(880, 0.1, 'sine', 0.06, 0.05);
  playTone(1320, 0.15, 'sine', 0.05, 0.1);
  for (let i = 0; i < 5; i++) {
    playTone(880 + i * 220, 0.05, 'triangle', 0.03, 0.15 + i * 0.03);
  }
}

// Escape success
export function playEscape() {
  initAudio();
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => playTone(freq, 0.25, 'sine', 0.08, i * 0.1));
  playTone(1318.5, 0.5, 'sine', 0.06, 0.4);
}

// Caught by guard
export function playCaught() {
  initAudio();
  playTone(220, 0.3, 'sawtooth', 0.1);
  playTone(110, 0.5, 'square', 0.08, 0.1);
  playNoise(0.4, 0.06, 300, 'lowpass');
}

// Alert level warning
export function playWarning() {
  initAudio();
  playTone(440, 0.1, 'square', 0.05);
  playTone(330, 0.1, 'square', 0.05, 0.1);
}

// Ambient hum (looped)
let ambientOsc = null;
let ambientGain = null;

export function startAmbient() {
  initAudio();
  if (ambientOsc) return;
  ambientOsc = audioCtx.createOscillator();
  ambientGain = audioCtx.createGain();
  ambientOsc.type = 'sine';
  ambientOsc.frequency.value = 55;
  ambientGain.gain.value = 0.008;
  ambientOsc.connect(ambientGain).connect(masterGain);
  ambientOsc.start();
  // Slow modulation
  const modOsc = audioCtx.createOscillator();
  const modGain = audioCtx.createGain();
  modOsc.type = 'sine';
  modOsc.frequency.value = 0.15;
  modGain.gain.value = 5;
  modOsc.connect(modGain).connect(ambientOsc.frequency);
  modOsc.start();
}

export function stopAmbient() {
  if (ambientOsc) {
    ambientOsc.stop();
    ambientOsc = null;
    ambientGain = null;
  }
}

export function setMasterVolume(vol) {
  if (masterGain) masterGain.gain.value = vol;
}
