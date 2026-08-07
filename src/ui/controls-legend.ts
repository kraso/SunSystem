/**
 * Leyenda de controles de la vista, en la esquina inferior izquierda.
 * HTML/CSS vanilla (sin framework, ver AGENTS.md). Usa la tipografía
 * "Audiowide" ya cargada globalmente y un recuadro de bordes sutiles.
 */

export class ControlsLegend {
  constructor() {
    const el = document.createElement('div');
    el.id = 'controls-legend';
    el.className = 'controls-legend';
    el.innerHTML = `
      <div class="legend-title">Controles</div>
      <ul>
        <li><span class="key">Arrastrar</span> Rotar vista</li>
        <li><span class="key">Rueda</span> Zoom</li>
        <li><span class="key">Ctrl + Rueda</span> Zoom rápido</li>
        <li><span class="key">Clic astro</span> Enfocar + info</li>
        <li><span class="key">Espacio</span> Pausar / Reanudar</li>
        <li><span class="key">+ / −</span> Velocidad</li>
        <li><span class="key">0</span> Reiniciar velocidad</li>
        <li><span class="key">Etiquetas</span> Ver nombres</li>
        <li><span class="key">Órbitas</span> Mostrar/ocultar líneas</li>
      </ul>
    `;
    document.body.appendChild(el);
  }
}
