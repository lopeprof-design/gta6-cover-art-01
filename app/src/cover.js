// Neon Coast cover renderer: draws the multi-panel poster onto any canvas.
// Everything is drawn with the 2D context — no fonts, images or libraries
// beyond the photos the user loads and the two bundled samples.

/** The three post sizes the app exports, in pixels. */
export const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

/** Colour grades: sky ramp, sun disc, neon accent, deep ink, paper gutters. */
export const GRADES = {
  sunset: {
    sky: ['#ff9a3d', '#ff5e7a', '#8a2f8f'],
    sun: '#ffd76a',
    neon: '#37f4ff',
    neon2: '#ff5e7a',
    ink: '#1c0b2e',
    paper: '#fff3e2',
  },
  neon: {
    sky: ['#1b0f4b', '#5b1a8a', '#c62b7e'],
    sun: '#ff7ad9',
    neon: '#37f4ff',
    neon2: '#ffe14d',
    ink: '#0d0620',
    paper: '#efe6ff',
  },
  dusk: {
    sky: ['#ff7a4d', '#b83a6e', '#3d1a5e'],
    sun: '#ffb347',
    neon: '#ff8ad8',
    neon2: '#37f4ff',
    ink: '#200a33',
    paper: '#ffe9d6',
  },
};

/**
 * Panel layouts, in unit coordinates (0..1 of the cover). Each panel is a
 * polygon; the gaps between them read as comic-book gutters. `sun` is where
 * the sunset disc sits inside the hero panel, `palm` where a silhouette
 * palm leans, `captionAtTop` puts the lettering over the hero instead of
 * under it.
 */
export const LAYOUTS = {
  split: {
    panels: [
      [[0, 0], [0.60, 0], [0.46, 1], [0, 1]],
      [[0.62, 0], [1, 0], [1, 0.46], [0.48, 0.46]],
      [[0.48, 0.48], [1, 0.48], [1, 1], [0.46, 1]],
    ],
    sun: [0.11, 0.09],
    palm: [0.55, 0.16],
    captionAtTop: false,
  },
  triple: {
    panels: [
      [[0, 0], [0.38, 0], [0.30, 1], [0, 1]],
      [[0.40, 0], [0.70, 0], [0.62, 1], [0.32, 1]],
      [[0.72, 0], [1, 0], [1, 1], [0.64, 1]],
    ],
    sun: [0.08, 0.09],
    palm: [0.07, 0.92],
    captionAtTop: false,
  },
  stack: {
    panels: [
      [[0, 0], [1, 0], [1, 0.58], [0, 0.68]],
      [[0, 0.70], [0.50, 0.60], [0.50, 1], [0, 1]],
      [[0.52, 0.60], [1, 0.60], [1, 1], [0.52, 1]],
    ],
    sun: [0.90, 0.12],
    palm: [0.07, 0.62],
    captionAtTop: false,
  },
};

/** A panel's photo placement: which photo slot it shows, zoom and shift. */
export function freshPanels() {
  return [
    { slot: 0, zoom: 1, ox: 0, oy: 0 },
    { slot: 1, zoom: 1, ox: 0, oy: 0 },
    { slot: 2, zoom: 1, ox: 0, oy: 0 },
  ];
}

function polygonPath(ctx, points, w, h) {
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * w, y * h);
    else ctx.lineTo(x * w, y * h);
  });
  ctx.closePath();
}

function panelBox(points, w, h) {
  const xs = points.map(([x]) => x * w);
  const ys = points.map(([, y]) => y * h);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  return { x0, y0, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/** Point-in-polygon test, for clicking a panel on the preview. */
export function panelAt(layoutName, ux, uy) {
  const panels = LAYOUTS[layoutName].panels;
  for (let i = panels.length - 1; i >= 0; i--) {
    const pts = panels[i];
    let inside = false;
    for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
      const [ax, ay] = pts[a];
      const [bx, by] = pts[b];
      if (ay > uy !== by > uy && ux < ((bx - ax) * (uy - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}

/** Split a caption into at most two balanced lines. */
function wrapCaption(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words;
  if (words.join(' ').length <= 12) return [words.join(' ')];
  let best = [words.join(' ')];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  return best;
}

/** A stylised palm silhouette: curved trunk, thick arcing fronds, coconuts. */
function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk, leaning slightly.
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(4, -55, 20, -95);
  ctx.stroke();
  // Fronds: thick arcs drooping from the crown, [tipX, tipY, ctrlX, ctrlY].
  ctx.lineWidth = 9;
  const fronds = [
    [-72, -96, -48, -128],
    [-64, -126, -28, -150],
    [-28, -146, 4, -158],
    [18, -148, 44, -138],
    [62, -128, 66, -104],
    [78, -100, 66, -80],
    [-70, -76, -52, -96],
  ];
  for (const [tx, ty, cx, cy] of fronds) {
    ctx.beginPath();
    ctx.moveTo(20, -95);
    ctx.quadraticCurveTo(cx, cy, tx, ty);
    ctx.stroke();
  }
  // A couple of coconuts under the crown.
  ctx.beginPath();
  ctx.arc(14, -88, 5, 0, Math.PI * 2);
  ctx.arc(27, -84, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Halftone dots across a band — the print-poster texture of the grade. */
function drawHalftone(ctx, x0, y0, w, h, color) {
  const step = Math.max(10, w / 46);
  ctx.save();
  ctx.fillStyle = color;
  for (let row = 0; row * step < h; row++) {
    for (let col = 0; col * step < w; col++) {
      const r = (0.6 + 2.6 * (row * step / h)) * (step / 9);
      if (r <= 0.4) continue;
      ctx.beginPath();
      ctx.arc(x0 + col * step + (row % 2 ? step / 2 : 0), y0 + row * step, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The sunset wash over one panel: warm top, magenta foot, vignette. */
function gradePanel(ctx, box, grade) {
  const wash = ctx.createLinearGradient(box.x0, box.y0, box.x0, box.y0 + box.h);
  wash.addColorStop(0, hexA(grade.sky[0], 0.20));
  wash.addColorStop(0.55, hexA(grade.sky[1], 0.10));
  wash.addColorStop(1, hexA(grade.sky[2], 0.38));
  ctx.fillStyle = wash;
  ctx.fillRect(box.x0, box.y0, box.w, box.h);
}

function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawEmptyPanel(ctx, box, grade, label) {
  const g = ctx.createLinearGradient(box.x0, box.y0, box.x0, box.y0 + box.h);
  g.addColorStop(0, grade.sky[0]);
  g.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(box.x0, box.y0, box.w, box.h);
  ctx.save();
  ctx.strokeStyle = hexA('#ffffff', 0.7);
  ctx.lineWidth = Math.max(2, box.w * 0.008);
  ctx.setLineDash([box.w * 0.03, box.w * 0.02]);
  ctx.strokeRect(box.x0 + box.w * 0.08, box.y0 + box.h * 0.08, box.w * 0.84, box.h * 0.84);
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.max(14, box.w * 0.055)}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(label, box.cx, box.cy + box.h * 0.02);
}

/**
 * Draws the whole cover.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w canvas width, @param {number} h canvas height
 * @param {object} state { layout, grade, caption, kicker, captionSize, captionPos,
 *   photos: [img|null x3], panels: [{slot, zoom, ox, oy} x3] }
 */
export function drawCover(ctx, w, h, state) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.split;

  // Paper gutters show through between the panels.
  ctx.fillStyle = grade.paper;
  ctx.fillRect(0, 0, w, h);

  layout.panels.forEach((points, i) => {
    const box = panelBox(points, w, h);
    const place = state.panels[i];
    const img = state.photos[place.slot];
    ctx.save();
    polygonPath(ctx, points, w, h);
    ctx.clip();
    if (img) {
      const s = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * place.zoom;
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      const cx = box.cx + (place.ox / 100) * box.w * 0.45;
      const cy = box.cy + (place.oy / 100) * box.h * 0.45;
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    } else {
      drawEmptyPanel(ctx, box, grade, `PANEL ${i + 1} — ADD A PHOTO`);
    }
    gradePanel(ctx, box, grade);
    // Halftone band across the top of the hero panel.
    if (i === 0) {
      ctx.save();
      ctx.globalAlpha = 0.16;
      drawHalftone(ctx, box.x0, box.y0 + box.h * 0.04, box.w, box.h * 0.24, grade.ink);
      ctx.restore();
    }
    ctx.restore();

    // Neon rim around each panel.
    ctx.save();
    polygonPath(ctx, points, w, h);
    ctx.shadowColor = grade.neon;
    ctx.shadowBlur = Math.max(6, w * 0.012);
    ctx.strokeStyle = grade.neon;
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.stroke();
    ctx.restore();
  });

  // Sunset disc, glowing over the hero panel.
  const [sx, sy] = layout.sun;
  const sunR = w * 0.085;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const sun = ctx.createRadialGradient(sx * w, sy * h, sunR * 0.1, sx * w, sy * h, sunR);
  sun.addColorStop(0, hexA(grade.sun, 0.95));
  sun.addColorStop(0.55, hexA(grade.sun, 0.45));
  sun.addColorStop(1, hexA(grade.sun, 0));
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sx * w, sy * h, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Palm silhouette leaning into the hero panel, drawn before the lettering.
  // Sized from the cover's short side so it never runs off the top.
  const [px, py] = layout.palm;
  drawPalm(ctx, px * w, py * h, Math.min(w, h) * 0.0011, hexA(grade.ink, 0.55));

  drawCaption(ctx, w, h, state, grade, layout);
}

/** Bold poster lettering: kicker line, then the caption in heavy capitals. */
function drawCaption(ctx, w, h, state, grade, layout) {
  const text = (state.caption || '').trim().toUpperCase();
  const kicker = (state.kicker || '').trim().toUpperCase();
  if (!text && !kicker) return;

  const atTop = state.captionPos === 'top' || (state.captionPos === 'auto' && layout.captionAtTop);
  const anchorY = atTop ? h * 0.13 : h * 0.90;
  const anchorX = w * 0.055;
  const maxW = w * 0.88;
  const sizeMul = (state.captionSize ?? 100) / 100;

  const lines = wrapCaption(text || 'NEON COAST');
  let size = Math.min(w * 0.115, h * 0.115) * sizeMul;
  const heavy = `"Arial Black", "Archivo Black", "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const setFont = (s) => { ctx.font = `900 ${s}px ${heavy}`; };
  setFont(size);
  const longest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  while (longest > maxW && size > 16) {
    size -= 3;
    setFont(size);
  }

  ctx.save();
  ctx.translate(anchorX, anchorY);
  ctx.rotate(-0.028);

  // Kicker: small, tracked-out, neon.
  if (kicker) {
    const kSize = Math.max(14, size * 0.22);
    ctx.font = `800 ${kSize}px "Segoe UI", Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(3, kSize * 0.28)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = grade.neon;
    ctx.shadowColor = grade.neon;
    ctx.shadowBlur = kSize * 0.7;
    ctx.fillText(kicker, 0, atTop ? -lines.length * size * 1.06 - kSize * 0.4 : -lines.length * size * 1.06 - kSize * 0.4);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
    ctx.shadowBlur = 0;
  }

  // Caption lines: ink outline, white fill, neon glow.
  setFont(size);
  const lineH = size * 1.04;
  lines.forEach((line, i) => {
    const y = -((lines.length - 1 - i) * lineH);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = grade.ink;
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.shadowColor = grade.neon2;
    ctx.shadowBlur = size * 0.22;
    ctx.shadowOffsetX = size * 0.03;
    ctx.shadowOffsetY = size * 0.03;
    ctx.strokeText(line, 0, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, 0, y);
  });
  ctx.restore();
}
