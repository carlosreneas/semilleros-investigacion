import { store, getSemilleroById } from './state/store.js';
import { escapeHtml } from './ui/components.js';
import { renderSemillerosView } from './views/semillerosView.js';
import { renderSemilleroDetailView } from './views/semilleroDetailView.js';
import { renderIntegrantesView } from './views/integrantesView.js';
import { renderProductosView } from './views/productosView.js';
import { renderActividadesView } from './views/actividadesView.js';
import { renderDirectoresView } from './views/directoresView.js';
import { renderLineasView } from './views/lineasView.js';
import { renderTiposActividadView } from './views/tiposActividadView.js';

function updateNavActive(routeKey) {
  document.querySelectorAll('.nav-link[data-route]').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.route === routeKey);
  });
}

function updateBreadcrumb(items) {
  const el = document.getElementById('topbarBreadcrumb');
  if (!el) return;

  el.innerHTML = items
    .map((item, idx) => {
      const isLast = idx === items.length - 1;
      if (isLast || !item.href) {
        return `<span class="breadcrumb__item is-active">${escapeHtml(item.label)}</span>`;
      }
      return `<a class="breadcrumb__link" href="${item.href}">${escapeHtml(item.label)}</a><span class="breadcrumb__sep">/</span>`;
    })
    .join('');
}

export function renderCurrentRoute() {
  const container = document.getElementById('appView');
  if (!container) return;

  if (!store.apiOnline && store.lastError) {
    container.innerHTML = `
      <div class="empty-state">
        <h2 class="empty-state__title">No hay conexión con el backend</h2>
        <p>${escapeHtml(store.lastError)}</p>
        <div class="mt-2">
          <button type="button" class="btn btn--primary" id="retryConnectionBtn">Reintentar conexión</button>
        </div>
      </div>
    `;
    container.querySelector('#retryConnectionBtn')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('app:refresh'));
    });
    return;
  }

  const hash = window.location.hash || '#/semilleros';
  const clean = hash.replace(/^#\/?/, '');
  const [section, param] = clean.split('/');

  if (section === 'semilleros' && param) {
    const sem = getSemilleroById(param);
    updateNavActive('semilleros');
    updateBreadcrumb([
      { label: 'Semilleros', href: '#/semilleros' },
      { label: sem ? `${sem.sigla} · ${sem.nombre}` : `Semillero #${param}` },
    ]);
    renderSemilleroDetailView(container, param);
    return;
  }

  if (section === 'integrantes') {
    updateNavActive('integrantes');
    updateBreadcrumb([{ label: 'Integrantes de Semilleros' }]);
    renderIntegrantesView(container);
    return;
  }

  if (section === 'productos') {
    updateNavActive('productos');
    updateBreadcrumb([{ label: 'Productos de Investigación' }]);
    renderProductosView(container);
    return;
  }

  if (section === 'actividades') {
    updateNavActive('actividades');
    updateBreadcrumb([{ label: 'Otras Actividades de Investigación' }]);
    renderActividadesView(container);
    return;
  }

  if (section === 'lineas') {
    updateNavActive('lineas');
    updateBreadcrumb([{ label: 'Líneas de Investigación' }]);
    renderLineasView(container);
    return;
  }

  if (section === 'tipos-actividad') {
    updateNavActive('tipos-actividad');
    updateBreadcrumb([{ label: 'Tipos de Actividad' }]);
    renderTiposActividadView(container);
    return;
  }

  if (section === 'directores') {
    updateNavActive('directores');
    updateBreadcrumb([{ label: 'Directores de Semilleros' }]);
    renderDirectoresView(container);
    return;
  }

  updateNavActive('semilleros');
  updateBreadcrumb([{ label: 'Semilleros de Investigación' }]);
  renderSemillerosView(container);
}

