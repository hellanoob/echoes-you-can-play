/*
  ECHOES YOU CAN PLAY, ROOM 3: PROTOTYPE 5
  Jesse Xu, DIGF-5008. p5.js 1.11.13. The sound is the browser's Web Audio.

  The idea
  - My own instrument, opened up so anyone can play each part by hand. In the performance every control
    comes off my body or my desk and goes into one VCV Rack patch. Here each source is an object in the
    room with a cable to its channel on the rack strip at the bottom, so you can see what drives what.

  The parts
  - Headband, raw EEG: alpha, theta and beta each set the pitch of one synth layer. The three layers run a
    four step sequencer that never stops. Nobody here wears the headband, so the three waves drift on
    their own, like a recording, and you can drag any of them. Let go and it drifts again.
  - Headband, blink: tap the eyes. Each blink rings the bell.
  - Headband, focus: it keeps rising and feeds the delay on the bell, so the bell smears into echoes and
    the room starts to swirl. Hold the eyebrows up and focus drops and stays low. Let go and it climbs.
    The eyes also blink on their own every few seconds, and every blink rings the bell.
  - Apple Watch: the heart. Tap it like a heartbeat. The tempo is half of what you tap, so tapping 120
    runs the patch at 60. Left alone it settles back to 60.
  - Laptop lid: the hinge angle opens a distorted bass. It never closes all the way.
  - The black box the laptop rests on: TAP plays a snare over the beat, HIT plays a hard distorted kick.
  - Phone, shake: the drop. The melody ducks, the beat stops so the kicks don't pile up, and a kick at
    four times the heart tempo fades in (240 at 60). Keep shaking hard and a swirling riser builds. Put
    the phone down and it all falls away. On a laptop, grab the phone in the room and shake it with
    the mouse.
  - BEAT on the rack: the lo-fi kick and hat, always going. Switch it on and off. Shaking always stops it.
  - The start screen reads the way the phone is held. After Tap to start, a phone held upright shows the
    room turned sideways, so people turn the phone.
  - Six cards unlock as you play, one per part. Card text is in cards.js.
*/

const CONFIG = {
  link: '',                // the room's own address for the laptop's QR code. Empty: the page reads its own
  hub: '',                 // the page with all three rooms, for Exit. Only needed for separate p5 editor sketches: paste its Fullscreen link

  // heart: you tap a heartbeat, the tempo is half of it
  restBpm: 60,             // the tempo it starts at and settles back to. I played at 60
  heartMin: 90, heartMax: 200,   // the tapped heart rate is held in this range, so the tempo stays 45 to 100
  relaxAfter: 5,           // seconds without a tap before the heart starts settling
  relaxRate: 3,            // heart BPM per second it settles back

  // melody: three layers, four steps
  stepsPerBeat: 2,         // melody steps per heartbeat. 1 is one step per beat
  root: 57,                // A3. Every layer is built on this, in the scale below
  scale: [0, 3, 5, 7, 10], // minor pentatonic
  bandSpan: 5,             // how many scale steps a brain wave moves its layer, from low to high
  holdAfterDrag: 4,        // seconds a dragged wave stays where you left it before drifting again

  // beat
  swing: 0.14,             // how late the off beat hats land, as a share of an eighth note

  // focus and delay
  focusRise: 1 / 35,       // focus climbs from 0 to full in about 35 seconds
  focusFall: 1.2,          // how fast it drops while the eyebrows are held up (per second)
  blinkEvery: [2.5, 6],    // the eyes blink on their own, every this many seconds

  // lid
  lidMin: 22, lidMax: 128, lidStart: 70,   // degrees from closed. It never closes all the way

  // shake: the phone's motion, as an RMS over a short window, in m/s². The threshold is high on purpose,
  // so holding the phone and tapping the screen doesn't start the drop
  shakeFrom: 7, shakeTo: 20, shakeWindow: 0.35, shakeHold: 0.25,
  // the same for shaking the phone in the room with a mouse or finger: how far it travels, in room
  // heights per second
  wiggleFrom: 0.5, wiggleTo: 2.0,
  dropRise: 1.1,           // how fast the drop fades in (per second, 0 to 1)
  dropFall: 1.6,           // how fast it falls away once the shaking stops
  dropMultiple: 4,         // the drop kick runs at this many times the heart
  riserFrom: 0.55,         // shake effort above this builds the riser
  riserBuild: 0.28,        // per second, scaled by effort
  riserFall: 1.3,

  master: 0.85,

  unlock: { brainDrag: 0.35, blinks: 3, heartTaps: 4, lidSwing: 45, drop: 0.85, riser: 0.2 }
};

const MODES = {
  phone: {
    help: 'Once it starts, turn the phone on its side. Tap the TAP and HIT pads on the black box, tap the heart like a heartbeat, drag the laptop lid, tap the eyes to blink, hold the eyebrows up, and drag the three brain waves on the headband. For the drop, shake the phone.',
    caveat: 'In the performance these come off my body and my desk: an EEG headband, an Apple Watch reading my heart, a laptop that feels knocks and its own hinge, and a phone’s motion. Here you play each one by hand.'
  },
  laptop: {
    help: 'Click the TAP and HIT pads on the black box and the eyes. Tap the heart like a heartbeat. Hold the eyebrows up. Drag the laptop lid and the three brain waves. For the drop, grab the phone in the room and shake it hard with the mouse. Keys: T tap, H hit, B blink, E hold the eyebrows, K heart.',
    caveat: 'In the performance these come off my body and my desk: an EEG headband, an Apple Watch reading my heart, a laptop that feels knocks and its own hinge, and a phone’s motion. Here you play each one by hand.'
  }
};

// the three layers, in the order of the headband's rows
const LAYERS = [
  { id: 'theta', sym: 'θ', name: 'THETA', col: '#7C9CFF', drift: 0.05, cycles: 2, oct: -12, pattern: [0, 0, 2, 1], wave: 'triangle', len: 0.95, gain: 0.26, cut: 900 },
  { id: 'alpha', sym: 'α', name: 'ALPHA', col: '#B6F24A', drift: 0.11, cycles: 6, oct: 0, pattern: [0, 2, 4, 3], wave: 'sawtooth', len: 0.55, gain: 0.07, cut: 1500 },
  { id: 'beta', sym: 'β', name: 'BETA', col: '#FF9F43', drift: 0.3, cycles: 15, oct: 12, pattern: [4, 2, 3, 1], wave: 'square', len: 0.22, gain: 0.04, cut: 2600 }
];
const BANDS = LAYERS.map((l, i) => ({ v: 0.5, manual: 0.5, blend: 0, holding: false, holdUntil: 0, seed: 11 + i * 37 }));

// the rack strip: one channel per sound
const CH = [
  { id: 'theta', lab: 'θ', sub: 'THETA', col: LAYERS[0].col },
  { id: 'alpha', lab: 'α', sub: 'ALPHA', col: LAYERS[1].col },
  { id: 'beta', lab: 'β', sub: 'BETA', col: LAYERS[2].col },
  { id: 'bell', lab: 'BELL', sub: 'DELAY', col: '#E7B8FF' },
  { id: 'beat', lab: 'BEAT', sub: 'KICK HAT', col: '#ECE6D6' },
  { id: 'snare', lab: 'SNARE', sub: 'TAP', col: '#ECE6D6' },
  { id: 'hit', lab: 'KICK', sub: 'HIT', col: '#FF5C5C' },
  { id: 'bass', lab: 'BASS', sub: 'LID', col: '#FFB35C' },
  { id: 'drop', lab: 'DROP', sub: '× 4', col: '#B6F24A' },
  { id: 'riser', lab: 'RISER', sub: 'SHAKE', col: '#FF5FA2' }
];
const CH_BY_ID = {};
CH.forEach(c => { CH_BY_ID[c.id] = c; c.m = 0; });

const COL = { ivory: '#ECE6D6', dim: 'rgba(236,230,214,0.6)', line: 'rgba(236,230,214,0.15)', neon: '#B6F24A', pink: '#FF5FA2', bg: '#0B0A0F' };
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const $ = id => document.getElementById(id);
const CARDS = window.CARDS || [];
const CARD_BY_ID = {};
CARDS.forEach(c => { CARD_BY_ID[c.id] = c; });
const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const KIND = coarse ? 'phone' : 'laptop';
const MODE = MODES[KIND];

let turned = false;
let started = false;
let L = null;
let audio = null;
let canvasEl = null;
let lastT = 0;
let wakeLock = null;
const unlocked = new Set();
const drags = new Map();

const heart = { bpm: CONFIG.restBpm, rate: CONFIG.restBpm * 2, target: CONFIG.restBpm * 2, lastTap: -1e9, taps: [], count: 0, flash: 0 };   // bpm is the tempo, rate the heart
const face = { blinkAt: -1e9, nextBlink: 3, browHeld: new Set(), browUp: 0, blinks: 0, brows: 0, focus: 0, rings: [] };
const lid = { angle: CONFIG.lidStart, lo: CONFIG.lidStart, hi: CONFIG.lidStart, touched: false };
const pads = { tap: { at: -1e9, n: 0 }, hit: { at: -1e9, n: 0 } };
const shake = { buf: [], wig: [], grav: null, motion: false, asked: false, effort: 0, activeT: 0, target: 0, level: 0, riser: 0, lastWig: null };
const seq = { next: 0, i: 0, step: -1 };
let beatOn = true;
let brainMoved = 0;
const vis = [];        // visual events waiting for their sound to play: { at (audio time), f }
const pulses = [];     // dots running along the cables
let shakeAt = 0, hitShake = 0;
let toastQueue = [], toastId = null, toastTimer = null;
let noted = {};

/* ================= p5 ================= */

function setup() {
  const v = turnRoom();
  const c = createCanvas(v.w, v.h);
  c.parent('stage');
  canvasEl = c.elt;
  pixelDensity(Math.min(2, displayDensity()));
  noiseSeed(5);
  layout();
  listenPointer();
  listenUI();
  renderArchive();
  if (document.fonts && document.fonts.load) {
    const faces = ['500 12px Jost', '600 12px Jost', '12px "IBM Plex Mono"', '500 12px "IBM Plex Mono"', 'italic 12px Newsreader'];
    Promise.all(faces.map(f => document.fonts.load(f).catch(() => null))).then(() => layout());
  }
}

function windowResized() {
  const v = turnRoom();
  resizeCanvas(v.w, v.h);
  layout();
}

// Once the room has started, a phone held upright gets the whole room turned a quarter turn, so it is
// always wide. The start screen stays the way the phone is held. Everything sits in #app, and #app turns.
function turnRoom() {
  const W = window.innerWidth, H = window.innerHeight, app = $('app');
  turned = started && coarse && Math.min(W, H) < 600 && H > W;
  const w = turned ? H : W, h = turned ? W : H;
  app.style.width = w + 'px';
  app.style.height = h + 'px';
  app.style.transform = turned ? 'translateX(' + W + 'px) rotate(90deg)' : '';
  app.classList.toggle('turned', turned);
  app.classList.toggle('short', h < 520);
  return { w, h };
}

function localXY(e) {
  if (turned) return { x: e.clientY, y: window.innerWidth - e.clientX };
  const r = canvasEl.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function safeInsets() {
  const cs = getComputedStyle($('safe'));
  const p = k => parseFloat(cs[k]) || 0;
  const s = { t: p('paddingTop'), r: p('paddingRight'), b: p('paddingBottom'), l: p('paddingLeft') };
  return turned ? { t: s.r, r: s.b, b: s.l, l: s.t } : s;   // turned, the phone's top (the notch) is the room's left
}

function draw() {
  if (!L) return;
  const now = performance.now() / 1000, dt = Math.min(0.1, Math.max(0.001, now - (lastT || now)));
  lastT = now;
  updateBands(now, dt);
  updateHeart(now, dt);
  updateFocus(dt);
  updateShake(now, dt);
  schedule();
  runVis();
  syncSound();
  if (started) trackCards();
  drawRoom(now, dt);
}

/* ================= layout ================= */

function layout() {
  const W = width, H = height, s = safeInsets();
  const portrait = H > W * 1.05;
  const pad = 14;
  const x0 = pad + s.l, x1 = W - pad - s.r, top = pad + s.t;
  const uw = x1 - x0;
  placeHud(portrait, s);
  const rackH = constrain(Math.round(H * 0.15), 56, 92);
  const rack = { x: x0, y: H - pad - s.b - rackH, w: uw, h: rackH };
  const floor = rack.y - 26;
  const hudB = top + 44;
  let scope, faceB, lap, watch, phone;
  if (!portrait) {
    const aw = uw * 0.3, bx = x0 + uw * 0.32, bw = uw * 0.42, cx = x0 + uw * 0.76, cw = x1 - cx;
    const sh = constrain((floor - top) * 0.36, 84, 132);
    scope = { x: x0, y: top, w: aw, h: sh };
    faceB = { x: x0, y: top + sh + 8, w: aw, h: floor - top - sh - 8 };
    lap = { x: bx, y: hudB + 6, w: bw, h: floor - hudB - 6 };
    const mid = hudB + 6 + (floor - hudB - 6) * 0.5;
    watch = { x: cx, y: hudB + 6, w: cw, h: mid - hudB - 10 };
    phone = { x: cx, y: mid + 4, w: cw, h: floor - mid - 4 };
  } else {
    const sh = constrain(H * 0.15, 96, 140);
    scope = { x: x0, y: hudB + 34, w: uw, h: sh };
    const r2 = scope.y + sh + 10, r2h = (floor - r2) * 0.48;
    faceB = { x: x0, y: r2, w: uw * 0.56, h: r2h };
    watch = { x: x0 + uw * 0.58, y: r2, w: uw * 0.42, h: r2h * 0.5 };
    phone = { x: x0 + uw * 0.58, y: r2 + r2h * 0.5, w: uw * 0.42, h: r2h * 0.5 };
    lap = { x: x0, y: r2 + r2h + 8, w: uw, h: floor - r2 - r2h - 8 };
  }
  L = { W, H, s, portrait, pad, x0, x1, top, floor, rack, scopeB: scope, faceB, lapB: lap, watchB: watch, phoneB: phone, fs: constrain(Math.min(W, H) / 420, 0.78, 1.25) };
  placeScope(); placeFace(); placeLaptop(); placeWatch(); placePhone(); placeRack();
  placeToast();
}

function placeHud(portrait, s) {
  const hud = $('hud');
  hud.style.top = (12 + s.t) + 'px';
  hud.style.right = (12 + s.r) + 'px';
  hud.style.left = portrait ? (12 + s.l) + 'px' : 'auto';
}

// the toast sits over the headband's panel, which matters least for a few seconds. Upright, it sits low
function placeToast() {
  const t = $('toast');
  if (L.portrait) {
    const w = Math.min(380, L.W - 2 * L.pad);
    t.style.left = ((L.W - w) / 2) + 'px'; t.style.right = 'auto'; t.style.width = w + 'px';
    t.style.top = 'auto'; t.style.bottom = (L.H - L.rack.y + 30) + 'px';
  } else {
    const b = L.scopeB;
    t.style.left = b.x + 'px'; t.style.right = 'auto'; t.style.width = Math.max(250, Math.min(b.w, 380)) + 'px';
    t.style.top = b.y + 'px'; t.style.bottom = 'auto';
  }
}

function placeScope() {
  const b = L.scopeB, rows = 4, rh = b.h / rows;
  const lw = Math.min(78, b.w * 0.27) * L.fs, nw = 34 * L.fs;
  L.scope = { b, rh, rows: [] };
  for (let i = 0; i < rows; i++) {
    const y0 = b.y + rh * i;
    L.scope.rows.push({ y0, cy: y0 + rh / 2, tx0: b.x + lw, tx1: b.x + b.w - nw - 6, lx: b.x + 10, nx: b.x + b.w - 8 });
  }
}

function placeFace() {
  const b = L.faceB;
  const ry = Math.min(b.h * 0.42, b.w * 0.5, 230), rx = ry * 0.76;
  const cx = b.x + b.w / 2, cy = b.y + b.h * 0.47;
  const ey = cy - ry * 0.02, ex = rx * 0.38, erx = rx * 0.21, ery = rx * 0.11;
  L.face = { cx, cy, rx, ry, ey, eyes: [{ x: cx - ex, y: ey }, { x: cx + ex, y: ey }], erx, ery,
    browY: cy - ry * 0.22, bandY: cy - ry * 0.5, bandH: ry * 0.17, bottom: b.y + b.h };
}

function placeLaptop() {
  const b = L.lapB;
  const pw = Math.min(b.h / 1.95, b.w * 0.44, 330);
  const ph = pw * 0.78;
  const px = b.x + b.w * 0.56 - pw / 2, py = b.y + b.h - ph;
  const lw = pw * 1.12, lt = Math.max(4, lw * 0.045);
  const bx = px + pw / 2 - lw / 2, by = py - lt;
  const r1 = Math.min(pw * 0.15, ph * 0.19), r2 = r1 * 1.22;
  L.box = { x: px, y: py, w: pw, h: ph,
    pads: [{ id: 'tap', x: px + pw * 0.29, y: py + ph * 0.42, r: r1 }, { id: 'hit', x: px + pw * 0.71, y: py + ph * 0.42, r: r2 }] };
  L.lap = { bx, by, lw, lt, hx: bx + lt * 0.6, hy: by, len: lw * 0.93 };
}

function placeWatch() {
  const b = L.watchB;
  const ws = Math.min(b.w * 0.6, (b.h - 18 * L.fs) * 0.78, 190);
  L.watch = { cx: b.x + b.w / 2, cy: b.y + (b.h - 18 * L.fs) / 2, w: ws, h: ws * 1.18, b };
}

function placePhone() {
  const b = L.phoneB;
  const h = Math.min((b.h - 18 * L.fs) * 0.92, b.w * 0.9, 250), w = h * 0.52;
  L.phone = { cx: b.x + b.w / 2, cy: b.y + (b.h - 18 * L.fs) / 2, w, h, b };
}

function placeRack() {
  const r = L.rack, cw = Math.min(96, r.w * 0.13);
  const chW = (r.w - cw - 8) / CH.length;
  L.clock = { x: r.x + 6, y: r.y, w: cw, h: r.h };
  CH.forEach((c, i) => { c.x = r.x + cw + 8 + chW * i; c.w = chW; c.cx = c.x + chW / 2; });
  const beat = CH_BY_ID.beat;
  L.beatBtn = { x: beat.x + 5, y: r.y + r.h * 0.34, w: beat.w - 10, h: r.h * 0.36 };
  // where each cable starts
  const F = L.face, S = L.scope, B = L.box, P = L.phone, Wt = L.watch;
  L.cables = [
    { ch: 'theta', x: S.rows[0].tx1 + 4, y: S.rows[0].cy },
    { ch: 'alpha', x: S.rows[1].tx1 + 4, y: S.rows[1].cy },
    { ch: 'beta', x: S.rows[2].tx1 + 4, y: S.rows[2].cy },
    { ch: 'bell', x: F.cx, y: F.ey + F.ery * 2 },
    { ch: 'snare', x: B.pads[0].x, y: B.pads[0].y + B.pads[0].r },
    { ch: 'hit', x: B.pads[1].x, y: B.pads[1].y + B.pads[1].r },
    { ch: 'bass', x: L.lap.hx, y: L.lap.hy },
    { ch: 'drop', x: P.cx - P.w * 0.2, y: P.cy + P.h / 2 },
    { ch: 'riser', x: P.cx + P.w * 0.2, y: P.cy + P.h / 2 },
    { ch: 'clock', x: Wt.cx, y: Wt.cy + Wt.h / 2 }
  ];
}

/* ================= the parts ================= */

function updateBands(now, dt) {
  BANDS.forEach((b, i) => {
    const drift = constrain(0.5 + (noise(b.seed, now * LAYERS[i].drift) - 0.5) * 2.4, 0, 1);
    if (b.holding) b.blend = 1;
    else if (now > b.holdUntil) b.blend = Math.max(0, b.blend - dt / 3);
    b.v = lerp(drift, b.manual, b.blend);
  });
}

function degreeSemis(d) {
  const S = CONFIG.scale, n = S.length, o = Math.floor(d / n), i = ((d % n) + n) % n;
  return S[i] + 12 * o;
}
function layerMidi(li, step) {
  const ly = LAYERS[li], shift = Math.round(BANDS[li].v * CONFIG.bandSpan);
  return CONFIG.root + ly.oct + degreeSemis(ly.pattern[((step % 4) + 4) % 4] + shift);
}
function noteName(m) { const r = Math.round(m); return NOTE_NAMES[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 1); }
function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

// Tap it like a heartbeat: the heart rate is how fast you tap, and the tempo is half of it
function tapHeart(now) {
  if (now - heart.lastTap > 2) heart.taps = [];
  heart.taps.push(now);
  while (heart.taps.length > 5) heart.taps.shift();
  if (heart.taps.length >= 2) {
    const iv = []; for (let i = 1; i < heart.taps.length; i++) iv.push(heart.taps[i] - heart.taps[i - 1]);
    const sorted = iv.slice().sort((a, b) => a - b), mid = sorted[Math.floor(sorted.length / 2)];
    heart.target = constrain(60 / mid, CONFIG.heartMin, CONFIG.heartMax);
  }
  heart.lastTap = now; heart.count++; heart.flash = 1;
  cablePulse('clock');
}

function updateHeart(now, dt) {
  if (now - heart.lastTap > CONFIG.relaxAfter) {
    const rest = CONFIG.restBpm * 2, d = heart.target - rest;
    heart.target = rest + Math.sign(d) * Math.max(0, Math.abs(d) - CONFIG.relaxRate * dt);
  }
  heart.rate += (heart.target - heart.rate) * Math.min(1, dt * 2.5);   // the tempo glides, it doesn't jump
  heart.bpm = heart.rate / 2;
  heart.flash = Math.max(0, heart.flash - dt * 3);
}

// Focus climbs on its own. Holding the eyebrows up brings it down and keeps it low
function updateFocus(dt) {
  if (!started) return;
  const held = face.browHeld.size > 0;
  face.browUp += ((held ? 1 : 0) - face.browUp) * Math.min(1, dt * 12);
  if (held) face.focus = Math.max(0, face.focus - dt * CONFIG.focusFall);
  else face.focus = Math.min(1, face.focus + dt * CONFIG.focusRise);
  // natural blinks, every few seconds
  const now = performance.now() / 1000;
  if (now >= face.nextBlink) { blink(true); }
}

function blink(auto) {
  const now = performance.now() / 1000;
  face.blinkAt = now;
  if (!auto) face.blinks++;
  const [a, b] = CONFIG.blinkEvery;
  face.nextBlink = now + a + Math.random() * (b - a);
  playBell();
  cablePulse('bell');
}

// held by a pointer or the E key; the first hold flushes the echoes already in the delay
function browsDown(id) {
  if (face.browHeld.has(id)) return;
  if (!face.browHeld.size) {
    face.brows++;
    face.rings.length = 0;
    if (audio) audio.clearUntil = audio.ctx.currentTime + 0.45;
  }
  face.browHeld.add(id);
}
function browsUp(id) { face.browHeld.delete(id); }

function strike(id) {
  const now = performance.now() / 1000;
  pads[id].at = now; pads[id].n++;
  if (id === 'tap') { playSnare(); CH_BY_ID.snare.m = 1; cablePulse('snare'); }
  else { playHit(); CH_BY_ID.hit.m = 1; cablePulse('hit'); hitShake = 1; }
}

function setLid(a) {
  lid.angle = constrain(a, CONFIG.lidMin, CONFIG.lidMax);
  lid.lo = Math.min(lid.lo, lid.angle); lid.hi = Math.max(lid.hi, lid.angle);
  lid.touched = true;
}
function lidAmt() { return (lid.angle - CONFIG.lidMin) / (CONFIG.lidMax - CONFIG.lidMin); }

/* ================= shaking ================= */

function askMotion() {
  if (shake.asked) return;
  shake.asked = true;
  const D = window.DeviceMotionEvent;
  const listen = () => window.addEventListener('devicemotion', onMotion);
  if (D && typeof D.requestPermission === 'function') {
    D.requestPermission().then(r => {
      if (r === 'granted') listen();
      else showNote('Motion', 'Motion access was turned down. Shake the phone in the room with your finger instead.', 5000);
    }).catch(() => listen());
  } else if (D) listen();
}

function onMotion(e) {
  const now = performance.now() / 1000;
  let mag = null;
  const a = e.acceleration;
  if (a && a.x != null) mag = Math.hypot(a.x, a.y, a.z || 0);
  else {
    const g = e.accelerationIncludingGravity;
    if (!g || g.x == null) return;
    if (!shake.grav) shake.grav = { x: g.x, y: g.y, z: g.z || 0 };
    const G = shake.grav, k = 0.08;
    G.x += (g.x - G.x) * k; G.y += (g.y - G.y) * k; G.z += ((g.z || 0) - G.z) * k;
    mag = Math.hypot(g.x - G.x, g.y - G.y, (g.z || 0) - G.z);
  }
  shake.motion = true;
  shake.buf.push({ t: now, v: mag * mag });
}

function rms(buf, now, win) {
  while (buf.length && now - buf[0].t > win) buf.shift();
  if (!buf.length) return 0;
  let s = 0; buf.forEach(p => { s += p.v; });
  return Math.sqrt(s / buf.length);
}

function updateShake(now, dt) {
  const m = rms(shake.buf, now, CONFIG.shakeWindow);
  // the wiggle: how far the pointer carried the phone over the window
  while (shake.wig.length && now - shake.wig[0].t > CONFIG.shakeWindow) shake.wig.shift();
  const w = shake.wig.reduce((a, p) => a + p.v, 0) / CONFIG.shakeWindow;
  const e1 = constrain((m - CONFIG.shakeFrom) / (CONFIG.shakeTo - CONFIG.shakeFrom), 0, 1);
  const e2 = constrain((w - CONFIG.wiggleFrom) / (CONFIG.wiggleTo - CONFIG.wiggleFrom), 0, 1);
  shake.effort = started ? Math.max(e1, e2) : 0;
  if (shake.effort > 0) shake.activeT += dt; else shake.activeT = 0;
  shake.target = shake.activeT >= CONFIG.shakeHold ? shake.effort : 0;
  if (shake.target > shake.level) shake.level = Math.min(shake.target, shake.level + CONFIG.dropRise * dt);
  else shake.level = Math.max(shake.target, shake.level - CONFIG.dropFall * dt);
  if (shake.target >= CONFIG.riserFrom) shake.riser = Math.min(1, shake.riser + CONFIG.riserBuild * (0.5 + shake.target) * dt);
  else shake.riser = Math.max(0, shake.riser - CONFIG.riserFall * dt);
  CH_BY_ID.riser.m = Math.max(CH_BY_ID.riser.m, shake.riser);
  if (shake.level > 0.02) shakeAt = now;
}

/* ================= sound ================= */

function buildAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const g = v => { const n = ctx.createGain(); n.gain.value = v; return n; };
  const filt = (type, f, q) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q != null) n.Q.value = q; return n; };
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
  const master = g(CONFIG.master);
  master.connect(comp); comp.connect(ctx.destination);
  const verb = ctx.createConvolver(); verb.buffer = roomImpulse(ctx, 2.4, 2.6);
  const verbOut = g(0.5); verb.connect(verbOut); verbOut.connect(master);
  const duck = g(1); duck.connect(master);                  // a hard hit ducks everything under it for a moment
  const melody = g(1); melody.connect(duck);
  const melSend = g(0.3); melody.connect(melSend); melSend.connect(verb);
  const beat = g(1); beat.connect(duck);
  const snare = g(0.9); snare.connect(master);
  const snSend = g(0.18); snare.connect(snSend); snSend.connect(verb);
  const hit = g(1); hit.connect(master);
  const drop = g(0); drop.connect(master);
  // the bell and its delay
  const bell = g(1); bell.connect(master);
  const bSend = g(0.25); bell.connect(bSend); bSend.connect(verb);
  const dl = ctx.createDelay(2.5); dl.delayTime.value = 0.75;
  const fb = g(0.2), dlLp = filt('lowpass', 3400, 0.5), dlHp = filt('highpass', 220, 0.5), wet = g(0.2);
  bell.connect(dl); dl.connect(dlLp); dlLp.connect(dlHp); dlHp.connect(fb); fb.connect(dl);
  let wetOut = wet;
  dlHp.connect(wet);
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (pan) { wet.connect(pan); wetOut = pan; }
  wetOut.connect(master);
  const wetVerb = g(0.4); wet.connect(wetVerb); wetVerb.connect(verb);
  const wob = ctx.createOscillator(); wob.frequency.value = 0.31;
  const wobG = g(0); wob.connect(wobG); wobG.connect(dl.delayTime); wob.start();
  let panG = null;
  if (pan) { const pl = ctx.createOscillator(); pl.frequency.value = 0.19; panG = g(0); pl.connect(panG); panG.connect(pan.pan); pl.start(); }
  // the distorted bass: saw and a sine an octave down, through a drive and a resonant filter, opened by the lid
  const bo = ctx.createOscillator(); bo.type = 'sawtooth'; bo.frequency.value = 55;
  const bs = ctx.createOscillator(); bs.type = 'sine'; bs.frequency.value = 55;
  const benv = g(0), bsG = g(0.7);
  bo.connect(benv); bs.connect(bsG); bsG.connect(benv);
  const drive = g(1), shaper = ctx.createWaveShaper(); shaper.curve = driveCurve(3); shaper.oversample = '2x';
  const blp = filt('lowpass', 300, 4), bass = g(0);
  benv.connect(drive); drive.connect(shaper); shaper.connect(blp); blp.connect(bass); bass.connect(duck);
  bo.start(); bs.start();
  // the riser: noise through a sweeping band pass and two detuned saws, panned in circles
  const nb = noiseBuffer(ctx, 2);
  const rn = ctx.createBufferSource(); rn.buffer = nb; rn.loop = true;
  const rbp = filt('bandpass', 600, 5), rnG = g(0.9);
  const r1 = ctx.createOscillator(), r2 = ctx.createOscillator(); r1.type = r2.type = 'sawtooth'; r2.detune.value = 22;
  const rlp = filt('lowpass', 600, 2), rsG = g(0.18);
  rn.connect(rbp); rbp.connect(rnG); r1.connect(rlp); r2.connect(rlp); rlp.connect(rsG);
  const rmix = g(1); rnG.connect(rmix); rsG.connect(rmix);
  const riser = g(0);
  let rpanG = null, rpl = null;
  if (ctx.createStereoPanner) {
    const rp = ctx.createStereoPanner(); rmix.connect(rp); rp.connect(riser);
    rpl = ctx.createOscillator(); rpl.frequency.value = 0.4; rpanG = g(0.3); rpl.connect(rpanG); rpanG.connect(rp.pan); rpl.start();
  } else rmix.connect(riser);
  const rSend = g(0.3); riser.connect(master); riser.connect(rSend); rSend.connect(verb);
  rn.start(); r1.start(); r2.start();
  // vinyl crackle under the beat, for the lo-fi feel
  const cr = ctx.createBufferSource(); cr.buffer = crackleBuffer(ctx, 3); cr.loop = true;
  const crG = g(0.05), crLp = filt('lowpass', 5000, 0.5);
  cr.connect(crLp); crLp.connect(crG); crG.connect(beat); cr.start();
  return { ctx, master, verb, duck, melody, beat, snare, hit, drop, bell, dl, fb, wet, wobG, panG, bo, bs, benv, drive, shaper, blp, bass,
    rbp, r1, r2, rlp, riser, rpl, rpanG, nb, hard: driveCurve(14), soft: driveCurve(2.2), clearUntil: 0, applied: {} };
}

function roomImpulse(ctx, seconds, decay) {
  const n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
  return buf;
}
function noiseBuffer(ctx, seconds) {
  const n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
function crackleBuffer(ctx, seconds) {
  const n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.04;
  for (let k = 0; k < seconds * 14; k++) { const at = Math.floor(Math.random() * (n - 40)), a = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1); for (let j = 0; j < 30; j++) d[at + j] += a * Math.exp(-j / 5); }
  return buf;
}
function driveCurve(k) {
  const n = 1024, c = new Float32Array(n), t = Math.tanh(k);
  for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / t; }
  return c;
}

function env(param, t, peak, attack, decay) {
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function kick(t, dest, o) {
  const ctx = audio.ctx, osc = ctx.createOscillator(), g = ctx.createGain();
  osc.frequency.setValueAtTime(o.f0, t);
  osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.fall);
  env(g.gain, t, o.gain, 0.003, o.decay);
  osc.connect(g);
  if (o.curve) { const sh = ctx.createWaveShaper(); sh.curve = o.curve; g.connect(sh); const post = ctx.createGain(); post.gain.value = o.post || 0.6; sh.connect(post); post.connect(dest); }
  else g.connect(dest);
  osc.start(t); osc.stop(t + o.decay + 0.05);
  if (o.click) noiseHit(t, dest, { type: 'highpass', f: 3000, gain: o.click, decay: 0.012 });
}

function noiseHit(t, dest, o) {
  const ctx = audio.ctx, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = audio.nb;
  f.type = o.type; f.frequency.value = o.f; if (o.q) f.Q.value = o.q;
  env(g.gain, t, o.gain, 0.002, o.decay);
  src.connect(f); f.connect(g); g.connect(dest);
  const off = Math.random() * 1.5;
  src.start(t, off); src.stop(t + o.decay + 0.05);
}

function synthNote(li, t, midi, dur) {
  const ly = LAYERS[li], ctx = audio.ctx, hz = midiHz(midi);
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o1.type = ly.wave; o2.type = ly.wave === 'square' ? 'square' : 'sawtooth';
  o1.frequency.value = hz; o2.frequency.value = hz; o2.detune.value = 8;
  const o2g = ctx.createGain(); o2g.gain.value = ly.wave === 'triangle' ? 0.12 : 0.5;
  f.type = 'lowpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(ly.cut * 2.2, t); f.frequency.exponentialRampToValueAtTime(ly.cut, t + Math.min(0.3, dur));
  const a = li === 0 ? 0.03 : 0.008;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(ly.gain, t + a);
  g.gain.setTargetAtTime(ly.gain * (li === 0 ? 0.8 : 0.35), t + a, dur * 0.3);
  g.gain.setTargetAtTime(0.0001, t + dur, 0.05);
  o1.connect(f); o2.connect(o2g); o2g.connect(f); f.connect(g); g.connect(audio.melody);
  o1.start(t); o2.start(t); o1.stop(t + dur + 0.4); o2.stop(t + dur + 0.4);
}

function playBell() {
  if (!audio) return;
  const t = audio.ctx.currentTime + 0.005;
  const shift = Math.round(BANDS[2].v * CONFIG.bandSpan);
  const midi = CONFIG.root + 24 + degreeSemis([0, 2, 4][Math.floor(Math.random() * 3)] + Math.floor(shift / 2));
  const hz = midiHz(midi), ctx = audio.ctx;
  [[1, 0.32, 2.8], [2, 0.12, 1.7], [2.76, 0.11, 1.2], [4.07, 0.05, 0.8], [5.4, 0.04, 0.5]].forEach(([r, gn, d]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = hz * r;
    env(g.gain, t, gn, 0.003, d);
    o.connect(g); g.connect(audio.bell);
    o.start(t); o.stop(t + d + 0.1);
  });
  // the room's rings follow the echoes, fading as the feedback does
  const dtime = audio.applied.dtime || 0.75, fbv = Math.max(0.05, audio.applied.fbv || 0.2);
  for (let n = 0; n < 9; n++) {
    const s = Math.pow(fbv, n) * (n ? 0.9 : 1);
    if (s < 0.04) break;
    vis.push({ at: t + n * dtime, f: () => { face.rings.push({ t0: performance.now() / 1000, s, hue: (n * 47 + 280) % 360 }); CH_BY_ID.bell.m = Math.max(CH_BY_ID.bell.m, s); } });
  }
}

function playSnare() {
  if (!audio) return;
  const t = audio.ctx.currentTime + 0.003, ctx = audio.ctx;
  noiseHit(t, audio.snare, { type: 'bandpass', f: 1900, q: 0.7, gain: 0.55, decay: 0.2 });
  noiseHit(t, audio.snare, { type: 'highpass', f: 5000, gain: 0.25, decay: 0.09 });
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
  env(g.gain, t, 0.35, 0.002, 0.11);
  o.connect(g); g.connect(audio.snare); o.start(t); o.stop(t + 0.2);
}

function playHit() {
  if (!audio) return;
  const t = audio.ctx.currentTime + 0.003;
  kick(t, audio.hit, { f0: 230, f1: 40, fall: 0.09, decay: 0.75, gain: 0.95, curve: audio.hard, post: 0.55, click: 0.4 });
  // duck the rest so it lands on its own
  const d = audio.duck.gain;
  d.cancelScheduledValues(t); d.setValueAtTime(d.value, t); d.linearRampToValueAtTime(0.25, t + 0.01); d.setTargetAtTime(1, t + 0.12, 0.18);
}

// a look-ahead clock: sixteenth notes at the heart's tempo, scheduled a little ahead of time
function schedule() {
  if (!audio || !started) return;
  const ctx = audio.ctx, ahead = ctx.currentTime + 0.12;
  if (seq.next < ctx.currentTime - 0.25) seq.next = ctx.currentTime + 0.05;
  while (seq.next < ahead) {
    playStep(seq.i, seq.next);
    seq.next += 60 / heart.bpm / 4;
    seq.i = (seq.i + 1) % 16;
  }
}

function playStep(i, t) {
  const d = 60 / heart.bpm / 4;
  const sw = i % 4 === 2 ? CONFIG.swing * 2 * d : 0;
  // the lo-fi beat: kick and hat. Its bus is closed while BEAT is off or the drop is on
  const beatHeard = beatOn && shake.level < 0.03;
  if (i === 0 || i === 6 || i === 10) {
    kick(t + sw, audio.beat, { f0: 120, f1: 46, fall: 0.11, decay: 0.38, gain: 0.85 });
    if (beatHeard) vis.push({ at: t + sw, f: () => { CH_BY_ID.beat.m = 1; } });
  }
  if (i % 2 === 0) noiseHit(t + sw, audio.beat, { type: 'highpass', f: 7500, gain: (i % 8 === 0 ? 0.2 : 0.12) * (0.8 + Math.random() * 0.4), decay: i % 8 === 4 ? 0.09 : 0.04 });
  // the melody: three layers stepping through four steps
  const per = Math.max(1, Math.round(4 / CONFIG.stepsPerBeat));
  if (i % per === 0) {
    seq.step = (seq.step + 1) % 4;
    const len = per * d;
    LAYERS.forEach((ly, li) => {
      if (li === 0 && seq.step % 2 === 1 && per < 4) return;        // theta, the low layer, holds across two steps
      const m = layerMidi(li, seq.step);
      synthNote(li, t, m, li === 0 && per < 4 ? len * 2 * ly.len : len * ly.len);
      vis.push({ at: t, f: () => { CH_BY_ID[ly.id].m = 1; cablePulse(ly.id); } });
    });
  }
  // the bass, on a broken rhythm, a step under the theta layer
  if ([0, 3, 6, 8, 11, 14].includes(i)) {
    const m = layerMidi(0, seq.step) - 12, hz = midiHz(m), a = audio;
    a.bo.frequency.setValueAtTime(hz, t); a.bs.frequency.setValueAtTime(hz / 2, t);
    a.benv.gain.cancelScheduledValues(t);
    a.benv.gain.setValueAtTime(0.0001, t);
    a.benv.gain.exponentialRampToValueAtTime(1, t + 0.006);
    a.benv.gain.setTargetAtTime(0.0001, t + d * 0.8, 0.05);
    const amt = lidAmt();
    if (amt > 0.04) vis.push({ at: t, f: () => { CH_BY_ID.bass.m = Math.max(CH_BY_ID.bass.m, 0.3 + amt * 0.7); cablePulse('bass'); } });
  }
  // the drop: a kick on every sixteenth, four times the heart
  if (shake.level > 0.01 && (CONFIG.dropMultiple >= 4 || i % (4 / CONFIG.dropMultiple) === 0)) {
    kick(t, audio.drop, { f0: 170, f1: 48, fall: 0.05, decay: 0.17, gain: 0.95, curve: audio.soft, post: 0.8, click: 0.15 });
    const lv = shake.level;
    vis.push({ at: t, f: () => { CH_BY_ID.drop.m = Math.max(CH_BY_ID.drop.m, lv); if (i % 4 === 0) cablePulse('drop'); } });
  }
  if (i % 4 === 0) vis.push({ at: t, f: () => { heart.beat = performance.now() / 1000; } });
  if (i % 2 === 0) vis.push({ at: t, f: () => { heart.thump = performance.now() / 1000; } });   // the heart beats twice per beat
}

function runVis() {
  if (!audio) return;
  const t = audio.ctx.currentTime;
  for (let k = vis.length - 1; k >= 0; k--) if (vis[k].at <= t) { const f = vis[k].f; vis.splice(k, 1); f(); }
  if (vis.length > 400) vis.splice(0, vis.length - 400);
}

function syncSound() {
  if (!audio) return;
  const a = audio, t = a.ctx.currentTime, lv = shake.level;
  const set = (p, v, tc) => p.setTargetAtTime(v, t, tc);
  // the drop: the melody ducks, the beat closes, the fast kick fades in quiet to loud
  set(a.melody.gain, started ? 1 - 0.78 * lv : 0, 0.08);
  const beatOpen = started && beatOn && lv < 0.03;
  set(a.beat.gain, beatOpen ? 1 : 0, beatOpen ? 0.25 : 0.03);
  set(a.drop.gain, Math.pow(lv, 1.4) * 0.95, 0.05);
  // the riser
  const r = shake.riser;
  set(a.riser.gain, Math.pow(r, 1.5) * 0.55, 0.06);
  set(a.rbp.frequency, 300 + r * r * 7000, 0.05);
  set(a.r1.frequency, midiHz(45 + r * 36), 0.05);
  set(a.r2.frequency, midiHz(45.1 + r * 36), 0.05);
  set(a.rlp.frequency, 400 + r * 5200, 0.05);
  if (a.rpl) { set(a.rpl.frequency, 0.4 + r * 5, 0.1); set(a.rpanG.gain, 0.25 + r * 0.7, 0.1); }
  // the bass, opened by the lid
  const amt = lidAmt();
  if (a.applied.lid !== amt) {
    a.applied.lid = amt;
    set(a.bass.gain, amt < 0.02 ? 0 : 0.05 + Math.pow(amt, 1.3) * 0.32, 0.05);
    set(a.blp.frequency, 140 + amt * amt * 2800, 0.05);
    set(a.drive.gain, 1 + amt * 7, 0.05);
  }
  // focus feeds the bell's delay. Raised eyebrows flush it
  const f = face.focus, dtime = 0.75 * 60 / heart.bpm;
  const fbv = t < a.clearUntil ? 0 : 0.18 + f * 0.7;
  if (Math.abs((a.applied.dtime || 0) - dtime) > 0.002) { a.applied.dtime = dtime; set(a.dl.delayTime, dtime, 0.2); }
  if (Math.abs((a.applied.fbv == null ? -1 : a.applied.fbv) - fbv) > 0.004) { a.applied.fbv = fbv; set(a.fb.gain, fbv, t < a.clearUntil ? 0.02 : 0.2); }
  set(a.wet.gain, t < a.clearUntil ? 0 : 0.18 + f * 0.7, t < a.clearUntil ? 0.03 : 0.3);
  set(a.wobG.gain, f * f * 0.006, 0.3);
  if (a.panG) set(a.panG.gain, f * 0.85, 0.3);
}

function resumeAudio() { if (audio && audio.ctx.state !== 'running') audio.ctx.resume(); }

// iPhones mute web audio in silent mode. Ask for the playback session, or fall back to a silent loop.
let iosAudioKept = false;
function keepIOSAudioOn() {
  const iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!iOS || iosAudioKept) return;
  iosAudioKept = true;
  try { if (navigator.audioSession) { navigator.audioSession.type = 'playback'; return; } } catch (e) {}
  try { const el = new Audio(silentWavUrl()); el.loop = true; el.setAttribute('playsinline', ''); el.play().catch(() => {}); } catch (e) {}
}
function silentWavUrl() {
  const rate = 8000, n = 800, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}
async function keepAwake() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) {}
}

/* ================= cards ================= */

function trackCards() {
  const U = CONFIG.unlock;
  if (brainMoved >= U.brainDrag) unlock('brain');
  if (face.blinks >= U.blinks) unlock('blink');
  if (heart.count >= U.heartTaps) unlock('heart');
  if (lid.hi - lid.lo >= U.lidSwing) unlock('lid');
  if (pads.tap.n >= 1 && pads.hit.n >= 1) unlock('knock');
  if (shake.level >= U.drop || shake.riser >= U.riser) unlock('shake');
  if (face.focus > 0.6 && !noted.brows && face.brows === 0) { noted.brows = true; showNote('Focus', 'The bell is smearing. Hold the eyebrows up to bring focus down.', 5000); }
}

function unlock(id) {
  if (unlocked.has(id) || !CARD_BY_ID[id]) return;
  unlocked.add(id);
  renderArchive();
  toastQueue.push(id);
  if (!toastId) nextToast();
  else { clearTimeout(toastTimer); toastTimer = setTimeout(nextToast, 1600); }
}

function nextToast() {
  clearTimeout(toastTimer);
  const el = $('toast');
  toastId = toastQueue.shift() || null;
  if (!toastId) { el.hidden = true; return; }
  $('toast-lab').textContent = 'Unlocked';
  $('toast-title').textContent = CARD_BY_ID[toastId].title;
  $('toast-read').hidden = false;
  el.hidden = false;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  toastTimer = setTimeout(nextToast, toastQueue.length ? 2200 : 5000);
}

function showNote(lab, msg, ms) {
  if (toastId) return;
  clearTimeout(toastTimer);
  const el = $('toast');
  $('toast-lab').textContent = lab;
  $('toast-title').textContent = msg;
  $('toast-read').hidden = true;
  el.hidden = false;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  toastTimer = setTimeout(() => { if (!toastId) el.hidden = true; }, ms || 3500);
}

function nextHint() {
  for (const c of CARDS) if (!unlocked.has(c.id)) return c.hint;
  return 'All six cards found. Open the Archive to read them.';
}

function renderArchive() {
  $('archive-count').textContent = unlocked.size + '/' + CARDS.length;
  const list = $('card-list');
  list.replaceChildren();
  CARDS.forEach((c, i) => {
    const open = unlocked.has(c.id);
    const li = document.createElement('li');
    li.className = 'card-item' + (open ? ' open' : '');
    const num = document.createElement('span'); num.className = 'num'; num.textContent = String(i + 1).padStart(2, '0');
    const mid = document.createElement('div');
    const t = document.createElement('p'); t.className = 't'; t.textContent = open ? c.title : 'Locked';
    const h = document.createElement('p'); h.className = 'h'; h.textContent = open ? c.eyebrow : c.hint;
    mid.append(t, h);
    li.append(num, mid);
    if (open) {
      const b = document.createElement('button');
      b.className = 'read'; b.type = 'button'; b.textContent = 'Read';
      b.addEventListener('click', () => openCard(c.id));
      li.append(b);
    }
    list.append(li);
  });
}

function openArchive() { renderArchive(); $('archive').hidden = false; $('archive-close').focus(); }
function openMap() { $('map').hidden = false; $('map').scrollTop = 0; $('map-close').focus(); }

function openCard(id) {
  const c = CARD_BY_ID[id];
  if (!c || !unlocked.has(id)) return;
  clearTimeout(toastTimer);
  $('toast').hidden = true;
  if (toastId === id) toastId = null;
  $('card-eyebrow').textContent = c.eyebrow;
  $('card-title').textContent = c.title;
  const fig = $('card-fig'), img = $('card-img'), credit = $('card-credit');
  if (c.image) {
    img.onerror = () => { fig.hidden = true; };
    img.removeAttribute('src'); img.alt = c.imageAlt || ''; img.src = c.image;
    credit.replaceChildren();
    if (c.creditUrl) { const a = document.createElement('a'); a.href = c.creditUrl; a.target = '_blank'; a.rel = 'noopener'; a.textContent = c.credit || 'Image source'; credit.append(a); }
    else credit.textContent = c.credit || '';
    fig.hidden = false;
  } else fig.hidden = true;
  const body = $('card-body');
  body.replaceChildren();
  (c.body || []).forEach(text => { const p = document.createElement('p'); p.textContent = text; body.append(p); });
  $('archive').hidden = true;
  const sheet = $('card');
  sheet.hidden = false; sheet.scrollTop = 0;
  $('card-close').focus();
}

function closeSheets() {
  const cardWasOpen = !$('card').hidden;
  $('card').hidden = true; $('archive').hidden = true; $('map').hidden = true;
  if (cardWasOpen && !toastId && toastQueue.length) nextToast();
}

function relock() {
  unlocked.clear();
  brainMoved = 0; face.blinks = 0; face.brows = 0; heart.count = 0;
  lid.lo = lid.hi = lid.angle; pads.tap.n = pads.hit.n = 0; noted = {};
  toastQueue = []; toastId = null; clearTimeout(toastTimer); $('toast').hidden = true;
  renderArchive();
}

/* ================= drawing ================= */

function drawRoom(now, dt) {
  const ctx = drawingContext;
  CH.forEach(c => { c.m = Math.max(0, c.m - dt * 2.6); });
  hitShake = Math.max(0, hitShake - dt * 5);
  ctx.save();
  // the room shakes with a hard hit and with the drop
  const jig = hitShake * 5 + shake.level * 2.2;
  if (jig > 0.05) ctx.translate((Math.random() - 0.5) * jig, (Math.random() - 0.5) * jig);
  drawBackdrop(ctx, now);
  drawCables(ctx, now);
  drawRings(ctx, now);
  drawScope(ctx, now);
  drawFace(ctx, now);
  drawLaptop(ctx, now);
  drawWatch(ctx, now);
  drawPhone(ctx, now);
  ctx.restore();
  drawRack(ctx, now);
  drawHint(ctx);
}

function font(ctx, w, px, fam) { ctx.font = w + ' ' + Math.round(px * L.fs) + 'px ' + fam; }
const JOST = 'Jost, "Avenir Next", system-ui, sans-serif', MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace', SERIF = 'Newsreader, Georgia, serif';

function drawBackdrop(ctx, now) {
  ctx.fillStyle = COL.bg; ctx.fillRect(-10, -10, L.W + 20, L.H + 20);
  // a soft glow behind the face that turns with focus, and a lime wash with the drop
  const F = L.face, f = face.focus;
  const hue = (280 + now * 25 * f) % 360;
  const g = ctx.createRadialGradient(F.cx, F.cy, F.ry * 0.3, F.cx, F.cy, F.ry * (2.2 + f * 1.5));
  g.addColorStop(0, 'hsla(' + hue + ',70%,45%,' + (0.08 + f * 0.22) + ')');
  g.addColorStop(1, 'hsla(' + hue + ',70%,30%,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, L.H);
  if (shake.level > 0.01) {
    const P = L.phone, g2 = ctx.createRadialGradient(P.cx, P.cy, 10, P.cx, P.cy, Math.max(L.W, L.H) * 0.8);
    g2.addColorStop(0, hexA(COL.neon, 0.1 + 0.2 * shake.level * CH_BY_ID.drop.m)); g2.addColorStop(1, hexA(COL.neon, 0));
    ctx.fillStyle = g2; ctx.fillRect(0, 0, L.W, L.H);
  }
  // the floor line under the box
  ctx.strokeStyle = COL.line; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(L.lapB.x, L.floor + 0.5); ctx.lineTo(L.lapB.x + L.lapB.w, L.floor + 0.5); ctx.stroke();
}

function cableEnd(id) {
  if (id === 'clock') return { x: L.clock.x + L.clock.w / 2, y: L.rack.y };
  const c = CH_BY_ID[id]; return { x: c.cx, y: L.rack.y };
}
function cablePt(c, k) {
  const e = cableEnd(c.ch), sag = Math.max(40, (e.y - c.y) * 0.5);
  const x0 = c.x, y0 = c.y, x1 = c.x, y1 = c.y + sag, x2 = e.x, y2 = e.y - sag, x3 = e.x, y3 = e.y;
  const u = 1 - k;
  return { x: u * u * u * x0 + 3 * u * u * k * x1 + 3 * u * k * k * x2 + k * k * k * x3, y: u * u * u * y0 + 3 * u * u * k * y1 + 3 * u * k * k * y2 + k * k * k * y3 };
}
function cablePulse(ch) { if (started) pulses.push({ ch, t0: performance.now() / 1000 }); }

function drawCables(ctx, now) {
  L.cables.forEach(c => {
    const e = cableEnd(c.ch), sag = Math.max(40, (e.y - c.y) * 0.5);
    const col = c.ch === 'clock' ? COL.pink : CH_BY_ID[c.ch].col;
    const act = c.ch === 'clock' ? heart.flash : CH_BY_ID[c.ch].m;
    ctx.strokeStyle = hexA(col, 0.09 + act * 0.25);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.bezierCurveTo(c.x, c.y + sag, e.x, e.y - sag, e.x, e.y); ctx.stroke();
  });
  for (let k = pulses.length - 1; k >= 0; k--) {
    const p = pulses[k], a = (now - p.t0) / 0.45;
    if (a >= 1) { pulses.splice(k, 1); continue; }
    const c = L.cables.find(q => q.ch === p.ch);
    if (!c) continue;
    const pt = cablePt(c, a), col = p.ch === 'clock' ? COL.pink : CH_BY_ID[p.ch].col;
    ctx.fillStyle = hexA(col, 0.9 * (1 - a * 0.5));
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  if (pulses.length > 120) pulses.splice(0, pulses.length - 120);
}

function drawRings(ctx, now) {
  const F = L.face;
  for (let k = face.rings.length - 1; k >= 0; k--) {
    const r = face.rings[k], age = now - r.t0;
    if (age > 1.8) { face.rings.splice(k, 1); continue; }
    const rad = F.ry * 0.9 + age * F.ry * 1.4, a = r.s * (1 - age / 1.8) * 0.55;
    ctx.strokeStyle = 'hsla(' + ((r.hue + age * 90) % 360) + ',85%,65%,' + a + ')';
    ctx.lineWidth = 2 + face.focus * 3;
    ctx.beginPath(); ctx.ellipse(F.cx, F.cy, rad * 0.82, rad, Math.sin(now + k) * 0.2 * face.focus, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawScope(ctx, now) {
  const S = L.scope, b = S.b;
  roundRect(ctx, b.x, b.y, b.w, b.h, 12);
  ctx.fillStyle = 'rgba(22,19,28,0.88)'; ctx.fill();
  ctx.strokeStyle = COL.line; ctx.lineWidth = 1; ctx.stroke();
  LAYERS.forEach((ly, i) => {
    const r = S.rows[i], B = BANDS[i], amp = S.rh * 0.26;
    font(ctx, '500', 15, JOST); ctx.fillStyle = ly.col; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(ly.sym, r.lx, r.cy);
    font(ctx, '400', 9.5, MONO); ctx.fillStyle = COL.dim;
    ctx.fillText(ly.name, r.lx + 16 * L.fs, r.cy + 1);
    // the wave: slow for theta, fast for beta, taller where the band is high
    ctx.strokeStyle = hexA(ly.col, 0.55); ctx.lineWidth = 1.4;
    ctx.beginPath();
    const n = Math.max(30, Math.floor((r.tx1 - r.tx0) / 3));
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = r.tx0 + u * (r.tx1 - r.tx0);
      const y = r.cy + Math.sin(u * ly.cycles * Math.PI * 2 - now * (1 + i * 2.5)) * amp * (0.35 + 0.65 * B.v) * (0.7 + 0.3 * noise(B.seed + u * 3, now * 0.6));
      if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
    // the handle: where the band sits, low on the left, high on the right
    const hx = r.tx0 + B.v * (r.tx1 - r.tx0), hr = Math.min(S.rh * 0.3, 10);
    ctx.fillStyle = ly.col; ctx.beginPath(); ctx.arc(hx, r.cy, hr, 0, Math.PI * 2); ctx.fill();
    if (B.holding || B.blend > 0.05) { ctx.strokeStyle = hexA(ly.col, 0.5 * Math.max(B.blend, 0.4)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, r.cy, hr + 4, 0, Math.PI * 2); ctx.stroke(); }
    font(ctx, '500', 10.5, MONO); ctx.fillStyle = COL.ivory; ctx.textAlign = 'right';
    ctx.fillText(noteName(layerMidi(i, Math.max(0, seq.step))), r.nx, r.cy);
  });
  // focus: rising on its own, into the bell's delay
  const r = S.rows[3], f = face.focus;
  font(ctx, '500', 9.5, MONO); ctx.fillStyle = COL.dim; ctx.textAlign = 'left';
  ctx.fillText('FOCUS', r.lx, r.cy);
  const bh = Math.min(8, S.rh * 0.3);
  roundRect(ctx, r.tx0, r.cy - bh / 2, r.tx1 - r.tx0, bh, bh / 2); ctx.fillStyle = 'rgba(236,230,214,0.08)'; ctx.fill();
  if (f > 0.005) {
    const g = ctx.createLinearGradient(r.tx0, 0, r.tx1, 0);
    g.addColorStop(0, '#7C9CFF'); g.addColorStop(0.5, '#C77DFF'); g.addColorStop(1, '#FF5FA2');
    roundRect(ctx, r.tx0, r.cy - bh / 2, Math.max(bh, (r.tx1 - r.tx0) * f), bh, bh / 2); ctx.fillStyle = g; ctx.fill();
  }
  font(ctx, '400', 9, MONO); ctx.fillStyle = f > 0.6 ? hexA(COL.pink, 0.6 + 0.4 * Math.sin(now * 5)) : COL.dim; ctx.textAlign = 'right';
  ctx.fillText(f > 0.6 ? 'BROWS ↑' : 'DELAY', r.nx, r.cy);
}

function drawFace(ctx, now) {
  const F = L.face, f = face.focus;
  const bt = now - face.blinkAt, close = bt < 0.2 ? Math.sin(bt / 0.2 * Math.PI) : 0;
  const raise = face.browUp;
  ctx.save();
  // neck and shoulders, cut off by the panel's bottom
  ctx.fillStyle = '#1b1722';
  ctx.beginPath(); ctx.rect(F.cx - F.rx * 0.32, F.cy + F.ry * 0.7, F.rx * 0.64, F.bottom - F.cy - F.ry * 0.7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(F.cx, F.bottom + F.ry * 0.25, F.rx * 1.5, F.ry * 0.5, 0, Math.PI, 0); ctx.fill();
  // ears and head
  ctx.fillStyle = '#231e2b'; ctx.strokeStyle = 'rgba(236,230,214,0.35)'; ctx.lineWidth = 1.5;
  [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(F.cx + s * F.rx * 0.98, F.cy + F.ry * 0.02, F.rx * 0.12, F.ry * 0.17, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
  ctx.beginPath(); ctx.ellipse(F.cx, F.cy, F.rx, F.ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // hair
  ctx.save();
  ctx.beginPath(); ctx.ellipse(F.cx, F.cy, F.rx, F.ry, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#131017';
  ctx.beginPath(); ctx.ellipse(F.cx, F.cy - F.ry * 0.75, F.rx * 1.15, F.ry * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  // the headband across the forehead
  const by = F.bandY - raise * F.ry * 0.03;
  ctx.fillStyle = '#0c0b10'; ctx.fillRect(F.cx - F.rx * 1.1, by - F.bandH / 2, F.rx * 2.2, F.bandH);
  ctx.strokeStyle = hexA(COL.neon, 0.35); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(F.cx - F.rx * 1.1, by - F.bandH / 2); ctx.lineTo(F.cx + F.rx * 1.1, by - F.bandH / 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(F.cx - F.rx * 1.1, by + F.bandH / 2); ctx.lineTo(F.cx + F.rx * 1.1, by + F.bandH / 2); ctx.stroke();
  ctx.restore();
  // the sensor pod in the middle, its light following the three waves
  const pw = F.rx * 0.46, ph = F.bandH * 1.25;
  roundRect(ctx, F.cx - pw / 2, by - ph / 2, pw, ph, ph * 0.35);
  ctx.fillStyle = '#19171f'; ctx.fill(); ctx.strokeStyle = 'rgba(236,230,214,0.3)'; ctx.stroke();
  const lit = LAYERS.map((ly, i) => BANDS[i].v);
  LAYERS.forEach((ly, i) => {
    const lx = F.cx - pw * 0.28 + i * pw * 0.28;
    ctx.fillStyle = hexA(ly.col, 0.35 + 0.65 * (CH_BY_ID[ly.id].m * 0.6 + lit[i] * 0.4));
    ctx.beginPath(); ctx.arc(lx, by, Math.max(1.6, ph * 0.13), 0, Math.PI * 2); ctx.fill();
  });
  // eyebrows
  const lift = raise * F.ry * 0.12;
  ctx.strokeStyle = COL.ivory; ctx.lineWidth = Math.max(2, F.rx * 0.05); ctx.lineCap = 'round';
  [-1, 1].forEach(s => {
    const x0 = F.cx + s * F.rx * 0.16, x1 = F.cx + s * F.rx * 0.62, y = F.browY - lift;
    ctx.beginPath(); ctx.moveTo(x0, y + F.ry * 0.015); ctx.quadraticCurveTo((x0 + x1) / 2, y - F.ry * 0.06 - lift * 0.4, x1, y + F.ry * 0.03); ctx.stroke();
  });
  // a nudge when the bell is smearing: arrows over the brows
  if (f > 0.6 && raise < 0.1) {
    const a = 0.4 + 0.4 * Math.sin(now * 5);
    ctx.strokeStyle = hexA(COL.pink, a); ctx.lineWidth = 2;
    [-1, 1].forEach(s => { const x = F.cx + s * F.rx * 0.4, y = F.browY - F.ry * 0.13 - (now * 8 % 4); ctx.beginPath(); ctx.moveTo(x - 5, y + 4); ctx.lineTo(x, y - 1); ctx.lineTo(x + 5, y + 4); ctx.stroke(); });
  }
  // eyes
  F.eyes.forEach(e => {
    ctx.save();
    ctx.beginPath(); ctx.moveTo(e.x - F.erx, e.y); ctx.quadraticCurveTo(e.x, e.y - F.ery * 1.9, e.x + F.erx, e.y); ctx.quadraticCurveTo(e.x, e.y + F.ery * 1.7, e.x - F.erx, e.y); ctx.closePath();
    ctx.fillStyle = '#0e0c12'; ctx.fill();
    ctx.clip();
    const iris = F.ery * 0.95;
    ctx.fillStyle = 'hsl(' + ((95 + f * 200 + now * 40 * f) % 360) + ',80%,62%)';
    ctx.beginPath(); ctx.arc(e.x, e.y, iris, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#060508'; ctx.beginPath(); ctx.arc(e.x, e.y, iris * 0.45, 0, Math.PI * 2); ctx.fill();
    // the lid comes down
    if (close > 0) { ctx.fillStyle = '#231e2b'; ctx.fillRect(e.x - F.erx, e.y - F.ery * 2, F.erx * 2, F.ery * 2 * close + F.ery * 2 * close); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(236,230,214,0.75)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(e.x - F.erx, e.y); ctx.quadraticCurveTo(e.x, e.y - F.ery * (1.9 - close * 1.9), e.x + F.erx, e.y); ctx.stroke();
    if (close > 0.6) { ctx.beginPath(); ctx.moveTo(e.x - F.erx, e.y); ctx.quadraticCurveTo(e.x, e.y + F.ery * 0.6, e.x + F.erx, e.y); ctx.stroke(); }
    // until the first blink, the eyes pulse
    if (face.blinks === 0 && started) {
      ctx.strokeStyle = hexA(COL.neon, 0.25 + 0.25 * Math.sin(now * 4)); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(e.x, e.y, F.erx * 1.35, F.ery * 2.4, 0, 0, Math.PI * 2); ctx.stroke();
    }
  });
  // nose and mouth
  ctx.strokeStyle = 'rgba(236,230,214,0.45)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(F.cx + F.rx * 0.02, F.cy + F.ry * 0.08); ctx.quadraticCurveTo(F.cx - F.rx * 0.1, F.cy + F.ry * 0.3, F.cx + F.rx * 0.06, F.cy + F.ry * 0.3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(F.cx - F.rx * 0.24, F.cy + F.ry * 0.52); ctx.quadraticCurveTo(F.cx, F.cy + F.ry * 0.58, F.cx + F.rx * 0.24, F.cy + F.ry * 0.52); ctx.stroke();
  ctx.restore();
}

function drawLaptop(ctx, now) {
  const B = L.box, P = L.lap;
  const hitT = now - pads.hit.at, tapT = now - pads.tap.at;
  const bump = (hitT < 0.25 ? (1 - hitT / 0.25) * 4 : 0) + (tapT < 0.12 ? (1 - tapT / 0.12) * 1.5 : 0);
  // the black box
  ctx.save();
  const g = ctx.createLinearGradient(B.x, B.y, B.x + B.w, B.y);
  g.addColorStop(0, '#08080a'); g.addColorStop(1, '#141318');
  ctx.fillStyle = g; ctx.fillRect(B.x, B.y, B.w, B.h);
  ctx.strokeStyle = 'rgba(236,230,214,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(B.x + 0.5, B.y + 0.5, B.w - 1, B.h - 1);
  B.pads.forEach(p => {
    const t = now - pads[p.id].at, hot = t < 0.3 ? 1 - t / 0.3 : 0, isHit = p.id === 'hit';
    const col = isHit ? '#FF5C5C' : COL.ivory;
    ctx.fillStyle = hexA(col, 0.08 + hot * 0.4);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + hot * 0.08), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hexA(col, 0.5 + hot * 0.5); ctx.lineWidth = 1.5; ctx.stroke();
    if (isHit) {   // an impact star
      ctx.beginPath();
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 - Math.PI / 2, rr = p.r * (k % 2 ? 0.26 : 0.55); ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fillStyle = hexA(col, 0.85); ctx.fill();
    } else {       // a fingertip with ripples
      ctx.fillStyle = hexA(col, 0.85); ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hexA(col, 0.6); ctx.lineWidth = 1.3;
      [0.32, 0.5].forEach(k => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * k, 0, Math.PI * 2); ctx.stroke(); });
    }
    font(ctx, '600', 10.5, JOST); ctx.fillStyle = COL.ivory; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    spaced(ctx, isHit ? 'HIT' : 'TAP', p.x, p.y + p.r + 7 * L.fs, 0.14);
    font(ctx, '400', 9, MONO); ctx.fillStyle = COL.dim;
    ctx.fillText(isHit ? 'kick' : 'snare', p.x, p.y + p.r + 21 * L.fs);
  });
  ctx.restore();
  // the laptop, side on: base on the box, lid on its hinge at the back
  ctx.save();
  ctx.translate(0, -bump);
  const amt = lidAmt(), ang = lid.angle * Math.PI / 180;
  ctx.fillStyle = '#8f8b97';
  roundRect(ctx, P.bx, P.by, P.lw, P.lt, P.lt * 0.45); ctx.fill();
  ctx.fillStyle = '#5d5965'; ctx.fillRect(P.bx + P.lw * 0.1, P.by + P.lt - 1.5, P.lw * 0.8, 1.5);
  const tx = P.hx + Math.cos(ang) * P.len, ty = P.hy - Math.sin(ang) * P.len;
  // the arc of the angle
  ctx.strokeStyle = hexA('#FFB35C', 0.25 + amt * 0.4); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(P.hx, P.hy, P.len * 0.32, -ang, 0); ctx.stroke();
  font(ctx, '500', 10, MONO); ctx.fillStyle = hexA('#FFB35C', 0.8); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const la = ang / 2;
  ctx.fillText(Math.round(lid.angle) + '°', P.hx + Math.cos(la) * P.len * 0.4, P.hy - Math.sin(la) * P.len * 0.4);
  // the screen glows on its inside face, brighter with more bass
  const nx = Math.sin(ang), ny = Math.cos(ang);
  ctx.strokeStyle = hexA('#FFB35C', 0.2 + amt * 0.7 * (0.6 + 0.4 * CH_BY_ID.bass.m)); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(P.hx + nx * P.lt * 0.7 + Math.cos(ang) * P.len * 0.06, P.hy + ny * P.lt * 0.7 - Math.sin(ang) * P.len * 0.06); ctx.lineTo(tx + nx * P.lt * 0.7 - Math.cos(ang) * P.len * 0.04, ty + ny * P.lt * 0.7 + Math.sin(ang) * P.len * 0.04); ctx.stroke();
  ctx.strokeStyle = '#a19dab'; ctx.lineWidth = P.lt * 0.85; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(P.hx, P.hy); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.fillStyle = '#5d5965'; ctx.beginPath(); ctx.arc(P.hx, P.hy, P.lt * 0.6, 0, Math.PI * 2); ctx.fill();
  // the handle at the lid's edge
  const hr = Math.max(9, P.lt * 1.6);
  ctx.strokeStyle = hexA('#FFB35C', lid.touched ? 0.5 : 0.5 + 0.4 * Math.sin(now * 4)); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(tx, ty, hr, 0, Math.PI * 2); ctx.stroke();
  P.tip = { x: tx, y: ty, r: hr };
  font(ctx, '400', 9, MONO); ctx.fillStyle = COL.dim; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('LID → BASS', P.bx + P.lw + 6, P.by + P.lt / 2);
  ctx.restore();
}

function drawWatch(ctx, now) {
  const Wt = L.watch, x = Wt.cx - Wt.w / 2, y = Wt.cy - Wt.h / 2;
  const sinceBeat = now - (heart.thump || -1e9), beatK = sinceBeat < 0.2 ? 1 - sinceBeat / 0.2 : 0;
  // strap
  ctx.fillStyle = '#17141c';
  roundRect(ctx, Wt.cx - Wt.w * 0.32, Wt.b.y, Wt.w * 0.64, Wt.b.h - 18 * L.fs, Wt.w * 0.1); ctx.fill();
  // case and screen
  roundRect(ctx, x, y, Wt.w, Wt.h, Wt.w * 0.26); ctx.fillStyle = '#2a2731'; ctx.fill();
  const ins = Wt.w * 0.06;
  roundRect(ctx, x + ins, y + ins, Wt.w - ins * 2, Wt.h - ins * 2, Wt.w * 0.2); ctx.fillStyle = '#050407'; ctx.fill();
  ctx.fillStyle = '#3a3640'; roundRect(ctx, x + Wt.w - 1, y + Wt.h * 0.28, Wt.w * 0.06, Wt.h * 0.16, 2); ctx.fill();
  // the heart, beating with the tempo
  const s = Wt.w * 0.16 * (1 + beatK * 0.16 + heart.flash * 0.12), hx = Wt.cx, hy = Wt.cy - Wt.h * 0.15;
  ctx.fillStyle = hexA(COL.pink, 0.75 + beatK * 0.25);
  heartPath(ctx, hx, hy, s); ctx.fill();
  if (heart.count === 0 && started) { ctx.strokeStyle = hexA(COL.pink, 0.3 + 0.25 * Math.sin(now * 4)); ctx.lineWidth = 1.5; heartPath(ctx, hx, hy, s * 1.5); ctx.stroke(); }
  font(ctx, '500', Math.max(12, Wt.w * 0.18 / L.fs), MONO); ctx.fillStyle = COL.ivory; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.round(heart.rate)), Wt.cx, Wt.cy + Wt.h * 0.2);
  font(ctx, '400', 8.5, MONO); ctx.fillStyle = COL.dim;
  ctx.fillText('BPM', Wt.cx, Wt.cy + Wt.h * 0.33);
  font(ctx, '500', 9.5, MONO); ctx.fillStyle = COL.dim; ctx.textBaseline = 'alphabetic';
  ctx.fillText('HEART ÷ 2 → TEMPO', Wt.cx, Wt.b.y + Wt.b.h - 3);
}

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.3, y + s * 0.1, x - s * 0.9, y - s * 0.95, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.9, y - s * 0.95, x + s * 1.3, y + s * 0.1, x, y + s * 0.9);
  ctx.closePath();
}

function drawPhone(ctx, now) {
  const P = L.phone, e = Math.max(shake.effort, shake.level * 0.6);
  ctx.save();
  ctx.translate(P.cx, P.cy);
  if (e > 0.01) ctx.rotate(Math.sin(now * 38) * 0.22 * e);
  roundRect(ctx, -P.w / 2, -P.h / 2, P.w, P.h, P.w * 0.18); ctx.fillStyle = '#16131b'; ctx.fill();
  ctx.strokeStyle = 'rgba(236,230,214,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  const ins = P.w * 0.07, sw = P.w - ins * 2, sh = P.h - ins * 2;
  roundRect(ctx, -sw / 2, -sh / 2, sw, sh, P.w * 0.13); ctx.fillStyle = '#050407'; ctx.fill();
  // the screen: effort as a rising fill, with the threshold where the riser starts
  const mh = sh * 0.7, mx = -sw * 0.18, my = sh * 0.35;
  roundRect(ctx, mx, my - mh, sw * 0.36, mh, 4); ctx.fillStyle = 'rgba(236,230,214,0.06)'; ctx.fill();
  if (shake.effort > 0.005) { roundRect(ctx, mx, my - mh * shake.effort, sw * 0.36, mh * shake.effort, 4); ctx.fillStyle = hexA(COL.neon, 0.85); ctx.fill(); }
  if (shake.riser > 0.005) { ctx.fillStyle = hexA(COL.pink, 0.9); ctx.fillRect(mx - 5, my - mh * shake.riser, 3, mh * shake.riser); }
  ctx.strokeStyle = hexA(COL.pink, 0.6); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(mx - 4, my - mh * CONFIG.riserFrom); ctx.lineTo(mx + sw * 0.36 + 4, my - mh * CONFIG.riserFrom); ctx.stroke();
  font(ctx, '500', 9, MONO); ctx.fillStyle = shake.level > 0.03 ? COL.neon : COL.dim; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(shake.level > 0.03 ? '× 4' : '', 0, -sh * 0.42);
  ctx.restore();
  // motion lines
  if (e > 0.05) {
    ctx.strokeStyle = hexA(COL.neon, e * 0.7); ctx.lineWidth = 2;
    [-1, 1].forEach(s => { for (let k = 1; k <= 2; k++) { const x = P.cx + s * (P.w / 2 + 6 * k); ctx.beginPath(); ctx.arc(P.cx, P.cy, P.w / 2 + 6 * k, s > 0 ? -0.5 : Math.PI - 0.5, s > 0 ? 0.5 : Math.PI + 0.5); ctx.stroke(); } });
  }
  font(ctx, '500', 9.5, MONO); ctx.fillStyle = COL.dim; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(KIND === 'phone' && shake.motion ? 'SHAKE YOUR PHONE' : 'GRAB IT AND SHAKE', P.cx, P.b.y + P.b.h - 3);
}

function drawRack(ctx, now) {
  const R = L.rack;
  roundRect(ctx, R.x, R.y, R.w, R.h, 10); ctx.fillStyle = '#121017'; ctx.fill();
  ctx.strokeStyle = COL.line; ctx.lineWidth = 1; ctx.stroke();
  // the clock, from the heart
  const C = L.clock, sinceBeat = now - (heart.beat || -1e9), led = sinceBeat < 0.12;
  font(ctx, '500', 9, MONO); ctx.fillStyle = COL.dim; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('CLOCK', C.x + 8, R.y + 7);
  ctx.fillStyle = led ? COL.pink : 'rgba(255,95,162,0.2)'; ctx.beginPath(); ctx.arc(C.x + C.w - 10, R.y + 12, 3.5, 0, Math.PI * 2); ctx.fill();
  font(ctx, '500', 17, MONO); ctx.fillStyle = COL.ivory; ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.round(heart.bpm)), C.x + 8, R.y + R.h * 0.55);
  font(ctx, '400', 8.5, MONO); ctx.fillStyle = COL.dim; ctx.textBaseline = 'bottom';
  ctx.fillText('BPM', C.x + 8, R.y + R.h - 5);
  ctx.strokeStyle = COL.line; ctx.beginPath(); ctx.moveTo(C.x + C.w + 2, R.y + 8); ctx.lineTo(C.x + C.w + 2, R.y + R.h - 8); ctx.stroke();
  CH.forEach(c => {
    font(ctx, '500', c.lab.length > 1 ? 9 : 12, c.lab.length > 1 ? MONO : JOST);
    ctx.fillStyle = c.col; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(c.lab, c.cx, R.y + 6);
    font(ctx, '400', 7.5, MONO); ctx.fillStyle = COL.dim; ctx.textBaseline = 'bottom';
    const muted = c.id === 'beat' && beatOn && shake.level >= 0.03;
    ctx.fillText(muted ? 'DROP' : c.sub, c.cx, R.y + R.h - 4);
    if (c.id === 'beat') {
      const b = L.beatBtn;
      roundRect(ctx, b.x, b.y, b.w, b.h, b.h / 2);
      ctx.fillStyle = beatOn && !muted ? hexA(COL.neon, 0.18 + c.m * 0.3) : 'rgba(236,230,214,0.05)'; ctx.fill();
      ctx.strokeStyle = beatOn ? hexA(COL.neon, muted ? 0.3 : 0.8) : COL.line; ctx.stroke();
      font(ctx, '600', 9, MONO); ctx.fillStyle = beatOn ? (muted ? COL.dim : COL.neon) : COL.dim; ctx.textBaseline = 'middle';
      ctx.fillText(beatOn ? 'ON' : 'OFF', b.x + b.w / 2, b.y + b.h / 2);
      return;
    }
    // the level
    const mw = Math.min(8, c.w * 0.18), my0 = R.y + R.h * 0.34, mh = R.h * 0.38;
    let v = c.m;
    if (c.id === 'bass') v = Math.max(v * lidAmt(), lidAmt() * 0.25);
    if (c.id === 'bell') v = Math.max(v, face.focus * 0.15);
    roundRect(ctx, c.cx - mw / 2, my0, mw, mh, mw / 2); ctx.fillStyle = 'rgba(236,230,214,0.07)'; ctx.fill();
    if (v > 0.01) { roundRect(ctx, c.cx - mw / 2, my0 + mh * (1 - v), mw, mh * v, mw / 2); ctx.fillStyle = hexA(c.col, 0.85); ctx.fill(); }
  });
}

function drawHint(ctx) {
  if (!started) return;
  font(ctx, 'italic 400', 12.5, SERIF); ctx.fillStyle = COL.dim; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(nextHint(), L.x0 + 2, L.rack.y - 8);
}

function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + Math.max(0, Math.min(1, a)) + ')'; }
function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function spaced(ctx, s, x, y, em) {
  const px = parseFloat(ctx.font.match(/(\d+(\.\d+)?)px/)[1]), gap = px * em;
  const w = [...s].reduce((a, ch) => a + ctx.measureText(ch).width, 0) + gap * (s.length - 1);
  const al = ctx.textAlign; ctx.textAlign = 'left';
  let cx = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x;
  for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + gap; }
  ctx.textAlign = al;
}

/* ================= pointer and keys ================= */

function listenPointer() {
  canvasEl.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', e => { if (e.key.toLowerCase() === 'e') browsUp('key'); });
  window.addEventListener('blur', () => face.browHeld.clear());
}

function sheetOpen() { return !$('start').hidden || !$('archive').hidden || !$('card').hidden || !$('map').hidden; }

function onDown(e) {
  if (window.__P5_TEST__) window.__lastPid = e.pointerId;
  if (!started || sheetOpen()) return;
  resumeAudio();
  const q = localXY(e), x = q.x, y = q.y, now = performance.now() / 1000;
  const capture = () => { try { canvasEl.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); };
  const b = L.beatBtn;
  if (x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - 8 && y <= b.y + b.h + 8) { beatOn = !beatOn; return; }
  for (const p of L.box.pads) if (Math.hypot(x - p.x, y - p.y) <= Math.max(p.r * 1.15, 24)) { strike(p.id); e.preventDefault(); return; }
  const Wt = L.watch;
  if (Math.abs(x - Wt.cx) <= Wt.w / 2 + 8 && Math.abs(y - Wt.cy) <= Wt.h / 2 + 8) { tapHeart(now); e.preventDefault(); return; }
  const F = L.face;
  // the eyes, and above them the brows: the whole forehead up to the headband raises them
  const eyeH = Math.max(F.ery * 2, (F.ey - F.browY) * 0.5);
  for (const ey of F.eyes) if (Math.abs(x - ey.x) <= Math.max(F.erx * 1.3, 20) && Math.abs(y - ey.y) <= eyeH) { blink(); e.preventDefault(); return; }
  if (Math.abs(x - F.cx) <= F.rx * 0.8 && y >= F.bandY - F.bandH * 0.6 && y < F.ey - eyeH) { browsDown(e.pointerId); drags.set(e.pointerId, { type: 'brows' }); capture(); return; }
  const S = L.scope;
  for (let i = 0; i < 3; i++) {
    const r = S.rows[i];
    if (x >= r.tx0 - 14 && x <= r.tx1 + 14 && y >= r.y0 && y <= r.y0 + S.rh) {
      const B = BANDS[i];
      B.holding = true; B.manual = B.v;
      drags.set(e.pointerId, { type: 'band', i, x0: x, v0: B.v });
      capture(); return;
    }
  }
  const P = L.lap, tip = P.tip;
  const nearLid = tip && (Math.hypot(x - tip.x, y - tip.y) <= tip.r + 16 || distToSeg(x, y, P.hx, P.hy, tip.x, tip.y) <= Math.max(16, P.lt * 2));
  if (nearLid) { drags.set(e.pointerId, { type: 'lid' }); lidFrom(x, y); capture(); return; }
  const Ph = L.phone;
  if (Math.abs(x - Ph.cx) <= Ph.w / 2 + 14 && Math.abs(y - Ph.cy) <= Ph.h / 2 + 14) {
    drags.set(e.pointerId, { type: 'phone', x, y, lastAt: now });
    capture(); return;
  }
}

function onMove(e) {
  const d = drags.get(e.pointerId);
  if (!d) return;
  const q = localXY(e), now = performance.now() / 1000;
  if (d.type === 'band') {
    const r = L.scope.rows[d.i], B = BANDS[d.i];
    const v = constrain(d.v0 + (q.x - d.x0) / (r.tx1 - r.tx0), 0, 1);
    brainMoved += Math.abs(v - B.manual);
    B.manual = v;
  } else if (d.type === 'lid') lidFrom(q.x, q.y);
  else if (d.type === 'phone') {
    shake.wig.push({ t: now, v: Math.hypot(q.x - d.x, q.y - d.y) / L.H });
    d.x = q.x; d.y = q.y; d.lastAt = now;
  }
}

function onUp(e) {
  const d = drags.get(e.pointerId);
  if (!d) return;
  if (d.type === 'band') { const B = BANDS[d.i]; B.holding = false; B.holdUntil = performance.now() / 1000 + CONFIG.holdAfterDrag; }
  if (d.type === 'brows') browsUp(e.pointerId);
  drags.delete(e.pointerId);
}

function lidFrom(x, y) {
  const P = L.lap;
  let a = Math.atan2(-(y - P.hy), x - P.hx) * 180 / Math.PI;
  if (a < -90) a += 360;
  setLid(a);
}

function distToSeg(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
  const k = constrain(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1);
  return Math.hypot(px - (x0 + k * dx), py - (y0 + k * dy));
}

function onKey(e) {
  if (!started || sheetOpen() || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  const k = e.key.toLowerCase(), now = performance.now() / 1000;
  if (k === 't') strike('tap');
  else if (k === 'h') strike('hit');
  else if (k === 'b') blink();
  else if (k === 'e') browsDown('key');
  else if (k === 'k') tapHeart(now);
  else return;
  resumeAudio();
}

/* ================= start and buttons ================= */

function roomLink() {
  if (CONFIG.link) return CONFIG.link;
  try { if (window.top === window.self && /^https?:/.test(location.href)) return location.href; } catch (e) {}
  return '';
}

function fillStart() {
  $('how-help').textContent = MODE.help;
  $('how-caveat').textContent = MODE.caveat;
  $('start-btn').textContent = started ? 'Back to the room' : 'Tap to start';
  $('share').hidden = KIND !== 'laptop' || started;
  if (!$('share').hidden) drawQR();
}

function drawQR() {
  const box = $('qr'), link = roomLink();
  box.replaceChildren(); box.hidden = true;
  $('qr-text').textContent = 'Or open this page on your phone.';
  if (!link || typeof window.qrcode !== 'function') return;
  try {
    const q = window.qrcode(0, 'M');
    q.addData(link); q.make();
    box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    box.hidden = false;
    $('qr-text').textContent = 'Or scan this to play it on your phone.';
  } catch (e) {}
}

// The start button starts the room the first time, and goes back to it after that.
function startRoom() {
  if (KIND === 'phone') askMotion();   // has to run inside the tap on iPhone
  if (!audio) audio = buildAudio();
  if (audio) { audio.ctx.resume(); keepIOSAudioOn(); }
  keepAwake();
  if (!started) { started = true; $('hud').hidden = false; windowResized(); }   // the room turns sideways now
  $('start').hidden = true;
}

function openHelp() { fillStart(); $('start').hidden = false; $('start').scrollTop = 0; $('start-btn').focus(); }

function setupStartPhoto() {
  const R = window.ROOM || {}, fig = $('start-photo'), img = $('start-img'), credit = $('start-credit');
  if (!R.image) { fig.hidden = true; return; }
  img.onload = () => fig.classList.add('ready');
  img.onerror = () => { fig.hidden = true; };
  img.alt = R.imageAlt || ''; img.src = R.image;
  credit.textContent = R.credit || '';
  if (R.creditUrl) credit.href = R.creditUrl; else credit.removeAttribute('href');
}

function listenUI() {
  setupStartPhoto();
  fillStart();
  $('start-btn').addEventListener('click', startRoom);
  $('help-btn').addEventListener('click', openHelp);
  $('map-btn').addEventListener('click', openMap);
  $('archive-btn').addEventListener('click', openArchive);
  $('archive-close').addEventListener('click', closeSheets);
  $('card-close').addEventListener('click', closeSheets);
  $('map-close').addEventListener('click', closeSheets);
  $('toast-read').addEventListener('click', () => { if (toastId) openCard(toastId); });
  $('relock').addEventListener('click', relock);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (started && !$('start').hidden) $('start').hidden = true; else closeSheets(); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && started) { resumeAudio(); keepAwake(); } });
}

/* test hook, only active when a test page defines window.__P5_TEST__ */
if (window.__P5_TEST__) {
  window.__P5_TEST__.api = {
    CONFIG, BANDS, CH_BY_ID, heart, face, lid, pads, shake, unlocked, turned: () => turned,
    motion: mag => onMotion({ acceleration: { x: mag, y: 0, z: 0 } }),
    setBeat: v => { beatOn = v; },
    state: () => ({ started, beatOn, bpm: heart.bpm, rate: heart.rate, browUp: face.browUp, blinks: face.blinks, focus: face.focus, effort: shake.effort, drop: shake.level, riser: shake.riser, lid: lid.angle, step: seq.step,
      ctx: audio ? audio.ctx.state : null, t: audio ? audio.ctx.currentTime : 0,
      gains: audio ? { melody: audio.melody.gain.value, beat: audio.beat.gain.value, drop: audio.drop.gain.value, riser: audio.riser.gain.value, bass: audio.bass.gain.value, fb: audio.fb.gain.value, wet: audio.wet.gain.value } : null,
      drags: [...drags.values()].map(d => d.type), fps: frameRate(), wig: shake.wig.length, notes: LAYERS.map((l, i) => noteName(layerMidi(i, Math.max(0, seq.step)))), bands: BANDS.map(b => +b.v.toFixed(3)) }),
    geo: () => ({ face: L.face, box: L.box, lap: L.lap, watch: L.watch, phone: L.phone, scope: L.scope, rack: L.rack, beatBtn: L.beatBtn, W: L.W, H: L.H })
  };
}

/* The way back to all three rooms. The page with all the rooms opens this one with ?hub=<its address>.
   CONFIG.hub, if set, is used when that can't come along (separate p5 editor sketches). With neither,
   Exit stays hidden and the room works on its own. */
(function setupExit() {
  let link = '';
  try { link = new URLSearchParams(location.search).get('hub') || ''; } catch (e) {}
  if (!link && typeof CONFIG !== 'undefined' && CONFIG.hub) link = CONFIG.hub;
  const relative = /^\.\.?\//.test(link);
  if (!relative && !/^https?:\/\//.test(link)) return;
  const go = () => {
    if (relative) { location.href = link; return; }               // the rooms sit in folders next to the hub
    try { window.top.location.href = link; } catch (e) { location.href = link; }
  };
  ['exit-btn', 'exit-link'].forEach(id => { const el = document.getElementById(id); if (el) { el.hidden = false; el.addEventListener('click', go); } });
})();
