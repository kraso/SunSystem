import type { ProvinceData } from '../core/types';

/**
 * Panel/controlador de la vista Planetario.
 *
 * Crea el botón "Planetario" (top-bar), el selector de provincia, un control
 * de fecha/hora y toggles para constelaciones y cielo profundo. Activa/desactiva
 * la cúpula celeste en la escena principal.
 */
export class PlanetariumPanel {
  private active = false;
  private onToggle: (active: boolean) => void;
  private onProvince: (p: ProvinceData) => void;
  private onDate: (d: Date) => void;
  private onLines: (v: boolean) => void;
  private onDeepSky: (v: boolean) => void;
  private btn: HTMLButtonElement | null = null;
  private dateInput: HTMLInputElement | null = null;

  constructor(opts: {
    provinces: ProvinceData[];
    onToggle: (active: boolean) => void;
    onProvince: (p: ProvinceData) => void;
    onDate: (d: Date) => void;
    onLines: (v: boolean) => void;
    onDeepSky: (v: boolean) => void;
  }) {
    this.onToggle = opts.onToggle;
    this.onProvince = opts.onProvince;
    this.onDate = opts.onDate;
    this.onLines = opts.onLines;
    this.onDeepSky = opts.onDeepSky;
    this.build(opts.provinces);
  }

  private build(provinces: ProvinceData[]): void {
    // Botón en top-bar
    const btn = document.createElement('button');
    btn.id = 'btn-planetario';
    btn.className = 'btn-hud';
    btn.title = 'Vista Planetario (cúpula celeste)';
    btn.innerHTML = '<span class="ico">🌌</span> Planetario';
    btn.addEventListener('click', () => this.toggle());
    document.getElementById('top-bar')?.appendChild(btn);
    this.btn = btn;

    // Selector de provincia en top-bar
    const sel = document.createElement('select');
    sel.id = 'province-select';
    sel.className = 'btn-hud';
    sel.title = 'Provincia (cielo observable)';
    for (const p of provinces) {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      sel.appendChild(opt);
    }
    sel.value = 'Madrid';
    sel.addEventListener('change', () => {
      const p = provinces.find((x) => x.name === sel.value);
      if (p) this.onProvince(p);
    });
    document.getElementById('top-bar')?.appendChild(sel);

    // Panel de control (oculto hasta activar)
    const panel = document.createElement('div');
    panel.id = 'planetario-controls';
    panel.className = 'hidden';
    panel.innerHTML = `
      <div class="pl-row">
        <label>Hora local</label>
        <input type="datetime-local" id="pl-datetime" />
      </div>
      <div class="pl-row">
        <label><input type="checkbox" id="pl-lines" checked /> Constelaciones</label>
        <label><input type="checkbox" id="pl-deepsky" checked /> Cielo profundo</label>
      </div>
      <div class="pl-hint">Arrastra para mirar el cielo · rueda para zoom</div>
    `;
    document.body.appendChild(panel);
    this.dateInput = panel.querySelector('#pl-datetime') as HTMLInputElement;

    // Inicializar con now local
    this.setDateTimeInput(new Date());
    this.dateInput?.addEventListener('change', () => {
      if (!this.dateInput?.value) return;
      const d = new Date(this.dateInput.value);
      this.onDate(d);
    });
    (panel.querySelector('#pl-lines') as HTMLInputElement)?.addEventListener('change', (e) => {
      this.onLines((e.target as HTMLInputElement).checked);
    });
    (panel.querySelector('#pl-deepsky') as HTMLInputElement)?.addEventListener('change', (e) => {
      this.onDeepSky((e.target as HTMLInputElement).checked);
    });
  }

  private setDateTimeInput(d: Date): void {
    if (!this.dateInput) return;
    const pad = (n: number) => String(n).padStart(2, '0');
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    this.dateInput.value = local;
  }

  private toggle(): void {
    this.active = !this.active;
    this.btn?.classList.toggle('active', this.active);
    document.getElementById('planetario-controls')?.classList.toggle('hidden', !this.active);
    this.onToggle(this.active);
    if (this.active) this.setDateTimeInput(new Date());
  }

  isActive(): boolean {
    return this.active;
  }
}
