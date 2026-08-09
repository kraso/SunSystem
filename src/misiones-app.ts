import missionsData from './data/missions.json';
import './ui/win-controls';

interface Mission {
  id: string;
  name: string;
  date: string;
  endDate?: string;
  agency: string;
  type: string;
  status: 'success' | 'failure' | 'partial';
  crew: string[];
  objectives: string;
  result: string;
  details: string;
  reference: string;
  image?: string;
}

const missions = missionsData as unknown as Mission[];

// Orden cronológico ascendente (histórico)
const sorted = [...missions].sort((a, b) => a.date.localeCompare(b.date));

const STATUS_LABEL: Record<string, string> = {
  success: 'Éxito',
  failure: 'Fallida',
  partial: 'Parcial',
};
const STATUS_CLASS: Record<string, string> = {
  success: 'st-success',
  failure: 'st-failure',
  partial: 'st-partial',
};

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderList(filter: string): void {
  const list = document.getElementById('missions-list');
  if (!list) return;
  const q = filter.trim().toLowerCase();
  const items = sorted.filter((m) => {
    if (!q) return true;
    const hay = [
      m.name, m.agency, m.type, STATUS_LABEL[m.status], m.objectives, m.result, m.details,
      ...m.crew,
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });
  list.innerHTML = '';
  if (!items.length) {
    list.innerHTML = '<p class="hint" style="padding:12px;">Sin resultados.</p>';
    return;
  }
  for (const m of items) {
    const el = document.createElement('div');
    el.className = 'mission-item';
    el.dataset.id = m.id;
    el.innerHTML =
      `<div class="mission-item-top">` +
        `<span class="mission-date">${fmtDate(m.date)}</span>` +
        `<span class="mission-status ${STATUS_CLASS[m.status]}">${STATUS_LABEL[m.status]}</span>` +
      `</div>` +
      `<div class="mission-name">${m.name}</div>` +
      `<div class="mission-meta">${m.agency} · ${m.type}</div>`;
    el.addEventListener('click', () => showDetail(m.id));
    list.appendChild(el);
  }
}

function showDetail(id: string): void {
  const m = missions.find((x) => x.id === id);
  const detail = document.getElementById('mission-detail');
  const empty = document.getElementById('mission-empty');
  if (!m || !detail) return;
  if (empty) empty.style.display = 'none';
  detail.style.display = 'block';
  const photoHtml = m.image
    ? `<img class="mission-photo" src="mission-photos/${m.image}" alt="${m.name}" onerror="this.style.display='none'" />`
    : '';
  const crewHtml = m.crew.length
    ? `<div class="mission-field"><span class="mf-label">Tripulación</span>` +
      `<span class="mf-value">${m.crew.join(', ')}</span></div>`
    : `<div class="mission-field"><span class="mf-label">Tripulación</span>` +
      `<span class="mf-value">No tripulada</span></div>`;
  detail.innerHTML =
    photoHtml +
    `<h2 id="mission-title">${m.name}</h2>` +
    `<div class="mission-badges">` +
      `<span class="mission-status ${STATUS_CLASS[m.status]}">${STATUS_LABEL[m.status]}</span>` +
      `<span class="mission-tag">${m.type}</span>` +
      `<span class="mission-tag">${m.agency}</span>` +
    `</div>` +
    `<div class="mission-field"><span class="mf-label">Fecha</span>` +
      `<span class="mf-value">${fmtDate(m.date)}${m.endDate ? ' — ' + (m.endDate === 'En servicio' || m.endDate === 'En ruta' ? m.endDate : fmtDate(m.endDate)) : ''}</span></div>` +
    crewHtml +
    `<div class="mission-field"><span class="mf-label">Objetivos</span><span class="mf-value">${m.objectives}</span></div>` +
    `<div class="mission-field"><span class="mf-label">Resultado</span><span class="mf-value">${m.result}</span></div>` +
    `<div class="mission-field"><span class="mf-label">Detalles</span><span class="mf-value">${m.details}</span></div>` +
    `<div class="mission-field"><span class="mf-label">Fuente</span><span class="mf-value mission-ref">${m.reference}</span></div>`;
}

function main(): void {
  const search = document.getElementById('missions-search') as HTMLInputElement | null;
  if (search) {
    search.addEventListener('input', () => renderList(search.value));
  }
  renderList('');
}

main();
