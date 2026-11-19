// Fixed scenes for screenshots, driven by the page's query string:
//   ?shot=cover  — the cover alone, edge to edge (the exported art itself)
//   ?shot=editor — the editor with sample photos loaded
//   ?shot=export — renders one export offscreen and reports its size in the DOM
// Params: photo (sample name), caption, kicker, layout, grade, size.
// window.__shotReady is set once the scene has painted.

import { SIZES } from './cover.js';

const SAMPLES = { pier: 'samples/pier.jpg', boulevard: 'samples/boulevard.jpg' };

function applyParams(query, app) {
  const { state } = app;
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('caption') !== null) {
    state.caption = query.get('caption');
    const cap = document.getElementById('caption');
    if (cap) cap.value = state.caption;
  }
  if (query.get('kicker') !== null) {
    state.kicker = query.get('kicker');
    const kick = document.getElementById('kicker');
    if (kick) kick.value = state.kicker;
  }
  if (query.get('size') && SIZES[query.get('size')]) app.setSize(query.get('size'));
}

function ready() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}

export async function runShot(shot, query, app) {
  const { state } = app;
  applyParams(query, app);

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const photo = query.get('photo') ?? 'pier';
    const second = query.get('photo2');
    await app.setPhoto(0, SAMPLES[photo] ?? SAMPLES.pier, `${photo} sample`);
    if (second) {
      await app.setPhoto(1, SAMPLES[second] ?? SAMPLES.boulevard, `${second} sample`);
      // Fill the third panel with the second sample too, zoomed in, so no
      // panel is left empty in a cover shot.
      await app.setPhoto(2, SAMPLES[second] ?? SAMPLES.boulevard, `${second} sample`);
      state.panels[2].zoom = 1.6;
      state.panels[2].oy = -18;
    }
    app.redraw();
    ready();
    return;
  }

  if (shot === 'export') {
    const sizeName = query.get('size') ?? 'wide';
    const [w, h] = SIZES[sizeName];
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const { drawCover } = await import('./cover.js');
    await app.setPhoto(0, SAMPLES[query.get('photo') ?? 'pier'], 'pier sample');
    await app.setPhoto(1, SAMPLES.boulevard, 'boulevard sample');
    drawCover(off.getContext('2d'), w, h, state);
    const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
    const info = document.getElementById('shot-info');
    info.hidden = false;
    info.textContent = `export-ok ${w}x${h} ${blob ? blob.size : 0} bytes`;
    window.__shotReady = true;
    return;
  }

  // editor (default shot): the workbench with photos already loaded.
  await app.setPhoto(0, SAMPLES[query.get('photo') ?? 'boulevard'], 'boulevard sample');
  await app.setPhoto(1, SAMPLES.pier, 'pier sample');
  app.selectPanel(0);
  app.redraw();
  ready();
}
