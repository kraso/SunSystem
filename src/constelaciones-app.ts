import constInfo from './data/constellation-info.json';
import constellationsData from './data/constellations.json';
import starsData from './data/stars.json';
import type { ConstellationData, StarData } from './core/types';

const rawInfo = constInfo as unknown as Record<string, {
  slug?: string;
  stars: { name: string; mag: number; bv: number | null; ra: number; dec: number }[];
  objects: { id: string; ra: number; dec: number }[];
}>;
const objects = (constInfo as unknown as { __objects__: {
  id: string; ngc: string; common: string; type: string; typeName: string;
  mag: number | null; ra: number; dec: number; constellation: string | null;
}[] }).__objects__;

const consts = constellationsData as ConstellationData[];
const stars = starsData as StarData[];
const constNames = consts.map((c) => c.name).sort((a, b) => a.localeCompare(b));

// Estrellas del catálogo (todas las "conocidas" del catálogo Hipparcos local)
interface StarEntry {
  hip: number; name: string; mag: number; ra: number; dec: number;
  con: string | null; bv: number | null;
}

// Constelación por bounding box de la figura (para estrellas sin 'con')
function constellationOf(ra: number, dec: number): string | null {
  for (const c of consts) {
    const ras: number[] = [];
    const decs: number[] = [];
    for (const ln of c.lines) {
      for (const p of ln) { ras.push(p[0]); decs.push(p[1]); }
    }
    if (!ras.length) continue;
    const rmin = Math.min(...ras) - 3, rmax = Math.max(...ras) + 3;
    const dmin = Math.min(...decs) - 3, dmax = Math.max(...decs) + 3;
    if (rmin <= ra && ra <= rmax && dmin <= dec && dec <= dmax) return c.name;
  }
  return null;
}

const starList: StarEntry[] = stars.map((s) => {
  const con0 = (s as unknown as { con?: string }).con ?? null;
  const con = con0 ?? constellationOf(s.ra, s.dec);
  return {
    hip: s.hip,
    name: s.name ?? '',
    mag: s.mag,
    ra: s.ra,
    dec: s.dec,
    con,
    bv: s.bv ? parseFloat(s.bv) : null,
  };
});

// Lista derecha: estrellas + objetos (no constelaciones)
type RightItem =
  | { kind: 'star'; label: string; hip: number }
  | { kind: 'obj'; label: string; id: string };
const rightItems: RightItem[] = [
  ...starList.map((s): RightItem => ({
    kind: 'star',
    label: s.name ? s.name : `HIP ${s.hip}${s.con ? ' (' + s.con + ')' : ''}`,
    hip: s.hip,
  })),
  ...objects.map((o): RightItem => ({ kind: 'obj', label: o.id, id: o.id })),
];
const rightLabels = rightItems.map((r) => r.label).sort((a, b) => a.localeCompare(b));

// ─── DOM ────────────────────────────────────────────────────────────
const searchInput = document.getElementById('const-search') as HTMLInputElement;
const suggest = document.getElementById('const-suggest') as HTMLDivElement;
const empty = document.getElementById('const-card-empty') as HTMLDivElement;
const content = document.getElementById('const-card-content') as HTMLDivElement;
const constListEl = document.getElementById('const-list') as HTMLDivElement;
const objListEl = document.getElementById('obj-list') as HTMLDivElement;

let constSortAsc = true;
let objSortAsc = true;

// ─── Helpers de formato ─────────────────────────────────────────────
function fmtRA(raDeg: number): string {
  let deg = raDeg % 360;
  if (deg < 0) deg += 360;
  const hours = deg / 15;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.floor((((hours - h) * 60) - m) * 60);
  return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}
function fmtDec(decDeg: number): string {
  const sign = decDeg >= 0 ? '+' : '−';
  const a = Math.abs(decDeg);
  const d = Math.floor(a);
  const m = Math.floor((a - d) * 60);
  const s = Math.floor((((a - d) * 60) - m) * 60);
  return `${sign}${d}° ${m.toString().padStart(2, '0')}′ ${s.toString().padStart(2, '0')}″`;
}
function deepSkyColor(type?: string): string {
  const t = (type || '').toLowerCase();
  if (['s', 's0', 'e', 'i', 'irr', 'sab', 'sb', 'sb0', 'sbcd'].includes(t)) return '#9fc4ff';
  if (['neb', 'snr', 'hii', 'rnes', 'dark', 'emneb'].includes(t)) return '#ff9b7a';
  if (t === 'gc') return '#88ffcc';
  if (t === 'oc') return '#d6ff8c';
  if (t === 'pn') return '#ff8ce0';
  return '#88ffcc';
}
function spectralByBv(bv: number | null): string {
  if (bv == null) return '—';
  if (bv < 0) return 'O/B (azul, muy caliente)';
  if (bv < 0.3) return 'A (blanca-azulada)';
  if (bv < 0.6) return 'F (blanca)';
  if (bv < 0.8) return 'G (amarilla, como el Sol)';
  if (bv < 1.4) return 'K (naranja)';
  return 'M (roja, fría)';
}

// ─── Listas laterales ───────────────────────────────────────────────
function renderConstList(): void {
  const arr = [...constNames].sort((a, b) => constSortAsc ? a.localeCompare(b) : b.localeCompare(a));
  constListEl.innerHTML = '';
  for (const n of arr) {
    const el = document.createElement('div');
    el.className = 'side-item';
    el.textContent = n;
    el.addEventListener('click', () => showConstellation(n));
    constListEl.appendChild(el);
  }
}
function renderObjList(): void {
  const arr = [...rightLabels].sort((a, b) => objSortAsc ? a.localeCompare(b) : b.localeCompare(a));
  const frag = document.createDocumentFragment();
  for (const label of arr) {
    const item = rightItems.find((r) => r.label === label)!;
    const el = document.createElement('div');
    el.className = 'side-item ' + (item.kind === 'obj' ? 'side-obj' : 'side-star');
    el.textContent = label;
    el.addEventListener('click', () => {
      if (item.kind === 'star') showStar(item.hip);
      else showObject(item.id);
    });
    frag.appendChild(el);
  }
  objListEl.innerHTML = '';
  objListEl.appendChild(frag);
}
document.querySelectorAll('.col-sort').forEach((btn) => {
  btn.addEventListener('click', () => {
    const col = (btn as HTMLElement).dataset.col;
    if (col === 'const') { constSortAsc = !constSortAsc; renderConstList(); }
    else { objSortAsc = !objSortAsc; renderObjList(); }
  });
});

// ─── Manipulación de la carta (pan / zoom / rotación libre, por carta) ──
interface ChartTransform { x: number; y: number; zoom: number; rot: number; }
const TF_DEFAULT: ChartTransform = { x: 0, y: 0, zoom: 1, rot: 0 };
const TF_LIMITS = { zoomMin: 0.4, zoomMax: 5, rotMax: 360 };

function tfKey(name: string): string {
  return 'sunconst:tf:' + name;
}
function loadChartTf(name: string): ChartTransform {
  try {
    const raw = localStorage.getItem(tfKey(name));
    if (raw) {
      const t = JSON.parse(raw) as Partial<ChartTransform>;
      return {
        x: t.x ?? 0,
        y: t.y ?? 0,
        zoom: Math.max(TF_LIMITS.zoomMin, Math.min(TF_LIMITS.zoomMax, t.zoom ?? 1)),
        rot: ((t.rot ?? 0) % 360 + 360) % 360,
      };
    }
  } catch { /* ignore */ }
  return { ...TF_DEFAULT };
}
let tfSaveTimer: number | undefined;
function saveChartTf(name: string, tf: ChartTransform): void {
  if (tfSaveTimer) window.clearTimeout(tfSaveTimer);
  tfSaveTimer = window.setTimeout(() => {
    try { localStorage.setItem(tfKey(name), JSON.stringify(tf)); } catch { /* ignore */ }
  }, 250);
}
function applyChartTf(wrap: HTMLElement, tf: ChartTransform): void {
  wrap.style.transform =
    `translate(${tf.x}px, ${tf.y}px) rotate(${tf.rot}deg) scale(${tf.zoom})`;
}

// Une los gestos de la carta: arrastrar = pan, rueda = zoom,
// Shift+arrastrar = rotación libre. El ajuste se guarda por constelación.
function bindChartControls(stage: HTMLElement, wrap: HTMLElement, name: string): void {
  let tf = loadChartTf(name);
  applyChartTf(wrap, tf);

  let dragging = false;
  let rotating = false;
  let lastX = 0;
  let lastY = 0;
  let startRot = 0;
  let startAngle = 0;

  const centerAngle = (cx: number, cy: number): number => {
    const r = stage.getBoundingClientRect();
    return Math.atan2(cy - (r.top + r.height / 2), cx - (r.left + r.width / 2)) * 180 / Math.PI;
  };

  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    stage.setPointerCapture(e.pointerId);
    if (e.shiftKey) {
      rotating = true;
      startRot = tf.rot;
      startAngle = centerAngle(e.clientX, e.clientY);
    } else {
      dragging = true;
    }
    lastX = e.clientX;
    lastY = e.clientY;
    stage.classList.add('grabbing');
  });
  stage.addEventListener('pointermove', (e) => {
    if (rotating) {
      const a = centerAngle(e.clientX, e.clientY);
      tf.rot = startRot + (a - startAngle);
      applyChartTf(wrap, tf);
    } else if (dragging) {
      tf.x += e.clientX - lastX;
      tf.y += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      applyChartTf(wrap, tf);
    }
  });
  const endDrag = (e: PointerEvent) => {
    if (!dragging && !rotating) return;
    dragging = false;
    rotating = false;
    stage.classList.remove('grabbing');
    try { stage.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    saveChartTf(name, tf);
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    tf.zoom = Math.max(TF_LIMITS.zoomMin, Math.min(TF_LIMITS.zoomMax, tf.zoom * factor));
    applyChartTf(wrap, tf);
    saveChartTf(name, tf);
  }, { passive: false });

  const resetBtn = stage.parentElement?.querySelector('.chart-reset') as HTMLButtonElement | null;
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      tf = { ...TF_DEFAULT };
      applyChartTf(wrap, tf);
      saveChartTf(name, tf);
    });
  }
}

// ─── Card de constelación ───────────────────────────────────────────
function showConstellation(name: string): void {
  const data = rawInfo[name];
  if (!data) return;
  empty.style.display = 'none';
  content.style.display = 'block';

  const objs = data.objects ?? [];
  const starsHtml = data.stars.length
    ? data.stars.map((s) =>
        `<li><span class="obj-name">${s.name}</span>` +
        `<span class="obj-meta">mag ${s.mag} · ${fmtRA(s.ra)} · ${fmtDec(s.dec)}</span></li>`).join('')
    : '<li class="hint">Sin estrellas notables en el catálogo.</li>';
  const objsHtml = objs.length
    ? objs.map((o) =>
        `<li><span class="obj-name">${o.id}</span>` +
        `<span class="obj-meta">${fmtRA(o.ra)} · ${fmtDec(o.dec)}</span></li>`).join('')
    : '<li class="hint">Sin objetos de cielo profundo en esta zona.</li>';

  content.innerHTML =
    `<h2 id="const-name">${name}</h2>` +
    `<div id="const-chart"></div>` +
    `<div id="const-info">` +
    `<div class="info-block"><h3>Estrellas notables (${data.stars.length})</h3>` +
    `<ul class="obj-list">${starsHtml}</ul></div>` +
    `<div class="info-block"><h3>Objetos de cielo profundo (${objs.length})</h3>` +
    `<ul class="obj-list">${objsHtml}</ul></div></div>`;

  const chartEl = document.getElementById('const-chart') as HTMLDivElement;
  chartEl.innerHTML = '';

  // Escenario de manipulación: stage (recorta) + wrap (lleva el transform).
  const stage = document.createElement('div');
  stage.className = 'chart-stage';
  const controls = document.createElement('div');
  controls.className = 'chart-controls';
  controls.innerHTML =
    `<span class="chart-hint">Arrastra: mover · Rueda: zoom · Mayús+arrastra: rotar</span>` +
    `<button type="button" class="chart-reset">Restablecer</button>`;
  chartEl.appendChild(controls);
  chartEl.appendChild(stage);

  const wrap = document.createElement('div');
  wrap.className = 'const-svg-inline';
  wrap.innerHTML = '<p class=\"hint\">Cargando carta…</p>';
  stage.appendChild(wrap);

  bindChartControls(stage, wrap, name);

  fetch(`/assets/constellation-charts/${data.slug}.svg`)
    .then((r) => r.text())
    .then((svg) => {
      wrap.innerHTML = svg;
      const vb = wrap.querySelector('svg')?.getAttribute('viewBox');
      if (vb) {
        const m = vb.match(/[\d.]+/g);
        if (m && m.length >= 4) stage.style.aspectRatio = `${m[2]} / ${m[3]}`;
      }
      applyChartTf(wrap, loadChartTf(name));
    })
    .catch(() => { wrap.innerHTML = '<p class=\"hint\">Carta no disponible.</p>'; });
}

// ─── Card de objeto astronómico (Messier, etc.) ─────────────────────
function showObject(id: string): void {
  const o = objects.find((x) => x.id === id);
  if (!o) return;
  empty.style.display = 'none';
  content.style.display = 'block';

  const nearby = stars.filter((s) =>
    Math.abs(s.ra - o.ra) < 6 && Math.abs(s.dec - o.dec) < 6).slice(0, 400);

  const title = o.common ? `${o.id} — ${o.common}` : o.id;
  const typeLabel = o.typeName && o.typeName !== o.type ? o.typeName : (o.type || '—');

  content.innerHTML =
    `<h2 id="const-name">${title}</h2>` +
    `<div class="obj-badge">${id}</div>` +
    `<div id="const-chart">${buildContextChart(nearby, o.ra, o.dec, { name: title, mag: o.mag ?? undefined, bv: null, isDeepSky: true, type: o.type, typeName: typeLabel })}</div>` +
    `<div id="const-info">` +
    `<div class="info-block"><h3>Datos del objeto</h3><ul class="obj-list">` +
    `<li><span class="obj-name">Catálogo</span><span class="obj-meta">${o.id}${o.ngc ? ' · ' + o.ngc : ''}</span></li>` +
    (o.common ? `<li><span class="obj-name">Nombre común</span><span class="obj-meta">${o.common}</span></li>` : '') +
    `<li><span class="obj-name">Tipo</span><span class="obj-meta">${typeLabel}</span></li>` +
    (o.mag != null ? `<li><span class="obj-name">Magnitud</span><span class="obj-meta">${o.mag}</span></li>` : '') +
    `<li><span class="obj-name">Ascensión Recta</span><span class="obj-meta">${fmtRA(o.ra)}</span></li>` +
    `<li><span class="obj-name">Declinación</span><span class="obj-meta">${fmtDec(o.dec)}</span></li>` +
    (o.constellation ? `<li><span class="obj-name">Constelación</span><span class="obj-meta">${o.constellation}</span></li>` : '<li class="hint">Sin constelación asociada.</li>') +
    `</ul></div>` +
    `<div class="info-block"><h3>Estrellas en el contexto (${nearby.length})</h3>` +
    `<ul class="obj-list">${nearby.slice(0, 12).map((s) =>
      `<li><span class="obj-name">${s.name ?? 'HIP ' + s.hip}</span>` +
      `<span class="obj-meta">mag ${s.mag} · ${fmtRA(s.ra)} · ${fmtDec(s.dec)}</span></li>`).join('')}</ul></div>` +
    `</div>`;
}

// ─── Card de estrella ───────────────────────────────────────────────
function showStar(hip: number): void {
  const s = stars.find((x) => x.hip === hip);
  if (!s) return;
  empty.style.display = 'none';
  content.style.display = 'block';

  const con = (s as unknown as { con?: string }).con ?? null;
  const bv = s.bv ? parseFloat(s.bv) : null;
  const nearby = stars.filter((x) =>
    Math.abs(x.ra - s.ra) < 6 && Math.abs(x.dec - s.dec) < 6 && x.hip !== hip).slice(0, 400);

  const title = s.name ? s.name : `HIP ${s.hip}`;

  content.innerHTML =
    `<h2 id="const-name">${title}</h2>` +
    `<div class="obj-badge">${s.name ? 'HIP ' + s.hip : 'Estrella'}</div>` +
    `<div id="const-chart">${buildContextChart(nearby, s.ra, s.dec, { name: title, mag: s.mag, bv })}</div>` +
    `<div id="const-info">` +
    `<div class="info-block"><h3>Datos de la estrella</h3><ul class="obj-list">` +
    `<li><span class="obj-name">Catálogo</span><span class="obj-meta">HIP ${s.hip}</span></li>` +
    (s.name ? `<li><span class="obj-name">Nombre</span><span class="obj-meta">${s.name}</span></li>` : '') +
    `<li><span class="obj-name">Magnitud</span><span class="obj-meta">${s.mag}</span></li>` +
    (bv != null ? `<li><span class="obj-name">Índice de color (B−V)</span><span class="obj-meta">${bv}</span></li>` : '') +
    (bv != null ? `<li><span class="obj-name">Tipo espectral</span><span class="obj-meta">${spectralByBv(bv)}</span></li>` : '') +
    `<li><span class="obj-name">Ascensión Recta</span><span class="obj-meta">${fmtRA(s.ra)}</span></li>` +
    `<li><span class="obj-name">Declinación</span><span class="obj-meta">${fmtDec(s.dec)}</span></li>` +
    (con ? `<li><span class="obj-name">Constelación</span><span class="obj-meta">${con}</span></li>` : '<li class="hint">Sin constelación asociada.</li>') +
    `</ul></div>` +
    `<div class="info-block"><h3>Estrellas en el contexto (${nearby.length})</h3>` +
    `<ul class="obj-list">${nearby.slice(0, 12).map((x) =>
      `<li><span class="obj-name">${x.name ?? 'HIP ' + x.hip}</span>` +
      `<span class="obj-meta">mag ${x.mag} · ${fmtRA(x.ra)} · ${fmtDec(x.dec)}</span></li>`).join('')}</ul></div>` +
    `</div>`;
}

// ─── SVG dinámico de contexto ───────────────────────────────────────
interface ChartCenter {
  name: string;
  mag?: number;
  bv?: number | null;
  isDeepSky?: boolean;
  type?: string;
  typeName?: string;
}
function buildContextChart(nearby: StarData[], raC: number, decC: number, center: ChartCenter): string {
  const W = 460, H = 460, pad = 30;
  const rDeg = 6;
  const inBox = nearby.filter((s) =>
    Math.abs(s.ra - raC) <= rDeg && Math.abs(s.dec - decC) <= rDeg);
  const raVals = inBox.map((s) => s.ra).concat(raC);
  const decVals = inBox.map((s) => s.dec).concat(decC);
  let rmin = Math.min(...raVals) - 0.5;
  let rmax = Math.max(...raVals) + 0.5;
  let dmin = Math.min(...decVals) - 0.5;
  let dmax = Math.max(...decVals) + 0.5;
  const raSpan = Math.max(rmax - rmin, 0.1);
  const decSpan = Math.max(dmax - dmin, 0.1);

  const xOf = (ra: number) => pad + (rmax - ra) / raSpan * (W - 2 * pad);
  const yOf = (dec: number) => pad + (dec - dmin) / decSpan * (H - 2 * pad);

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Audiowide, Segoe UI, sans-serif">`,
    `<rect width="${W}" height="${H}" fill="#05060c"/>`,
  ];
  for (const s of inBox) {
    const x = xOf(s.ra), y = yOf(s.dec);
    const r = Math.max(1, Math.min(6, 4.2 - s.mag * 0.55));
    const b = s.bv ? parseFloat(s.bv) : 0;
    const col = b < 0.5 ? '#cfe0ff' : b < 1.0 ? '#ffffff' : b < 1.5 ? '#fff2cc' : '#ffd699';
    parts.push(`<circle class="star" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${col}" data-name="${s.name ?? 'HIP ' + s.hip}" data-meta="mag ${s.mag}"/>`);
    if (s.name) parts.push(`<text x="${(x + r + 3).toFixed(1)}" y="${(y + 3).toFixed(1)}" fill="#aebfe0" font-size="9">${s.name}</text>`);
  }
  // Objeto central real (lo que se está consultando)
  const ox = xOf(raC), oy = yOf(decC);
  if (center.isDeepSky) {
    // Mancha difusa (objeto de cielo profundo) + núcleo
    const dsc = deepSkyColor(center.type);
    parts.push(`<circle class="star" cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="14" fill="${dsc}" fill-opacity="0.15" data-name="${center.name}" data-meta="${center.typeName ?? ''}"/>`);
    parts.push(`<circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="4.5" fill="${dsc}" fill-opacity="0.5"/>`);
  } else {
    // Estrella central con su tamaño/color real + anillo de resaltado
    const sr = Math.max(2.5, Math.min(7.5, 4.6 - (center.mag ?? 0) * 0.55));
    const cb = center.bv ?? 0;
    const ccol = cb < 0.5 ? '#cfe0ff' : cb < 1.0 ? '#ffffff' : cb < 1.5 ? '#fff2cc' : '#ffd699';
    parts.push(`<circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="${(sr + 5).toFixed(1)}" fill="none" stroke="#88ffcc" stroke-width="1.6" opacity="0.9"/>`);
    parts.push(`<circle class="star" cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="${sr.toFixed(1)}" fill="${ccol}" data-name="${center.name}" data-meta=""/>`);
  }
  parts.push('</svg>');
  return parts.join('');
}

// ─── Buscador central ───────────────────────────────────────────────
function renderSuggest(q: string): void {
  const f = q.trim().toLowerCase();
  suggest.innerHTML = '';
  if (!f) return;
  const cMatches = constNames.filter((n) => n.toLowerCase().includes(f)).slice(0, 5);
  const sMatches = starList.filter((s) =>
    (s.name && s.name.toLowerCase().includes(f)) || `hip ${s.hip}`.includes(f)).slice(0, 5);
  const oMatches = objects.filter((o) =>
    o.id.toLowerCase().includes(f) || (o.ngc && o.ngc.toLowerCase().includes(f))).slice(0, 5);
  for (const n of cMatches) {
    const el = document.createElement('div');
    el.className = 'suggest-item';
    el.textContent = `✦ ${n}`;
    el.addEventListener('click', () => { searchInput.value = n; suggest.innerHTML = ''; showConstellation(n); });
    suggest.appendChild(el);
  }
  for (const s of sMatches) {
    const label = s.name ? s.name : `HIP ${s.hip}${s.con ? ' (' + s.con + ')' : ''}`;
    const el = document.createElement('div');
    el.className = 'suggest-item';
    el.textContent = `★ ${label}`;
    el.addEventListener('click', () => { searchInput.value = label; suggest.innerHTML = ''; showStar(s.hip); });
    suggest.appendChild(el);
  }
  for (const o of oMatches) {
    const el = document.createElement('div');
    el.className = 'suggest-item';
    el.textContent = `◍ ${o.id}`;
    el.addEventListener('click', () => { searchInput.value = o.id; suggest.innerHTML = ''; showObject(o.id); });
    suggest.appendChild(el);
  }
}

searchInput.addEventListener('input', () => renderSuggest(searchInput.value));
searchInput.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const q = searchInput.value.trim();
  if (rawInfo[q]) { suggest.innerHTML = ''; showConstellation(q); return; }
  const cm = constNames.find((n) => n.toLowerCase() === q.toLowerCase());
  if (cm) { suggest.innerHTML = ''; showConstellation(cm); return; }
  const sm = starList.find((s) => (s.name && s.name.toLowerCase() === q.toLowerCase()) || (`hip ${s.hip}` === q.toLowerCase()));
  if (sm) { suggest.innerHTML = ''; showStar(sm.hip); return; }
  const om = objects.find((x) => x.id.toLowerCase() === q.toLowerCase() || (x.ngc && x.ngc.toLowerCase() === q.toLowerCase()));
  if (om) { suggest.innerHTML = ''; showObject(om.id); }
});

// ─── Tooltip de estrellas/objetos dentro de las cartas ──────────────
const chartTip = document.getElementById('const-tooltip') as HTMLDivElement;
document.addEventListener('mousemove', (e) => {
  const t = e.target as Element | null;
  const star = t && t.closest ? t.closest('.star') : null;
  if (star && star.getAttribute('data-name')) {
    const nm = star.getAttribute('data-name') || '';
    const mt = star.getAttribute('data-meta') || '';
    chartTip.innerHTML = `<span class="tt-name">${nm}</span>` + (mt ? `<span class="tt-meta">${mt}</span>` : '');
    chartTip.style.display = 'block';
    const x = (e.clientX ?? 0) + 14;
    const y = (e.clientY ?? 0) + 14;
    chartTip.style.left = `${x}px`;
    chartTip.style.top = `${y}px`;
  } else {
    chartTip.style.display = 'none';
  }
});
document.addEventListener('mouseleave', () => { chartTip.style.display = 'none'; });

// ─── Init ───────────────────────────────────────────────────────────
renderConstList();
renderObjList();
