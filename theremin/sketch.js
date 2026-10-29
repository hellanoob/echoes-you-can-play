/*
  Echoes You Can Play
  Room 1: Theremin, Petrograd 1920
  Jesse Xu, DIGF-5008 Exploration

  How it fits together
  - p5.js: setup() makes the canvas, draw() draws the room every frame.
  - The rule of this room: you don't touch the instrument. Room 2, the Trautonium, is the
    opposite: there you have to press the wire.
  - A real theremin feels your hands through two antennas. A browser can't, so the front
    camera watches them, and ml5's handPose finds 21 points on each hand.
      Right hand (the one on the right of the mirrored picture) is the pitch hand. How big
      the palm looks stands in for how close it is to the upright antenna: closer is higher.
      Left hand is the volume hand. Its size stands in for its distance from the loop, as on
      the real instrument: closer is quieter, further is louder.
  - The room is always wide, like the Trautonium room. The start screen reads the way the phone
    is held. After Tap to start, a phone held upright gets the whole room drawn sideways, so people just turn the phone (rotation lock on or off). The camera keeps
    the phone's own upright picture, so the hand points are turned into the room's directions
    (see screenToRoom), and the faint mirror is drawn against the glass, where it lines up.
      One hand only: it plays the pitch at full volume.
  - "Set my reach" measures the player's own far and near, since phone cameras differ.
  - If the camera can't open, the phone falls back to tilt and a laptop to the mouse.
  - Sound: the browser's Web Audio API (the engine p5.sound runs on). A sine and a richer
    wave crossfaded by TONE, a low-pass filter, optional vibrato, a small room.
    The pitch always glides, as on a theremin. TUNING AID pulls it toward the nearest note.
  - Card text lives in cards.js. Cards unlock from what you play (CONFIG.unlock).
  - The camera picture never leaves the device: no recording, nothing sent anywhere.
*/

const CONFIG = {
  // The room's address, for the QR code on a laptop. In the p5 editor paste the Fullscreen link here.
  link: '',
  hub: '',                 // the page with all three rooms, for Exit. Only needed for separate p5 editor sketches: paste its Fullscreen link
  // How big the palm looks (across the palm, as a share of the camera picture's shorter side)
  // when the pitch hand is as far away as you play, and as near. "Set my reach" replaces these.
  far: 0.10,
  near: 0.34,
  // The volume hand works like the real loop: the closer it comes, the quieter. On the same far-to-near
  // scale as the pitch hand: full volume from far out to volFull, silent from volSilent in.
  volFull: 0.15,
  volSilent: 0.85,
  // Shake filter on each hand's distance (a One Euro filter). Lower steady = steadier when the hand is still,
  // higher follow = quicker to catch up when it moves.
  steady: 0.1,
  follow: 2.5,
  ranges: [[48, 84], [36, 96]],   // three octaves C3 to C6, and five octaves C2 to C7 once card 03 is open
  pitchSmooth: 0.05,              // seconds of glide on top of the shake filter. Higher is lazier
  volSmooth: 0.05,
  holdLost: 0.3,                  // seconds a lost pitch hand keeps sounding, so a flicker in tracking doesn't cut the note
  vibratoRate: 6,                 // Hz
  vibratoMax: 35,                 // cents with the VIBRATO knob all the way up
  reverb: 0.2,                    // room amount, 0 to 1
  room: 1.8,                      // room length in seconds
  audible: 0.06,                  // a note this loud or louder counts as heard, for the cards
  calibrate: 3,                   // seconds for each step of "Set my reach"
  // The hand tracker. MediaPipe's own files from the same CDN as p5.js, matching the version built into ml5 1.3.1.
  // If it hasn't started after trackerWait seconds, the room tries ml5's other runtime (TensorFlow.js).
  mediapipePath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240',
  trackerWait: 20,
  unlock: {
    air: 1.5,                     // seconds of sound
    glideSemis: 12,               // one octave...
    glideWindow: 3,               // ...within this many seconds, without the sound stopping
    steadyCents: 20,              // within this many cents of a note...
    steadySecs: 2,                // ...for this long...
    steadyLevel: 0.15,            // ...at least this loud
    swells: 3,                    // volume swells from swellLow up past swellHigh
    swellLow: 0.25,
    swellHigh: 0.65,
    swellWindow: 20               // seconds
  }
};

const MODES = {
  phone: {
    help: 'Stand the phone up on its side, facing you, about an arm’s length away, and sit back. Your right hand plays the pitch: bring it closer to the phone to go higher. Your left hand is the volume, like the loop on a real theremin: bring it closer to go quiet, pull it back to swell. Don’t touch the screen.',
    caveat: 'A real theremin senses your hands through two antennas. A phone can’t, so its front camera watches your hands instead, and how big your hand looks stands in for how close it is.',
    fallback: 'Play by tilting the phone instead',
    fallbackHelp: 'Tilt the phone left and right for the pitch. Hold it more upright to make it louder, lay it flatter to fade out.'
  },
  laptop: {
    help: 'Sit about an arm’s length from the screen. Your right hand plays the pitch: bring it closer to the camera to go higher. Your left hand is the volume, like the loop on a real theremin: bring it closer to go quiet, pull it back to swell.',
    caveat: 'A real theremin senses your hands through two antennas. A laptop can’t, so its camera watches your hands instead, and how big your hand looks stands in for how close it is.',
    fallback: 'Play with the mouse instead',
    fallbackHelp: 'Move the pointer left and right for the pitch, and up to make it louder.'
  }
};

const KNOBS = [
  { id: 'tone', label: 'TONE', value: 0.45 },
  { id: 'vibrato', label: 'VIBRATO', value: 0 },
  { id: 'aid', label: 'TUNING', value: 0 },   // pulls the pitch toward the nearest note
  { id: 'volume', label: 'VOLUME', value: 0.85 }
];
const K = {};
KNOBS.forEach(k => { k.def = k.value; K[k.id] = k; });
const RANGE = { id: 'range', value: 0, lockedBy: 'rockmore' };   // 0 three octaves, 1 five

const COL = {
  bg: '#0B0E12', wood: '#6E4628', woodDark: '#3B2414', woodLight: '#93603A', grille: '#2B2219', grilleLine: '#3A2E22',
  brass: '#C9A15B', brassDark: '#7A5E2E', chromeA: '#EEF2F5', chromeB: '#7D868E',
  neon: '#7CCBFF', warm: '#FFB35C', ivory: '#ECE6D6', dim: 'rgba(236,230,214,0.62)', faint: 'rgba(236,230,214,0.16)',
  tape: '#E6DAB0', tapeInk: '#4A3F2C'
};
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const $ = id => document.getElementById(id);
const CARDS = window.CARDS || [];
const CARD_BY_ID = {};
CARDS.forEach(c => { CARD_BY_ID[c.id] = c; });
const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
let turned = false;           // a phone held upright: the whole room is drawn sideways
const KIND = coarse ? 'phone' : 'laptop';
const MODE = MODES[KIND];

let started = false;
let L = null;                 // layout, rebuilt on every resize
let audio = null;             // Web Audio graph, built on the first tap
let canvasEl = null;
let input = 'camera';         // 'camera', or the fallback: 'tilt' on a phone, 'mouse' on a laptop
const unlocked = new Set();

const cam = { status: 'off', video: null, stream: null, vw: 0, vh: 0, hands: [], at: -1e9, model: null, problem: '',
  runtime: '', frames: 0, onAt: 0, error: '' };
const tilt = { ok: false, beta: 0, gamma: 0, at: -1e9 };
const mouse = { x: 0, y: 0, at: -1e9, inside: false };
// what the hands are doing. reach and height are 0 to 1. m is the sounding pitch as a MIDI number
const play = { reach: 0, height: 1, pitchSeen: -1e9, volSeen: -1e9, lastHeight: 1, m: null, vol: 1, level: 0,
  hasPitch: false, hasVol: false, pitchHand: null, volHand: null, rawSize: null, everSeen: false,
  pf: { sizes: [], f: {} }, vf: { sizes: [], f: {} }, frameAt: -1 };
let lastT = 0;

// cards
let soundTime = 0, glideBuf = [], quietSince = 0, steadyNote = null, steadyT = 0, swellArmed = false, swellTimes = [];
let toastQueue = [], toastId = null, toastTimer = null;
const calib = { step: null, t0: 0, far: [], near: [] };

let wakeLock = null;
const knobDrags = new Map();

/* ================= p5 ================= */

function setup() {
  const v = turnRoom();
  const c = createCanvas(v.w, v.h);
  c.parent('stage');
  canvasEl = c.elt;
  pixelDensity(Math.min(2, displayDensity()));
  loadReach();
  layout();
  listenPointer();
  listenUI();
  renderArchive();
  if (document.fonts && document.fonts.load) {
    const faces = ['500 12px Jost', '600 12px Jost', '12px "IBM Plex Mono"', '500 12px "IBM Plex Mono"', '12px Newsreader'];
    Promise.all(faces.map(f => document.fonts.load(f).catch(() => null))).then(() => layout());
  }
}

function windowResized() {
  const v = turnRoom();
  resizeCanvas(v.w, v.h);
  layout();
}

// Once the room has started, a phone held upright gets the whole room turned a quarter turn, so it is
// always wide. The start screen stays the way the phone is held. Everything on the page sits in #app,
// and #app is what turns. Returns the room's size.
function turnRoom() {
  const W = window.innerWidth, H = window.innerHeight, app = $('app');
  turned = started && coarse && Math.min(W, H) < 600 && H > W;
  const w = turned ? H : W, h = turned ? W : H;
  app.style.width = w + 'px';
  app.style.height = h + 'px';
  app.style.transform = turned ? 'translateX(' + W + 'px) rotate(90deg)' : '';
  app.classList.toggle('turned', turned);
  return { w, h };
}

// a point on the glass (the phone's own upright picture) to the room, and a pointer to the room
function screenToRoom(x, y) { return turned ? { x: y, y: window.innerWidth - x } : { x, y }; }
function localXY(e) {
  if (turned) return screenToRoom(e.clientX, e.clientY);
  const r = canvasEl.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function draw() {
  if (!L) return;
  const now = millis() / 1000, dt = Math.min(0.1, Math.max(0.001, now - (lastT || now)));
  lastT = now;
  readInput(now, dt);
  syncSound();
  if (started) { trackCards(now, dt); stepCalib(now); }
  drawRoom(now);
}

function safeInsets() {
  const cs = getComputedStyle($('safe'));
  const p = k => parseFloat(cs[k]) || 0;
  const s = { t: p('paddingTop'), r: p('paddingRight'), b: p('paddingBottom'), l: p('paddingLeft') };
  return turned ? { t: s.r, r: s.b, b: s.l, l: s.t } : s;   // turned, the phone's top (the notch) is the room's left
}

/* ================= layout ================= */

function layout() {
  const W = width, H = height, s = safeInsets();
  const portrait = H > W * 1.05;
  placeHud(portrait, s);
  $('app').classList.toggle('short', H < 520);
  const pad = 16;
  const disp = { x: pad + s.l, y: pad + s.t, w: Math.min(portrait ? W - 2 * pad - s.l - s.r : 300, 330), h: 176 };
  if (portrait) {                                  // the corner buttons sit above it on a phone, in one row or two
    const hud = $('hud');
    const hb = hud.hidden ? 0 : hud.getBoundingClientRect().bottom;
    disp.y = Math.max(disp.y + 50, hb + 10);
  }
  const hintH = 30;
  const bottom = H - pad - s.b - hintH;
  const top = portrait ? disp.y + disp.h + 26 : pad + s.t + 70;
  const avH = Math.max(140, bottom - top), avW = W - 2 * pad - s.l - s.r;
  // cabinet width. Cabinet and legs are about one cabinet width tall; the antenna takes what is left above,
  // up to most of a cabinet width, so a short screen gets a shorter antenna instead of a tiny instrument
  const short = H < 520;
  const legF = short ? 0.22 : 0.4;
  const cw = Math.max(120, Math.min(avW * (portrait ? 0.62 : 0.42), avH / (0.58 + legF + (short ? 0.6 : 0.95)), 440));
  const ch = cw * 0.58, legH = cw * legF;
  const loopW = cw * 0.42;
  let cx = portrait ? W / 2 + loopW * 0.2 : Math.max(disp.x + disp.w + loopW + cw / 2 + 30, W * 0.55);
  cx = Math.min(cx, W - pad - s.r - cw / 2 - 4);
  const floorY = bottom;
  const cab = { x: cx - cw / 2, y: floorY - legH - ch, w: cw, h: ch };
  const rod = { x: cab.x + cw * 0.84, y0: cab.y + 2, y1: Math.max(top - 10, cab.y - cw * 0.95), r: Math.max(2.5, cw * 0.012) };
  const loop = { x0: cab.x + 2, x1: cab.x - loopW, y: cab.y + ch * 0.24, h: cw * 0.16, r: Math.max(2.5, cw * 0.012) };
  const kr = Math.max(11, Math.min(24, cw * 0.055));
  const ky = cab.y + ch * 0.8;
  const slots = KNOBS.length + 1, x0 = cab.x + cw * 0.12, x1 = cab.x + cw * 0.88;
  const gap = (x1 - x0) / (slots - 1);
  KNOBS.forEach((k, i) => { k.x = x0 + gap * i; k.y = ky; k.r = Math.min(kr, gap * 0.36); k.slot = gap; });
  RANGE.x = x1; RANGE.y = ky; RANGE.w = Math.min(kr * 2.2, gap * 0.8); RANGE.h = RANGE.w * 0.68; RANGE.slot = gap;
  L = { W, H, s, portrait, disp, cab, rod, loop, floorY, legH, cw, ch, hintY: H - pad - s.b - 8 };
  placeToast();
}

function placeHud(portrait, s) {
  const hud = $('hud');
  hud.style.top = (12 + s.t) + 'px';
  hud.style.right = (12 + s.r) + 'px';
  hud.style.left = portrait ? (12 + s.l) + 'px' : 'auto';
}

function placeToast() {
  const s = L.s, toast = $('toast');
  // upright, the toast sits low, clear of the note display at the top. On its side it sits under the
  // display on the left, clear of the antenna
  if (L.portrait) {
    toast.style.top = 'auto'; toast.style.bottom = (46 + s.b) + 'px';
    toast.style.left = (12 + s.l) + 'px'; toast.style.right = (12 + s.r) + 'px'; toast.style.width = 'auto';
  } else {
    toast.style.top = (L.disp.y + L.disp.h + 12) + 'px'; toast.style.bottom = 'auto';
    toast.style.left = L.disp.x + 'px'; toast.style.right = 'auto'; toast.style.width = Math.max(260, L.disp.w) + 'px';
  }
}

/* ================= the hands ================= */

function gotHands(results, err) {
  if (err) { cam.error = String(err.message || err).slice(0, 60); return; }
  cam.hands = Array.isArray(results) ? results : [];
  cam.at = millis() / 1000;
  cam.frames++;
}

function handInfo(h) {
  const kp = h && h.keypoints;
  if (!kp || kp.length < 21 || !cam.vw || !cam.vh) return null;
  const ref = Math.min(cam.vw, cam.vh);
  const d = (a, b) => Math.hypot(kp[a].x - kp[b].x, kp[a].y - kp[b].y);
  // the palm only: wrist to each knuckle, and across the knuckles. It changes far less than the fingers do
  // when a hand opens and closes, and averaging five lengths takes out much of the tracker's shake.
  const size = (d(0, 5) + d(0, 9) + d(0, 13) + d(0, 17) + d(5, 17)) / 5 / ref;
  const ids = [0, 5, 9, 13, 17];
  let x = 0, y = 0;
  ids.forEach(i => { x += kp[i].x; y += kp[i].y; });
  x /= ids.length; y /= ids.length;
  // sx, sy: on the glass, mirrored like a mirror. x, y: in the room, where your right hand is on the right
  const sx = 1 - x / cam.vw, sy = y / cam.vh;
  return { size, sx, sy, x: turned ? sy : sx, y: turned ? 1 - sx : sy, kp };
}

function reachFor(size) {
  const a = Math.log(Math.max(1e-4, CONFIG.far)), b = Math.log(Math.max(CONFIG.far * 1.05, CONFIG.near));
  return constrain((Math.log(Math.max(1e-4, size)) - a) / (b - a), 0, 1);
}

// the volume hand: far is loud, near is quiet, like the loop
function volumeFor(reach) { return constrain((CONFIG.volSilent - reach) / (CONFIG.volSilent - CONFIG.volFull), 0, 1); }

// A hand's distance, cleaned up: the median of its last five sizes drops single bad frames, then a
// One Euro filter (Casiez, Roussel and Vogel, 2012) holds it steady when still and follows when it moves.
function cleanReach(st, size, dt) {
  st.sizes.push(size); if (st.sizes.length > 5) st.sizes.shift();
  const r = reachFor(st.sizes.slice().sort((a, b) => a - b)[Math.floor(st.sizes.length / 2)]);
  const f = st.f, alpha = cut => 1 / (1 + 1 / (2 * Math.PI * cut * dt));
  if (f.x == null) { f.x = r; f.dx = 0; return r; }
  f.dx += alpha(0.5) * ((r - f.x) / dt - f.dx);
  f.x += alpha(CONFIG.steady + CONFIG.follow * Math.abs(f.dx)) * (r - f.x);
  return f.x;
}
function resetFilter(st) { st.sizes = []; st.f = {}; }

function readInput(now, dt) {
  play.rawSize = null;
  if (input === 'camera') {
    const fresh = now - cam.at < 0.5;
    const hs = fresh ? cam.hands.map(handInfo).filter(Boolean).sort((a, b) => a.x - b.x) : [];
    let ph = null, vh = null;
    if (hs.length >= 2) { ph = hs[hs.length - 1]; vh = hs[0]; }
    else if (hs.length === 1) { if (hs[0].x >= 0.45) ph = hs[0]; else vh = hs[0]; }
    play.pitchHand = ph; play.volHand = vh;
    // filter once per tracker frame, not once per screen frame
    const fresh2 = cam.at !== play.frameAt, fdt = Math.min(0.25, Math.max(0.01, cam.at - play.frameAt));
    play.frameAt = cam.at;
    if (now - play.pitchSeen > CONFIG.holdLost) resetFilter(play.pf);
    if (now - play.volSeen > 0.6) resetFilter(play.vf);
    if (ph) { if (fresh2) play.reach = cleanReach(play.pf, ph.size, fdt); play.rawSize = ph.size; play.pitchSeen = now; play.everSeen = true; }
    if (vh) { if (fresh2) play.height = volumeFor(cleanReach(play.vf, vh.size, fdt)); play.lastHeight = play.height; play.volSeen = now; play.everSeen = true; }
    play.hasPitch = now - play.pitchSeen < CONFIG.holdLost;
    play.hasVol = now - play.volSeen < 0.6;
    // A volume hand that went quiet right up against the camera and then dropped out of the picture stays
    // quiet for a while, instead of the sound jumping back to full.
    let target;
    if (play.hasVol) target = play.height;
    else if (play.lastHeight < 0.3 && now - play.volSeen < 4) target = play.lastHeight;
    else target = 1;
    play.volTarget = target;
  } else if (input === 'tilt') {
    const on = tilt.ok && now - tilt.at < 1;
    play.hasPitch = on;
    play.hasVol = on;
    if (on) {
      play.reach = constrain((tilt.gamma + 35) / 70, 0, 1);
      play.height = constrain((tilt.beta - 10) / 55, 0, 1);
    }
    play.volTarget = on ? play.height : 0;
  } else {
    const on = mouse.inside && now - mouse.at < 3 && !knobDrags.size;
    play.hasPitch = on;
    play.hasVol = on;
    if (on) {
      play.reach = constrain(mouse.x / width, 0, 1);
      play.height = constrain(1 - mouse.y / height, 0, 1);
    }
    play.volTarget = on ? play.height : 0;
  }
  // pitch: glide toward the hand, smoothed so tracking shake doesn't wobble the note
  const rg = CONFIG.ranges[RANGE.value ? 1 : 0];
  let target = rg[0] + play.reach * (rg[1] - rg[0]);
  const aid = K.aid.value;
  if (aid > 0) { const n = Math.round(target); target = n + (target - n) * (1 - aid); }
  if (play.hasPitch) {
    if (play.m === null || play.level < 0.005) play.m = target;          // a note that starts from silence starts on its own pitch
    else play.m += (target - play.m) * (1 - Math.exp(-dt / CONFIG.pitchSmooth));
  }
  const vt = play.hasPitch ? play.volTarget : 0;
  play.vol += (vt - play.vol) * (1 - Math.exp(-dt / CONFIG.volSmooth));
  play.level = play.m === null ? 0 : play.vol * K.volume.value;
}

/* ================= camera and hand tracker ================= */

async function startCamera() {
  if (cam.status === 'starting' || cam.status === 'model' || cam.status === 'on') return;
  cam.status = 'starting'; cam.problem = '';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return cameraFailed('This browser can’t open the camera here.');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
  } catch (e) {
    return cameraFailed(e && e.name === 'NotAllowedError' ? 'Camera access was turned down. Allow the camera for this page in your browser settings, or play without it.' : 'The camera didn’t open. Another app may be using it.');
  }
  const v = document.createElement('video');
  v.setAttribute('playsinline', ''); v.setAttribute('autoplay', ''); v.muted = true;
  // in the page and on screen, but invisible: Safari can stop updating a video it thinks nobody sees
  v.style.cssText = 'position:fixed;left:0;top:0;opacity:0.01;pointer-events:none;z-index:-1;';
  v.srcObject = stream;
  document.body.appendChild(v);
  try { await v.play(); } catch (e) {}
  await new Promise(r => { if (v.videoWidth) r(); else v.addEventListener('loadedmetadata', () => r(), { once: true }); setTimeout(r, 3000); });
  cam.vw = v.videoWidth || 640; cam.vh = v.videoHeight || 480;
  v.width = cam.vw; v.height = cam.vh;       // ml5 scales the hand points to these
  v.style.width = '2px'; v.style.height = '2px';
  cam.video = v; cam.stream = stream;
  if (typeof window.ml5 === 'undefined' || !window.ml5.handPose) return cameraFailed('The hand tracker didn’t load. Check the internet connection and reload.');
  cam.status = 'model';
  loadTracker('mediapipe');
  setTimeout(() => { if (cam.status === 'model') showNote('Camera', 'The hand tracker is still loading. It can take a little while the first time.', 5000); }, 9000);
}

function loadTracker(runtime) {
  const opts = { maxHands: 2, modelType: 'lite', runtime };
  if (runtime === 'mediapipe') opts.solutionPath = CONFIG.mediapipePath;
  cam.runtime = runtime;
  let done = false;
  const ready = m => {
    if (done || cam.status !== 'model' || cam.runtime !== runtime) return;
    done = true;
    cam.model = m;
    cam.status = 'on'; cam.onAt = millis() / 1000; cam.frames = 0;
    try { m.detectStart(cam.video, gotHands); } catch (e) { cam.error = String(e.message || e).slice(0, 60); }
    $('reach-btn').hidden = false;
    layout();
  };
  try {
    const m = window.ml5.handPose(opts, () => ready(m));
    if (m && m.ready && typeof m.ready.then === 'function') m.ready.then(() => ready(m)).catch(e => trackerFailed(runtime, e));
  } catch (e) { trackerFailed(runtime, e); return; }
  setTimeout(() => { if (!done) trackerFailed(runtime, new Error('took too long')); }, CONFIG.trackerWait * 1000);
}

// one runtime failed: try the other, then give up and offer the fallback
function trackerFailed(runtime, e) {
  if (cam.status !== 'model' || cam.runtime !== runtime) return;
  cam.error = runtime + ': ' + String((e && e.message) || e).slice(0, 50);
  if (runtime === 'mediapipe') loadTracker('tfjs');
  else cameraFailed('The hand tracker didn’t load on this device (' + cam.error + '). Reload to try again, or play without the camera.');
}

function cameraFailed(msg) {
  cam.status = 'failed';
  cam.problem = msg;
  if (cam.stream) { try { cam.stream.getTracks().forEach(t => t.stop()); } catch (e) {} }
  openHelp();
}

/* ================= fallback: tilt or mouse ================= */

function useFallback() {
  if (KIND === 'phone') { input = 'tilt'; askMotion(); }   // has to run inside the tap on iPhone
  else input = 'mouse';
  $('reach-btn').hidden = true;
  startRoom(true);
}

function askMotion() {
  const D = window.DeviceOrientationEvent;
  const listen = () => window.addEventListener('deviceorientation', e => {
    if (e.beta == null || e.gamma == null) return;
    tilt.beta = e.beta; tilt.gamma = e.gamma; tilt.at = millis() / 1000; tilt.ok = true;
  });
  if (D && typeof D.requestPermission === 'function') {
    D.requestPermission().then(r => { if (r === 'granted') listen(); else showNote('Tilt', 'Motion access was turned down, so tilting can’t play.', 5000); }).catch(() => listen());
  } else listen();
}

/* ================= sound ================= */

function buildAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  // the theremin's voice: close to a sine, with a few soft overtones that TONE brings in
  const rich = ctx.createPeriodicWave(new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]), new Float32Array([0, 1, 0.45, 0.24, 0.13, 0.08, 0.05, 0.03, 0.02]));
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
  o1.type = 'sine'; o2.setPeriodicWave(rich);
  const g1 = ctx.createGain(), g2 = ctx.createGain();
  const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
  lfo.frequency.value = CONFIG.vibratoRate; lfoG.gain.value = 0;
  lfo.connect(lfoG); lfoG.connect(o1.detune); lfoG.connect(o2.detune);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6;
  const amp = ctx.createGain(); amp.gain.value = 0;
  const master = ctx.createGain(); master.gain.value = 0.9;
  const conv = ctx.createConvolver(); conv.buffer = roomImpulse(ctx, CONFIG.room, 3);
  const wet = ctx.createGain(); wet.gain.value = CONFIG.reverb;
  o1.connect(g1); o2.connect(g2); g1.connect(lp); g2.connect(lp);
  lp.connect(amp); amp.connect(master); amp.connect(conv); conv.connect(wet); wet.connect(master);
  master.connect(ctx.destination);
  const t = ctx.currentTime;
  o1.frequency.setValueAtTime(220, t); o2.frequency.setValueAtTime(220, t);
  o1.start(); o2.start(); lfo.start();
  return { ctx, o1, o2, g1, g2, lfoG, lp, amp, applied: {} };
}

function roomImpulse(ctx, seconds, decay) {
  const n = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return buf;
}

function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function syncSound() {
  if (!audio) return;
  const a = audio, t = a.ctx.currentTime;
  if (play.m !== null) {
    const hz = midiHz(play.m);
    a.o1.frequency.setTargetAtTime(hz, t, 0.012);
    a.o2.frequency.setTargetAtTime(hz, t, 0.012);
  }
  // loudness on a curve, so the volume hand fades smoothly to silence
  const lvl = started ? Math.pow(constrain(play.level, 0, 1), 1.6) * 0.42 : 0;
  a.amp.gain.setTargetAtTime(lvl, t, 0.025);
  const tone = K.tone.value, vib = K.vibrato.value;
  if (a.applied.tone !== tone) {
    a.applied.tone = tone;
    a.g1.gain.setTargetAtTime(1 - tone * 0.8, t, 0.03);
    a.g2.gain.setTargetAtTime(0.15 + tone * 0.85, t, 0.03);
    a.lp.frequency.setTargetAtTime(900 + tone * tone * 6500, t, 0.03);
  }
  if (a.applied.vib !== vib) { a.applied.vib = vib; a.lfoG.gain.setTargetAtTime(vib * CONFIG.vibratoMax, t, 0.05); }
}

function resumeAudio() { if (audio && audio.ctx.state !== 'running') audio.ctx.resume(); }

// iPhones mute web audio in silent mode. Ask for the playback session, or fall back to a silent loop.
let iosAudioKept = false;
function keepIOSAudioOn() {
  const iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!iOS || iosAudioKept) return;
  iosAudioKept = true;
  try { if (navigator.audioSession) { navigator.audioSession.type = 'playback'; return; } } catch (e) {}
  try {
    const a = new Audio(silentWavUrl());
    a.loop = true;
    a.setAttribute('playsinline', '');
    a.play().catch(() => {});
  } catch (e) {}
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

// Nobody touches the screen while playing, so ask the phone not to sleep.
async function keepAwake() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) {}
}

/* ================= cards ================= */

function trackCards(now, dt) {
  const U = CONFIG.unlock, loud = play.level >= CONFIG.audible;
  if (loud) {
    soundTime += dt;
    if (soundTime >= U.air) unlock('air');
  }
  // one glide across an octave, without the sound stopping
  if (loud && play.m !== null) {
    quietSince = 0;
    glideBuf.push({ t: now, m: play.m });
    while (glideBuf.length && now - glideBuf[0].t > U.glideWindow) glideBuf.shift();
    let lo = Infinity, hi = -Infinity;
    glideBuf.forEach(p => { lo = Math.min(lo, p.m); hi = Math.max(hi, p.m); });
    if (hi - lo >= U.glideSemis) unlock('petrograd');
  } else {
    quietSince += dt;
    if (quietSince > 0.25) glideBuf = [];
  }
  // one note held in tune
  if (play.m !== null && play.level >= U.steadyLevel) {
    const n = Math.round(play.m), cents = (play.m - n) * 100;
    if (Math.abs(cents) <= U.steadyCents && n === steadyNote) {
      steadyT += dt;
      if (steadyT >= U.steadySecs) unlock('rockmore');
    } else { steadyNote = Math.abs(cents) <= U.steadyCents ? n : null; steadyT = 0; }
  } else { steadyNote = null; steadyT = 0; }
  // swells with the volume hand, while the pitch hand plays
  const hasVolControl = input !== 'camera' || play.hasVol;
  if (play.hasPitch && hasVolControl) {
    if (play.volTarget <= U.swellLow) swellArmed = true;
    else if (swellArmed && play.volTarget >= U.swellHigh) {
      swellArmed = false;
      swellTimes.push(now);
      swellTimes = swellTimes.filter(t => now - t <= U.swellWindow);
      if (swellTimes.length >= U.swells) unlock('spellbound');
      else if (!unlocked.has('spellbound')) showNote('Swell', swellTimes.length + ' of ' + U.swells, 1400);
    }
  }
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

// a short message in the toast without a card
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
  return 'All four cards found. Open the Archive to read them.';
}

function renderArchive() {
  $('archive-count').textContent = unlocked.size + '/' + CARDS.length;
  const list = $('card-list');
  list.replaceChildren();
  CARDS.forEach((c, i) => {
    const open = unlocked.has(c.id);
    const li = document.createElement('li');
    li.className = 'card-item' + (open ? ' open' : '');
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = String(i + 1).padStart(2, '0');
    const mid = document.createElement('div');
    const t = document.createElement('p');
    t.className = 't';
    t.textContent = open ? c.title : 'Locked';
    const hint = document.createElement('p');
    hint.className = 'h';
    hint.textContent = open ? c.eyebrow : c.hint;
    mid.append(t, hint);
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

function openArchive() {
  renderArchive();
  $('archive').hidden = false;
  $('archive-close').focus();
}

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
    img.removeAttribute('src');
    img.alt = c.imageAlt || '';
    img.src = c.image;
    credit.replaceChildren();
    if (c.creditUrl) {
      const a = document.createElement('a');
      a.href = c.creditUrl; a.target = '_blank'; a.rel = 'noopener'; a.textContent = c.credit || 'Image source';
      credit.append(a);
    } else credit.textContent = c.credit || '';
    fig.hidden = false;
  } else fig.hidden = true;
  const body = $('card-body');
  body.replaceChildren();
  (c.body || []).forEach(text => { const p = document.createElement('p'); p.textContent = text; body.append(p); });
  if (c.reward) { const p = document.createElement('p'); p.className = 'reward'; p.textContent = c.reward; body.append(p); }
  const src = $('card-sources');
  src.replaceChildren();
  (c.sources || []).forEach(s => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = s.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = s.label;
    li.append(a);
    src.append(li);
  });
  $('archive').hidden = true;
  const sheet = $('card');
  sheet.hidden = false;
  sheet.scrollTop = 0;
  $('card-close').focus();
}

function closeSheets() {
  const cardWasOpen = !$('card').hidden;
  $('card').hidden = true;
  $('archive').hidden = true;
  if (cardWasOpen && !toastId && toastQueue.length) nextToast();
}

function relock() {
  unlocked.clear();
  soundTime = 0; glideBuf = []; steadyT = 0; swellTimes = []; swellArmed = false;
  RANGE.value = 0;
  toastQueue = []; toastId = null; clearTimeout(toastTimer); $('toast').hidden = true;
  renderArchive();
}

/* ================= set my reach ================= */

function loadReach() {
  try {
    const r = JSON.parse(localStorage.getItem('theremin.reach') || 'null');
    if (r && r.far > 0 && r.near > r.far) { CONFIG.far = r.far; CONFIG.near = r.near; }
  } catch (e) {}
}

function startCalib() {
  if (input !== 'camera' || cam.status !== 'on') return;
  calib.step = 'far'; calib.t0 = millis() / 1000; calib.far = []; calib.near = [];
  $('reach-btn').classList.add('on');
}

function median(a) { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; }

function stepCalib(now) {
  if (!calib.step) return;
  if (play.rawSize !== null) calib[calib.step].push(play.rawSize);
  if (now - calib.t0 < CONFIG.calibrate) return;
  if (calib.step === 'far') { calib.step = 'near'; calib.t0 = now; return; }
  calib.step = null;
  $('reach-btn').classList.remove('on');
  const f = median(calib.far), n = median(calib.near);
  if (calib.far.length < 8 || calib.near.length < 8 || n < f * 1.4) {
    showNote('Set my reach', 'That didn’t catch a clear far and near. Try again, with your right hand further away for the first count and close for the second.', 6000);
    return;
  }
  CONFIG.far = f * 1.04; CONFIG.near = n * 0.96;
  try { localStorage.setItem('theremin.reach', JSON.stringify({ far: CONFIG.far, near: CONFIG.near })); } catch (e) {}
  showNote('Set my reach', 'Done. The whole range now sits between your far and your near.', 4000);
}

/* ================= drawing ================= */

// The camera picture's size changes when the phone turns (upright it is tall, on its side it is wide).
// Read it every frame, so the mirror isn't squashed and the hand points stay where the hands are.
function syncVideoSize() {
  const v = cam.video;
  if (!v || !v.videoWidth || !v.videoHeight) return;
  if (v.videoWidth !== cam.vw || v.videoHeight !== cam.vh) {
    cam.vw = v.videoWidth; cam.vh = v.videoHeight;
    v.width = cam.vw; v.height = cam.vh;     // ml5 scales the hand points to these
    cam.hands = [];
  }
}

function drawRoom(now) {
  syncVideoSize();
  const ctx = drawingContext;
  const g = ctx.createRadialGradient(width * 0.55, height * 0.35, 10, width * 0.55, height * 0.4, Math.max(width, height) * 0.8);
  g.addColorStop(0, '#162231'); g.addColorStop(1, COL.bg);
  ctx.fillStyle = g; ctx.fillRect(0, 0, width, height);
  drawCamera();
  drawFloor();
  drawInstrument(now);
  drawHands();
  drawDisplay();
  drawHint();
  drawPrompt(now);
}

// the camera picture as a faint mirror behind the instrument, so players can see where their hands are
// The picture fills the glass. Turned, the glass is the room's height wide and its width tall.
function glassSize() { return turned ? { w: height, h: width } : { w: width, h: height }; }
function coverFit() {
  const G = glassSize(), sc = Math.max(G.w / cam.vw, G.h / cam.vh);
  return { sc, ox: (G.w - cam.vw * sc) / 2, oy: (G.h - cam.vh * sc) / 2, W: G.w, H: G.h };
}
function toScreenPt(nx, ny) {   // nx, ny: mirrored picture coordinates on the glass, 0 to 1
  const f = coverFit();
  return { x: f.ox + nx * cam.vw * f.sc, y: f.oy + ny * cam.vh * f.sc };
}
// draw in the glass's own directions: turned, the canvas is turned a quarter back
function glassTransform(ctx) { if (turned) { ctx.translate(0, height); ctx.rotate(-Math.PI / 2); } }

function drawCamera() {
  if (input !== 'camera' || !cam.video || !cam.vw || (cam.status !== 'on' && cam.status !== 'model')) return;
  const ctx = drawingContext, f = coverFit();
  ctx.save();
  glassTransform(ctx);
  ctx.globalAlpha = 0.2;
  ctx.translate(f.W, 0); ctx.scale(-1, 1);
  try { ctx.drawImage(cam.video, f.W - f.ox - cam.vw * f.sc, f.oy, cam.vw * f.sc, cam.vh * f.sc); } catch (e) {}
  ctx.restore();
  ctx.fillStyle = 'rgba(11,14,18,0.35)';
  ctx.fillRect(0, 0, width, height);
}

function drawFloor() {
  const ctx = drawingContext, y = L.floorY;
  const g = ctx.createLinearGradient(0, y - 4, 0, height);
  g.addColorStop(0, 'rgba(236,230,214,0.10)'); g.addColorStop(1, 'rgba(236,230,214,0)');
  ctx.fillStyle = g; ctx.fillRect(0, y, width, height - y);
}

function drawInstrument(now) {
  const ctx = drawingContext, c = L.cab, cw = L.cw, near = play.hasPitch ? play.reach : 0;
  const loopNear = play.hasPitch ? 1 - play.vol : 0;
  // legs
  ctx.fillStyle = COL.woodDark;
  const legW = cw * 0.05;
  [[0.08, -0.03], [0.92, 0.03], [0.22, -0.01], [0.78, 0.01]].forEach(([fx, lean], i) => {
    const x = c.x + c.w * fx, y0 = c.y + c.h, y1 = L.floorY;
    ctx.globalAlpha = i < 2 ? 1 : 0.55;
    ctx.beginPath();
    ctx.moveTo(x - legW / 2, y0); ctx.lineTo(x + legW / 2, y0);
    ctx.lineTo(x + legW * 0.3 + lean * cw, y1); ctx.lineTo(x - legW * 0.3 + lean * cw, y1);
    ctx.closePath(); ctx.fill();
  });
  ctx.globalAlpha = 1;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(c.x + c.w / 2, L.floorY + 2, c.w * 0.62, Math.max(3, cw * 0.025), 0, 0, Math.PI * 2); ctx.fill();
  // pitch antenna: an upright rod rising from the right end of the cabinet
  const r = L.rod;
  glow(r.x, (r.y0 + r.y1) / 2, near, COL.neon, cw, r.y0 - r.y1);
  const rg = ctx.createLinearGradient(r.x - r.r, 0, r.x + r.r, 0);
  rg.addColorStop(0, COL.chromeB); rg.addColorStop(0.45, COL.chromeA); rg.addColorStop(1, COL.chromeB);
  ctx.fillStyle = rg;
  ctx.fillRect(r.x - r.r, r.y1, r.r * 2, r.y0 - r.y1);
  ctx.beginPath(); ctx.arc(r.x, r.y1, r.r * 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222'; ctx.fillRect(r.x - r.r * 2.4, r.y0 - r.r * 2, r.r * 4.8, r.r * 2.4);
  // volume loop: a flat loop out from the left side of the cabinet
  const lp = L.loop;
  glow((lp.x0 + lp.x1) / 2, lp.y, loopNear, COL.warm, cw, lp.h);
  ctx.strokeStyle = COL.chromeA; ctx.lineWidth = lp.r * 2; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(lp.x0, lp.y - lp.h * 0.18);
  ctx.lineTo(lp.x1 + lp.h / 2, lp.y - lp.h * 0.5);
  ctx.arc(lp.x1 + lp.h / 2, lp.y, lp.h / 2, -Math.PI / 2, Math.PI / 2, true);
  ctx.lineTo(lp.x0, lp.y + lp.h * 0.18);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(1, lp.r * 0.6);
  ctx.beginPath(); ctx.moveTo(lp.x0, lp.y + lp.h * 0.18 + lp.r * 0.7); ctx.lineTo(lp.x1 + lp.h / 2, lp.y + lp.h * 0.5 + lp.r * 0.7); ctx.stroke();
  // cabinet
  const wg = ctx.createLinearGradient(0, c.y, 0, c.y + c.h);
  wg.addColorStop(0, COL.woodLight); wg.addColorStop(0.12, COL.wood); wg.addColorStop(1, COL.woodDark);
  ctx.fillStyle = wg;
  roundRect(ctx, c.x, c.y, c.w, c.h, cw * 0.035); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(c.x + 4, c.y + 3, c.w - 8, 2);
  // grain
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
  for (let i = 1; i < 7; i++) { const y = c.y + c.h * i / 7; ctx.beginPath(); ctx.moveTo(c.x + 6, y); ctx.bezierCurveTo(c.x + c.w * 0.3, y + 3, c.x + c.w * 0.6, y - 3, c.x + c.w - 6, y + 1); ctx.stroke(); }
  // speaker grille
  const gx = c.x + c.w * 0.1, gy = c.y + c.h * 0.12, gw = c.w * 0.8, gh = c.h * 0.5;
  ctx.fillStyle = COL.grille; roundRect(ctx, gx, gy, gw, gh, cw * 0.02); ctx.fill();
  ctx.save(); roundRect(ctx, gx, gy, gw, gh, cw * 0.02); ctx.clip();
  ctx.strokeStyle = COL.grilleLine; ctx.lineWidth = 1;
  for (let x = gx - gh; x < gx + gw; x += 5) { ctx.beginPath(); ctx.moveTo(x, gy + gh); ctx.lineTo(x + gh, gy); ctx.stroke(); }
  // the speaker breathes with the sound
  const breathe = play.level > 0.01 ? 0.25 + play.level * 0.5 : 0;
  if (breathe) { const sg = ctx.createRadialGradient(gx + gw / 2, gy + gh / 2, 2, gx + gw / 2, gy + gh / 2, gw * 0.5); sg.addColorStop(0, 'rgba(124,203,255,' + (breathe * 0.35).toFixed(3) + ')'); sg.addColorStop(1, 'rgba(124,203,255,0)'); ctx.fillStyle = sg; ctx.fillRect(gx, gy, gw, gh); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; roundRect(ctx, gx, gy, gw, gh, cw * 0.02); ctx.stroke();
  // name plate
  ctx.fillStyle = COL.brass;
  const pw = c.w * 0.26, ph = Math.max(8, c.h * 0.075);
  const py = c.y + (gy - c.y - ph) / 2;   // in the strip above the grille, clear of the knobs
  roundRect(ctx, c.x + c.w / 2 - pw / 2, py, pw, ph, 2); ctx.fill();
  ctx.fillStyle = COL.brassDark; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '600 ' + Math.max(6, ph * 0.62).toFixed(1) + 'px Jost, sans-serif';
  spaced(ctx, 'THEREMIN', c.x + c.w / 2, py + ph / 2 + 0.5, 0.18);
  KNOBS.forEach(drawKnob);
  drawRangeSwitch();
}

function glow(x, y, amt, color, cw, len) {
  if (amt <= 0.01) return;
  const ctx = drawingContext;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rad = cw * (0.25 + amt * 0.55) + len * 0.35;
  const gr = ctx.createRadialGradient(x, y, 1, x, y, rad);
  const a = (0.08 + amt * 0.32).toFixed(3);
  gr.addColorStop(0, hexA(color, a)); gr.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = gr;
  ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  ctx.restore();
}

function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function spaced(ctx, s, x, y, em) {
  const size = parseFloat(ctx.font.match(/([\d.]+)px/)[1]), gap = size * em;
  const w = [...s].reduce((a, ch) => a + ctx.measureText(ch).width, 0) + gap * (s.length - 1);
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + gap; }
  ctx.textAlign = align;
}

// a label as large as it can be, up to max px, without running into the next knob's
function fitLabel(ctx, label, slot, max) {
  let size = max;
  for (; size > 5.5; size -= 0.5) {
    ctx.font = '600 ' + size + 'px Jost, sans-serif';
    if (ctx.measureText(label).width + size * 0.08 * label.length <= slot - 6) break;
  }
}

function drawKnob(k) {
  const ctx = drawingContext;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.arc(k.x + 1, k.y + 2, k.r, 0, Math.PI * 2); ctx.fill();
  const kg = ctx.createRadialGradient(k.x - k.r * 0.35, k.y - k.r * 0.35, 1, k.x, k.y, k.r);
  kg.addColorStop(0, '#3A3631'); kg.addColorStop(1, '#141210');
  ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = COL.brass; ctx.lineWidth = Math.max(1.5, k.r * 0.12);
  ctx.beginPath(); ctx.arc(k.x, k.y, k.r * 0.86, 0, Math.PI * 2); ctx.stroke();
  const a = (-135 + 270 * k.value) * Math.PI / 180;
  ctx.strokeStyle = COL.ivory; ctx.lineWidth = Math.max(1.5, k.r * 0.13); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(k.x + Math.sin(a) * k.r * 0.2, k.y - Math.cos(a) * k.r * 0.2); ctx.lineTo(k.x + Math.sin(a) * k.r * 0.75, k.y - Math.cos(a) * k.r * 0.75); ctx.stroke();
  ctx.fillStyle = 'rgba(236,230,214,0.82)'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  fitLabel(ctx, k.label, k.slot, Math.min(11, Math.max(7, k.r * 0.5)));
  spaced(ctx, k.label, k.x, k.y + k.r + 4, 0.08);
}

function drawRangeSwitch() {
  const ctx = drawingContext, s = RANGE, x = s.x - s.w / 2, y = s.y - s.h / 2;
  ctx.fillStyle = '#16130F'; roundRect(ctx, x, y, s.w, s.h, s.h * 0.3); ctx.fill();
  ctx.strokeStyle = COL.brass; ctx.lineWidth = 1.5; roundRect(ctx, x, y, s.w, s.h, s.h * 0.3); ctx.stroke();
  const half = s.w / 2;
  ctx.fillStyle = COL.ivory; roundRect(ctx, x + 2 + (s.value ? half : 0), y + 2, half - 4, s.h - 4, s.h * 0.24); ctx.fill();
  ctx.font = '600 ' + Math.max(7, s.h * 0.34).toFixed(1) + 'px Jost, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = s.value ? COL.dim : '#16130F'; ctx.fillText('3', x + half / 2, s.y + 0.5);
  ctx.fillStyle = s.value ? '#16130F' : COL.dim; ctx.fillText('5', x + half * 1.5, s.y + 0.5);
  ctx.fillStyle = 'rgba(236,230,214,0.82)'; ctx.textBaseline = 'top';
  fitLabel(ctx, 'OCTAVES', s.slot, 11);
  spaced(ctx, 'OCTAVES', s.x, s.y + s.h / 2 + 5, 0.08);
  if (!unlocked.has(s.lockedBy)) {   // taped shut until card 03
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(-0.12);
    ctx.fillStyle = COL.tape; ctx.globalAlpha = 0.93;
    ctx.fillRect(-s.w * 0.62, -s.h * 0.32, s.w * 1.24, s.h * 0.64);
    ctx.globalAlpha = 1; ctx.fillStyle = COL.tapeInk; ctx.textBaseline = 'middle';
    ctx.font = 'italic ' + Math.max(7, s.h * 0.3).toFixed(1) + 'px Newsreader, serif';
    ctx.fillText('card 03', 0, 0.5);
    ctx.restore();
  }
}

// the hand points the camera found, over the faint mirror
function drawHands() {
  if (input !== 'camera') return;
  const ctx = drawingContext;
  ctx.save();
  glassTransform(ctx);
  [[play.pitchHand, COL.neon], [play.volHand, COL.warm]].forEach(([hnd, col]) => {
    if (!hnd) return;
    ctx.fillStyle = hexA(col, 0.85);
    hnd.kp.forEach(p => { const q = toScreenPt(1 - p.x / cam.vw, p.y / cam.vh); ctx.beginPath(); ctx.arc(q.x, q.y, 2.6, 0, Math.PI * 2); ctx.fill(); });
    const c = toScreenPt(hnd.sx, hnd.sy), f = coverFit();
    ctx.strokeStyle = hexA(col, 0.6); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(c.x, c.y, hnd.size * Math.min(cam.vw, cam.vh) * f.sc * 0.55, 0, Math.PI * 2); ctx.stroke();
  });
  ctx.restore();
}

function noteParts(m) {
  const n = Math.round(m), cents = Math.round((m - n) * 100);
  return { name: NOTE_NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1), cents, hz: midiHz(m) };
}

function drawDisplay() {
  const ctx = drawingContext, d = L.disp, x = d.x, y = d.y, w = d.w, h = d.h;
  ctx.fillStyle = 'rgba(14,18,24,0.84)'; roundRect(ctx, x, y, w, h, 12); ctx.fill();
  ctx.strokeStyle = COL.faint; ctx.lineWidth = 1; roundRect(ctx, x, y, w, h, 12); ctx.stroke();
  const sounding = play.m !== null && play.level >= 0.02;
  const P = sounding ? noteParts(play.m) : null;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillStyle = COL.dim; ctx.font = '500 10px Jost, sans-serif'; spaced(ctx, 'NOTE', x + 14, y + 20, 0.16);
  ctx.fillStyle = sounding ? COL.ivory : COL.faint; ctx.font = '500 40px Jost, sans-serif';
  ctx.fillText(P ? P.name : '··', x + 12, y + 60);
  if (P) {
    const inTune = Math.abs(P.cents) <= CONFIG.unlock.steadyCents;
    ctx.textAlign = 'right'; ctx.font = '500 16px "IBM Plex Mono", monospace';
    ctx.fillStyle = inTune ? COL.neon : COL.dim;
    ctx.fillText((P.cents > 0 ? '+' : P.cents < 0 ? '−' : '±') + Math.abs(P.cents) + '¢', x + w - 14, y + 36);
    ctx.fillStyle = COL.dim; ctx.font = '13px "IBM Plex Mono", monospace';
    ctx.fillText(P.hz.toFixed(1) + ' Hz', x + w - 14, y + 58);
  }
  // tuner: the needle sits in the middle when the note is in tune
  const ty = y + 76, tx0 = x + 14, tx1 = x + w - 14;
  ctx.strokeStyle = COL.faint; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx0, ty); ctx.lineTo(tx1, ty); ctx.stroke();
  const zone = (tx1 - tx0) * CONFIG.unlock.steadyCents / 100;
  ctx.fillStyle = 'rgba(124,203,255,0.18)'; ctx.fillRect((tx0 + tx1) / 2 - zone, ty - 5, zone * 2, 10);
  ctx.fillStyle = COL.dim; ctx.fillRect((tx0 + tx1) / 2 - 0.5, ty - 7, 1, 14);
  if (P) { const nx = (tx0 + tx1) / 2 + (tx1 - tx0) / 2 * constrain(P.cents / 50, -1, 1); ctx.fillStyle = Math.abs(P.cents) <= CONFIG.unlock.steadyCents ? COL.neon : COL.ivory; ctx.fillRect(nx - 1.5, ty - 9, 3, 18); }
  // reach (how close the pitch hand is) and loop (how loud the volume hand lets it be)
  bar(x + 14, y + 104, w - 28, 'PITCH HAND', 'FAR', 'NEAR', play.hasPitch ? play.reach : null, COL.neon);
  bar(x + 14, y + 138, w - 28, 'VOLUME HAND', 'QUIET', 'LOUD', play.hasPitch || play.hasVol ? play.vol : null, COL.warm);
  ctx.textAlign = 'left'; ctx.fillStyle = COL.dim; ctx.font = '500 9.5px Jost, sans-serif';
  spaced(ctx, statusText(), x + 14, y + h - 10, 0.12);
}

function bar(x, y, w, label, lo, hi, v, col) {
  const ctx = drawingContext;
  ctx.textAlign = 'left'; ctx.fillStyle = COL.dim; ctx.font = '500 9.5px Jost, sans-serif'; spaced(ctx, label, x, y, 0.12);
  ctx.textAlign = 'right'; ctx.font = '9.5px "IBM Plex Mono", monospace'; ctx.fillText(lo + ' / ' + hi, x + w, y);
  ctx.fillStyle = 'rgba(236,230,214,0.1)'; roundRect(ctx, x, y + 6, w, 6, 3); ctx.fill();
  if (v !== null) { ctx.fillStyle = col; roundRect(ctx, x, y + 6, Math.max(6, w * v), 6, 3); ctx.fill(); }
}

function statusText() {
  if (input === 'tilt') return tilt.ok ? 'TILT · NO CAMERA' : 'TILT · WAITING FOR MOTION';
  if (input === 'mouse') return 'MOUSE · NO CAMERA';
  if (cam.status === 'on') {
    // the tracker loaded but isn't looking at any frames: say so, so it isn't mistaken for "no hands"
    if (!cam.frames && millis() / 1000 - cam.onAt > 4) return 'TRACKER NOT RUNNING' + (cam.error ? ' · ' + cam.error.toUpperCase() : '');
    const n = (play.pitchHand ? 1 : 0) + (play.volHand ? 1 : 0);
    return 'CAMERA · ' + (n === 0 ? 'NO HANDS' : n === 1 ? '1 HAND' : '2 HANDS');
  }
  if (cam.status === 'model' || cam.status === 'starting') return 'CAMERA · LOADING THE HAND TRACKER' + (cam.runtime === 'tfjs' ? ' (2ND TRY)' : '');
  if (cam.status === 'failed') return 'CAMERA · OFF';
  return 'CAMERA · NOT STARTED';
}

function drawHint() {
  if (!started) return;
  const ctx = drawingContext, h = nextHint();
  if (!h) return;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = 'italic 15px Newsreader, serif'; ctx.fillStyle = COL.dim;
  const x = 16 + L.s.l, max = width - x - 16 - L.s.r;
  let s = h;
  while (ctx.measureText(s).width > max && s.length > 10) s = s.slice(0, -2);
  if (s !== h) s = s.trimEnd() + '…';
  ctx.fillText(s, x, L.hintY);
}

// big, plain guidance in the middle of the room
function drawPrompt(now) {
  if (!started) return;
  let msg = null, sub = null;
  if (calib.step) {
    const left = Math.max(1, Math.ceil(CONFIG.calibrate - (now - calib.t0)));
    msg = calib.step === 'far' ? 'Right hand far away' : 'Now right hand close';
    sub = (calib.step === 'far' ? 'As far as you’ll play. ' : 'As close as you’ll play, without touching. ') + left;
  } else if (input === 'camera' && cam.status === 'on' && !play.hasPitch && now - play.pitchSeen > 2.5) {
    msg = play.volHand ? 'Now your right hand' : 'Raise your right hand';
    sub = play.volHand ? 'The right hand plays the pitch.' : 'Hold it up in front of the camera, palm facing it.';
  } else if (input === 'camera' && (cam.status === 'model' || cam.status === 'starting')) {
    msg = 'Waking up the hand tracker'; sub = 'A few seconds.';
  }
  if (!msg) return;
  const ctx = drawingContext, cx = width / 2, cy = L.portrait ? L.disp.y + L.disp.h + 50 : height * 0.32;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = '500 ' + (L.portrait ? 24 : 30) + 'px Jost, sans-serif';
  const w = Math.max(ctx.measureText(msg).width, 200) + 48;
  ctx.fillStyle = 'rgba(11,14,18,0.78)'; roundRect(ctx, cx - w / 2, cy - 38, w, sub ? 72 : 52, 14); ctx.fill();
  ctx.fillStyle = COL.ivory; ctx.fillText(msg, cx, cy);
  if (sub) { ctx.font = 'italic 16px Newsreader, serif'; ctx.fillStyle = COL.dim; ctx.fillText(sub, cx, cy + 24); }
}

/* ================= knobs and pointer ================= */

function listenPointer() {
  canvasEl.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  canvasEl.addEventListener('dblclick', e => { const q = localXY(e), k = hitKnob(q.x, q.y); if (k) k.value = k.def; });
  canvasEl.addEventListener('wheel', e => { const q = localXY(e), k = hitKnob(q.x, q.y); if (!k) return; e.preventDefault(); k.value = constrain(k.value - e.deltaY * 0.0015, 0, 1); }, { passive: false });
  canvasEl.addEventListener('pointerleave', () => { mouse.inside = false; });
}

function hitKnob(x, y) {
  for (const k of KNOBS) if (Math.hypot(x - k.x, y - k.y) <= Math.max(k.r * 1.5, 22)) return k;
  return null;
}
function hitRange(x, y) {
  const s = RANGE;
  return Math.abs(x - s.x) <= Math.max(s.w / 2 + 6, 22) && Math.abs(y - s.y) <= Math.max(s.h / 2 + 6, 22);
}

let touchNoted = false;
function onDown(e) {
  resumeAudio();
  const q = localXY(e), x = q.x, y = q.y;
  const k = hitKnob(x, y);
  if (k) { knobDrags.set(e.pointerId, { k, x, y, v: k.value }); try { canvasEl.setPointerCapture(e.pointerId); } catch (er) {} e.preventDefault(); return; }
  if (hitRange(x, y)) {
    if (!unlocked.has(RANGE.lockedBy)) showNote('Locked', 'Unlock card 03 to open five octaves.', 3000);
    else RANGE.value = RANGE.value ? 0 : 1;
    return;
  }
  if (e.pointerType === 'touch' && input === 'camera' && started && !touchNoted) {
    touchNoted = true;
    showNote('No touching', 'This one you play in the air. Hold your hands in front of the camera.', 4000);
  }
}

function onMove(e) {
  const d = knobDrags.get(e.pointerId);
  if (d) {
    // drag right or up in the room to turn it up
    const q = localXY(e);
    d.k.value = constrain(d.v + ((q.x - d.x) - (q.y - d.y)) / 180, 0, 1);
    return;
  }
  if (e.pointerType === 'mouse' && e.target === canvasEl) { const q = localXY(e); mouse.x = q.x; mouse.y = q.y; mouse.at = millis() / 1000; mouse.inside = true; }
}

function onUp(e) { knobDrags.delete(e.pointerId); }

/* ================= start and buttons ================= */

function roomLink() {
  if (CONFIG.link) return CONFIG.link;
  try { if (window.top === window.self && /^https?:/.test(location.href)) return location.href; } catch (e) {}
  return '';
}

function fillStart() {
  const failed = cam.status === 'failed' && input === 'camera';
  $('how-help').textContent = input === 'camera' ? MODE.help : MODE.fallbackHelp;
  $('how-caveat').textContent = MODE.caveat;
  $('how-problem').hidden = !failed;
  $('how-problem').textContent = cam.problem;
  $('fallback-btn').textContent = MODE.fallback;
  $('fallback-btn').hidden = !(failed || (input === 'camera' && !started));
  $('start-btn').textContent = failed ? 'Try the camera again' : started ? 'Back to the antennas' : 'Tap to start';
  $('start-tip').hidden = input !== 'camera';
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

// The start screen's button starts the room the first time, and goes back to it after that.
function startRoom(fromFallback) {
  if (!audio) audio = buildAudio();
  if (audio) { audio.ctx.resume(); keepIOSAudioOn(); }
  keepAwake();
  if (!started) { started = true; $('hud').hidden = false; windowResized(); }   // the room turns sideways now
  $('start').hidden = true;
  if (input === 'camera' && fromFallback !== true && (cam.status === 'off' || cam.status === 'failed')) {
    if (cam.status === 'failed') { cam.status = 'off'; cam.video = null; }
    startCamera();
  }
}

function openHelp() {
  fillStart();
  $('start').hidden = false;
  $('start').scrollTop = 0;
  $('start-btn').focus();
}

function setupStartPhoto() {
  const R = window.ROOM || {}, fig = $('start-photo'), img = $('start-img'), credit = $('start-credit');
  if (!R.image) { fig.hidden = true; return; }
  img.onload = () => fig.classList.add('ready');
  img.onerror = () => { fig.hidden = true; };
  img.alt = R.imageAlt || '';
  img.src = R.image;
  credit.textContent = R.credit || '';
  if (R.creditUrl) credit.href = R.creditUrl; else credit.removeAttribute('href');
}

function listenUI() {
  setupStartPhoto();
  fillStart();
  $('start-btn').addEventListener('click', () => startRoom());
  $('fallback-btn').addEventListener('click', useFallback);
  $('help-btn').addEventListener('click', openHelp);
  $('reach-btn').addEventListener('click', startCalib);
  $('archive-btn').addEventListener('click', openArchive);
  $('archive-close').addEventListener('click', closeSheets);
  $('card-close').addEventListener('click', closeSheets);
  $('toast-read').addEventListener('click', () => { if (toastId) openCard(toastId); });
  $('relock').addEventListener('click', relock);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && started) { resumeAudio(); keepAwake(); } });
}

/* test hook, only active when a test page defines window.__THER_TEST__ */
if (window.__THER_TEST__) {
  window.__THER_TEST__.api = {
    unlocked, play, cam, K, RANGE, CONFIG, calib, turned: () => turned,
    fakeCamera: (vw, vh) => { cam.vw = vw; cam.vh = vh; cam.status = 'on'; cam.frames = 1; $('reach-btn').hidden = false; layout(); },
    hands: results => gotHands(results),
    setInput: v => { input = v; },
    tilt: (beta, gamma) => { tilt.beta = beta; tilt.gamma = gamma; tilt.at = millis() / 1000; tilt.ok = true; },
    state: () => ({ started, input, camStatus: cam.status, runtime: cam.runtime, frames: cam.frames, camError: cam.error, level: play.level, m: play.m, vol: play.vol, reach: play.reach, hasPitch: play.hasPitch, hasVol: play.hasVol, ctx: audio ? audio.ctx.state : null, gain: audio ? audio.amp.gain.value : null, hz: audio ? audio.o1.frequency.value : null, soundTime, swells: swellTimes.length, layout: { disp: L.disp, cab: L.cab, rod: L.rod, loop: L.loop } })
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
