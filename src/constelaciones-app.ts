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
...starList.filter((s) => s.hip !== 62434).map((s): RightItem => ({
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

// ─── Editor de la carta: arrastrar estrellas + expandir el espacio ──
// El usuario puede mover cada estrella (nodo) a mano y "abrir" la figura
// con un deslizador que separa las estrellas desde el centro. El ajuste se
// guarda POR CARTA en localStorage (posiciones de cada estrella + factor de
// expansión). Un botón restablece a los datos reales del catálogo.
interface NodeState { x: number; y: number; }
interface ChartEdit { expand: number; pos: Record<string, NodeState>; }

function editKey(name: string): string {
  return 'sunconst:edit:' + name;
}
function loadEdit(name: string): ChartEdit {
  try {
    const raw = localStorage.getItem(editKey(name));
    if (raw) {
      const e = JSON.parse(raw) as Partial<ChartEdit>;
      return {
        expand: Math.max(0.6, Math.min(3, e.expand ?? 1)),
        pos: e.pos && typeof e.pos === 'object' ? e.pos : {},
      };
    }
  } catch { /* ignore */ }
  return { expand: 1, pos: {} };
}
let editSaveTimer: number | undefined;
function saveEdit(name: string, edit: ChartEdit): void {
  if (editSaveTimer) window.clearTimeout(editSaveTimer);
  editSaveTimer = window.setTimeout(() => {
    try { localStorage.setItem(editKey(name), JSON.stringify(edit)); } catch { /* ignore */ }
  }, 250);
}

// Recalcula las posiciones de todas las estrellas y líneas a partir del
// estado de edición (expansión + offsets por estrella) y del viewBox real.
// Las posiciones BASE son las del catálogo (guardadas una vez al cargar),
// para que expandir/arrastrar/restablecer siempre partan de los datos reales.
function applyEdit(svg: SVGSVGElement, edit: ChartEdit, vbW: number, vbH: number): void {
  const stars = Array.from(svg.querySelectorAll<SVGCircleElement>('circle.star[data-vid]'));
  if (!stars.length) return;
  // centro del lienzo (en coords del viewBox)
  const cx = vbW / 2;
  const cy = vbH / 2;
  // capturar posiciones base del catálogo la primera vez
  if (!svg.dataset.baseReady) {
    for (const c of stars) {
      c.dataset.baseX = c.getAttribute('cx')!;
      c.dataset.baseY = c.getAttribute('cy')!;
    }
    svg.dataset.baseReady = '1';
  }
  const pts: Record<string, { x: number; y: number }> = {};
  for (const c of stars) {
    const vid = c.dataset.vid!;
    const baseX = parseFloat(c.dataset.baseX!);
    const baseY = parseFloat(c.dataset.baseY!);
    const ov = edit.pos[vid];
    const ox = ov ? ov.x : 0;
    const oy = ov ? ov.y : 0;
    // expansión: separa la estrella del centro por el factor
    const ex = cx + (baseX - cx) * edit.expand + ox;
    const ey = cy + (baseY - cy) * edit.expand + oy;
    pts[vid] = { x: ex, y: ey };
    c.setAttribute('cx', ex.toFixed(1));
    c.setAttribute('cy', ey.toFixed(1));
  }
  // etiquetas siguen a su estrella
  for (const t of Array.from(svg.querySelectorAll<SVGTextElement>('text.star-label[data-vid]'))) {
    const p = pts[t.dataset.vid!];
    if (!p) continue;
    const r = parseFloat(svg.querySelector<SVGCircleElement>(`circle.star[data-vid="${t.dataset.vid}"]`)!.getAttribute('r')!);
    t.setAttribute('x', (p.x + r + 4).toFixed(1));
    t.setAttribute('y', (p.y + 4).toFixed(1));
  }
  // líneas siguen a sus vértices (según data-seq)
  for (const line of Array.from(svg.querySelectorAll<SVGPolylineElement>('polyline.fig-line[data-seq]'))) {
    const seq = line.dataset.seq!.split(',');
    const coords = seq.map((vid) => {
      const p = pts[vid];
      return p ? `${p.x.toFixed(1)},${p.y.toFixed(1)}` : '';
    }).filter(Boolean);
    line.setAttribute('points', coords.join(' '));
  }
}

// Une los gestos sobre el SVG: arrastrar una estrella la mueve (en coords del
// viewBox). El deslizador de expansión se bindea aparte.
function bindNodeEditor(svg: SVGSVGElement, stage: HTMLElement, name: string, vbW: number, vbH: number): void {
  let edit = loadEdit(name);

  const clientToSvg = (clientX: number, clientY: number): { x: number; y: number } => {
    const r = svg.getBoundingClientRect();
    return {
      x: (clientX - r.left) / r.width * vbW,
      y: (clientY - r.top) / r.height * vbH,
    };
  };

  let draggingVid: string | null = null;
  let offX = 0, offY = 0;
  let grabX = 0, grabY = 0;

  svg.addEventListener('pointerdown', (e) => {
    const target = e.target as Element;
    const circle = target.closest<SVGCircleElement>('circle.star[data-vid]');
    if (!circle) return;
    e.preventDefault();
    draggingVid = circle.dataset.vid!;
    try { svg.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const p = clientToSvg(e.clientX, e.clientY);
    grabX = p.x;
    grabY = p.y;
    const cur = edit.pos[draggingVid] || { x: 0, y: 0 };
    offX = cur.x;
    offY = cur.y;
    svg.classList.add('editing');
  });

  svg.addEventListener('pointermove', (e) => {
    if (!draggingVid) return;
    const p = clientToSvg(e.clientX, e.clientY);
    const nx = offX + (p.x - grabX);
    const ny = offY + (p.y - grabY);
    if (!edit.pos[draggingVid]) edit.pos[draggingVid] = { x: 0, y: 0 };
    edit.pos[draggingVid].x = nx;
    edit.pos[draggingVid].y = ny;
    applyEdit(svg, edit, vbW, vbH);
  });

  const end = (e: PointerEvent) => {
    if (!draggingVid) return;
    draggingVid = null;
    svg.classList.remove('editing');
    try { svg.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    saveEdit(name, edit);
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);

  // deslizador de expansión
  const expand = stage.parentElement?.querySelector<HTMLInputElement>('.chart-expand');
  if (expand) {
    expand.value = String(edit.expand);
    expand.addEventListener('input', () => {
      edit.expand = Math.max(0.6, Math.min(3, parseFloat(expand.value) || 1));
      applyEdit(svg, edit, vbW, vbH);
      saveEdit(name, edit);
    });
  }
  // restablecer a datos reales
  const reset = stage.parentElement?.querySelector<HTMLButtonElement>('.chart-reset');
  if (reset) {
    reset.addEventListener('click', () => {
      edit = { expand: 1, pos: {} };
      applyEdit(svg, edit, vbW, vbH);
      if (expand) expand.value = '1';
      saveEdit(name, edit);
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

  // Escenario de edición: el SVG vive en un stage sin recorte (para poder
  // arrastrar estrellas fuera de los márgenes) y se editan los nodos a mano.
  const stage = document.createElement('div');
  stage.className = 'chart-stage';
  const controls = document.createElement('div');
  controls.className = 'chart-controls';
  controls.innerHTML =
    `<span class="chart-hint">Arrastra una estrella para moverla · el deslizador abre la figura</span>` +
    `<label class="chart-expand-wrap">Expansión ` +
    `<input type="range" class="chart-expand" min="0.6" max="3" step="0.05" value="1"></label>` +
    `<button type="button" class="chart-reset">Restablecer</button>`;
  chartEl.appendChild(controls);
  chartEl.appendChild(stage);

  const wrap = document.createElement('div');
  wrap.className = 'const-svg-inline';
  wrap.innerHTML = '<p class="hint">Cargando carta…</p>';
  stage.appendChild(wrap);

  fetch(`/assets/constellation-charts/${data.slug}.svg`)
    .then((r) => r.text())
    .then((svgText) => {
      wrap.innerHTML = svgText;
      const svgEl = wrap.querySelector('svg') as SVGSVGElement | null;
      if (!svgEl) return;
      const vb = svgEl.getAttribute('viewBox');
      let vbW = 760, vbH = 280;
      if (vb) {
        const m = vb.match(/[\d.]+/g);
        if (m && m.length >= 4) { vbW = parseFloat(m[2]); vbH = parseFloat(m[3]); }
      }
      // el SVG ocupa el ancho disponible; sin recorte para poder mover nodos
      svgEl.style.width = '100%';
      svgEl.style.height = 'auto';
      svgEl.style.display = 'block';
      svgEl.style.touchAction = 'none';
      svgEl.classList.add('editable');
      // El stage adopta el aspect-ratio real del viewBox de la carta, para
      // que ninguna estrella quede fuera del área visible (antes el
      // aspect-ratio fijo 760/280 recortaba las cartas altas como Cruz).
      stage.style.aspectRatio = `${vbW} / ${vbH}`;
      bindNodeEditor(svgEl, stage, name, vbW, vbH);
      // aplicar edición guardada (expand + posiciones)
      const edit = loadEdit(name);
      applyEdit(svgEl, edit, vbW, vbH);
      const expand = stage.parentElement?.querySelector<HTMLInputElement>('.chart-expand');
      if (expand) expand.value = String(edit.expand);
    })
    .catch(() => { wrap.innerHTML = '<p class="hint">Carta no disponible.</p>'; });
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
