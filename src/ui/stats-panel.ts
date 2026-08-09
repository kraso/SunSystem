import type { CelestialBodyData } from '../core/types';

/**
 * Panel de estadísticas con imágenes reales de la NASA.
 * Se abre como overlay a pantalla completa.
 */
export class StatsPanel {
  private overlay: HTMLElement;
  private grid: HTMLElement;
  private visible: boolean = false;
  private cache: Map<string, string[]> = new Map();

  constructor(private bodies: CelestialBodyData[]) {
    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'stats-overlay';
    this.overlay.className = 'stats-hidden';
    this.overlay.innerHTML = `
      <div id="stats-header">
        <h1>📊 Estadísticas del Sistema Solar</h1>
        <a id="stats-close" class="brand" href="./index.html" title="Volver a SunSystem">☀️ SunSystem</a>
      </div>
      <div id="stats-legend">
        <span class="legend-title">Leyenda (color del borde = tipo):</span>
        <span class="legend-item"><i class="swatch sw-terrestrial"></i>Rocoso</span>
        <span class="legend-item"><i class="swatch sw-gas_giant"></i>Gigante gaseoso</span>
        <span class="legend-item"><i class="swatch sw-ice_giant"></i>Gigante de hielo</span>
        <span class="legend-item"><i class="swatch sw-moon"></i>Luna</span>
        <span class="legend-item"><i class="swatch sw-dwarf_planet"></i>Planeta enano</span>
      </div>
      <div id="stats-grid"></div>
    `;
    document.body.appendChild(this.overlay);

    this.grid = this.overlay.querySelector('#stats-grid')!;

    // Volver a la página principal (el enlace navega a index.html)


    // ESC para cerrar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) this.hide();
    });
  }

  show(): void {
    this.visible = true;
    this.overlay.className = 'stats-visible';
    this.buildList();
  }

  hide(): void {
    this.visible = false;
    this.overlay.className = 'stats-hidden';
  }

  toggle(): void {
    this.visible ? this.hide() : this.show();
  }

  private buildList(): void {
    this.grid.innerHTML = '';

    // Agrupar cuerpos por tipo (excluir estrella)
    const groupDefs: { type: string; label: string; bodies: CelestialBodyData[] }[] = [
      { type: 'terrestrial', label: '🪨 Planetas rocosos', bodies: [] },
      { type: 'gas_giant',   label: '🌀 Gigantes gaseosos', bodies: [] },
      { type: 'ice_giant',   label: '❄️ Gigantes de hielo', bodies: [] },
      { type: 'moon',        label: '🌙 Satélites', bodies: [] },
    ];

    for (const body of this.bodies) {
      if (body.type === 'star') continue;
      const group = groupDefs.find(g => g.type === body.type);
      if (group) group.bodies.push(body);
    }

    // Ordenar dentro de cada grupo: planetas por distancia orbital,
    // lunas por radio descendente (más grande primero)
    for (const group of groupDefs) {
      if (group.type === 'moon') {
        group.bodies.sort((a, b) => b.radiusKm - a.radiusKm);
      } else {
        group.bodies.sort((a, b) => a.semiMajorAxisAu - b.semiMajorAxisAu);
      }
    }

    for (const group of groupDefs) {
      if (group.bodies.length === 0) continue;

      const section = document.createElement('div');
      section.className = 'stats-section';
      section.innerHTML = `<h2 class="stats-section-title">${group.label}</h2>`;

      const list = document.createElement('div');
      list.className = 'stats-list';

      for (const body of group.bodies) {
        const item = document.createElement('button');
        item.className = 'stats-list-item';
        item.type = 'button';
        item.dataset.name = body.name;
        item.innerHTML = `<span class="stats-list-dot type-${body.type}"></span>${body.label}`;

        const slot = document.createElement('div');
        slot.className = 'stats-card-slot';
        slot.dataset.name = body.name;

        item.addEventListener('click', () => {
          if (slot.childElementCount === 0) {
            slot.appendChild(this.createCard(body));
          }
          const open = slot.classList.toggle('open');
          item.classList.toggle('active', open);
        });

        list.appendChild(item);
        list.appendChild(slot);
      }

      section.appendChild(list);
      this.grid.appendChild(section);
    }
  }

  private createCard(body: CelestialBodyData): HTMLElement {
    const card = document.createElement('div');
    card.className = `stats-card type-${body.type}`;
    card.innerHTML = `
      <div class="stats-gallery">
        <div class="stats-img-container">
          <div class="stats-img-placeholder">🔭</div>
        </div>
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

    // Cargar fotos reales locales (assets/photos) en carrusel rotativo
    this.loadPhotos(body, card.querySelector('.stats-gallery') as HTMLElement);
    return card;
  }

  /** Carga las fotos reales de assets/photos/ en un carrusel rotativo. */
  private async loadPhotos(body: CelestialBodyData, gallery: HTMLElement): Promise<void> {
    const cacheKey = body.name;
    if (this.cache.has(cacheKey)) {
      this.renderGallery(gallery, this.cache.get(cacheKey)!);
      return;
    }

    const photos: string[] = [];
    for (let i = 1; i <= 4; i++) {
      photos.push(`/photos/${body.name}-${i}.jpg`);
    }

    // Fallback: si no hay fotos locales, usar la textura del cuerpo
    const hasLocal = body.textures?.diffuse;
    if (!hasLocal && photos.length === 0) {
      this.renderGallery(gallery, []);
      return;
    }

    this.cache.set(cacheKey, photos);
    this.renderGallery(gallery, photos);
  }

  private renderGallery(gallery: HTMLElement, photos: string[]): void {
    gallery.innerHTML = '';

    // Fallback a textura local si no hay fotos
    if (photos.length === 0) {
      const ph = document.createElement('div');
      ph.className = 'stats-img-container';
      ph.innerHTML = '<div class="stats-img-placeholder">🔭</div>';
      gallery.appendChild(ph);
      return;
    }

    const track = document.createElement('div');
    track.className = 'stats-gallery-track';

    let active = 0;
    const slides: { wrap: HTMLElement; img: HTMLImageElement }[] = [];

    for (const src of photos) {
      const wrap = document.createElement('div');
      wrap.className = 'stats-img-container';
      const img = document.createElement('img');
      img.className = 'stats-img';
      img.alt = '';
      img.loading = 'lazy';
      img.src = src;
      img.onerror = () => { wrap.style.display = 'none'; };
      wrap.appendChild(img);
      track.appendChild(wrap);
      slides.push({ wrap, img });
    }

    gallery.appendChild(track);

    // Rotación automática cada 3.5s (solo si hay >1 foto)
    if (slides.length > 1) {
      const timer = window.setInterval(() => {
        slides[active].wrap.classList.remove('active');
        active = (active + 1) % slides.length;
        slides[active].wrap.classList.add('active');
      }, 3500);
      // Limpiar timer si la card se elimina del DOM
      const observer = new MutationObserver(() => {
        if (!gallery.isConnected) {
          window.clearInterval(timer);
          observer.disconnect();
        }
      });
      observer.observe(gallery, { childList: true, subtree: true });
    }

    slides[0].wrap.classList.add('active');
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
