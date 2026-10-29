/*
  ECHOES YOU CAN PLAY: ALL THREE ROOMS
  Jesse Xu, DIGF-5008. p5.js 1.11.13.

  The hall: pick a room to go in. Every room has Exit in its corner (and "All rooms" on its start screen),
  which comes back here. Each room is still its own page with its own start tap, so the camera, motion
  and sound work exactly as they do on their own.

  Where the rooms live (CONFIG.rooms):
  - In folders next to this page: theremin/, trautonium/ and prototype-5/. This is how the zip is laid out,
    and how it goes on GitHub Pages. Nothing to edit.
  - Or as three separate p5 editor sketches: paste each room's Fullscreen link instead, and paste this
    page's Fullscreen link into CONFIG.hub at the top of each room's sketch.js, so Exit knows the way back.
*/

const CONFIG = {
  link: '',   // this page's address, for the QR code on a laptop. Empty: the page reads its own
  rooms: {
    theremin: 'theremin/index.html',
    trautonium: 'trautonium/index.html',
    prototype5: 'prototype-5/index.html'
  }
};

const $ = id => document.getElementById(id);

// Open a room. A room in a folder next to this page is told the way back as ../index.html. A room on
// its own link is told this page's address, and opened in the whole window, not inside the editor's frame.
function enter(id) {
  const link = CONFIG.rooms[id];
  if (!link) return;
  const relative = !/^https?:\/\//.test(link);
  const back = relative ? '../index.html' : selfLink();
  const url = link + (link.includes('?') ? '&' : '?') + 'hub=' + encodeURIComponent(back);
  if (relative) { location.href = url; return; }
  try { window.top.location.href = url; } catch (e) { location.href = url; }
}

function selfLink() {
  if (CONFIG.link) return CONFIG.link;
  try { if (window.top === window.self && /^https?:/.test(location.href)) return location.href.split('?')[0]; } catch (e) {}
  return location.href.split('?')[0];
}

function drawQR() {
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  const link = CONFIG.link || (/^https?:/.test(location.href) && window.top === window.self ? location.href.split('?')[0] : '');
  if (coarse || !link || typeof window.qrcode !== 'function') return;
  try {
    const q = window.qrcode(0, 'M');
    q.addData(link); q.make();
    $('qr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    $('share').hidden = false;
  } catch (e) {}
}

document.querySelectorAll('.enter').forEach(b => b.addEventListener('click', () => enter(b.dataset.room)));
drawQR();

/* ================= p5: three slow waves behind the cards, one per room ================= */

const WAVES = [
  { col: [124, 203, 255], y: 0.3, f: 1.4, sp: 0.35, shape: 'sine' },    // theremin: a pure tone
  { col: [255, 106, 44], y: 0.55, f: 2.2, sp: 0.25, shape: 'saw' },     // trautonium: a sharp edged wave
  { col: [182, 242, 74], y: 0.8, f: 3, sp: 0.5, shape: 'eeg' }          // prototype 5: a noisy brain wave
];
let still = false;

function setup() {
  const c = createCanvas(windowWidth, windowHeight);
  c.parent('stage');
  pixelDensity(1);
  frameRate(30);
  still = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

function draw() {
  clear();
  const t = still ? 0 : millis() / 1000, amp = Math.min(height * 0.06, 50);
  noFill();
  strokeWeight(1.6);
  WAVES.forEach((w, k) => {
    stroke(w.col[0], w.col[1], w.col[2], 46);
    beginShape();
    for (let x = 0; x <= width; x += 6) {
      const ph = (x / width) * w.f * TWO_PI - t * w.sp * TWO_PI;
      let v;
      if (w.shape === 'sine') v = Math.sin(ph);
      else if (w.shape === 'saw') v = ((ph / TWO_PI) % 1 + 1) % 1 * 2 - 1;
      else v = Math.sin(ph) * 0.5 + (noise(x * 0.02, t * 0.8 + k) - 0.5) * 1.6;
      vertex(x, height * w.y + v * amp);
    }
    endShape();
  });
}
