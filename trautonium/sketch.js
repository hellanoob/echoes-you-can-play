/*
  Echoes You Can Play
  Room 2: Trautonium, Berlin 1930
  Jesse Xu, DIGF-5008 Exploration

  How it fits together
  - p5.js: setup() makes the canvas, draw() draws the instrument every frame.
    Everything that never moves (cabinet, panel, engraving, rails) is drawn once
    into a p5.Graphics layer and redrawn only when the window or the device changes.
  - Two manuals, like Sala's Mixtur-Trautonium: the back rail (II) and the front
    rail (I). Each rail is one wire, so each plays one note at a time. Press a
    second point on the same wire and the highest press wins, as on the Trautoniks
    VT2012; let go and it falls back to the next highest still held (see topFinger).
    Each rail has its own octave switch.
  - Sound: the browser's Web Audio API (the same engine p5.sound runs on).
    One voice per manual: a sawtooth oscillator for the neon-tube tone, three
    subharmonics for Mixtur, two formant filters, vibrato, and a soft saturation
    that gives harder presses more bite. A finger that holds still is drawn most
    of the way into tune and a slide glides freely (CONFIG.snap, see settlePitch).
  - This page is played on a phone: a finger on each rail, and the phone tipping
    on something soft is the pressure. A laptop in a browser only gets one point
    from its trackpad, so it gets a "play this on your phone" screen with a QR
    code, and "play here with the mouse" as a fallback. The Mac app is the
    laptop version (see MODES below).
  - The rails always run left to right, like the real instrument. The start screen
    reads the way the phone is held. After Tap to start, a phone held upright shows
    the whole room turned sideways, so people just turn the phone.
  - The tongues above each rail are preset notes on C, D, G and A in each octave,
    the way Sala set his. On a keyboard, 1 to = plays the back rail's tongues and
    Q to ] the front rail's, so a trackpad player can hold a second note.
  - The wire never moves sideways. Where it is pressed, it touches the rail:
    its shadow meets it there, and the rail darkens a little as it is pushed down.
  - Knobs turn left to right, so dragging right turns them up (dragging up works too).
    Every finger can turn its own knob while others play the rails. Scroll also turns
    them, double-click resets. Tap beside an OKTAVE switch's lever to move it that
    way, or slide it.
  - Card text lives in cards.js. Cards unlock from what you play (CONFIG.unlock).
  - Inside the Mac app (the TrautoniumMac folder) this same page gets every
    finger on the trackpad from macOS. See "the Mac app" further down.
*/

const CONFIG = {
  // The room's web address, for the QR code a laptop shows. Paste your p5 editor Fullscreen link
  // (File > Share > Fullscreen) or your GitHub Pages address between the quotes.
  link: '',
  hub: '',                 // the page with all three rooms, for Exit. Only needed for separate p5 editor sketches: paste its Fullscreen link
  lowMidi: 48,            // C3 at the low end of both rails, before each rail's Oktave switch
  semitones: 36,          // three octaves
  glide: 0.01,            // pitch smoothing in seconds. Higher = lazier slides
  snap: 0.85,             // how far a finger that holds still is drawn into tune, 0 (not at all) to 1 (exactly). Slides always glide freely
  snapSpeed: 4,           // a finger moving faster than this many semitones a second counts as sliding, so it isn't drawn in
  snapTime: 0.07,         // seconds a finger that stops takes to settle into tune
  drift: 1.5,             // cents of slow wobble on every note, the warmth of a neon tube. More sounds seasick
  reverb: 0.12,           // room amount, 0 to 1
  room: 1.3,              // room length in seconds
  vibratoRate: 5.8,       // Hz
  vibratoMax: 40,         // cents of vibrato with the Vibrato knob all the way up
  pressureVibrato: 45,    // Mac trackpad: extra cents when pressing past the deep click
  lap: {                  // phone on something soft
    deadzone: 0.8,        // degrees of tip ignored, so breathing and settling stay silent
    range: 7,             // degrees of tip for full volume, pressing the middle of the front rail. Lower = easier
    scale: [0.35, 2],     // how far the spot you press can change that, least and most (see tipScale)
    even: 0.01,           // when the tip can't tell two fingers apart, how strongly it falls back to an even split (see splitTilt)
    smooth: 0.04          // seconds over which each finger's share settles, so sensor noise can't make the rails flicker
  },
  floor: 0.12,            // loudness with no pressure, only where pressure is a stand-in (see floorFor)
  audible: 0.06,          // a note this loud or louder counts as heard, for the cards
  pad: {                  // Mac app, fingers on the trackpad
    touch: 0.3,           // loudness while a finger only touches the pad
    click: 0.45,          // loudness the moment the pad clicks, rising to 1 at the deep click
    edge: 0.04            // the outer 4% of the pad on each side is left out, so the ends of the rails are easy to reach
  },
  tongues: [0, 2, 7, 9, 12, 14, 19, 21, 24, 26, 31, 33],   // C D G A in each octave, semitones above the low end
  keys: [
    ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],          // back rail II
    ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight']                // front rail I
  ],
  keyLabels: [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='], ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']']],
  unlock: {
    soundSeconds: 1.5,    // card 1: seconds of sound in total
    octave: 12,           // card 2: semitones covered in one glide
    holdSeconds: 3,       // card 3: seconds on one steady note
    holdWobble: 0.35,     // card 3: drift allowed, in semitones, that still counts as steady
    swoopSemis: 7,        // card 4: size of one swoop, in semitones
    swoopMs: 350,         // card 4: a swoop has to happen this fast
    swoopHigh: 0.6,       // card 4: a swoop has to reach this far up the rail (0 to 1)
    swoops: 4,            // card 4: swoops needed
    mixturOn: 0.15        // card 4: how far Mixtur has to be turned up
  }
};

const APP = window.TRAUT_APP || null;   // set by the Mac app before this page loads

// Three ways in, picked by what the page is running on. Nobody has to choose.
// pressure: tilt (the phone tipping on something soft), pad (the Mac app: every finger on the trackpad),
// or force (a laptop browser: trackpad pressure in Safari, otherwise how far below the wire you press)
const MODES = {
  phone: {
    pressure: 'tilt', keys: false,
    help: 'Lay your phone on something soft, like a pillow or your lap, and put a finger on each rail. A finger that only rests makes no sound, like the real wire. Press down and the phone tips a little: that tip is the volume. Slide to change the note.',
    caveat: 'Phone screens can’t feel pressure, so the tilt stands in. The way the phone tips shows which finger pressed. If motion is blocked, pressing lower on a rail is louder.'
  },
  app: {
    pressure: 'pad', keys: true,
    help: 'Rest your fingers on the trackpad. The top half plays the back rail, the bottom half the front rail. Slide to change the note. A touch is soft, pressing the pad is louder, and pressing past the deep click adds vibrato. Keys 1 to = and Q to ] play the tongues. Tab switches between playing and the cursor.',
    caveat: 'Pressure is one reading for the whole pad, so both rails share it.'
  },
  laptop: {
    pressure: 'force', keys: true,
    help: 'Click a wire and slide along it. Click lower on the rail for louder, or in Safari on a MacBook, press the trackpad harder. Keys 1 to = play the back rail’s tongues, Q to ] the front rail’s.',
    caveat: 'A trackpad gives a web page one point, so this plays one rail at a time. The room is made for a phone.'
  }
};

// the essential knobs, grouped like the sections on a Trautonium panel
const KNOBS = [
  // OKTAVE is two three-way switches, one per rail: down an octave, as it is, up an octave.
  // The back rail's (II) sits on top and the front rail's (I) below, the same order as the rails.
  { id: 'oktave2',  label: 'II',         sub: 'back rail',    group: 'GENERATOR',     value: 0.5,  def: 0.5, steps: 3, kind: 'switch', slot: 'oktave', manual: 0 },
  { id: 'oktave1',  label: 'I',          sub: 'front rail',   group: 'GENERATOR',     value: 0.5,  def: 0.5, steps: 3, kind: 'switch', slot: 'oktave', manual: 1 },
  { id: 'mixtur',   label: 'MIXTUR',     sub: 'subharmonics', group: 'GENERATOR',     value: 0,    def: 0,   lockedBy: 'sala' },
  { id: 'formant',  label: 'FORMANT',    sub: 'tone',         group: 'FORMANTFILTER', value: 0.5,  def: 0.5 },
  { id: 'resonanz', label: 'RESONANZ',   sub: 'resonance',    group: 'FORMANTFILTER', value: 0.3,  def: 0.3 },
  { id: 'vibrato',  label: 'VIBRATO',    sub: 'vibrato',      group: 'AUSGANG',       value: 0,    def: 0 },
  { id: 'laut',     label: 'LAUTSTÄRKE', sub: 'volume',       group: 'AUSGANG',       value: 0.75, def: 0.75 }
];
const GROUPS = ['GENERATOR', 'FORMANTFILTER', 'AUSGANG'];
const SLOT_LABELS = { oktave: { label: 'OKTAVE', sub: 'octave' } };   // controls that share one place on the panel
const K = {};
KNOBS.forEach(k => { K[k.id] = k; });

const COL = {
  alu: '#C8CBCE', engrave: '#2C2F33', knob: '#141518', capA: '#E4E6E9', capB: '#8E9399',
  ledBg: '#170504', ledOff: 'rgba(255,48,36,0.09)', ledOn: '#FF3A2C', ledGlow: 'rgba(255,58,44,0.28)',
  faceInk: '#2A241F', faceRed: '#C33A2E',
  wire: '#F6F8F9', tongue: '#26272A', tongueHi: '#55585D',
  neon: '#FF6A2C', paper: '#F3EBD6', paperInk: '#3A332B', tape: '#E6DAB0'
};
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SEG = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
  'A': 'abcefg', 'b': 'cdefg', 'C': 'adef', 'd': 'bcdeg', 'E': 'adefg', 'F': 'aefg', 'G': 'acdef', '-': 'g', ' ': '' };

const $ = id => document.getElementById(id);
const CARDS = window.CARDS || [];
const CARD_BY_ID = {};
CARDS.forEach(c => { CARD_BY_ID[c.id] = c; });
const KEYMAP = {};
CONFIG.keys.forEach((row, m) => row.forEach((code, j) => { KEYMAP[code] = { m, j }; }));

const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const KIND = APP ? 'app' : coarse ? 'phone' : 'laptop';
const MODE = MODES[KIND];
let turned = false;           // a phone held upright: the whole room is drawn sideways
let started = false;
let L = null;                 // layout, rebuilt on every resize
let layer = null;             // p5.Graphics with everything that never moves
let audio = null;             // Web Audio graph, built on the first tap
let canvasEl = null;
const fingers = new Map();    // id -> a press: pointer id, or 'key:' + key code
const manualState = [{ stack: [] }, { stack: [] }];   // presses on each wire, in the order they came
const unlocked = new Set();
let soundTime = 0, swoops = 0, lastSwoopAt = 0, swoopFlash = 0;
const lastNotes = [null, null];
let lastHz = null, lastManual = 0, syncAt = 0;
let level = 0, pegel = 0, druck = 0;
const knobDrags = new Map();  // pointer id -> the knob that finger is turning. Several knobs can turn at once
let hover = null;             // mouse over a rail: shows which note you would play
let forceSeen = false;        // Safari has reported trackpad pressure at least once
let penSeen = false;          // an Apple Pencil has touched a rail
// tilt status: waiting until the first reading, then on, denied (prompt refused) or none (no sensor here)
const motion = { ok: false, status: 'idle', g: null, asked: false };
let lapRest = null, lapTip = 0;     // where the phone rested, and how many degrees it has tipped since
// the Mac app: play is on when the trackpad plays the rails, off when it moves the cursor
const pad = { play: true, stage: 0, pressure: 0 };
const applied = { formant: -1, res: -1, mix: -1, vol: -1, oct: [null, null] };

/* ================= p5 ================= */

function setup() {
  const v = turnRoom();
  const c = createCanvas(v.w, v.h);
  c.parent('stage');
  canvasEl = c.elt;
  pixelDensity(Math.min(2, displayDensity()));
  layout();
  listenPointer();
  listenUI();
  renderArchive();
  // redraw the engraving once the web fonts have arrived. The canvas never asks for a font by itself, so ask here.
  if (document.fonts && document.fonts.load) {
    const faces = ['bold 12px Jost', '500 12px Jost', '12px "IBM Plex Mono"', '12px Newsreader', 'italic 12px Newsreader'];
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
  turned = started && phoneSized() && H > W;
  const w = turned ? H : W, h = turned ? W : H;
  app.style.width = w + 'px';
  app.style.height = h + 'px';
  app.style.transform = turned ? 'translateX(' + W + 'px) rotate(90deg)' : '';
  app.classList.toggle('turned', turned);
  app.classList.toggle('short', h < 520);           // the start screen goes side by side when there is little height
  return { w, h };
}

function draw() {
  if (!L) return;
  const now = performance.now();
  if (octaveShift(0) !== L.oct[0] || octaveShift(1) !== L.oct[1]) buildLayer();   // an octave switch moved: renumber that rail
  image(layer, 0, 0, width, height);
  syncSound();

  // output level from the analyser
  let rms = 0;
  if (audio) {
    audio.analyser.getFloatTimeDomainData(audio.buf);
    let s = 0;
    for (let i = 0; i < audio.buf.length; i += 4) s += audio.buf[i] * audio.buf[i];
    rms = Math.sqrt(s / (audio.buf.length / 4));
  }
  level += (rms - level) * (rms > level ? 0.5 : 0.12);
  const peg = constrain(map(20 * Math.log10(level + 1e-6), -42, -6, 0, 1), 0, 1.1);
  pegel += (peg - pegel) * (peg > pegel ? 0.35 : 0.08);
  let press = 0;
  for (let m = 0; m < 2; m++) { const f = topFinger(m); if (f) press = Math.max(press, f.a + 0.2 * f.pv); }
  druck += (press - druck) * 0.25;

  // unlocks that depend on time, counted only while a note can actually be heard
  let loud = 0;
  for (let m = 0; m < 2; m++) {
    const f = topFinger(m);
    if (!f) continue;
    const lv = loudness(f);
    loud = Math.max(loud, lv);
    f.loudAt = lv > CONFIG.audible ? (f.loudAt || now) : 0;
    if (f.loudAt && now - holdStart(f) >= CONFIG.unlock.holdSeconds * 1000) unlock('sala');
  }
  if (started && loud > CONFIG.audible) {
    soundTime += deltaTime / 1000;
    if (soundTime >= CONFIG.unlock.soundSeconds) unlock('wire');
  }
  nudgeIfQuiet(now, loud);

  drawDisplays();
  drawMeters();
  drawKnobs();
  drawHint();
  drawShelf(now);
  drawNoteLabels();
  swoopFlash *= 0.9;
}

/* ================= layout ================= */

// The notch and the home bar, in the room's own directions. Turned sideways, the phone's top is the room's left.
function safeInsets() {
  const cs = getComputedStyle($('safe'));
  const s = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  return turned ? { t: s.r, r: s.b, b: s.l, l: s.t } : s;
}

// The panel on top, the two manuals below it, rails running left to right.
// A tall narrow window gets a shorter panel and the manuals centred on the shelf.
function layout() {
  const s = safeInsets(), W = width, H = height;
  const bw = Math.round(constrain(Math.min(W, H) * 0.024, 10, 20));   // wood around the panel
  const x0 = Math.max(16, s.l + bw), y0 = s.t + bw, x1 = W - Math.max(16, s.r + bw), y1 = H - s.b - bw;
  const ph = Math.round(constrain(Math.min((y1 - y0) * 0.46, (x1 - x0) * 0.42), 150, 420));
  const P = { x: x0, y: y0, w: x1 - x0, h: ph };
  const shelf = { x: x0, y: y0 + ph + bw, w: x1 - x0, h: Math.max(60, y1 - (y0 + ph + bw)) };

  // rail space: x runs along the rails from low to high, y runs across them
  const len = shelf.w, thick = shelf.h;
  const R = { len, thick, p0: 30, p1: len - 30 };
  R.semiW = (R.p1 - R.p0) / CONFIG.semitones;
  const gap = Math.round(constrain(thick * 0.05, 6, 18)), tm = Math.min((thick - gap) / 2, 230);
  const top0 = Math.round((thick - (tm * 2 + gap)) / 2);
  R.manuals = [0, 1].map(i => {
    const top = top0 + (i === 0 ? 0 : tm + gap);
    const tb = Math.round(Math.min(tm * 0.3, 70)), rh = Math.round(Math.min(tm * 0.54, 124));
    const rt = top + tb, rb = rt + rh;
    return {
      i, name: i === 0 ? 'II' : 'I', top, bottom: top + tm, tb, rt, rh, rb,
      rest: rt + rh * 0.24,                        // where the wire runs
      deep: rb - 8,                                // furthest below the wire you can press
      tongues: CONFIG.tongues.map((semi, j) => ({ j, semi, u: semi / CONFIG.semitones, x: R.p0 + R.semiW * semi }))
    };
  });
  L = { bw, P, shelf, R, D: {} };
  layoutPanel();
  placeHud();
  buildLayer();
  checkNarrow();
  syncPadMode();                     // the Mac app parks the cursor over the middle of the rails
}

function toRail(sx, sy) { return { x: sx - L.shelf.x, y: sy - L.shelf.y }; }
function toScreen(rx, ry) { return { x: L.shelf.x + rx, y: L.shelf.y + ry }; }
function railTransform(g) { g.translate(L.shelf.x, L.shelf.y); }

function phoneSized() { return coarse && Math.min(window.innerWidth, window.innerHeight) < 600; }

// A laptop window narrower than 500 pixels would squash three octaves, so it asks to be made wider.
function checkNarrow() {
  const narrow = started && !phoneSized() && width < 500;
  const el = $('narrow');
  if (el.hidden === !narrow) return;
  el.hidden = !narrow;
  if (narrow) releaseAll();
}

function layoutPanel() {
  const P = L.P, D = L.D;
  D.groups = [];
  const pad = Math.round(constrain(P.h * 0.07, 10, 26));
  D.pad = pad;
  D.titleSize = Math.round(constrain(P.h * 0.085, 15, 30));
  D.title = { x: P.x + pad, y: P.y + pad + D.titleSize * 0.9 };
  D.eyebrow = P.w >= 760;
  // content starts below the title and below the buttons in the corner
  const top = Math.max(P.y + pad + D.titleSize + Math.round(pad * 1.1), P.y + Math.round(pad * 0.6) + 50);
  const rowH = P.y + P.h - pad - top;
  let x = P.x + pad;
  const dw = Math.round(constrain(P.w * 0.19, 132, 300));
  const noteH = Math.round(rowH * 0.36), hzH = Math.round(rowH * 0.2), gap = Math.round(rowH * 0.07);
  const half = (dw - 8) / 2;
  D.notes = [
    { x, y: top + 12, w: half, h: noteH, label: 'TON I', m: 1 },
    { x: x + half + 8, y: top + 12, w: half, h: noteH, label: 'TON II', m: 0 }
  ];
  D.hz = { x, y: top + 12 + noteH + gap + 10, w: Math.round(dw * 0.74), h: hzH };
  D.lamp = { x: x + dw * 0.88, y: D.hz.y + hzH / 2, r: Math.max(5, Math.min(hzH * 0.34, 11)) };
  D.hint = { x, y: D.hz.y + hzH + gap, w: dw, h: P.y + P.h - pad - (D.hz.y + hzH + gap) };
  x += dw + pad * 1.5;
  D.meters = [];
  const room = P.x + P.w - pad - x - 390 - pad * 2.2;   // what the knobs leave over for the two meters
  if (P.w >= 720 && room >= 140) {               // small screens skip the meters so the knobs fit
    const mw = Math.round(Math.min(constrain(rowH * 0.8, 70, 190), room / 2)), mh = Math.round(mw * 0.74);
    D.meters = [
      { x, y: top + 12, w: mw, h: mh, label: 'PEGEL', sub: 'level' },
      { x: x + mw + pad * 0.7, y: top + 12, w: mw, h: mh, label: 'DRUCK', sub: 'pressure' }
    ];
    x += mw * 2 + pad * 0.7 + pad * 1.5;
  }
  // one place per knob, except the two octave switches, which share one
  const slots = [];
  KNOBS.forEach(k => {
    const last = slots[slots.length - 1];
    if (k.slot && last && last.key === k.slot) last.items.push(k);
    else slots.push({ key: k.slot || k.id, group: k.group, kind: k.kind || 'knob', items: [k] });
  });
  const kw = P.x + P.w - pad - x, sw = kw / slots.length;
  const r = Math.round(constrain(Math.min(sw * 0.38, rowH * 0.19), 13, 34)), cy = top + rowH * 0.46;
  slots.forEach((s, i) => {
    s.cx = x + sw * (i + 0.5); s.cy = cy; s.w = sw; s.r = r;
    if (s.kind !== 'switch') { s.items.forEach(k => { k.r = r; k.x = s.cx; k.y = cy; }); return; }
    // two slide switches with one -1 / 0 / +1 legend between them and the rail numerals on the left.
    // Numeral, gap, track and lever stay in the middle of the place and clear of the next knob's ring and tape
    const th = Math.round(constrain(r * 0.42, 8, 13)), num = knobLabelSize({ r }) * 1.2;
    const side = num + 5 + th * 1.55;                         // everything that isn't the track itself
    const right = i + 1 < slots.length ? x + sw * (i + 1.5) - r * 1.4 - 3 : s.cx + sw / 2;
    const tw = Math.round(constrain(Math.min(sw * 0.74, (right - s.cx) * 2) - side, 22, r * 2.2)), total = side + tw;
    const gap = th / 2 + 9;
    s.th = th; s.tw = tw; s.h = r * 2.72 + 12;
    s.x0 = Math.min(s.cx - total / 2, right - total);         // drawn extent: numeral's left edge to the lever's right edge at +1
    s.x1 = s.x0 + total;
    s.tx = s.x0 + num + 5 + th * 0.8 + tw / 2;                // where the tracks are centred
    s.items.forEach((k, j) => { k.r = r; k.x = s.tx; k.y = cy + (j ? gap : -gap); k.tw = tw; k.th = th; });
  });
  D.slots = slots;
  GROUPS.forEach(name => {
    const gs = slots.filter(s => s.group === name), gx = gs[0].cx - sw / 2, gw = sw * gs.length;
    D.groups.push({ name, x: gx, y: top, w: gw, cx: gx + gw / 2, labelY: top + 4 });
  });
}

// the buttons in the panel's top right corner, and the toast in its top left
function placeHud() {
  const hud = $('hud'), toast = $('toast'), P = L.P, pad = L.D.pad;
  hud.style.right = (width - (P.x + P.w - pad)) + 'px';
  hud.style.top = (P.y + pad * 0.6) + 'px';
  toast.style.left = (P.x + pad) + 'px';
  toast.style.width = Math.round(Math.min(380, P.w * 0.44)) + 'px';
  toast.style.top = (P.y + pad * 0.5) + 'px';
}

/* ================= the parts that never move ================= */

function buildLayer() {
  // p5's own layer.remove() throws in 1.11, so take the old canvas out of the page directly
  if (layer && layer.elt) layer.elt.remove();
  layer = createGraphics(width, height);
  layer.pixelDensity(pixelDensity());
  L.oct = [octaveShift(0), octaveShift(1)];   // the rail numbers below are drawn for these octaves
  const g = layer;
  randomSeed(11);
  noiseSeed(11);
  woodGrain(g, 0, 0, width, height);
  aluminium(g, L.P.x, L.P.y, L.P.w, L.P.h, 6);
  panelEngraving(g);
  L.D.slots.forEach(s => { if (s.kind === 'switch') switchFace(g, s); else knobScale(g, s.items[0]); });
  L.D.meters.forEach(m => meterFace(g, m));
  L.D.notes.forEach(n => ledHousing(g, n, n.label));
  ledHousing(g, L.D.hz, 'FREQUENZ');
  lampSocket(g, L.D.lamp);
  g.push();
  railTransform(g);
  L.R.manuals.forEach(M => railStatic(g, M));
  g.pop();
}

function woodGrain(g, x, y, w, h) {
  g.push();
  const ctx = g.drawingContext;
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, '#5B3721');
  grad.addColorStop(0.55, '#4A2B18');
  grad.addColorStop(1, '#341E10');
  g.noStroke();
  g.fill(0);
  ctx.fillStyle = grad;
  g.rect(x, y, w, h);
  g.noFill();
  for (let i = 0; i < h; i += 3) {
    const dark = random() < 0.62;
    g.stroke(dark ? 'rgba(18,8,3,' + random(0.06, 0.18).toFixed(3) + ')' : 'rgba(255,214,170,' + random(0.03, 0.08).toFixed(3) + ')');
    g.strokeWeight(random(0.6, 1.7));
    g.beginShape();
    for (let s = -10; s <= w + 10; s += 14) g.vertex(x + s, y + i + (noise(i * 0.05, s * 0.0035) - 0.5) * 22);
    g.endShape();
  }
  g.pop();
}

function aluminium(g, x, y, w, h, r) {
  g.push();
  const ctx = g.drawingContext;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  g.noStroke();
  g.fill(COL.alu);
  g.rect(x, y, w, h, r);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  g.strokeWeight(1);
  for (let i = 2; i < h - 2; i += 1.5) {
    g.stroke(random() < 0.5 ? 'rgba(255,255,255,' + random(0.05, 0.14).toFixed(3) + ')' : 'rgba(0,0,0,' + random(0.02, 0.06).toFixed(3) + ')');
    const a = x + 3 + random(0, w * 0.3);
    g.line(a, y + i, Math.min(a + random(w * 0.2, w), x + w - 3), y + i);
  }
  g.noFill();
  g.stroke(255, 255, 255, 150);
  g.line(x + r, y + 0.5, x + w - r, y + 0.5);
  g.line(x + 0.5, y + r, x + 0.5, y + h - r);
  g.stroke(0, 0, 0, 80);
  g.line(x + r, y + h - 0.5, x + w - r, y + h - 0.5);
  g.line(x + w - 0.5, y + r, x + w - 0.5, y + h - r);
  [[x + 11, y + 11], [x + w - 11, y + 11], [x + 11, y + h - 11], [x + w - 11, y + h - 11]].forEach(p => screw(g, p[0], p[1], 4.5));
  g.pop();
}

function screw(g, x, y, r) {
  g.push();
  g.noStroke();
  g.fill(0, 0, 0, 60);
  g.ellipse(x + 0.8, y + 1, r * 2.2);
  g.fill('#D9DCDF');
  g.ellipse(x, y, r * 2);
  g.stroke('#6E7378');
  g.strokeWeight(1.2);
  g.line(x - r * 0.6, y - r * 0.35, x + r * 0.6, y + r * 0.35);
  g.pop();
}

// engraved text: dark letters with a light edge under them
function engrave(g, s, x, y, size, align, spacing, col) {
  g.push();
  g.textFont('Jost');
  g.textStyle(BOLD);
  g.textSize(size);
  g.textAlign(align || CENTER, BASELINE);
  if (spacing && 'letterSpacing' in g.drawingContext) g.drawingContext.letterSpacing = spacing;
  g.noStroke();
  g.fill(255, 255, 255, 150);
  g.text(s, x + 0.5, y + 0.8);
  g.fill(col || COL.engrave);
  g.text(s, x, y);
  g.pop();
}

function smallPrint(g, s, x, y, size, align, col) {
  g.push();
  g.textFont('IBM Plex Mono');
  g.textStyle(NORMAL);
  g.textSize(size);
  g.textAlign(align || CENTER, BASELINE);
  g.noStroke();
  g.fill(col || 'rgba(44,47,51,0.75)');
  g.text(s, x, y);
  g.pop();
}

function panelEngraving(g) {
  const D = L.D, P = L.P;
  engrave(g, 'TRAUTONIUM', D.title.x, D.title.y, D.titleSize, LEFT, '0.2em');
  if (D.eyebrow) {
    g.push();
    g.textFont('Jost');
    g.textStyle(BOLD);
    g.textSize(D.titleSize);
    if ('letterSpacing' in g.drawingContext) g.drawingContext.letterSpacing = '0.2em';
    const tw = g.textWidth('TRAUTONIUM');
    g.pop();
    smallPrint(g, 'RAUM 2 · BERLIN, 1930', D.title.x + tw + 18, D.title.y - 2, Math.max(9, D.titleSize * 0.42), LEFT);
  }
  D.groups.forEach((gr, i) => {
    engrave(g, gr.name, gr.cx, gr.labelY, constrain(L.P.h * 0.032, 8, 12), CENTER, '0.14em');
    if (i > 0) divider(g, gr.x, gr.y - 6, P.y + P.h - D.pad);
  });
  if (D.meters.length) divider(g, D.meters[0].x - D.pad * 0.75, D.notes[0].y - 10, P.y + P.h - D.pad);
  divider(g, D.slots[0].cx - D.slots[0].r * 2.2, D.notes[0].y - 10, P.y + P.h - D.pad);
}

// the octave switches: two slots cut into the panel with one -1 / 0 / +1 legend between them,
// each rail's numeral on the left, and OKTAVE engraved below like a knob's name
function switchFace(g, s) {
  const size = knobLabelSize(s);
  s.items.forEach(k => {
    const x0 = k.x - k.tw / 2 - k.th / 2, y0 = k.y - k.th / 2, w = k.tw + k.th;
    g.push();
    g.noStroke();
    g.fill(255, 255, 255, 140);                  // the light lower edge of the cut
    g.rect(x0, y0 + 1, w, k.th, k.th / 2);
    g.fill(COL.knob);
    g.rect(x0, y0, w, k.th, k.th / 2);
    g.stroke(255, 255, 255, 40);
    g.strokeWeight(1);
    for (let i = 0; i < 3; i++) g.line(k.x - k.tw / 2 + k.tw * i / 2, y0 + 2, k.x - k.tw / 2 + k.tw * i / 2, y0 + k.th - 2);
    g.pop();
    engrave(g, k.label, x0 - k.th * 0.3 - 5, k.y + size * 0.36, size, RIGHT, '0.06em');
  });
  ['-1', '0', '+1'].forEach((t, i) => smallPrint(g, t, s.tx - s.tw / 2 + s.tw * i / 2, s.cy + 3, constrain(s.r * 0.3, 8, 10), CENTER, COL.engrave));
  engrave(g, SLOT_LABELS[s.key].label, s.cx, s.cy + s.r * 1.36 + size + 6, size, CENTER, '0.06em');
  smallPrint(g, SLOT_LABELS[s.key].sub, s.cx, s.cy + s.r * 1.36 + size * 2 + 9, constrain(s.r * 0.32, 7, 10), CENTER, 'rgba(44,47,51,0.7)');
}

function divider(g, x, y0, y1) {
  g.push();
  g.strokeWeight(1);
  g.stroke(0, 0, 0, 60);
  g.line(x, y0, x, y1);
  g.stroke(255, 255, 255, 120);
  g.line(x + 1, y0, x + 1, y1);
  g.pop();
}

function knobLabelSize(k) { return constrain(k.r * 0.36, 7.5, 12); }

function knobScale(g, k) {
  const r1 = k.r * 1.2, r2 = k.r * 1.36, n = k.steps || 11;
  g.push();
  g.stroke(COL.engrave);
  for (let i = 0; i < n; i++) {
    const a = radians(-135 + 270 * i / (n - 1)) - HALF_PI;
    g.strokeWeight(i === 0 || i === n - 1 || k.steps ? 1.6 : 1);
    g.line(k.x + cos(a) * r1, k.y + sin(a) * r1, k.x + cos(a) * r2, k.y + sin(a) * r2);
    if (k.steps) smallPrint(g, ['-1', '0', '+1'][i], k.x + cos(a) * (r2 + 9), k.y + sin(a) * (r2 + 9) + 3, 9, CENTER, COL.engrave);
  }
  g.pop();
  const size = knobLabelSize(k);
  engrave(g, k.label, k.x, k.y + k.r * 1.36 + size + 6, size, CENTER, '0.06em');
}

function meterFace(g, m) {
  g.push();
  g.noStroke();
  g.fill('#18191B');
  g.rect(m.x, m.y, m.w, m.h, 6);
  const ctx = g.drawingContext;
  const fx = m.x + 5, fy = m.y + 5, fw = m.w - 10, fh = m.h - 10;
  const grad = ctx.createLinearGradient(0, fy, 0, fy + fh);
  grad.addColorStop(0, '#F7EED5');
  grad.addColorStop(1, '#E2D5B0');
  g.fill(0);
  ctx.fillStyle = grad;
  g.rect(fx, fy, fw, fh, 3);
  const cx = m.x + m.w / 2, cy = m.y + m.h * 0.96, rr = m.h * 0.68;
  m.cx = cx; m.cy = cy; m.rr = rr;
  g.noFill();
  g.stroke(COL.faceRed);
  g.strokeWeight(Math.max(2, m.h * 0.04));
  g.arc(cx, cy, rr * 2, rr * 2, radians(-90 + 30), radians(-90 + 50));
  g.stroke(COL.faceInk);
  g.strokeWeight(1);
  g.arc(cx, cy, rr * 2, rr * 2, radians(-90 - 50), radians(-90 + 50));
  for (let i = 0; i <= 10; i++) {
    const a = radians(-50 + 100 * i / 10) - HALF_PI;
    const len = i % 5 === 0 ? m.h * 0.08 : m.h * 0.045;
    g.line(cx + cos(a) * rr, cy + sin(a) * rr, cx + cos(a) * (rr - len), cy + sin(a) * (rr - len));
  }
  g.pop();
  const t = meterText(m);
  engrave(g, m.label, cx, t.nameY, t.big, CENTER, '0.1em', COL.faceInk);
}

// where the name (PEGEL, DRUCK) and the small word under it sit on a meter face.
// On small meters they get pushed up so the small word stays clear of the needle's base, but never up into the scale.
function meterText(m) {
  const big = constrain(m.h * 0.11, 7.5, 13), small = constrain(m.h * 0.085, 7, 10);
  const baseTop = m.y + m.h - 9, tickEnd = m.cy - m.rr + m.h * 0.08;
  let subY = Math.min(m.cy - m.rr * 0.42 + constrain(m.h * 0.1, 8, 12) + 2, baseTop - 3);
  let nameY = Math.min(m.cy - m.rr * 0.42, subY - small - 2);
  nameY = Math.max(nameY, tickEnd + big * 0.72 + 1);
  subY = Math.max(subY, nameY + small + 1);
  return { big, small, nameY, subY };
}

function ledHousing(g, r, label) {
  g.push();
  g.noStroke();
  g.fill(255, 255, 255, 120);
  g.rect(r.x, r.y + 1, r.w, r.h, 5);
  g.fill(COL.ledBg);
  g.rect(r.x, r.y, r.w, r.h, 5);
  g.fill(0, 0, 0, 90);
  g.rect(r.x + 2, r.y + 2, r.w - 4, 3, 2);
  g.pop();
  engrave(g, label, r.x + 2, r.y - 5, 8.5, LEFT, '0.14em');
}

function lampSocket(g, l) {
  g.push();
  g.noStroke();
  g.fill('#8B9096');
  g.ellipse(l.x, l.y, l.r * 2.9);
  g.fill('#E5E7EA');
  g.ellipse(l.x, l.y, l.r * 2.5);
  g.fill('#3A1A0E');
  g.ellipse(l.x, l.y, l.r * 2);
  g.pop();
  engrave(g, 'NEON', l.x, l.y + l.r * 1.45 + 10, 7.5, CENTER, '0.12em');
}

// one manual: the bar that holds the tongues, then the steel rail with its scale
function railStatic(g, M) {
  const R = L.R, ctx = g.drawingContext, barY = M.top + M.tb * 0.1, barH = M.tb * 0.3;
  g.push();
  g.noStroke();
  g.fill(0, 0, 0, 70);
  g.rect(8, barY + 3, R.len - 16, barH, 3);
  g.fill('#BFC3C7');
  g.rect(8, barY, R.len - 16, barH, 3);
  g.fill(255, 255, 255, 140);
  g.rect(8, barY, R.len - 16, 2, 2);
  M.tongues.forEach(t => { g.fill('#1E1F22'); g.rect(t.x - 6, barY - 2, 12, barH + 6, 2); });
  [16, R.len - 16].forEach(x => screw(g, x, barY + barH / 2, Math.min(3.5, barH * 0.3)));
  if (MODE.keys && barH >= 9) {
    M.tongues.forEach((t, j) => smallPrint(g, CONFIG.keyLabels[M.i][j], t.x + 13, barY + barH * 0.78, Math.min(10, barH * 0.75), LEFT, 'rgba(30,33,36,0.8)'));
  }
  g.pop();

  g.push();
  g.noStroke();
  g.fill(0, 0, 0, 90);
  g.rect(6, M.rt + 4, R.len - 12, M.rh, 4);
  const grad = ctx.createLinearGradient(0, M.rt, 0, M.rb);
  grad.addColorStop(0, '#F4F6F8');
  grad.addColorStop(0.16, '#B3BAC0');
  grad.addColorStop(0.48, '#E6EAED');
  grad.addColorStop(0.8, '#9AA2A9');
  grad.addColorStop(1, '#CCD1D5');
  g.fill(0);
  ctx.fillStyle = grad;
  g.rect(6, M.rt, R.len - 12, M.rh, 4);
  g.stroke(255, 255, 255, 90);
  g.strokeWeight(1);
  for (let i = 0; i < 6; i++) { const y = M.rt + M.rh * (0.32 + i * 0.09); g.line(10, y, R.len - 10, y); }
  g.noStroke();
  g.fill('#2B2E31');
  g.rect(6, M.rt - 2, 22, M.rh + 4, 3);
  g.rect(R.len - 28, M.rt - 2, 22, M.rh + 4, 3);
  g.fill('rgba(236,226,202,0.85)');
  g.textFont('Jost');
  g.textStyle(BOLD);
  g.textSize(Math.min(12, M.rh * 0.26));
  g.textAlign(CENTER, CENTER);
  g.text(M.name, 17, M.rt + M.rh * 0.62);
  // engraved scale along the lower edge
  for (let k = 0; k <= CONFIG.semitones; k++) {
    const x = R.p0 + R.semiW * k, pc = (CONFIG.lowMidi + k) % 12;
    const natural = [0, 2, 4, 5, 7, 9, 11].indexOf(pc) >= 0;
    const len = Math.min(M.rh * 0.3, pc === 0 ? 16 : natural ? 10 : 6);
    g.stroke(pc === 0 ? 'rgba(30,33,36,0.9)' : 'rgba(30,33,36,0.55)');
    g.strokeWeight(pc === 0 ? 1.5 : 1);
    g.line(x, M.rb - 4, x, M.rb - 4 - len);
    if (pc === 0 && M.rh >= 40) {
      g.noStroke();
      g.fill('rgba(30,33,36,0.85)');
      g.textFont('IBM Plex Mono');
      g.textStyle(NORMAL);
      g.textSize(Math.min(10, M.rh * 0.16));
      const last = k === CONFIG.semitones;           // the top C is right at the end cap, so its name goes left of the tick
      g.textAlign(last ? RIGHT : LEFT, BASELINE);
      g.text('C' + (Math.floor(midiFor(k, M.i) / 12) - 1), last ? x - 3 : x + 3, M.rb - 7);   // follows this rail's octave switch
    }
  }
  g.pop();
}

/* ================= the parts that move ================= */

function drawSeg(ch, x, y, w, h, dp) {
  const t = Math.max(2, w * 0.17), on = SEG[ch] || '';
  const segs = {
    a: [t, 0, w - 2 * t, t], d: [t, h - t, w - 2 * t, t], g: [t, h / 2 - t / 2, w - 2 * t, t],
    f: [0, t, t, h / 2 - 1.5 * t], b: [w - t, t, t, h / 2 - 1.5 * t],
    e: [0, h / 2 + t / 2, t, h / 2 - 1.5 * t], c: [w - t, h / 2 + t / 2, t, h / 2 - 1.5 * t]
  };
  push();
  translate(x, y);
  shearX(radians(-7));
  noStroke();
  for (const key in segs) {
    const s = segs[key];
    if (on.indexOf(key) >= 0) {
      fill(COL.ledGlow);
      rect(s[0] - 1.5, s[1] - 1.5, s[2] + 3, s[3] + 3, t);
      fill(COL.ledOn);
    } else fill(COL.ledOff);
    rect(s[0], s[1], s[2], s[3], t / 2);
  }
  fill(dp ? COL.ledOn : COL.ledOff);
  ellipse(w + t * 0.9, h - t / 2, t * 1.1);
  pop();
}

function drawNoteLED(n, note, live) {
  const ch = Math.min(n.h * 0.66, n.w * 0.46), cw = ch * 0.56, y = n.y + (n.h - ch) / 2;
  let letter = '-', oct = '-', sharp = false;
  if (note) {
    letter = { B: 'b', D: 'd' }[note.name[0]] || note.name[0];
    sharp = note.name[1] === '#';
    oct = note.name[note.name.length - 1];
  }
  const x0 = n.x + (n.w - cw * 3.3) / 2;
  push();
  if (!live) drawingContext.globalAlpha = 0.5;
  drawSeg(letter, x0, y, cw, ch, false);
  drawSeg(oct, x0 + cw * 1.7, y, cw, ch, false);
  noStroke();
  fill(sharp ? COL.ledOn : COL.ledOff);
  ellipse(x0 + cw * 3.15, n.y + n.h * 0.3, Math.max(4, ch * 0.16));
  fill(sharp ? 'rgba(255,90,70,0.9)' : 'rgba(255,90,70,0.25)');
  textFont('IBM Plex Mono');
  textSize(Math.max(8, ch * 0.3));
  textAlign(CENTER, CENTER);
  text('#', x0 + cw * 3.15, n.y + n.h * 0.62);
  pop();
}

function drawDisplays() {
  const D = L.D;
  D.notes.forEach(n => drawNoteLED(n, lastNotes[n.m], !!topFinger(n.m)));
  const z = D.hz, zh = z.h * 0.66, zw = zh * 0.55, zy = z.y + (z.h - zh) / 2;
  let cells = [' ', ' ', '-', '-'], dp = -1;
  if (lastHz) {
    if (lastHz >= 999.95) cells = String(Math.round(lastHz)).padStart(4, ' ').slice(-4).split('');
    else { const p = lastHz.toFixed(1).split('.'); cells = (p[0].padStart(3, ' ').slice(-3) + p[1]).split(''); dp = 2; }
  }
  push();
  if (!fingers.size) drawingContext.globalAlpha = 0.55;
  cells.forEach((c, i) => drawSeg(c, z.x + z.w * 0.08 + i * zw * 1.55, zy, zw, zh, i === dp));
  pop();
  // the neon lamp lights with the sound
  const l = D.lamp, gl = Math.min(1, level * 6), flick = gl > 0.02 ? 0.85 + 0.15 * Math.random() : 1;
  if (gl > 0.01) {
    push();
    noStroke();
    drawingContext.shadowColor = 'rgba(255,106,44,' + (0.9 * gl) + ')';
    drawingContext.shadowBlur = 24 * gl;
    fill(255, 120 + 60 * gl, 50, (90 + 165 * gl) * flick);
    ellipse(l.x, l.y, l.r * 1.9);
    pop();
  }
}

// the small word on the DRUCK meter: where the pressure is coming from right now
function pressureLabel() {
  const mode = MODE.pressure;
  if (penSeen) return 'pencil';
  if (mode === 'pad') return pad.play ? 'trackpad' : (forceSeen ? 'trackpad' : 'depth');
  if (mode === 'force') return forceSeen ? 'trackpad' : 'depth';
  if (mode === 'tilt') return motion.ok ? 'tilt' : 'depth';
  return 'depth';
}

function drawMeters() {
  const vals = [pegel, druck];
  L.D.meters.forEach((m, i) => {
    const v = constrain(vals[i], 0, 1.12);
    const a = radians(-50 + 100 * Math.min(v, 1.08)) - HALF_PI;
    push();
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(m.x + 5, m.y + 5, m.w - 10, m.h - 10);
    drawingContext.clip();
    stroke(0, 0, 0, 50);
    strokeWeight(2);
    line(m.cx + 1.5, m.cy + 1.5, m.cx + cos(a) * m.rr * 1.04 + 1.5, m.cy + sin(a) * m.rr * 1.04 + 1.5);
    stroke('#1A1714');
    strokeWeight(1.4);
    line(m.cx, m.cy, m.cx + cos(a) * m.rr * 1.04, m.cy + sin(a) * m.rr * 1.04);
    drawingContext.restore();
    noStroke();
    fill('#18191B');
    rect(m.cx - m.w * 0.16, m.y + m.h - 9, m.w * 0.32, 9, 3);
    fill('rgba(42,36,31,0.7)');
    textFont('IBM Plex Mono');
    const t = meterText(m);
    textSize(t.small);
    textAlign(CENTER, BASELINE);
    text(i === 0 ? m.sub : pressureLabel(), m.cx, t.subY);
    pop();
  });
}

function knobLocked(k) { return !!(k.lockedBy && !unlocked.has(k.lockedBy)); }

// a switch's lever sits at -1, 0 or +1 along its slot
function drawSwitch(k) {
  const ctx = drawingContext, lx = k.x - k.tw / 2 + k.tw * k.value, w = k.th * 1.5, h = k.th + 8;
  push();
  noStroke();
  fill(0, 0, 0, 70);
  rect(lx - w / 2 + 1.5, k.y - h / 2 + 2.5, w, h, 3);
  const grad = ctx.createLinearGradient(0, k.y - h / 2, 0, k.y + h / 2);
  grad.addColorStop(0, COL.capA);
  grad.addColorStop(1, COL.capB);
  fill(0);
  ctx.fillStyle = grad;
  rect(lx - w / 2, k.y - h / 2, w, h, 3);
  stroke([...knobDrags.values()].some(d => d.k === k) ? COL.neon : 'rgba(20,21,24,0.55)');
  strokeWeight(Math.max(1.5, k.th * 0.16));
  line(lx, k.y - h / 2 + 3, lx, k.y + h / 2 - 3);
  pop();
}

function drawKnobs() {
  const ctx = drawingContext;
  KNOBS.forEach(k => {
    if (k.kind === 'switch') { drawSwitch(k); return; }
    const ang = -135 + 270 * k.value;
    push();
    translate(k.x, k.y);
    noStroke();
    fill(0, 0, 0, 70);
    ellipse(2, 3.5, k.r * 2.1);
    fill(COL.knob);
    ellipse(0, 0, k.r * 2);
    rotate(radians(ang));
    stroke(255, 255, 255, 22);
    strokeWeight(1);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TWO_PI;
      line(cos(a) * k.r * 0.8, sin(a) * k.r * 0.8, cos(a) * k.r * 0.97, sin(a) * k.r * 0.97);
    }
    noStroke();
    const grad = ctx.createRadialGradient(-k.r * 0.2, -k.r * 0.25, k.r * 0.05, 0, 0, k.r * 0.66);
    grad.addColorStop(0, COL.capA);
    grad.addColorStop(1, COL.capB);
    fill(0);
    ctx.fillStyle = grad;
    ellipse(0, 0, k.r * 1.3);
    stroke([...knobDrags.values()].some(d => d.k === k) ? COL.neon : '#FFFFFF');
    strokeWeight(Math.max(2, k.r * 0.1));
    strokeCap(ROUND);
    line(0, -k.r * 0.18, 0, -k.r * 0.9);
    pop();
    push();
    noStroke();
    fill('rgba(44,47,51,0.7)');
    textFont('IBM Plex Mono');
    textSize(constrain(k.r * 0.32, 7, 10));
    textAlign(CENTER, BASELINE);
    text(k.sub, k.x, k.y + k.r * 1.36 + knobLabelSize(k) * 2 + 9);
    pop();
    if (knobLocked(k)) {
      push();
      translate(k.x, k.y);
      rotate(radians(-12));
      noStroke();
      fill(0, 0, 0, 40);
      rect(-k.r * 1.3 + 1, -k.r * 0.38 + 2, k.r * 2.6, k.r * 0.76, 2);   // the tape: 2.6 r long, so it clears the octave switches
      fill(COL.tape);
      rect(-k.r * 1.3, -k.r * 0.38, k.r * 2.6, k.r * 0.76, 2);
      fill('#5A4E3A');
      textFont('IBM Plex Mono');
      textSize(constrain(k.r * 0.34, 6.5, 11));
      textAlign(CENTER, CENTER);
      text('KARTE 03', 0, 1);
      pop();
    }
  });
}

function drawHint() {
  const h = L.D.hint;
  if (!started || h.h < 36 || h.w < 80) return;
  const txt = nextHint();
  if (!txt) return;
  const hh = Math.min(h.h, 96);
  push();
  noStroke();
  fill(0, 0, 0, 45);
  rect(h.x + 2, h.y + 3, h.w, hh, 2);
  fill(COL.paper);
  rect(h.x, h.y, h.w, hh, 2);
  fill(COL.neon);
  textFont('IBM Plex Mono');
  textSize(8.5);
  textAlign(LEFT, TOP);
  text('NÄCHSTE KARTE · NEXT CARD', h.x + 9, h.y + 8);
  fill(COL.paperInk);
  textFont('Newsreader');
  textStyle(ITALIC);
  textSize(constrain(h.w * 0.075, 12, 15));
  textLeading(textSize() * 1.25);
  text(txt, h.x + 9, h.y + 24, h.w - 18, hh - 28);
  pop();
}

function contactX(f) {
  const R = L.R;
  if (f.kind === 'tongue') return R.manuals[f.manual].tongues[f.tongue].x;
  return R.p0 + (R.p1 - R.p0) * f.u;
}

function drawShelf(now) {
  const R = L.R;
  push();
  railTransform(window);
  R.manuals.forEach(M => {
    const list = [];
    for (const f of fingers.values()) if (f.manual === M.i) list.push(f);
    const top = topFinger(M.i);
    // the plate moves down a little when it is pressed, so the rail darkens
    let deepest = 0;
    list.forEach(f => { deepest = Math.max(deepest, f.a); });
    if (deepest > 0) {
      noStroke();
      fill(0, 0, 0, 18 + 40 * deepest);
      rect(6, M.rt, R.len - 12, M.rh, 4);
    }
    // the wire stays straight. Its shadow sits below it, and meets it wherever it touches the rail.
    const x0 = R.p0 - 14, x1 = R.p1 + 14, off = Math.max(3, M.rh * 0.08);
    noFill();
    stroke(0, 0, 0, 80);
    strokeWeight(2.4);
    beginShape();
    for (let x = x0; x <= x1; x += 3) {
      let k = 1;
      list.forEach(f => {
        const d = Math.abs(x - contactX(f)) / (26 + 46 * f.a);
        if (d < 1) k = Math.min(k, d * d * (3 - 2 * d));
      });
      vertex(x, M.rest + 1 + off * k);
    }
    endShape();
    stroke(COL.wire);
    strokeWeight(1.8);
    line(x0, M.rest, x1, M.rest);
    noStroke();
    fill('#5D6369');
    ellipse(x0, M.rest, 7);
    ellipse(x1, M.rest, 7);

    // tongues: levers from the bar that press the wire at a preset note
    strokeCap(ROUND);
    const barY = M.top + M.tb * 0.1 + M.tb * 0.15;
    M.tongues.forEach(t => {
      const held = list.some(f => f.kind === 'tongue' && f.tongue === t.j);
      const tipX = t.x - M.tb * 0.14, tipY = held ? M.rest + 1 : M.rt + 3;
      stroke(0, 0, 0, 70);
      strokeWeight(Math.max(4, M.tb * 0.13));
      line(t.x + 1.5, barY + 2, tipX + 1.5, tipY + 2);
      stroke(held ? '#0E0F11' : COL.tongue);
      line(t.x, barY, tipX, tipY);
      stroke(COL.tongueHi);
      strokeWeight(1.2);
      line(t.x - 1.2, barY, tipX - 1.2, tipY);
    });

    // where the wire touches: bright for the note sounding, dim for presses held under it
    list.forEach(f => {
      const x = contactX(f), live = f === top;
      noStroke();
      if (live) {
        drawingContext.shadowColor = 'rgba(255,106,44,0.9)';
        drawingContext.shadowBlur = 12 + 18 * f.a + 16 * swoopFlash;
        fill(255, 106, 44, 220);
        ellipse(x, M.rest, 6 + 9 * f.a);
        drawingContext.shadowBlur = 0;
        fill('#FFF1E6');
        ellipse(x, M.rest, 3.5);
      } else {
        fill(255, 106, 44, 110);
        ellipse(x, M.rest, 6);
      }
      if (!unlocked.has('sala') && live && f.loudAt) {
        const held = (now - holdStart(f)) / (CONFIG.unlock.holdSeconds * 1000);
        if (held > 0.2) {
          noFill();
          stroke(255, 106, 44, 220);
          strokeWeight(2);
          arc(x, M.rest, 40, 40, -HALF_PI, -HALF_PI + TWO_PI * Math.min(1, held));
        }
      }
    });
    if (hover && hover.m === M.i && !fingers.size) {
      noFill();
      stroke(255, 106, 44, 160);
      strokeWeight(1.5);
      ellipse(R.p0 + (R.p1 - R.p0) * hover.u, M.rest, 18);
    }
  });
  pop();
}

function drawNoteLabels() {
  const list = [];
  for (let m = 0; m < 2; m++) {
    const f = topFinger(m);
    if (f) list.push({ x: contactX(f), y: L.R.manuals[m].rest, semi: playedSemi(f), m });
  }
  if (hover && !fingers.size) list.push({ x: L.R.p0 + (L.R.p1 - L.R.p0) * hover.u, y: L.R.manuals[hover.m].rest, semi: hover.u * CONFIG.semitones, m: hover.m, dim: true });
  list.forEach(o => {
    const s = toScreen(o.x, o.y), lx = s.x, ly = s.y - 16;
    push();
    noStroke();
    fill(20, 12, 8, o.dim ? 120 : 200);
    rectMode(CENTER);
    rect(lx, ly - 4, 40, 18, 9);
    fill(o.dim ? 'rgba(255,214,190,0.75)' : '#FFE4D2');
    textFont('IBM Plex Mono');
    textSize(11);
    textAlign(CENTER, CENTER);
    text(noteParts(midiFor(o.semi, o.m)).name, lx, ly - 4);
    pop();
  });
}

/* ================= sound ================= */

class Voice {
  constructor(ctx, dest, drift) {
    this.ctx = ctx;
    this.on = false;
    this.level = 0.5;
    this.fx = 0.5;
    this.res = 0.45;
    this.main = ctx.createOscillator();
    this.main.type = 'sawtooth';
    this.sum = ctx.createGain();
    this.sum.gain.value = 0.5;
    this.main.connect(this.sum);
    // vibrato: a sine wobble on the pitch, depth in cents
    this.vib = ctx.createOscillator();
    this.vib.frequency.value = CONFIG.vibratoRate * (0.96 + Math.random() * 0.08);
    this.vibDepth = ctx.createGain();
    this.vibDepth.gain.value = 0;
    this.vib.connect(this.vibDepth);
    drift.connect(this.main.detune);
    this.vibDepth.connect(this.main.detune);
    // Mixtur: subharmonics at 1/2, 1/3 and 1/4 of the main pitch, silent until turned up
    this.subs = [2, 3, 4].map(div => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      const g = ctx.createGain();
      g.gain.value = 0;
      o.connect(g); g.connect(this.sum);
      drift.connect(o.detune);
      this.vibDepth.connect(o.detune);
      return { div, o, g };
    });
    // formants: two resonant band-pass filters in parallel, plus a quieter dry path
    this.f1 = ctx.createBiquadFilter(); this.f1.type = 'bandpass';
    this.f2 = ctx.createBiquadFilter(); this.f2.type = 'bandpass';
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.Q.value = 0.7; this.lp.frequency.value = 1500;
    // less of the two vowel-like formants and more of the raw buzz, so it reads as a reed or brass voice
    // instead of a ghost-movie wail. A design choice: the real filter settings aren't documented
    const g1 = ctx.createGain(); g1.gain.value = 1.9;
    const g2 = ctx.createGain(); g2.gain.value = 1.3;
    const g0 = ctx.createGain(); g0.gain.value = 0.45;
    this.tone = ctx.createGain();       // evens out loudness across the formant sweep
    this.vca = ctx.createGain();
    this.vca.gain.value = 0;
    this.sum.connect(this.f1); this.f1.connect(g1); g1.connect(this.tone);
    this.sum.connect(this.f2); this.f2.connect(g2); g2.connect(this.tone);
    this.sum.connect(this.lp); this.lp.connect(g0); g0.connect(this.tone);
    // a soft valve-style saturation after the VCA: the harder you press, the more bite
    this.drive = ctx.createWaveShaper();
    this.drive.curve = driveCurve(1.6);
    this.drive.oversample = '2x';
    this.tone.connect(this.vca);
    this.vca.connect(this.drive);
    this.drive.connect(dest);
    this.formant(0.5);
    this.resonance(0.45);
    const t = ctx.currentTime;
    this.main.start(t);
    this.vib.start(t);
    this.subs.forEach(s => s.o.start(t));
  }
  // a note that starts from silence starts on its pitch, like a wire touching the rail.
  // Only a note that is already sounding glides, so a new press never scoops up from the last one
  pitch(hz) {
    const t = this.ctx.currentTime;
    const set = (param, v) => {
      if (this.on) { param.setTargetAtTime(v, t, CONFIG.glide); return; }
      param.cancelScheduledValues(t);
      param.setValueAtTime(v, t);
    };
    set(this.main.frequency, hz);
    this.subs.forEach(s => set(s.o.frequency, hz / s.div));
  }
  press(p, floor) {                // p from 0 (resting) to 1 (hard). floor: how loud it is with no pressure at all
    const t = this.ctx.currentTime;
    this.level = floor + (1 - floor) * p;
    if (this.on) this.vca.gain.setTargetAtTime(this.level * 0.85, t, 0.02);
    this.lp.frequency.setTargetAtTime(600 + 5200 * p * p, t, 0.03);
  }
  formant(x) {                     // x from 0 to 1 sweeps both formants upward
    const t = this.ctx.currentTime;
    this.fx = x;
    this.f1.frequency.setTargetAtTime(240 * Math.pow(1300 / 240, x), t, 0.05);
    this.f2.frequency.setTargetAtTime(750 * Math.pow(3400 / 750, x), t, 0.05);
    this.toneGain();
  }
  resonance(v) {
    const t = this.ctx.currentTime;
    this.res = v;
    this.f1.Q.setTargetAtTime(2 + 8 * v, t, 0.05);
    this.f2.Q.setTargetAtTime(3 + 9 * v, t, 0.05);
    this.toneGain();
  }
  toneGain() {
    this.tone.gain.setTargetAtTime((0.5 + 0.8 * Math.pow(this.fx, 0.8)) * (0.85 + 0.45 * this.res), this.ctx.currentTime, 0.05);
  }
  mixtur(amount) {
    const t = this.ctx.currentTime, lv = [0.55, 0.4, 0.3];
    this.subs.forEach((s, i) => s.g.gain.setTargetAtTime(lv[i] * amount, t, 0.08));
  }
  vibrato(cents) { this.vibDepth.gain.setTargetAtTime(cents, this.ctx.currentTime, 0.08); }
  start() {
    this.on = true;
    this.vca.gain.setTargetAtTime(this.level * 0.85, this.ctx.currentTime, 0.006);
  }
  stop() {
    this.on = false;
    this.vca.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
  }
}

function buildAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  let ctx;
  try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { ctx = new AC(); }
  const master = ctx.createGain();
  master.gain.value = 1.1 * K.laut.value;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.5;
  comp.attack.value = 0.003; comp.release.value = 0.25;
  const verb = ctx.createConvolver();
  verb.buffer = roomImpulse(ctx, CONFIG.room, 3.5);
  const dark = ctx.createBiquadFilter();      // a darker tail, so the room doesn't hiss like a haunted hall
  dark.type = 'lowpass';
  dark.frequency.value = 4500;
  const wet = ctx.createGain();
  wet.gain.value = CONFIG.reverb;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0;
  master.connect(comp);
  master.connect(verb); verb.connect(dark); dark.connect(wet); wet.connect(comp);
  comp.connect(ctx.destination);
  comp.connect(analyser);
  // the neon tube never sat still: a small shared wobble, in cents
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.3;
  const drift = ctx.createGain();
  drift.gain.value = CONFIG.drift;
  lfo.connect(drift);
  lfo.start();
  const voices = [new Voice(ctx, master, drift), new Voice(ctx, master, drift)];   // one per manual
  return { ctx, master, analyser, buf: new Float32Array(analyser.fftSize), voices };
}

// soft clipping: quiet signals pass at the same level, the loudest peaks get rounded off
function driveCurve(k) {
  const n = 2048, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / k; }
  return c;
}

function roomImpulse(ctx, seconds, decay) {
  const rate = ctx.sampleRate, len = Math.floor(rate * seconds), pre = Math.floor(rate * 0.012);
  const b = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = pre; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - (i - pre) / (len - pre), decay);
  }
  return b;
}

function resumeAudio() {
  if (audio && audio.ctx.state !== 'running') audio.ctx.resume();
}

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

// each rail has its own octave switch: -1, 0 or +1
function octaveShift(m) { return Math.round((m === 0 ? K.oktave2 : K.oktave1).value * 2) - 1; }
function midiFor(semi, m) { return CONFIG.lowMidi + 12 * octaveShift(m) + semi; }
function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function noteParts(m) {
  const n = Math.round(m);
  return { name: NOTE_NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1), cents: Math.round((m - n) * 100) };
}

// pressure for one press, from whatever this device can measure
function pressureFor(f) {
  const mode = MODE.pressure;
  if (f.type === 'pad') return padLevel().a;                      // Mac app: every finger shares the pad's pressure
  if (f.type === 'pen' && f.penA != null) return f.penA;          // Apple Pencil, on any setting
  if ((mode === 'force' || mode === 'pad') && f.force) return f.forceA;
  if (mode === 'tilt' && motion.ok) return tiltShare.get(f.id) || 0;        // this finger's share of the tip (splitTilt)
  if (f.kind === 'tongue') return 0.65;
  return f.depthA;
}

// How loud a press is with no pressure at all. On a Trautonium the wire resting on the rail is
// silent, and pushing the rail down brings the sound in (Doepfer). Real pressure follows that:
// the phone's tilt, trackpad force, the Pencil. Where pressure is only a stand-in (how far below
// the wire you press, a key on a tongue, the Mac app's light touch), a quiet floor keeps it playable.
function floorFor(f) {
  if (f.type === 'pen' && f.penA != null) return 0;
  if (f.force) return 0;
  if (MODE.pressure === 'tilt' && motion.ok) return 0;
  return CONFIG.floor;
}
function loudness(f) {
  const fl = floorFor(f);
  return fl + (1 - fl) * f.a;
}
// a steady note counts from when it last moved or last became audible, whichever is later
function holdStart(f) { return Math.max(f.anchorAt, f.loudAt || 0); }

// A phone's resting finger is silent, like the real wire. If someone sits on a silent note, say how to make it sound.
let quietSince = 0, nudgedAt = -1e9;
function nudgeIfQuiet(now, loud) {
  if (!(started && MODE.pressure === 'tilt' && motion.ok && fingers.size && loud <= CONFIG.audible)) { quietSince = 0; return; }
  if (!quietSince) quietSince = now;
  if (now - quietSince > 2500 && now - nudgedAt > 30000) {
    nudgedAt = now;
    showNote('Press harder', 'Resting is silent, like the real wire. Press down so the phone tips on something soft.', 6000);
  }
}
function vibCents(f) {
  const pv = f.type === 'pad' ? padLevel().pv : (f.force ? f.pv : 0);
  return K.vibrato.value * CONFIG.vibratoMax + pv * CONFIG.pressureVibrato;
}

// push knob and pressure changes into the sound, only when something changed
function syncSound() {
  if (!audio) return;
  const fx = K.formant.value;
  if (Math.abs(fx - applied.formant) > 0.003) { audio.voices.forEach(v => v.formant(fx)); applied.formant = fx; }
  if (K.resonanz.value !== applied.res) { audio.voices.forEach(v => v.resonance(K.resonanz.value)); applied.res = K.resonanz.value; }
  const mix = unlocked.has('sala') ? K.mixtur.value : 0;
  if (mix !== applied.mix) { audio.voices.forEach(v => v.mixtur(mix)); applied.mix = mix; }
  if (K.laut.value !== applied.vol) { audio.master.gain.setTargetAtTime(1.1 * K.laut.value, audio.ctx.currentTime, 0.03); applied.vol = K.laut.value; }
  const now = performance.now(), dt = Math.min(0.1, Math.max(0, (now - (syncAt || now)) / 1000));
  syncAt = now;
  splitTilt(dt);
  for (const f of fingers.values()) { f.a = pressureFor(f); settlePitch(f, now, dt); }
  for (let m = 0; m < 2; m++) {
    const oct = octaveShift(m), octChanged = oct !== applied.oct[m];
    applied.oct[m] = oct;
    const f = topFinger(m);
    if (!f) continue;
    const v = audio.voices[m];
    if (octChanged) applyFinger(f);
    else if (Math.abs(playedSemi(f) - f.sSent) > 0.002) sendPitch(f);
    const lv = loudness(f);
    if (Math.abs(lv - f.aSent) > 0.008) { v.press(f.a, floorFor(f)); f.aSent = lv; }
    const c = vibCents(f);
    if (Math.abs(c - f.vc) > 0.5) { v.vibrato(c); f.vc = c; }
  }
}

/* ================= tilt: the phone tipping on something soft ================= */

// iPhones only allow motion access when asked inside a tap, so this runs from the start button
function askMotion() {
  if (motion.asked) return;
  const DOE = window.DeviceOrientationEvent;
  if (!DOE) { motion.status = 'none'; return; }
  motion.asked = true;
  motion.status = 'waiting';
  if (typeof DOE.requestPermission === 'function') {
    DOE.requestPermission()
      .then(state => { if (state === 'granted') window.addEventListener('deviceorientation', onOrient); else motion.status = 'denied'; })
      .catch(() => { motion.status = 'none'; });
  } else {
    window.addEventListener('deviceorientation', onOrient);
  }
  setTimeout(() => { if (!motion.ok && motion.status === 'waiting') motion.status = 'none'; }, 2500);
}

// How far the phone has tipped, divided by how far these presses should tip it, if every press pushed alike.
// Kept to compare against: the room itself splits the tip between the fingers (splitTilt below).
function tiltPressure() {
  return constrain((lapTip - CONFIG.lap.deadzone) / (CONFIG.lap.range * tipScale()), 0, 1);
}

/*
  Who pressed: splitting the tip between the fingers.
  A phone on something soft tips toward the press, by an amount that grows with how far the press is from
  the middle of the phone (see tipScale). So the tip has a direction as well as a size. Every finger's
  place on the glass is known, and each finger's push tips the phone along its own line from the middle.
  The measured tip is the sum of those pushes, so the room solves for the push of each finger:
    tip = K x (a1 x lever1 + a2 x lever2 + ...)   with each a between 0 and 1
  Left and right, up and down: two numbers, so two fingers (one per rail) can be told apart exactly,
  unless they sit in one line with the middle of the phone. There the tip can't say which one pushed,
  so the room leans toward an even split (CONFIG.lap.even). A push can't pull, so no a goes below 0.
  Fingers on knobs press the phone too. They are in the sum, so their push doesn't leak into a rail.
*/
let lapVec = [0, 0];                       // the tip as a direction in the room: x along the rails, y across them, degrees
const tiltShare = new Map();               // finger id -> its pressure from the tip, 0 to 1
// The eight ways the phone's two axes can line up with the room's, as [xx, xy, yx, yy]:
// room x = xx * phone x + xy * phone y, room y = yx * phone x + yy * phone y
const AXES = [[1, 0, 0, 1], [-1, 0, 0, 1], [1, 0, 0, -1], [-1, 0, 0, -1], [0, 1, 1, 0], [0, -1, 1, 0], [0, 1, -1, 0], [0, -1, -1, 0]];
const tiltAxes = { base: -1, fix: 0, score: new Array(8).fill(0), at: 0 };

function axesApply(m, v) { return [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]]; }

// The phone reports tilt in its own frame: upright, x to the right, y to the top. The room turned sideways,
// and a phone on its side with its top to the left (orientation 90), both put the room's x along the phone's
// -y and the room's y along the phone's -x.
function baseAxes() {
  if (turned) return 7;
  const a = typeof window.orientation === 'number' ? window.orientation : (screen.orientation && screen.orientation.angle) || 0;
  return [2, 7, 1, 4][((Math.round(a / 90) % 4) + 4) % 4];   // 0, 90, 180, 270 (or -90)
}
// a shift of gravity across the phone's screen, in the room's directions. fix is learned in learnAxes
function phoneToRoom(d) { return axesApply(AXES[tiltAxes.base], axesApply(AXES[tiltAxes.fix], d)); }

// a finger's lever: where it presses, from the middle of the screen, with the short side stretched by the
// aspect (a phone tips more easily across its short side). Very short levers are lengthened to the
// smallest one CONFIG.lap.scale allows, as tipScale does, so a press near the middle can't read as huge
function refLever() { return Math.max(Math.abs(toScreen(0, L.R.manuals[1].rest).y / height - 0.5) * (width / height), 0.05); }
function leverAt(x, y) {
  const across = width / height, least = CONFIG.lap.scale[0] * refLever();
  let u = x / width - 0.5, v = (y / height - 0.5) * across;
  const n = Math.hypot(u, v);
  if (n < 1e-6) return [0, least];
  if (n < least) { u *= least / n; v *= least / n; }
  return [u, v];
}
// everything pressing on the glass: fingers on the rails and tongues, and fingers turning knobs
function pressPoints() {
  const pts = [];
  if (!L) return pts;
  for (const f of fingers.values()) {
    if (f.type === 'key' || f.type === 'pad') continue;            // keys and the Mac trackpad don't press the phone
    const p = toScreen(contactX(f), L.R.manuals[f.manual].rest);
    pts.push({ f, lv: leverAt(p.x, p.y), even: 1 });
  }
  for (const d of knobDrags.values()) pts.push({ f: null, lv: leverAt(d.x0, d.y0), even: 0 });
  return pts;
}

function splitTilt(dt) {
  const was = new Map(tiltShare);
  tiltShare.clear();
  if (!L || MODE.pressure !== 'tilt' || !motion.ok) return;
  const pts = pressPoints(), mag = Math.hypot(lapVec[0], lapVec[1]), eff = mag - CONFIG.lap.deadzone;
  if (!pts.length) return;
  let a = pts.map(() => 0);
  if (eff > 0) {
    const K = CONFIG.lap.range / refLever();                         // degrees of tip per unit of lever, pressing fully
    const s = [lapVec[0] / mag * eff / K, lapVec[1] / mag * eff / K];
    // the even split: the one pressure for every rail finger that best explains the tip
    let ex = 0, ey = 0;
    pts.forEach(p => { if (p.even) { ex += p.lv[0]; ey += p.lv[1]; } });
    const even = Math.max(0, (ex * s[0] + ey * s[1]) / Math.max(ex * ex + ey * ey, 1e-6));
    a = shareOut(pts.map(p => p.lv), s, pts.map(p => p.even * even), CONFIG.lap.even);
  }
  const k = 1 - Math.exp(-Math.max(dt || 0, 0) / CONFIG.lap.smooth);
  pts.forEach((p, i) => {
    if (!p.f) return;
    const target = constrain(a[i], 0, 1), before = was.get(p.f.id);
    tiltShare.set(p.f.id, before == null ? target : before + (target - before) * k);
  });
}

// Pushes a >= 0 whose levers add up closest to the tip s, leaning on the prior where the tip can't tell
// them apart. Least squares with a small pull (lam) toward the prior; any push that comes out below zero
// is set to zero and the rest are solved again.
function shareOut(lv, s, prior, lam) {
  const n = lv.length, free = new Array(n).fill(true);
  let a = new Array(n).fill(0);
  for (let pass = 0; pass <= n; pass++) {
    const idx = [];
    for (let i = 0; i < n; i++) if (free[i]) idx.push(i);
    if (!idx.length) break;
    const A = idx.map((i, r) => idx.map((j, c) => lv[i][0] * lv[j][0] + lv[i][1] * lv[j][1] + (r === c ? lam : 0)));
    const b = idx.map(i => lv[i][0] * s[0] + lv[i][1] * s[1] + lam * prior[i]);
    const x = solveLinear(A, b);
    a = new Array(n).fill(0);
    idx.forEach((i, r) => { a[i] = x[r]; });
    let dropped = false;
    idx.forEach(i => { if (a[i] < 0) { free[i] = false; a[i] = 0; dropped = true; } });
    if (!dropped) break;
  }
  return a;
}
function solveLinear(A, b) {                // Gaussian elimination, small systems only
  const n = b.length, M = A.map((row, i) => row.concat(b[i]));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const d = M[c][c] || 1e-12;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const k = M[r][c] / d;
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  return M.map((row, i) => row[n] / (row[i] || 1e-12));
}

// Checking the phone's sense of direction against the fingers. When one finger presses alone, the phone
// has to tip toward it. Each of the eight ways the axes could line up keeps a score of how well it
// explains such tips. If another one beats the current one clearly (about two seconds of firm, clear
// presses), the room switches to it. This guards against a phone or browser that reports tilt with its
// axes swapped or flipped. The scores restart when the phone's orientation changes.
function learnAxes(d, dt) {
  const pts = pressPoints();
  if (pts.length !== 1 || !pts[0].f) return;
  const deg = Math.hypot(d[0], d[1]) * 180 / Math.PI;
  const w = constrain((deg - CONFIG.lap.deadzone) / CONFIG.lap.range, 0, 1);
  if (w <= 0 || dt <= 0) return;
  const lv = pts[0].lv, ln = Math.hypot(lv[0], lv[1]), keep = Math.exp(-dt / 30), S = tiltAxes.score;
  for (let k = 0; k < 8; k++) {
    const t = axesApply(AXES[tiltAxes.base], axesApply(AXES[k], d)), tn = Math.hypot(t[0], t[1]);
    S[k] = S[k] * keep + w * dt * (t[0] * lv[0] + t[1] * lv[1]) / (tn * ln || 1);
  }
  let best = tiltAxes.fix;
  for (let k = 0; k < 8; k++) if (S[k] > S[best]) best = k;
  if (best !== tiltAxes.fix && S[best] - S[tiltAxes.fix] > 2) tiltAxes.fix = best;
}

// The same push tips the phone very differently depending on where it lands. A phone lying on
// something soft acts like a plate on springs: a press tips it in proportion to how far the press is
// from the middle, and it tips more easily across its short side than along its long side. The front
// rail runs near the bottom edge and the back rail near the middle, so pressing the back rail barely
// tips it. This compares the presses held now with one press in the middle of the front rail, which
// is what CONFIG.lap.range is measured against. Two presses on the same side tip it twice as far.
function tipScale() {
  if (!L || !fingers.size) return 1;
  const across = width / height;              // the long side over the short side, in the room's own directions
  let sx = 0, sy = 0;
  for (const f of fingers.values()) {
    const p = toScreen(contactX(f), L.R.manuals[f.manual].rest);
    sx += p.x / width - 0.5;
    sy += (p.y / height - 0.5) * across;
  }
  const ref = Math.abs(toScreen(0, L.R.manuals[1].rest).y / height - 0.5) * across;
  return constrain(Math.hypot(sx, sy) / Math.max(ref, 0.05), CONFIG.lap.scale[0], CONFIG.lap.scale[1]);
}

// The direction of gravity relative to the screen, built from beta and gamma.
// How far the phone tips away from where it rested goes to tiltPressure().
function onOrient(e) {
  if (e.beta == null || e.gamma == null) return;
  const b = e.beta * Math.PI / 180, g = e.gamma * Math.PI / 180;
  motion.g = [Math.sin(g) * Math.cos(b), -Math.sin(b), -Math.cos(g) * Math.cos(b)];
  motion.ok = true;
  motion.status = 'on';
  // resting position follows slowly while nothing is pressed, so settling and breathing between notes do not build up
  if (!lapRest) lapRest = motion.g.slice();
  if (!fingers.size) {
    for (let i = 0; i < 3; i++) lapRest[i] += (motion.g[i] - lapRest[i]) * 0.08;
    const n = Math.hypot(lapRest[0], lapRest[1], lapRest[2]) || 1;
    for (let i = 0; i < 3; i++) lapRest[i] /= n;
  }
  const dot = constrain(motion.g[0] * lapRest[0] + motion.g[1] * lapRest[1] + motion.g[2] * lapRest[2], -1, 1);
  lapTip = Math.acos(dot) * 180 / Math.PI;
  // the tip as a direction: gravity shifts across the screen toward whichever edge went down
  const base = baseAxes(), now = performance.now(), dt = tiltAxes.at ? Math.min(0.1, (now - tiltAxes.at) / 1000) : 0;
  tiltAxes.at = now;
  if (base !== tiltAxes.base) { tiltAxes.base = base; tiltAxes.score.fill(0); }
  const d = [motion.g[0] - lapRest[0], motion.g[1] - lapRest[1]];
  learnAxes(d, dt);
  const t = phoneToRoom(d);
  lapVec = [t[0] * 180 / Math.PI, t[1] * 180 / Math.PI];
}

/* ================= the start screen ================= */
// A phone and the Mac app get how to play and a start button.
// A laptop browser first gets "this is played on a phone", a QR code of the room's address,
// and "play here with the mouse" for anyone without a phone to hand.

function roomLink() {
  if (CONFIG.link) return CONFIG.link;
  // a page that isn't inside a frame knows its own address. The p5 editor runs sketches inside one.
  try { if (window.top === window.self && /^https?:/.test(location.href)) return location.href; } catch (e) {}
  return '';
}

function fillStart() {
  const phoneFirst = KIND === 'laptop' && !started;
  $('start-how').hidden = phoneFirst;
  $('start-phone').hidden = !phoneFirst;
  $('how-help').textContent = MODE.help;
  $('how-caveat').textContent = MODE.caveat;
  $('start-tip').hidden = KIND !== 'phone';
  if (phoneFirst) drawQR();
}

function drawQR() {
  const box = $('qr'), link = roomLink();
  box.replaceChildren();
  box.hidden = true;
  $('qr-text').textContent = 'Open this page on your phone.';
  if (!link || typeof window.qrcode !== 'function') return;
  try {
    const q = window.qrcode(0, 'M');
    q.addData(link);
    q.make();
    box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    box.hidden = false;
    $('qr-text').textContent = 'Scan this with your phone’s camera.';
  } catch (e) {}
}

/* ================= playing: rails, tongues, keys, knobs ================= */

// A wire plays its highest press: the contact furthest up the wire wins, as on the Trautoniks
// VT2012 (Sound On Sound: "If you make contact with several fingers at once, the highest takes
// priority"). What Sala's own instrument did isn't documented. Ties go to the newest press.
function topFinger(m) {
  let top = null;
  for (const id of manualState[m].stack) {
    const f = fingers.get(id);
    if (f && (!top || f.semi >= top.semi)) top = f;
  }
  return top;
}

// sound whichever press is highest on this wire, or go quiet if none is left
function soundManual(m) {
  if (!audio) return;
  const v = audio.voices[m], f = topFinger(m);
  if (!f) { v.stop(); return; }
  applyFinger(f);
  if (!v.on) v.start();
}

function pushFinger(f) {
  fingers.set(f.id, f);
  manualState[f.manual].stack.push(f.id);
  f.a = pressureFor(f);
  soundManual(f.manual);
}

function releaseFinger(id) {
  const f = fingers.get(id);
  if (!f) return;
  fingers.delete(id);
  const st = manualState[f.manual];
  st.stack = st.stack.filter(x => x !== id);
  soundManual(f.manual);
}

function releaseAll() {
  fingers.clear();
  manualState.forEach(s => { s.stack = []; });
  if (audio) audio.voices.forEach(v => v.stop());
  knobDrags.clear();
}

function applyFinger(f) {
  if (!audio || topFinger(f.manual) !== f) return;
  const v = audio.voices[f.manual];
  lastManual = f.manual;
  sendPitch(f);
  v.press(f.a, floorFor(f));
  f.aSent = loudness(f);
  const c = vibCents(f);
  v.vibrato(c);
  f.vc = c;
}

function newFinger(id, type, manual, kind, tongue, u, depthA) {
  const now = performance.now(), semi = u * CONFIG.semitones, near = Math.round(semi);
  return {
    id, type, manual, kind, tongue, u, semi, depthA, a: depthA, aSent: -1, pv: 0, vc: -1,
    force: false, forceA: 0, penA: null, min: semi, max: semi, anchor: semi, anchorAt: now, hist: [{ t: now, s: semi }],
    // a new press lands in tune straight away (see settlePitch)
    trail: [{ t: now, s: semi }], target: near, off: (near - semi) * CONFIG.snap, sSent: -99
  };
}

// Pitch rounding, a design choice for fingers on glass. A press that holds still is drawn most of
// the way into tune and a slide glides freely. The pull works over time, not by position, so a slow
// slide never jumps from note to note. The note it aims for only changes once the finger is well past
// halfway to the next one, so a shaky finger can't flip between two notes.
function settlePitch(f, now, dt) {
  if (Math.abs(f.semi - f.target) > 0.6) f.target = Math.round(f.semi);
  const still = Math.max(0, 1 - slideSpeed(f, now) / CONFIG.snapSpeed);
  const want = (f.target - f.semi) * CONFIG.snap * still;
  f.off += (want - f.off) * (1 - Math.exp(-dt / CONFIG.snapTime));
}
// how fast a press is sliding, in semitones a second, over the last tenth of a second.
// A finger that stops sends no more events, so this reads against the time now.
function slideSpeed(f, now) {
  const tr = f.trail;
  let ref = tr[0];
  for (let i = tr.length - 1; i >= 0; i--) if (now - tr[i].t >= 100) { ref = tr[i]; break; }
  return Math.abs(f.semi - ref.s) / (Math.max(now - ref.t, 40) / 1000);
}
function playedSemi(f) { return f.semi + f.off; }
function sendPitch(f) {
  const s = playedSemi(f), m = midiFor(s, f.manual);
  audio.voices[f.manual].pitch(midiHz(m));
  f.sSent = s;
  lastNotes[f.manual] = noteParts(m);
  if (f.manual === lastManual) lastHz = midiHz(m);
}

function listenPointer() {
  canvasEl.addEventListener('pointerdown', onDown);
  canvasEl.addEventListener('pointermove', onMove);
  canvasEl.addEventListener('pointerup', onUp);
  canvasEl.addEventListener('pointercancel', onUp);
  canvasEl.addEventListener('lostpointercapture', onUp);
  canvasEl.addEventListener('pointerleave', () => { hover = null; });
  canvasEl.addEventListener('contextmenu', e => e.preventDefault());
  canvasEl.addEventListener('dblclick', onDouble);
  canvasEl.addEventListener('wheel', onWheel, { passive: false });
  // Mac trackpad pressure (Safari only). Cancel the system's force-click action first.
  canvasEl.addEventListener('webkitmouseforcewillbegin', e => e.preventDefault());
  canvasEl.addEventListener('webkitmouseforcechanged', onForce);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  window.addEventListener('pagehide', releaseAll);
  window.addEventListener('blur', () => { for (const id of [...fingers.keys()]) if (String(id).indexOf('key:') === 0) releaseFinger(id); });
}

// a pointer's place in the room. Turned sideways, the screen's top-to-bottom is the room's left-to-right.
function localXY(e) {
  if (turned) return { x: e.clientY, y: window.innerWidth - e.clientX };
  const r = canvasEl.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function hitKnob(x, y) {
  if (!L || !L.D.slots) return null;
  // the octave switches split their place in two: the top half is the back rail's, the bottom half the front rail's
  for (const s of L.D.slots) {
    if (s.kind === 'switch' && Math.abs(x - s.cx) <= s.w / 2 && Math.abs(y - s.cy) <= s.h / 2) return y < s.cy ? s.items[0] : s.items[1];
  }
  for (const k of KNOBS) if (k.kind !== 'switch' && k.r && dist(x, y, k.x, k.y) <= k.r + 10) return k;
  return null;
}
// Tapping beside a switch's lever moves it one step that way. Sliding moves it a step every switchStep pixels.
// A finger is wider than the whole track on a phone, so a tap never has to land on an exact spot.
function switchTap(k, x) {
  const lx = k.x - k.tw / 2 + k.tw * k.value, half = k.th * 0.75;
  if (x > lx + half) setKnob(k, k.value + 0.5);
  else if (x < lx - half) setKnob(k, k.value - 0.5);
}
function switchStep(k) { return Math.max(k.tw / 2, 16); }

function hitTongue(M, rx, ry) {
  if (ry < M.top + M.tb * 0.25 || ry > M.rt + 4) return null;
  const hw = Math.min(16, L.R.semiW * 0.9);
  let best = null, bestD = Infinity;
  M.tongues.forEach(t => {
    const d = Math.abs(rx - (t.x - M.tb * 0.07));
    if (d <= hw && d < bestD) { best = t; bestD = d; }
  });
  return best;
}

function readRail(M, rx, ry) {
  const R = L.R;
  return {
    u: constrain((rx - R.p0) / (R.p1 - R.p0), 0, 1),
    a: constrain((ry - M.rest) / (M.deep - M.rest), 0, 1)
  };
}

// which manual, and whether a tongue or the rail itself, is under a point in rail space
function hitShelf(rx, ry) {
  const R = L.R;
  for (const M of R.manuals) {
    if (ry < M.top - 4 || ry > M.bottom + 4) continue;
    const t = hitTongue(M, rx, ry);
    if (t) return { M, tongue: t };
    if (rx >= R.p0 - 16 && rx <= R.p1 + 16 && ry >= M.rt - 2 && ry <= M.rb + 10) return { M, tongue: null, rail: readRail(M, rx, ry) };
  }
  return null;
}

function setKnob(k, v) {
  v = constrain(v, 0, 1);
  if (k.steps) v = Math.round(v * (k.steps - 1)) / (k.steps - 1);
  k.value = v;
}

function onDown(e) {
  if (!started || !L) return;
  // Mac app while the trackpad plays the rails: the cursor is parked and hidden, so its clicks are not presses
  if (APP && pad.play) { e.preventDefault(); return; }
  const { x, y } = localXY(e);
  const k = hitKnob(x, y);
  if (k) {
    e.preventDefault();
    if (knobLocked(k)) { showNote('Locked', 'Mixtur unlocks with card 03: hold one note steady for three seconds.'); return; }
    // every finger can turn its own knob. A second finger on the same knob takes it over.
    for (const [id, d] of knobDrags) if (d.k === k) knobDrags.delete(id);
    if (k.kind === 'switch') switchTap(k, x);
    knobDrags.set(e.pointerId, { k, x0: x, y0: y, v0: k.value });
    try { canvasEl.setPointerCapture(e.pointerId); } catch (err) {}
    return;
  }
  const rp = toRail(x, y), hit = hitShelf(rp.x, rp.y);
  if (!hit) return;
  e.preventDefault();
  resumeAudio();
  if (!audio) return;
  try { canvasEl.setPointerCapture(e.pointerId); } catch (err) {}
  const f = hit.tongue
    ? newFinger(e.pointerId, e.pointerType, hit.M.i, 'tongue', hit.tongue.j, hit.tongue.u, 0.65)
    : newFinger(e.pointerId, e.pointerType, hit.M.i, 'rail', -1, hit.rail.u, hit.rail.a);
  if (e.pointerType === 'pen' && e.pressure > 0) { f.penA = e.pressure; penSeen = true; }
  hover = null;
  pushFinger(f);
}

function onMove(e) {
  const { x, y } = localXY(e);
  const d = knobDrags.get(e.pointerId);
  if (d) {
    e.preventDefault();
    if (d.k.kind === 'switch') setKnob(d.k, d.v0 + Math.round((x - d.x0) / switchStep(d.k)) * 0.5);
    // the pointer turns left to right, like the knob: dragging right turns it up, and so does dragging up
    else setKnob(d.k, d.v0 + ((x - d.x0) + (d.y0 - y)) / (e.shiftKey ? 600 : 180));
    return;
  }
  const f = fingers.get(e.pointerId);
  if (!f) {
    if (e.pointerType === 'mouse' && started && L && !(APP && pad.play)) {
      const rp = toRail(x, y), k = hitKnob(x, y), hit = k ? null : hitShelf(rp.x, rp.y);
      hover = hit && !hit.tongue ? { m: hit.M.i, u: hit.rail.u } : null;
      canvasEl.style.cursor = k ? (knobLocked(k) ? 'not-allowed' : 'ew-resize') : hit && hit.tongue ? 'pointer' : hit ? 'none' : 'default';
    }
    return;
  }
  e.preventDefault();
  const now = performance.now();
  if (f.kind === 'rail') {
    const rp = toRail(x, y), r = readRail(L.R.manuals[f.manual], rp.x, rp.y);   // a press stays on its own wire
    f.u = r.u;
    f.semi = r.u * CONFIG.semitones;
    f.depthA = r.a;
  }
  if (f.type === 'pen' && e.pressure > 0) f.penA = e.pressure;
  moved(f, now);
}

// after a press slides: pressure, the unlock checks, then the sound
function moved(f, now) {
  f.a = pressureFor(f);
  f.trail.push({ t: now, s: f.semi });
  while (f.trail.length > 2 && now - f.trail[1].t > 150) f.trail.shift();
  f.min = Math.min(f.min, f.semi);
  f.max = Math.max(f.max, f.semi);
  if (Math.abs(f.semi - f.anchor) > CONFIG.unlock.holdWobble) { f.anchor = f.semi; f.anchorAt = now; }
  if (f.max - f.min >= CONFIG.unlock.octave) unlock('berlin');
  trackSwoop(f, now);
  soundManual(f.manual);             // a slide can change which press is highest on this wire
}

function onUp(e) {
  if (knobDrags.delete(e.pointerId)) return;
  releaseFinger(e.pointerId);
}

// Safari reports trackpad pressure between mousedown and mouseup.
// Normal click to force click = soft to loud. Past the force click = vibrato.
function onForce(e) {
  let f = null;
  for (const x of fingers.values()) if (x.type === 'mouse') f = x;
  if (!f || typeof e.webkitForce !== 'number') return;
  const F1 = MouseEvent.WEBKIT_FORCE_AT_MOUSE_DOWN || 1, F2 = MouseEvent.WEBKIT_FORCE_AT_FORCE_MOUSE_DOWN || 2;
  applyForce(f, e.webkitForce, F1, F2);
}
function applyForce(f, force, F1, F2) {
  f.force = true;
  forceSeen = true;
  f.forceA = constrain((force - F1 * 0.9) / (F2 - F1 * 0.9), 0, 1);
  f.pv = constrain((force - F2) / ((F2 - F1) * 0.9), 0, 1);
  f.a = pressureFor(f);
  applyFinger(f);
}

/* ================= the Mac app ================= */
// The app (TrautoniumMac) loads this same page and calls two functions on it:
//   trautPad([{ id, x, y }, ...])   every finger touching the trackpad. x and y run 0 to 1, y = 1 at the top.
//   trautPadForce(stage, pressure)  Force Touch: stage 0 not clicked, 1 clicked, 2 past the deep click.
// The page tells the app when the trackpad should play and when it should move the cursor.
// Top half of the pad = the back rail (II), bottom half = the front rail (I). A finger stays on the rail it started on.

function tellApp(msg) {
  try { window.webkit.messageHandlers.traut.postMessage(msg); } catch (e) {}
}

function overlayOpen() {
  return !$('start').hidden || !$('archive').hidden || !$('card').hidden || !$('narrow').hidden;
}

// play while the room is on screen and the player has not asked for the cursor
function syncPadMode() {
  if (!APP || !L) return;
  const on = started && pad.play && !overlayOpen();
  const S = L.shelf;
  tellApp({ type: 'mode', play: on, x: S.x + S.w / 2, y: S.y + S.h / 2 });
  $('pad-btn').textContent = pad.play ? 'Tab: cursor' : 'Tab: play';
  if (!on) {
    for (const id of [...fingers.keys()]) if (String(id).indexOf('pad:') === 0) releaseFinger(id);
  }
  canvasEl.style.cursor = on ? 'none' : '';
}

function setPadPlay(on) {
  pad.play = on;
  pad.stage = 0;
  pad.pressure = 0;
  releaseAll();
  syncPadMode();
  showNote(on ? 'Trackpad plays' : 'Cursor', on ? 'Fingers on the pad play the rails. Tab gives you the cursor back.' : 'The trackpad moves the cursor now, for the knobs and buttons. Tab to play again.', 4000);
}

// one reading for the whole pad: touching is soft, clicking is louder, past the deep click adds vibrato
function padLevel() {
  const P = CONFIG.pad;
  if (pad.stage < 1) return { a: P.touch, pv: 0 };
  if (pad.stage < 2) return { a: P.click + (1 - P.click) * constrain(pad.pressure, 0, 1), pv: 0 };
  return { a: 1, pv: constrain(pad.pressure, 0, 1) };
}

window.trautPad = function (list) {
  if (!APP || !started || !L || !pad.play || overlayOpen() || !Array.isArray(list)) return;
  resumeAudio();
  if (!audio) return;
  const now = performance.now(), seen = new Set(), P = CONFIG.pad;
  list.forEach(t => {
    const id = 'pad:' + t.id, u = constrain((t.x - P.edge) / (1 - 2 * P.edge), 0, 1);
    seen.add(id);
    let f = fingers.get(id);
    if (!f) {
      f = newFinger(id, 'pad', t.y >= 0.5 ? 0 : 1, 'rail', -1, u, P.touch);
      hover = null;
      pushFinger(f);
      return;
    }
    if (Math.abs(f.u - u) < 1e-4) return;
    f.u = u;
    f.semi = u * CONFIG.semitones;
    moved(f, now);
  });
  for (const id of [...fingers.keys()]) if (String(id).indexOf('pad:') === 0 && !seen.has(id)) releaseFinger(id);
};

window.trautPadForce = function (stage, pressure) {
  if (!APP) return;
  pad.stage = stage;
  pad.pressure = pressure;
  if (stage > 0) forceSeen = true;
  if (pad.play) {
    for (const f of fingers.values()) if (f.type === 'pad') applyFinger(f);
  } else {
    // with the cursor, pressure works like it does in Safari
    let f = null;
    for (const x of fingers.values()) if (x.type === 'mouse') f = x;
    if (f && stage > 0) applyForce(f, stage + pressure, 1, 2);
  }
};

// the keyboard plays the tongues: number row for the back rail, Q row for the front rail
function onKeyDown(e) {
  if (e.key === 'Escape') { if (started && !$('start').hidden) closeHelp(); else closeSheets(); return; }
  if (!started || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
  if (APP && e.key === 'Tab' && !overlayOpen()) { e.preventDefault(); setPadPlay(!pad.play); return; }
  if (overlayOpen()) return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
  const hit = KEYMAP[e.code];
  if (!hit) return;
  e.preventDefault();
  resumeAudio();
  if (!audio) return;
  const id = 'key:' + e.code;
  if (fingers.has(id)) return;
  const t = L.R.manuals[hit.m].tongues[hit.j];
  pushFinger(newFinger(id, 'key', hit.m, 'tongue', hit.j, t.u, 0.65));
}

function onKeyUp(e) {
  const id = 'key:' + e.code;
  if (fingers.has(id)) { e.preventDefault(); releaseFinger(id); }
}

function onDouble(e) {
  const { x, y } = localXY(e);
  const k = hitKnob(x, y);
  if (k && !knobLocked(k)) setKnob(k, k.def);
}

function onWheel(e) {
  const { x, y } = localXY(e);
  const k = hitKnob(x, y);
  if (!k || knobLocked(k) || !started) return;
  e.preventDefault();
  if (k.steps) {
    k.wheel = (k.wheel || 0) + e.deltaY;
    if (Math.abs(k.wheel) > 40) { setKnob(k, k.value - Math.sign(k.wheel) / (k.steps - 1)); k.wheel = 0; }
  } else setKnob(k, k.value - e.deltaY * 0.0015);
}

// A swoop is a fast run of at least swoopSemis that reaches the upper part of the rail.
function trackSwoop(f, now) {
  const U = CONFIG.unlock;
  f.hist.push({ t: now, s: f.semi });
  while (f.hist.length > 1 && now - f.hist[0].t > U.swoopMs) f.hist.shift();
  if (K.mixtur.value < U.mixturOn || !unlocked.has('sala') || unlocked.has('birds')) return;
  let lo = Infinity, hi = -Infinity;
  for (const p of f.hist) { lo = Math.min(lo, p.s); hi = Math.max(hi, p.s); }
  if (hi - lo >= U.swoopSemis && hi >= CONFIG.semitones * U.swoopHigh && now - lastSwoopAt > 150) {
    swoops++;
    lastSwoopAt = now;
    swoopFlash = 1;
    f.hist = [{ t: now, s: f.semi }];
    if (swoops >= U.swoops) unlock('birds');
  }
}

/* ================= cards ================= */

let toastQueue = [], toastId = null, toastTimer = null;

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
  toastTimer = setTimeout(nextToast, toastQueue.length ? 2200 : 4500);
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
  for (const c of CARDS) {
    if (unlocked.has(c.id)) continue;
    if (c.id === 'birds' && !unlocked.has('sala')) continue;
    return c.hint;
  }
  return unlocked.size === CARDS.length ? 'All four cards found. Open the Archive to read them.' : null;
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
    hint.textContent = open ? c.eyebrow : (c.id === 'birds' && !unlocked.has('sala') ? 'Unlock card 03 first.' : c.hint);
    mid.append(t, hint);
    li.append(num, mid);
    if (open) {
      const b = document.createElement('button');
      b.className = 'read';
      b.type = 'button';
      b.textContent = 'Read';
      b.addEventListener('click', () => openCard(c.id));
      li.append(b);
    }
    list.append(li);
  });
}

function openArchive() {
  releaseAll();
  renderArchive();
  $('archive').hidden = false;
  $('archive-close').focus();
  syncPadMode();
}

function openCard(id) {
  const c = CARD_BY_ID[id];
  if (!c || !unlocked.has(id)) return;
  releaseAll();
  clearTimeout(toastTimer);
  $('toast').hidden = true;
  if (toastId === id) toastId = null;
  $('card-eyebrow').textContent = c.eyebrow;
  $('card-title').textContent = c.title;
  const fig = $('card-fig'), img = $('card-img'), credit = $('card-credit');
  if (c.image) {
    // no internet, or a page that blocks outside images: the card reads fine without its photo
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
  syncPadMode();
}

function closeSheets() {
  const cardWasOpen = !$('card').hidden;
  $('card').hidden = true;
  $('archive').hidden = true;
  if (cardWasOpen && !toastId && toastQueue.length) nextToast();
  syncPadMode();
}

function relock() {
  unlocked.clear();
  soundTime = 0; swoops = 0;
  setKnob(K.mixtur, 0);
  toastQueue = []; toastId = null; clearTimeout(toastTimer); $('toast').hidden = true;
  renderArchive();
}

/* ================= start and buttons ================= */

// The start screen's button starts the room the first time, and goes back to the wire after that.
// "How to play" in the corner brings the screen back.
function startRoom() {
  if (MODE.pressure === 'tilt') askMotion();   // has to run inside the tap on iPhone
  if (!audio) audio = buildAudio();
  if (audio) { audio.ctx.resume(); keepIOSAudioOn(); }
  if (!started) {
    started = true;
    $('start-btn').textContent = 'Back to the wire';
    $('hud').hidden = false;
    windowResized();                             // the room turns sideways now
  }
  $('start').hidden = true;
  checkNarrow();
  syncPadMode();
}

function openHelp() {
  releaseAll();
  fillStart();
  $('start').hidden = false;
  $('start').scrollTop = 0;
  $('start-btn').focus();
  syncPadMode();
}

function closeHelp() {
  $('start').hidden = true;
  syncPadMode();
}

// The start screen's photo of the real instrument (window.ROOM in cards.js). It fades in once it has
// loaded. With no internet, or on a page that blocks outside images, the figure goes and the layout falls back.
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
  $('start-btn').addEventListener('click', startRoom);
  $('laptop-btn').addEventListener('click', startRoom);
  $('help-btn').addEventListener('click', openHelp);
  $('pad-btn').addEventListener('click', () => setPadPlay(!pad.play));
  $('pad-btn').hidden = !APP;
  $('archive-btn').addEventListener('click', openArchive);
  $('archive-close').addEventListener('click', closeSheets);
  $('card-close').addEventListener('click', closeSheets);
  $('toast-read').addEventListener('click', () => { if (toastId) openCard(toastId); });
  $('relock').addEventListener('click', relock);
}

/* test hook, only active when a test page defines window.__TRAUT_TEST__ */
if (window.__TRAUT_TEST__) {
  window.__TRAUT_TEST__.api = {
    unlocked, fingers, K, manualState, pad,
    device: () => KIND,
    turned: () => turned,
    mode: () => MODE.pressure,
    keys: () => MODE.keys,
    lap: () => tiltPressure(),
    shares: () => [0, 1].map(m => { const f = topFinger(m); return f ? +(tiltShare.get(f.id) || 0).toFixed(3) : null; }),
    levers: () => pressPoints().map(p => ({ id: p.f ? String(p.f.id) : 'knob', lv: p.lv })),
    axes: () => ({ base: tiltAxes.base, fix: tiltAxes.fix, vec: lapVec.slice() }),
    refLever: () => refLever(),
    tipScale: () => tipScale(),
    loud: () => [0, 1].map(m => { const f = topFinger(m); return f ? +loudness(f).toFixed(3) : 0; }),
    voicesOn: () => audio ? audio.voices.map(v => v.on) : [],
    state: () => ({ started, soundTime, swoops, level, druck, pegel, label: pressureLabel(), motionOk: motion.ok, motionStatus: motion.status, ctxState: audio ? audio.ctx.state : null, layout: L }),
    tops: () => [0, 1].map(m => { const f = topFinger(m); return f ? { id: String(f.id), semi: f.semi, a: +f.a.toFixed(3), pv: +f.pv.toFixed(3), vc: f.vc } : null; }),
    toScreen: (x, y) => toScreen(x, y)
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
