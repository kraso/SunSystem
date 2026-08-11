import phenomenaData from './data/phenomena.json';
import './ui/win-controls';

interface PhenomenonFact {
  label: string;
  value: string;
}

interface PhenomenonSection {
  heading: string;
  body: string;
}

interface Phenomenon {
  slug: string;
  section: 'catastrofes' | 'cuerpos-menores';
  title: string;
  icon: string;
  summary: string;
  image: string;
  tags: string[];
  facts: PhenomenonFact[];
  content: PhenomenonSection[];
}

const ALL = phenomenaData as unknown as Phenomenon[];

/**
 * Renderiza una sección de fenómenos (Catástrofes o Cuerpos menores).
 * @param section Slug de la sección a mostrar.
 */
export function renderPhenomena(section: 'catastrofes' | 'cuerpos-menores'): void {
  const items = ALL.filter((p) => p.section === section);

  function renderList(filter: string): void {
    const list = document.getElementById('phen-list');
    if (!list) return;
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? items.filter((p) =>
          [p.title, p.summary, ...p.tags].join(' ').toLowerCase().includes(q))
      : items;
    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<p class="hint" style="padding:12px;">Sin resultados.</p>';
      return;
    }
    for (const p of filtered) {
      const el = document.createElement('div');
      el.className = 'phen-item';
      el.dataset.slug = p.slug;
      el.innerHTML =
        `<span class="phen-ico">${p.icon}</span>` +
        `<span class="phen-name">${p.title}</span>`;
      el.addEventListener('click', () => showDetail(p.slug));
      list.appendChild(el);
    }
  }

  function showDetail(slug: string): void {
    const p = items.find((x) => x.slug === slug);
    const detail = document.getElementById('phen-detail');
    const empty = document.getElementById('phen-empty');
    if (!p || !detail) return;
    if (empty) empty.style.display = 'none';
    detail.style.display = 'block';

    const photoHtml = p.image
      ? `<img class="phen-photo" src="phenomena-photos/${p.image}" alt="${p.title}" onerror="this.style.display='none'" />`
      : '';

    const factsHtml = p.facts.length
      ? `<div class="phen-facts">` +
        p.facts
          .map(
            (f) =>
              `<div class="phen-fact"><span class="pf-label">${f.label}</span>` +
              `<span class="pf-value">${f.value}</span></div>`
          )
          .join('') +
        `</div>`
      : '';

    const sectionsHtml = p.content
      .map(
        (s) =>
          `<div class="phen-block"><h3>${s.heading}</h3><p>${s.body}</p></div>`
      )
      .join('');

    const tagsHtml = p.tags.length
      ? `<div class="phen-tags">` +
        p.tags.map((t) => `<span class="phen-tag">${t}</span>`).join('') +
        `</div>`
      : '';

    detail.innerHTML =
      photoHtml +
      `<h2 id="phen-title">${p.icon} ${p.title}</h2>` +
      `<p class="phen-summary">${p.summary}</p>` +
      tagsHtml +
      factsHtml +
      sectionsHtml;

    detail.scrollTop = 0;
  }

  const search = document.getElementById('phen-search') as HTMLInputElement | null;
  if (search) {
    search.addEventListener('input', () => renderList(search.value));
  }
  renderList('');
}

renderPhenomena('__SECTION__' as 'catastrofes' | 'cuerpos-menores');