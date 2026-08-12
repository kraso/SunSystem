import { StatsPanel } from './ui/stats-panel';
import celestialBodiesData from './data/celestial-bodies.json';
import type { CelestialBodyData } from './core/types';
import './ui/win-controls';

const container = document.getElementById('stats-content');
if (container) {
  new StatsPanel(celestialBodiesData as CelestialBodyData[], container);
}
