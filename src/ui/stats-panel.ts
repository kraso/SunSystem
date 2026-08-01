import type { CelestialBodyData } from '../core/types';

/**
 * Panel de estadísticas con imágenes reales de la NASA.
 * Se abre como overlay a pantalla completa.
 */
export class StatsPanel {
  private overlay: HTMLElement;
  private grid: HTMLElement;
  private visible: boolean = false;
  private cache: Map<string, string> = new Map();

  constructor(private bodies: CelestialBodyData[]) {
    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'stats-overlay';
    this.overlay.className = 'stats-hidden';
    this.overlay.innerHTML = `
      <div id="stats-header">
        <h1>📊 Estadísticas del Sistema Solar</h1>
        <button id="stats-close">✕ Cerrar</button>
      </div>
      <div id="stats-grid"></div>
    `;
    document.body.appendChild(this.overlay);

    this.grid = this.overlay.querySelector('#stats-grid')!;

    // Cerrar
    this.overlay.querySelector('#stats-close')!.addEventListener('click', () => this.hide());

    // ESC para cerrar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) this.hide();
    });
  }

  show(): void {
    this.visible = true;
    this.overlay.className = 'stats-visible';
    this.buildCards();
  }

  hide(): void {
    this.visible = false;
    this.overlay.className = 'stats-hidden';
  }

  toggle(): void {
    this.visible ? this.hide() : this.show();
  }

  private buildCards(): void {
    this.grid.innerHTML = '';

    for (const body of this.bodies) {
      if (body.type === 'star') continue; // El Sol ya ocupa mucho

      const card = document.createElement('div');
      card.className = `stats-card type-${body.type}`;
      card.innerHTML = `
        <div class="stats-img-container">
          <img class="stats-img" src="" alt="${body.label}" loading="lazy" />
          <div class="stats-img-placeholder">🔭</div>
        </div>
        <div class="stats-info">
          <h3>${body.label}</h3>
          <span class="stats-type">${this.typeLabel(body.type)}${body.parent ? ` · ${body.parent}` : ''}</span>
          <table>
            <tr><td>Radio</td><td>${this.fmt(body.radiusKm)} km</td></tr>
            <tr><td>Masa</td><td>${this.fmtMass(body.massKg)} kg</td></tr>
            ${body.semiMajorAxisAu > 0 ? `<tr><td>Distancia orbital</td><td>${body.semiMajorAxisAu.toFixed(4)} UA</td></tr>` : ''}
            ${body.orbitalPeriodDays > 0 ? `<tr><td>Período orbital</td><td>${this.fmt(body.orbitalPeriodDays)} días</td></tr>` : ''}
            <tr><td>Excentricidad</td><td>${body.eccentricity.toFixed(4)}</td></tr>
            <tr><td>Inclinación</td><td>${body.inclinationDeg.toFixed(2)}°</td></tr>
          </table>
          <p class="stats-desc">${body.description}</p>
        </div>
      `;
      this.grid.appendChild(card);

      // Cargar imagen de la NASA
      this.loadNasaImage(body.name, card.querySelector('.stats-img') as HTMLImageElement);
    }
  }

  /** Busca imagen en la API pública de NASA Images */
  private async loadNasaImage(query: string, imgEl: HTMLImageElement): Promise<void> {
    // Usar caché
    if (this.cache.has(query)) {
      imgEl.src = this.cache.get(query)!;
      imgEl.style.display = 'block';
      return;
    }

    try {
      const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query + ' planet')}&media_type=image`;
      const resp = await fetch(url);
      const data = await resp.json();

      const items = data?.collection?.items;
      if (items && items.length > 0) {
        // Tomar la primera imagen con thumbnail
        for (const item of items) {
          const href = item?.links?.[0]?.href;
          if (href) {
            this.cache.set(query, href);
            imgEl.src = href;
            imgEl.style.display = 'block';
            imgEl.onerror = () => { imgEl.style.display = 'none'; };
            return;
          }
        }
      }
    } catch {
      // fallback silencioso
    }

    // Si no hay imagen, mostrar placeholder
    imgEl.style.display = 'none';
  }

  private fmt(n: number): string {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + ' M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + ' k';
    return n.toFixed(1);
  }

  private fmtMass(kg: number): string {
    if (kg >= 1e27) return (kg / 1e27).toFixed(2) + ' × 10²⁷';
    if (kg >= 1e24) return (kg / 1e24).toFixed(2) + ' × 10²⁴';
    if (kg >= 1e21) return (kg / 1e21).toFixed(2) + ' × 10²¹';
    if (kg >= 1e18) return (kg / 1e18).toFixed(2) + ' × 10¹⁸';
    return kg.toExponential(2);
  }

  private typeLabel(type: string): string {
    const map: Record<string, string> = {
      terrestrial: '🪨 Rocoso',
      gas_giant: '🌀 Gigante gaseoso',
      ice_giant: '❄️ Gigante de hielo',
      moon: '🌙 Luna',
      dwarf_planet: '⚪ Planeta enano',
      star: '☀️ Estrella',
    };
    return map[type] || type;
  }
}
