import { store, loadAllData, getIntegrantesBySemillero } from '../state/store.js';
import { resolveFileUrl } from '../config.js';
import { semillerosApi } from '../api/semillerosApi.js';
import { confirmDialog } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import {
  escapeHtml,
  openSemilleroFormModal,
  renderEmptyState,
  resolveImageUrl,
} from '../ui/components.js';

let filters = {
  query: '',
  lineaId: '',
  directorId: '',
  grupoId: '',
};

let viewMode = 'table'; // 'table' | 'cards'

export function renderSemillerosView(container) {
  const { semilleros, integrantes, lineas, directores, gruposInvestigacion } = store;

  const filtered = semilleros.filter((s) => {
    const q = filters.query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      s.nombre.toLowerCase().includes(q) ||
      s.sigla.toLowerCase().includes(q) ||
      (s.grupoInvestigacion?.nombre || '').toLowerCase().includes(q) ||
      (s.grupoInvestigacion?.sigla || '').toLowerCase().includes(q) ||
      (s.director?.nombre || '').toLowerCase().includes(q);

    const matchesLinea =
      !filters.lineaId ||
      (s.lineas || []).some((l) => Number(l.id) === Number(filters.lineaId));

    const matchesDirector =
      !filters.directorId ||
      Number(s.director?.id) === Number(filters.directorId);

    const matchesGrupo =
      !filters.grupoId ||
      Number(s.grupoInvestigacion?.id) === Number(filters.grupoId);

    return matchesQuery && matchesLinea && matchesDirector && matchesGrupo;
  });

  const lineaOptions = lineas
    .map(
      (l) =>
        `<option value="${l.id}" ${Number(filters.lineaId) === Number(l.id) ? 'selected' : ''}>${escapeHtml(l.nombre)}</option>`
    )
    .join('');

  const directorOptions = directores
    .map(
      (d) =>
        `<option value="${d.id}" ${Number(filters.directorId) === Number(d.id) ? 'selected' : ''}>${escapeHtml(d.nombre)}</option>`
    )
    .join('');

  const grupoOptions = (gruposInvestigacion || [])
    .map(
      (g) =>
        `<option value="${g.id}" ${Number(filters.grupoId) === Number(g.id) ? 'selected' : ''}>${escapeHtml(g.sigla)} - ${escapeHtml(g.nombre)}</option>`
    )
    .join('');

  const cardsHtml = `
    <div class="cards-grid">
      ${filtered
      .map((s) => {
        const count = getIntegrantesBySemillero(s.id).length;
        const lineasHtml = (s.lineas || []).length
          ? s.lineas.map((l) => `<span class="tag">${escapeHtml(l.nombre)}</span>`).join('')
          : '<span class="text-sm text-muted">Sin líneas asociadas</span>';

        return `
            <article class="semillero-card" data-semillero-id="${s.id}">
              ${s.fotoUrl ? `
                <div class="semillero-card__banner" data-action="open" data-id="${s.id}" title="Ver semillero">
                  <img src="${escapeHtml(resolveImageUrl(s.fotoUrl))}" alt="${escapeHtml(s.nombre)}" class="semillero-card__banner-img" loading="lazy" onerror="this.parentElement.style.display='none'" />
                </div>
              ` : ''}
              <div class="semillero-card__header">
                <div style="display: flex; align-items: center; gap: 10px;">
                  ${s.logoUrl
            ? `<img src="${escapeHtml(resolveFileUrl(s.logoUrl))}" alt="${escapeHtml(s.sigla)}" style="width: 36px; height: 36px; object-fit: contain; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: #fff; padding: 2px;" />`
            : ''
          }
                  <span class="sigla-badge">${escapeHtml(s.sigla)}</span>
                </div>
                <div class="card-actions">
                  <button type="button" class="btn btn--secondary btn--sm" data-action="edit" data-id="${s.id}">
                    Editar
                  </button>
                  <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${s.id}">
                    Eliminar
                  </button>
                </div>
              </div>

              <div>
                <h2 class="semillero-card__title" data-action="open" data-id="${s.id}">
                  ${escapeHtml(s.nombre)}
                </h2>
                <p class="semillero-card__group">
                  ${s.grupoInvestigacion?.sigla ? `<span class="badge badge--neutral">${escapeHtml(s.grupoInvestigacion.sigla)}</span> ` : ''}${escapeHtml(s.grupoInvestigacion?.nombre || 'Grupo no asignado')}
                </p>
              </div>

              <div class="semillero-card__meta">
                <div class="meta-row">
                  <span class="meta-row__label">Director</span>
                  <span class="meta-row__value">${escapeHtml(s.director?.nombre || 'No asignado')}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-row__label">Integrantes</span>
                  <span class="meta-row__value">${count} registrado${count === 1 ? '' : 's'}</span>
                </div>
              </div>

              <div class="tags-wrap">${lineasHtml}</div>

              <div class="semillero-card__footer">
                <span class="text-sm text-muted">${(s.lineas || []).length} línea(s)</span>
                <a href="#/semilleros/${s.id}" class="btn btn--soft-red btn--sm">
                  Ver líneas e integrantes →
                </a>
              </div>
            </article>
          `;
      })
      .join('')}
    </div>`;

  const tableHtml = `
    <div class="table-card">
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Semillero</th>
              <th>Director</th>
              <th>Integrantes</th>
              <th>Líneas de Investigación</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filtered
      .map((s) => {
        const count = getIntegrantesBySemillero(s.id).length;
        const lineasTags = (s.lineas || []).length
          ? s.lineas.map((l) => `<span class="tag"><span>${escapeHtml(l.nombre)}</span></span>`).join('')
          : '<span class="text-sm text-muted">Sin líneas asociadas</span>';

        return `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      ${s.logoUrl
                        ? `<img src="${escapeHtml(resolveFileUrl(s.logoUrl))}" alt="${escapeHtml(s.sigla)}" style="width: 34px; height: 34px; object-fit: contain; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: #fff; padding: 2px; flex-shrink: 0;" />`
                        : (s.fotoUrl ? `<img src="${escapeHtml(resolveImageUrl(s.fotoUrl))}" alt="${escapeHtml(s.sigla)}" class="semillero-table-thumb" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-flex';" />` : '')
                      }
                      <span class="sigla-badge">${escapeHtml(s.sigla)}</span>
                      <div>
                        <strong style="cursor: pointer;" data-action="open" data-id="${s.id}">
                          ${escapeHtml(s.nombre)}
                        </strong>
                        <div class="text-sm text-muted">
                          ${escapeHtml(s.grupoInvestigacion?.sigla ? `${s.grupoInvestigacion.sigla} · ${s.grupoInvestigacion.nombre}` : (s.grupoInvestigacion?.nombre || ''))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div><strong>${escapeHtml(s.director?.nombre || 'No asignado')}</strong></div>
                    <div class="text-sm text-muted">${escapeHtml(s.director?.correo || '')}</div>
                  </td>
                  <td>
                    <span class="badge badge--member">${count} registrado${count === 1 ? '' : 's'}</span>
                  </td>
                  <td>
                    <div class="tags-wrap">${lineasTags}</div>
                  </td>
                  <td style="text-align: right;">
                    <div class="card-actions" style="justify-content: flex-end;">
                      <a href="#/semilleros/${s.id}" class="btn btn--soft-red btn--sm" title="Ver líneas e integrantes">
                        Ver detalle →
                      </a>
                      <button type="button" class="btn btn--secondary btn--sm" data-action="edit" data-id="${s.id}">
                        Editar
                      </button>
                      <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${s.id}">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>`;
      })
      .join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  const contentHtml = filtered.length
    ? viewMode === 'table'
      ? tableHtml
      : cardsHtml
    : renderEmptyState(
      'No se encontraron semilleros',
      semilleros.length
        ? 'Prueba ajustando los filtros o el término de búsqueda.'
        : 'Aún no hay semilleros registrados en la base de datos.',
      `<button type="button" class="btn btn--primary" id="emptyCreateSemilleroBtn">+ Crear primer semillero</button>`
    );

  container.innerHTML = `
    <section>
      <div class="page-header">
        <div>
          <h1 class="page-title">Semilleros de Investigación</h1>
          <p class="page-subtitle">Explora, administra y consulta líneas e integrantes de los semilleros UFPS Cúcuta.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn--primary" id="newSemilleroBtn">+ Nuevo Semillero</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Semilleros Activos</span>
          <span class="kpi-value">${semilleros.length}</span>
          <span class="kpi-hint">Registrados en el sistema</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Integrantes</span>
          <span class="kpi-value">${integrantes.length}</span>
          <span class="kpi-hint">Estudiantes vinculados</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Líneas de Investigación</span>
          <span class="kpi-value">${lineas.length}</span>
          <span class="kpi-hint">Áreas temáticas disponibles</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Directores</span>
          <span class="kpi-value">${directores.length}</span>
          <span class="kpi-hint">Docentes responsables</span>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <span class="search-box__icon">🔍</span>
          <input type="search" class="search-box__input" id="semSearchInput"
            placeholder="Buscar por nombre, sigla, grupo o director..."
            value="${escapeHtml(filters.query)}" />
        </div>
        <select class="filter-select" id="semLineaFilter" aria-label="Filtrar por línea">
          <option value="">Todas las líneas</option>
          ${lineaOptions}
        </select>
        <select class="filter-select" id="semDirectorFilter" aria-label="Filtrar por director">
          <option value="">Todos los directores</option>
          ${directorOptions}
        </select>
        <select class="filter-select" id="semGrupoFilter" aria-label="Filtrar por grupo de investigación">
          <option value="">Todos los grupos</option>
          ${grupoOptions}
        </select>
        <div class="view-toggle" role="group" aria-label="Modo de visualización">
          <button type="button" class="view-toggle__btn ${viewMode === 'cards' ? 'is-active' : ''}" data-view-mode="cards">Tarjetas</button>
          <button type="button" class="view-toggle__btn ${viewMode === 'table' ? 'is-active' : ''}" data-view-mode="table">Tabla</button>
        </div>
      </div>

      ${contentHtml}
    </section>
  `;

  // Eventos de creación y filtros
  container.querySelector('#newSemilleroBtn')?.addEventListener('click', () => {
    openSemilleroFormModal(null, () => renderSemillerosView(container));
  });

  container.querySelector('#emptyCreateSemilleroBtn')?.addEventListener('click', () => {
    openSemilleroFormModal(null, () => renderSemillerosView(container));
  });

  const searchInput = container.querySelector('#semSearchInput');
  searchInput?.addEventListener('input', (e) => {
    filters.query = e.target.value;
    renderSemillerosView(container);
    const nextInput = container.querySelector('#semSearchInput');
    if (nextInput) {
      nextInput.focus();
      nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
    }
  });

  container.querySelector('#semLineaFilter')?.addEventListener('change', (e) => {
    filters.lineaId = e.target.value;
    renderSemillerosView(container);
  });

  container.querySelector('#semDirectorFilter')?.addEventListener('change', (e) => {
    filters.directorId = e.target.value;
    renderSemillerosView(container);
  });

  container.querySelector('#semGrupoFilter')?.addEventListener('change', (e) => {
    filters.grupoId = e.target.value;
    renderSemillerosView(container);
  });

  container.querySelectorAll('[data-view-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextMode = btn.dataset.viewMode;
      if (nextMode && nextMode !== viewMode) {
        viewMode = nextMode;
        renderSemillerosView(container);
      }
    });
  });

  // Acciones en tarjetas
  container.querySelectorAll('[data-action="open"]').forEach((el) => {
    el.addEventListener('click', () => {
      window.location.hash = `#/semilleros/${el.dataset.id}`;
    });
  });

  container.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sem = store.semilleros.find((item) => Number(item.id) === Number(btn.dataset.id));
      if (sem) {
        openSemilleroFormModal(sem, () => renderSemillerosView(container));
      }
    });
  });

  container.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sem = store.semilleros.find((item) => Number(item.id) === Number(btn.dataset.id));
      if (!sem) return;

      confirmDialog({
        title: `Eliminar semillero ${sem.sigla}`,
        message: `¿Seguro que deseas eliminar "${sem.nombre}"? Esta acción eliminará también sus asociaciones y no se puede deshacer.`,
        onConfirm: async () => {
          try {
            await semillerosApi.remove(sem.id);
            await loadAllData();
            showToast('Semillero eliminado', 'success');
            renderSemillerosView(container);
          } catch (err) {
            showToast(err.message, 'error');
            throw err;
          }
        },
      });
    });
  });
}

