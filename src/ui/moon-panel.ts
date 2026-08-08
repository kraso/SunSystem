/**
 * Panel "Luna": calendario mensual de fases + visor 3D de la fase
 * + información detallada + galería de fotos reales de la NASA.
 *
 * Se abre como overlay a pantalla completa (mismo patrón que StatsPanel).
 */

import { getMoonPhase, getPhaseDescription, PHASE_NAMES_ES, PHASE_NAMES_EN, isSupermoon, getMoonDistanceKm, type PhaseName } from '../core/lunar-phase';
import { MoonViewer } from './moon-viewer';
import eclipsesData from '../data/eclipses.json';
import type { EclipseEvent } from '../core/types';

const ECLIPSES = eclipsesData as EclipseEvent[];

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const PHASE_ICON = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];

export class MoonPanel {
  private overlay: HTMLElement;
  private viewer: MoonViewer;
  private visible = false;
  private viewYear: number;
  private viewMonth: number; // 0-11
  private selectedDate: Date;
  private nasaCache = new Map<string, string>();
  private infoWasHidden = true;
  private statsWasHidden = true;

  constructor() {
    const now = new Date();
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth();
    this.selectedDate = now;

    this.overlay = document.createElement('div');
    this.overlay.id = 'moon-overlay';
    this.overlay.className = 'stats-hidden';
    this.overlay.innerHTML = this.template();
    document.body.appendChild(this.overlay);

    this.viewer = new MoonViewer(this.overlay.querySelector('#moon-viewer') as HTMLElement);

    this.bindEvents();
    this.renderCalendar();
    // El visor 3D se construye en show(), cuando el overlay ya es visible
    // y el contenedor tiene tamaño real (evita un canvas 0x0 en blanco).
  }

  private template(): string {
    return `
      <div id="stats-header">
        <h1>🌙 Fases de la Luna</h1>
        <button id="moon-close" class="btn-hud">✕ Cerrar</button>
      </div>
      <div id="moon-body">
        <div id="moon-left">
          <div id="moon-nav">
            <button id="moon-prev" class="btn-hud-sm" title="Mes anterior">◀</button>
            <span id="moon-title">${MONTH_NAMES_ES[this.viewMonth]} ${this.viewYear}</span>
            <button id="moon-next" class="btn-hud-sm" title="Mes siguiente">▶</button>
            <button id="moon-today" class="btn-hud-sm" title="Hoy">Hoy</button>
          </div>
          <div id="moon-calendar"></div>
          <div id="moon-phases-legend"></div>
        </div>
        <div id="moon-right">
          <div id="moon-viewer"></div>
          <div id="moon-detail"></div>
          <div id="moon-chart"></div>
          <h3 class="moon-gallery-title">📷 Fotos reales (NASA)</h3>
          <div id="moon-gallery"></div>
        </div>
      </div>
    `;
  }

  show(): void {
    this.visible = true;
    this.overlay.className = 'stats-visible';
    // Oculta los paneles flotantes del simulador para no dejar recuadros sueltos.
    const info = document.getElementById('info-panel');
    const stats = document.getElementById('stats-overlay');
    this.infoWasHidden = info ? info.classList.contains('hidden') : true;
    this.statsWasHidden = stats ? stats.classList.contains('stats-hidden') : true;
    info?.classList.add('hidden');
    stats?.classList.add('stats-hidden');
    this.renderDetail();
  }

  hide(): void {
    this.visible = false;
    this.overlay.className = 'stats-hidden';
    this.viewer.dispose();
    // Restaura el estado previo de los paneles flotantes.
    const info = document.getElementById('info-panel');
    const stats = document.getElementById('stats-overlay');
    if (info && !this.infoWasHidden) info.classList.remove('hidden');
    if (stats && !this.statsWasHidden) stats.classList.remove('stats-hidden');
  }

  toggle(): void {
    this.visible ? this.hide() : this.show();
  }

  private bindEvents(): void {
    this.overlay.querySelector('#moon-close')!.addEventListener('click', () => this.hide());
    this.overlay.querySelector('#moon-prev')!.addEventListener('click', () => this.changeMonth(-1));
    this.overlay.querySelector('#moon-next')!.addEventListener('click', () => this.changeMonth(1));
    this.overlay.querySelector('#moon-today')!.addEventListener('click', () => this.goToday());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) this.hide();
    });
  }

  private changeMonth(delta: number): void {
    this.viewMonth += delta;
    if (this.viewMonth < 0) { this.viewMonth = 11; this.viewYear--; }
    if (this.viewMonth > 11) { this.viewMonth = 0; this.viewYear++; }
    this.renderCalendar();
  }

  private goToday(): void {
    const now = new Date();
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth();
    this.selectedDate = now;
    this.renderCalendar();
    this.renderDetail();
  }

  /** Renderiza el grid mensual con el icono de fase de cada día. */
  private renderCalendar(): void {
    const grid = this.overlay.querySelector('#moon-calendar') as HTMLElement;
    const today = new Date();
    const firstDay = new Date(Date.UTC(this.viewYear, this.viewMonth, 1));
    const startWeekday = (firstDay.getUTCDay() + 6) % 7; // lunes=0
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();

    let html = '';
    const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    html += weekDays.map((w) => `<div class="moon-wd">${w}</div>`).join('');

    for (let i = 0; i < startWeekday; i++) {
      html += '<div class="moon-cell moon-empty"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(this.viewYear, this.viewMonth, d);
      const phase = getMoonPhase(date);
      const isToday =
        today.getDate() === d &&
        today.getMonth() === this.viewMonth &&
        today.getFullYear() === this.viewYear;
      const isSel =
        this.selectedDate.getDate() === d &&
        this.selectedDate.getMonth() === this.viewMonth;
      const eclipse = this.findEclipse(this.viewYear, this.viewMonth, d);
      const eclipseBadge = eclipse
        ? `<span class="moon-eclipse ${eclipse.kind}" title="${eclipse.subtype}">${eclipse.kind === 'solar' ? '☀' : '🌑'}</span>`
        : '';
      const supBadge = isSupermoon(date)
        ? '<span class="moon-super" title="Superluna">★</span>'
        : '';
      const cls = `moon-cell${isToday ? ' moon-today' : ''}${isSel ? ' moon-selected' : ''}${eclipse ? ' has-eclipse' : ''}`;
      html += `<div class="${cls}" data-day="${d}">
        <span class="moon-num">${d}</span>
        <span class="moon-ico">${PHASE_ICON[phase.index8]}</span>
        ${eclipseBadge}${supBadge}
      </div>`;
    }
    grid.innerHTML = html;

    grid.querySelectorAll('.moon-cell[data-day]').forEach((cell) => {
      cell.addEventListener('click', () => {
        const d = parseInt((cell as HTMLElement).dataset.day!);
        this.selectedDate = new Date(this.viewYear, this.viewMonth, d);
        this.renderCalendar();
        this.renderDetail();
        this.renderDistanceChart();
      });
    });

    this.overlay.querySelector('#moon-title')!.textContent =
      `${MONTH_NAMES_ES[this.viewMonth]} ${this.viewYear}`;
    this.renderLegend();
    this.renderDistanceChart();
  }

  private renderLegend(): void {
    const legend = this.overlay.querySelector('#moon-phases-legend') as HTMLElement;
    legend.innerHTML = PHASE_NAMES_ES.map(
      (name, i) => `<span class="moon-legend-item">${PHASE_ICON[i]} ${name}</span>`,
    ).join('');
  }

  /** Renderiza el visor 3D + ficha detallada + galería de la fecha seleccionada. */
  private renderDetail(): void {
    const phase = getMoonPhase(this.selectedDate);
    this.viewer.setAgeDays(phase.age);

    const pct = (phase.illumination * 100).toFixed(1);
    const dateStr = this.selectedDate.toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const detail = this.overlay.querySelector('#moon-detail') as HTMLElement;
    const superBadge = isSupermoon(this.selectedDate)
      ? '<span class="moon-badge super" title="Distancia al perigeo ≤ 360.000 km">★ Superluna</span>'
      : '';
    const eclipse = this.findEclipse(
      this.selectedDate.getFullYear(),
      this.selectedDate.getMonth(),
      this.selectedDate.getDate(),
    );
    const eclipseBadge = eclipse
      ? `<span class="moon-badge ${eclipse.kind}">${eclipse.kind === 'solar' ? '☀' : '🌑'} Eclipse ${eclipse.subtype}</span>`
      : '';
    const distKm = Math.round(getMoonDistanceKm(this.selectedDate));
    const dist = distKm.toLocaleString('es-ES');
    detail.innerHTML = `
      <h2>${PHASE_ICON[phase.index8]} ${phase.phaseName}</h2>
      <p class="moon-date">${dateStr}</p>
      <div class="moon-badges">${superBadge}${eclipseBadge}</div>
      <div class="stat"><span class="stat-label">Iluminación</span><span class="stat-value">${pct}%</span></div>
      <div class="stat"><span class="stat-label">Edad lunar</span><span class="stat-value">${phase.age.toFixed(1)} días</span></div>
      <div class="stat"><span class="stat-label">Fase del ciclo</span><span class="stat-value">${(phase.cycleFraction * 100).toFixed(0)}%</span></div>
      <div class="stat"><span class="stat-label">Distancia Tierra–Luna</span><span class="stat-value">${dist} km</span></div>
      ${distKm <= 360000 ? '<div class="stat"><span class="stat-label">Umbral superluna</span><span class="stat-value">≤ 360.000 km ✓</span></div>' : ''}
      ${eclipse ? this.eclipseInfoHtml(eclipse) : ''}
      <p id="moon-desc">${getPhaseDescription(phase.phaseName)}</p>
    `;

    this.loadNasaGallery(phase.phaseName);
  }

  /** Busca un eclipse en la fecha indicada (o null). */
  private findEclipse(year: number, month: number, day: number): EclipseEvent | null {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return ECLIPSES.find((e) => e.date === key) ?? null;
  }

  /** HTML con la información detallada de un eclipse. */
  private eclipseInfoHtml(e: EclipseEvent): string {
    const icon = e.kind === 'solar' ? '☀️ Eclipse solar' : '🌑 Eclipse lunar';
    const timeMadrid = this.eclipseTimeMadrid(e);
    return `
      <div class="moon-eclipse-info">
        <h3>${icon} — ${e.subtype}</h3>
        <div class="stat"><span class="stat-label">Magnitud</span><span class="stat-value">${e.magnitude}</span></div>
        <div class="stat"><span class="stat-label">Duración</span><span class="stat-value">${e.duration}</span></div>
        <div class="stat"><span class="stat-label">Hora (Madrid)</span><span class="stat-value">${timeMadrid}</span></div>
        <div class="stat"><span class="stat-label">Cuerpos</span><span class="stat-value">${e.bodies}</span></div>
        <p class="moon-eclipse-vis">👁 Visibilidad: ${e.visibility}</p>
      </div>`;
  }

  /** Convierte la hora UTC del eclipse a hora local de Madrid (CET/CEST). */
  private eclipseTimeMadrid(e: EclipseEvent): string {
    if (!e.timeUtc) return '—';
    const iso = `${e.date}T${e.timeUtc}:00Z`;
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleTimeString('es-ES', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }

  /** Carga fotos reales de la NASA para la fase (reusa images-api.nasa.gov). */
  private async loadNasaGallery(phaseName: PhaseName): Promise<void> {
    const gallery = this.overlay.querySelector('#moon-gallery') as HTMLElement;
    const cacheKey = phaseName;

    if (this.nasaCache.has(cacheKey)) {
      const cached = this.nasaCache.get(cacheKey)!;
      gallery.innerHTML = cached
        ? cached.split('|').map((src) => this.imgTag(src)).join('')
        : '<p class="moon-loading">Sin imágenes de la NASA para esta fase.</p>';
      return;
    }
    gallery.innerHTML = '<p class="moon-loading">Cargando fotos de la NASA…</p>';

    try {
      // La API de NASA indexa en inglés; traducimos la fase al término EN.
      const enPhase = PHASE_NAMES_EN[phaseName] ?? 'moon';
      const q = encodeURIComponent(`${enPhase} moon`);
      const resp = await fetch(`https://images-api.nasa.gov/search?q=${q}&media_type=image`);
      const data = await resp.json();
      const items = data?.collection?.items ?? [];
      const thumbs = items
        .map((it: { links?: { href: string }[] }) => it?.links?.[0]?.href)
        .filter(Boolean)
        .slice(0, 6);

      if (thumbs.length === 0) {
        gallery.innerHTML = '<p class="moon-loading">Sin imágenes de la NASA para esta fase.</p>';
        return;
      }
      this.nasaCache.set(cacheKey, thumbs.join('|'));
      gallery.innerHTML = thumbs.map((src: string) => this.imgTag(src)).join('');
    } catch {
      gallery.innerHTML = '<p class="moon-loading">No se pudo cargar la galería (sin red).</p>';
    }
  }

  private imgTag(src: string): string {
    return `<img class="moon-photo" src="${src}" alt="Foto NASA" loading="lazy"
      onerror="this.style.display='none'" />`;
  }

  /**
   * Dibuja la curva de distancia Tierra–Luna del mes (modelo Meeus) como SVG.
   * Incluye la línea de umbral de superluna (360.000 km) y marca el día seleccionado.
   */
  private renderDistanceChart(): void {
    const chart = this.overlay.querySelector('#moon-chart') as HTMLElement;
    const year = this.viewYear;
    const month = this.viewMonth;
    const days = new Date(year, month + 1, 0).getDate();

    const pts: { day: number; dist: number }[] = [];
    for (let d = 1; d <= days; d++) {
      const date = new Date(year, month, d);
      pts.push({ day: d, dist: getMoonDistanceKm(date) });
    }

    const W = 320;
    const H = 90;
    const padL = 4;
    const padR = 4;
    const padT = 8;
    const padB = 14;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const dists = pts.map((p) => p.dist);
    const min = Math.min(...dists);
    const max = Math.max(...dists);
    const lo = Math.floor(min / 10000) * 10000;
    const hi = Math.ceil(max / 10000) * 10000;

    const x = (d: number) => padL + ((d - 1) / (days - 1)) * innerW;
    const y = (dist: number) => padT + (1 - (dist - lo) / (hi - lo)) * innerH;

    const linePath = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.day).toFixed(1)},${y(p.dist).toFixed(1)}`)
      .join(' ');

    const thresholdY = y(360000);
    const selDay = this.selectedDate.getDate();
    const selX = x(selDay);
    const selPt = pts.find((p) => p.day === selDay);
    const selDist = selPt ? selPt.dist : 0;
    const selY = selPt ? y(selDist) : padT;
    const distLabel = `${Math.round(selDist).toLocaleString('es-ES')} km`;
    // Coloca la etiqueta a la izquierda del punto si está muy a la derecha.
    const labelX = selX > W - 48 ? selX - 4 : selX + 4;
    const labelAnchor = selX > W - 48 ? 'end' : 'start';
    const labelY = Math.max(padT + 6, Math.min(H - padB - 2, selY - 4));

    const dots = pts
      .map((p) => {
        const isSel = p.day === selDay;
        const isSuper = p.dist <= 360000;
        const color = isSuper ? '#4ea1ff' : 'rgba(255,255,255,0.35)';
        const r = isSel ? 3.4 : 1.6;
        return `<circle cx="${x(p.day).toFixed(1)}" cy="${y(p.dist).toFixed(1)}" r="${r}" fill="${isSel ? '#ffd166' : color}" />`;
      })
      .join('');

    chart.innerHTML = `
      <div class="chart-title">Distancia Tierra–Luna (modelo Meeus)</div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="moon-chart-svg">
        <line x1="${padL}" y1="${thresholdY.toFixed(1)}" x2="${W - padR}" y2="${thresholdY.toFixed(1)}"
              stroke="#ff5d5d" stroke-width="0.6" stroke-dasharray="3 2" opacity="0.7" />
        <path d="${linePath}" fill="none" stroke="#6cc6ff" stroke-width="1.4" />
        ${dots}
        <line x1="${selX.toFixed(1)}" y1="${padT}" x2="${selX.toFixed(1)}" y2="${H - padB}"
              stroke="#ffd166" stroke-width="0.6" opacity="0.6" />
        <text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" class="chart-label"
              text-anchor="${labelAnchor}" fill="#ffd166">${distLabel}</text>
      </svg>
      <div class="chart-scale">
        <span>${(hi / 1000).toFixed(0)}k km</span>
        <span class="chart-th">⚠ 360k (superluna)</span>
        <span>${(lo / 1000).toFixed(0)}k km</span>
      </div>`;
  }
}
