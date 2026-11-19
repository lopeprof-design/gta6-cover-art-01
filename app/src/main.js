// Neon Coast Cover Studio — wires the editor: photos, panels, look, export.
// A `?shot=` query instead sets up one fixed scene for a screenshot.

import { SIZES, drawCover, freshPanels, panelAt } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('preview');
const status = document.getElementById('status');

/** Everything the cover is drawn from. */
const state = {
  layout: 'split',
  grade: 'sunset',
  caption: 'Neon Coast',
  kicker: 'A Sunset Story',
  captionSize: 100,
  captionPos: 'auto',
  photos: [null, null, null],
  panels: freshPanels(),
  selected: 0,
};

function redraw() {
  const ctx = canvas.getContext('2d');
  drawCover(ctx, canvas.width, canvas.height, state);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function markSlot(i, name) {
  const el = document.querySelector(`[data-slot-state="${i}"]`);
  if (!el) return;
  el.textContent = name ? `loaded: ${name}` : 'empty';
  el.classList.toggle('loaded', Boolean(name));
}

async function setPhoto(i, url, name) {
  try {
    state.photos[i] = await loadImage(url);
    markSlot(i, name ?? url.split('/').pop());
    redraw();
  } catch {
    status.textContent = `Could not load that photo. Try another file.`;
  }
}

function selectPanel(i) {
  state.selected = i;
  document.querySelectorAll('#panel-pick button').forEach((b) => {
    b.classList.toggle('picked', Number(b.dataset.panel) === i);
  });
  const place = state.panels[i];
  document.getElementById('panel-photo').value = String(place.slot);
  document.getElementById('panel-zoom').value = String(Math.round(place.zoom * 100));
  document.getElementById('panel-ox').value = String(place.ox);
  document.getElementById('panel-oy').value = String(place.oy);
  syncPanelLabels();
}

function syncPanelLabels() {
  const place = state.panels[state.selected];
  document.getElementById('zoom-val').textContent = `${Math.round(place.zoom * 100)}%`;
  document.getElementById('ox-val').textContent = String(place.ox);
  document.getElementById('oy-val').textContent = String(place.oy);
}

function setSize(name) {
  const [w, h] = SIZES[name];
  canvas.width = w;
  canvas.height = h;
  redraw();
}

// --- Photo slots -----------------------------------------------------------
document.querySelectorAll('[data-photo-input]').forEach((input) => {
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    await setPhoto(Number(input.dataset.photoInput), URL.createObjectURL(file), file.name);
  });
});

document.getElementById('sample-pier').addEventListener('click', async () => {
  await setPhoto(0, 'samples/pier.jpg', 'pier sample');
  await setPhoto(1, 'samples/boulevard.jpg', 'boulevard sample');
  status.textContent = 'Sample photos loaded — pier in Photo 1, boulevard in Photo 2.';
});
document.getElementById('sample-boulevard').addEventListener('click', async () => {
  await setPhoto(0, 'samples/boulevard.jpg', 'boulevard sample');
  await setPhoto(1, 'samples/pier.jpg', 'pier sample');
  status.textContent = 'Sample photos loaded — boulevard in Photo 1, pier in Photo 2.';
});

// --- Panel picking and adjustment ------------------------------------------
document.querySelectorAll('#panel-pick button').forEach((b) => {
  b.addEventListener('click', () => selectPanel(Number(b.dataset.panel)));
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const ux = (e.clientX - rect.left) / rect.width;
  const uy = (e.clientY - rect.top) / rect.height;
  const hit = panelAt(state.layout, ux, uy);
  if (hit >= 0) selectPanel(hit);
});

document.getElementById('panel-photo').addEventListener('change', (e) => {
  state.panels[state.selected].slot = Number(e.target.value);
  redraw();
});
document.getElementById('panel-zoom').addEventListener('input', (e) => {
  state.panels[state.selected].zoom = Number(e.target.value) / 100;
  syncPanelLabels();
  redraw();
});
document.getElementById('panel-ox').addEventListener('input', (e) => {
  state.panels[state.selected].ox = Number(e.target.value);
  syncPanelLabels();
  redraw();
});
document.getElementById('panel-oy').addEventListener('input', (e) => {
  state.panels[state.selected].oy = Number(e.target.value);
  syncPanelLabels();
  redraw();
});

// --- Look ------------------------------------------------------------------
document.querySelectorAll('input[name="layout"]').forEach((r) => {
  r.addEventListener('change', () => {
    state.layout = r.value;
    redraw();
  });
});
document.querySelectorAll('input[name="grade"]').forEach((r) => {
  r.addEventListener('change', () => {
    state.grade = r.value;
    redraw();
  });
});
document.getElementById('caption').addEventListener('input', (e) => {
  state.caption = e.target.value;
  redraw();
});
document.getElementById('kicker').addEventListener('input', (e) => {
  state.kicker = e.target.value;
  redraw();
});
document.getElementById('caption-size').addEventListener('input', (e) => {
  state.captionSize = Number(e.target.value);
  document.getElementById('cap-size-val').textContent = `${state.captionSize}%`;
  redraw();
});
document.getElementById('caption-pos').addEventListener('change', (e) => {
  state.captionPos = e.target.value;
  redraw();
});

// --- Export ----------------------------------------------------------------
/** Renders the cover at an exact post size and downloads it as a PNG. */
export function exportCover(sizeName) {
  const [w, h] = SIZES[sizeName];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off.getContext('2d'), w, h, state);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-${w}x${h}.png`;
      a.click();
      status.textContent = `Saved neon-coast-${w}x${h}.png (${blob ? Math.round(blob.size / 1024) : '?'} KiB).`;
      resolve(blob);
    }, 'image/png');
  });
}

document.querySelectorAll('[data-export]').forEach((b) => {
  b.addEventListener('click', () => exportCover(b.dataset.export));
});

// --- Start -----------------------------------------------------------------
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { state, setPhoto, setSize, selectPanel, redraw });
} else {
  setSize('square');
  selectPanel(0);
}
