import { MoonPanel } from './ui/moon-panel';
import './ui/win-controls';

const container = document.getElementById('moon-content');
if (container) {
  new MoonPanel(container);
}
