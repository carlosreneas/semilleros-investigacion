import { store, loadAllData, getSemilleroById } from '../state/store.js';
import { actividadesApi } from '../api/actividadesApi.js';
import { confirmDialog } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import {
  escapeHtml,
  openActividadFormModal,
  openSemilleroPreviewModal,
  renderEmptyState,
} from '../ui/components.js';

let filters = {
  query: '',
  semilleroId: '',
  tipoActividadId: '',
};

let viewMode = 'table'; // 'table' | 'cards'

export function renderActividadesView(container) {
  const { actividades, semilleros, tiposActividad } = store;

  const filtered = actividades.filter((a) => {
    const q = filters.query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      a.nombre.toLowerCase().includes(q) ||
      (a.tipoActividadNombre || '').toLowerCase().includes(q) ||
      (a.semilleroSigla || '').toLowerCase().includes(q) ||
      (a.semilleroNombre || '').toLowerCase().includes(q);

    const matchesSemillero =
      !filters.semilleroId || Number(a.semilleroId) === Number(filters.semilleroId);

    const matchesTipo =
      !filters.tipoActividadId || Number(a.tipoActividadId) === Number(filters.tipoActividadId);

    return matchesQuery && matchesSemillero && matchesTipo;
  });

  const semilleroOptions = semilleros
    .map(
      (s) =>
        `<option value="${s.id}" ${Number(filters.semilleroId) === Number(s.id) ? 'selected' : ''}>${escapeHtml(s.sigla)} — ${escapeHtml(s.nombre)}</option>`
    )
    .join('');

  const tipoOptions = tiposActividad
    .map(
      (t) =>
        `<option value="${t.id}" ${Number(filters.tipoActividadId) === Number(t.id) ? 'selected' : ''}>${escapeHtml(t.nombre)}</option>`
    )
    .join('');

  const tableHtml = `
    <div class="table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre de la Actividad</th>
              <th>Semillero</th>
              <th>Tipo de Actividad</th>
              <th style="width: 220px;">% de Cumplimiento</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filtered
              .map(
                (a) => `
              <tr>
                <td>
                  <strong>${escapeHtml(a.nombre)}</strong>
                </td>
                <td>
                  <button type="button" class="semillero-link-btn" data-view-semillero="${a.semilleroId}" title="Ver semillero">
                    <span>${escapeHtml(a.semilleroSigla)}</span>
                  </button>
                </td>
                <td>
                  <span class="badge badge--member">${escapeHtml(a.tipoActividadNombre)}</span>
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="flex: 1; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
                      <div style="width: ${Math.min(100, Math.max(0, a.porcentajeCumplimiento))}%; height: 100%; background: ${a.porcentajeCumplimiento === 100 ? '#16a34a' : 'var(--ufps-red-600)'};"></div>
                    </div>
                    <strong style="min-width: 44px; font-size: 0.88rem; color: ${a.porcentajeCumplimiento === 100 ? '#16a34a' : 'var(--text-primary)'};">
                      ${a.porcentajeCumplimiento}%
                    </strong>
                  </div>
                </td>
                <td style="text-align: right;">
                  <div class="card-actions" style="justify-content: flex-end;">
                    <button type="button" class="btn btn--secondary btn--sm" data-edit-actividad="${a.id}">Editar</button>
                    <button type="button" class="btn btn--danger btn--sm" data-delete-actividad="${a.id}">Eliminar</button>
                  </div>
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  const cardsHtml = `
    <div class="cards-grid">
      ${filtered
        .map(
          (a) => `
        <article class="semillero-card">
          <div class="semillero-card__header">
            <button type="button" class="sigla-badge" style="border: 0; cursor: pointer;" data-view-semillero="${a.semilleroId}" title="Ver semillero">
              ${escapeHtml(a.semilleroSigla)}
            </button>
            <span class="badge badge--member">${escapeHtml(a.tipoActividadNombre)}</span>
          </div>

          <div>
            <h2 class="semillero-card__title">${escapeHtml(a.nombre)}</h2>
            <p class="semillero-card__group">${escapeHtml(a.semilleroNombre)}</p>
          </div>

          <hr class="card-divider" />

          <div class="semillero-card__meta">
            <div class="meta-row" style="flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="meta-row__label">% de Cumplimiento:</span>
                <strong style="color: ${a.porcentajeCumplimiento === 100 ? '#16a34a' : 'var(--text-primary)'};">
                  ${a.porcentajeCumplimiento}%
                </strong>
              </div>
              <div style="height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
                <div style="width: ${Math.min(100, Math.max(0, a.porcentajeCumplimiento))}%; height: 100%; background: ${a.porcentajeCumplimiento === 100 ? '#16a34a' : 'var(--ufps-red-600)'};"></div>
              </div>
            </div>
          </div>

          <div class="semillero-card__footer">
            <a href="#/semilleros/${a.semilleroId}" class="btn btn--soft-red btn--sm">Ver semillero →</a>
            <div class="card-actions">
              <button type="button" class="btn btn--secondary btn--sm" data-edit-actividad="${a.id}">Editar</button>
              <button type="button" class="btn btn--danger btn--sm" data-delete-actividad="${a.id}">Eliminar</button>
            </div>
          </div>
        </article>`
        )
        .join('')}
    </div>`;

  const contentHtml = filtered.length
    ? viewMode === 'table'
      ? tableHtml
      : cardsHtml
    : renderEmptyState(
        'No se encontraron actividades',
        actividades.length
          ? 'Ajusta los filtros de búsqueda para ver otros resultados.'
          : 'Aún no hay actividades registradas en los semilleros.',
        `<button type="button" class="btn btn--primary" id="emptyCreateActividadBtn">+ Registrar actividad</button>`
      );

  container.innerHTML = `
    <section>
      <div class="page-header">
        <div>
          <h1 class="page-title">Otras Actividades de Investigación</h1>
          <p class="page-subtitle">Monitorea y administra eventos, talleres, ferias y espacios de socialización de los semilleros.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn--primary" id="newActividadBtn">+ Nueva Actividad</button>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <span class="search-box__icon">🔍</span>
          <input type="search" class="search-box__input" id="actSearchInput"
            placeholder="Buscar por nombre, tipo o semillero..."
            value="${escapeHtml(filters.query)}" />
        </div>
        <select class="filter-select" id="actSemilleroFilter" aria-label="Filtrar por semillero">
          <option value="">Todos los semilleros</option>
          ${semilleroOptions}
        </select>
        <select class="filter-select" id="actTipoFilter" aria-label="Filtrar por tipo de actividad">
          <option value="">Todos los tipos de actividad</option>
          ${tipoOptions}
        </select>
        <div class="view-toggle" role="group" aria-label="Modo de visualización">
          <button type="button" class="view-toggle__btn ${viewMode === 'cards' ? 'is-active' : ''}" data-view-mode="cards">Tarjetas</button>
          <button type="button" class="view-toggle__btn ${viewMode === 'table' ? 'is-active' : ''}" data-view-mode="table">Tabla</button>
        </div>
      </div>

      ${contentHtml}
    </section>
  `;

  const openNew = () => openActividadFormModal({}, () => renderActividadesView(container));
  container.querySelector('#newActividadBtn')?.addEventListener('click', openNew);
  container.querySelector('#emptyCreateActividadBtn')?.addEventListener('click', openNew);

  const searchInput = container.querySelector('#actSearchInput');
  searchInput?.addEventListener('input', (e) => {
    filters.query = e.target.value;
    renderActividadesView(container);
    const nextInput = container.querySelector('#actSearchInput');
    if (nextInput) {
      nextInput.focus();
      nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
    }
  });

  container.querySelector('#actSemilleroFilter')?.addEventListener('change', (e) => {
    filters.semilleroId = e.target.value;
    renderActividadesView(container);
  });

  container.querySelector('#actTipoFilter')?.addEventListener('change', (e) => {
    filters.tipoActividadId = e.target.value;
    renderActividadesView(container);
  });

  container.querySelectorAll('[data-view-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextMode = btn.dataset.viewMode;
      if (nextMode && nextMode !== viewMode) {
        viewMode = nextMode;
        renderActividadesView(container);
      }
    });
  });

  container.querySelectorAll('[data-view-semillero]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const semillero = getSemilleroById(btn.dataset.viewSemillero);
      openSemilleroPreviewModal(semillero);
    });
  });

  container.querySelectorAll('[data-edit-actividad]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const actividad = store.actividades.find(
        (item) => Number(item.id) === Number(btn.dataset.editActividad)
      );
      if (actividad) {
        openActividadFormModal({ actividad }, () => renderActividadesView(container));
      }
    });
  });

  container.querySelectorAll('[data-delete-actividad]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const actividad = store.actividades.find(
        (item) => Number(item.id) === Number(btn.dataset.deleteActividad)
      );
      if (!actividad) return;

      confirmDialog({
        title: 'Eliminar actividad',
        message: `¿Seguro que deseas eliminar la actividad "${actividad.nombre}"?`,
        onConfirm: async () => {
          try {
            await actividadesApi.remove(actividad.id);
            await loadAllData();
            showToast('Actividad eliminada correctamente', 'success');
            renderActividadesView(container);
          } catch (err) {
            showToast(err.message, 'error');
            throw err;
          }
        },
      });
    });
  });
}

