/**
 * Panel de información del cuerpo celeste seleccionado.
 */
export class InfoPanel {
  private panel: HTMLElement;
  private nameEl: HTMLElement;
  private statsEl: HTMLElement;
  private descEl: HTMLElement;

  constructor() {
    this.panel = document.getElementById('info-panel')!;
    this.nameEl = document.getElementById('info-name')!;
    this.statsEl = document.getElementById('info-stats')!;
    this.descEl = document.getElementById('info-desc')!;
  }

  /** Muestra información de un cuerpo celeste */
  show(body: {
    label: string;
    description: string;
    type: string;
    radiusKm: number;
    massKg: number;
    orbitalPeriodDays: number;
    rotationPeriodHours: number;
    densityGcm3: number;
    axialTiltDeg: number;
  }): void {
    this.nameEl.textContent = body.label;
    this.descEl.textContent = body.description;

    const absRotation = Math.abs(body.rotationPeriodHours);

    this.statsEl.innerHTML = `
      <div class="stat">
        <span class="stat-label">Tipo</span>
        <span class="stat-value">${this.translateType(body.type)}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Diámetro</span>
        <span class="stat-value">${(body.radiusKm * 2).toLocaleString()} km</span>
      </div>
      <div class="stat">
        <span class="stat-label">Masa</span>
        <span class="stat-value">${body.massKg.toExponential(2)} kg</span>
      </div>
      <div class="stat">
        <span class="stat-label">Densidad</span>
        <span class="stat-value">${body.densityGcm3.toFixed(2)} g/cm³</span>
      </div>
      <div class="stat">
        <span class="stat-label">Período orbital</span>
        <span class="stat-value">${body.orbitalPeriodDays > 0 ? this.formatDays(body.orbitalPeriodDays) : '—'}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Rotación</span>
        <span class="stat-value">${body.rotationPeriodHours > 0 ? this.formatHours(absRotation) :
          body.rotationPeriodHours < 0 ? this.formatHours(absRotation) + ' (retrógrado)' : '—'}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Inclinación axial</span>
        <span class="stat-value">${body.axialTiltDeg.toFixed(1)}°</span>
      </div>
    `;

    this.panel.classList.remove('hidden');
  }

  /** Oculta el panel */
  hide(): void {
    this.panel.classList.add('hidden');
  }

  /** Alterna visibilidad */
  toggle(): void {
    this.panel.classList.toggle('hidden');
  }

  private translateType(type: string): string {
    const map: Record<string, string> = {
      star: 'Estrella',
      terrestrial: 'Planeta rocoso',
      gas_giant: 'Gigante gaseoso',
      ice_giant: 'Gigante de hielo',
      dwarf_planet: 'Planeta enano',
      moon: 'Luna / Satélite',
    };
    return map[type] ?? type;
  }

  private formatDays(days: number): string {
    if (days < 2) return `${(days * 24).toFixed(1)} horas`;
    if (days < 365) return `${days.toFixed(1)} días`;
    return `${(days / 365.25).toFixed(2)} años`;
  }

  private formatHours(hours: number): string {
    if (hours < 1) return `${(hours * 60).toFixed(0)} min`;
    if (hours < 24) return `${hours.toFixed(1)} horas`;
    return `${(hours / 24).toFixed(1)} días`;
  }
}
