/**
 * Atajos de teclado para la simulación.
 *
 * - Espacio: pausar/reanudar
 * - + / =: acelerar
 * - -: desacelerar
 * - 0: resetear velocidad a 1 día/s
 * - R: reiniciar simulación
 * - F: ajustar cámara a vista frontal (top-down)
 */


export interface KeyboardConfig {
  onPauseToggle: () => void;
  onSpeedChange: (factor: number) => void;
  onReset: () => void;
}

export function bindKeyboard(config: KeyboardConfig): void {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    // Ignorar si el foco está en un input
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        config.onPauseToggle();
        break;
      case '+':
      case '=':
        e.preventDefault();
        config.onSpeedChange(2);
        break;
      case '-':
        e.preventDefault();
        config.onSpeedChange(0.5);
        break;
      case '0':
        e.preventDefault();
        config.onReset();
        break;
    }
  });
}
