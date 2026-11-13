import { store, loadAllData } from '../state/store.js';
import { tiposActividadApi } from '../api/tiposActividadApi.js';
import { confirmDialog } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml, openTipoActividadFormModal, renderEmptyState } from '../ui/components.js';

let searchQuery = '';

export function renderTiposActividadView(container) {
  const { tiposActividad, actividades } = store;
  const q = searchQuery.trim().toLowerCase();

  const filtered = tiposActividad.filter(
    (t) => !q || t.nombre.toLowerCase().includes(q)
  );

  const rowsHtml = filtered.length
    ? `
      <div class="table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tipo de Actividad</th>
                <th>Actividades Registradas</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${filtered
                .map((t) => {
                  const count = actividades.filter((a) => Number(a.tipoActividadId) === Number(t.id)).length;
                  return `
                  <tr>
                    <td>
                      <div class="table-title"><strong>${escapeHtml(t.nombre)}</strong></div>
                    </td>
                    <td>
                      <span class="badge badge--member">${count} actividad${count === 1 ? '' : 'es'}</span>
                    </td>
                    <td style="text-align: right;">
                      <div class="card-actions" style="justify-content: flex-end;">
                        <button type="button" class="btn btn--secondary btn--sm" data-edit-tipo="${t.id}">Editar</button>
                        <button type="button" class="btn btn--danger btn--sm" data-delete-tipo="${t.id}">Eliminar</button>
                      </div>
                    </td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>`
    : renderEmptyState(
        'No se encontraron tipos de actividad',
        tiposActividad.length
          ? 'Intenta con otro término de búsqueda.'
          : 'Aún no hay tipos de actividad registrados en el catálogo.',
        `<button type="button" class="btn btn--primary" id="emptyCreateTipoBtn">+ Crear primer tipo</button>`
      );

  container.innerHTML = `
    <section>
      <div class="page-header">
        <div>
          <h1 class="page-title">Tipos de Actividad</h1>
          <p class="page-subtitle">Catálogo institucional para clasificar las actividades de investigación desarrolladas por los semilleros.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn--primary" id="newTipoBtn">+ Nuevo Tipo de Actividad</button>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <span class="search-box__icon">🔍</span>
          <input type="search" class="search-box__input" id="tipoSearchInput"
            placeholder="Buscar por nombre de tipo de actividad..."
            value="${escapeHtml(searchQuery)}" />
        </div>
      </div>

      ${rowsHtml}
    </section>
  `;

  const openNew = () => openTipoActividadFormModal(null, () => renderTiposActividadView(container));
  container.querySelector('#newTipoBtn')?.addEventListener('click', openNew);
  container.querySelector('#emptyCreateTipoBtn')?.addEventListener('click', openNew);

  const searchInput = container.querySelector('#tipoSearchInput');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderTiposActividadView(container);
    const next = container.querySelector('#tipoSearchInput');
    if (next) {
      next.focus();
      next.setSelectionRange(next.value.length, next.value.length);
    }
  });

  container.querySelectorAll('[data-edit-tipo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tipo = store.tiposActividad.find((item) => Number(item.id) === Number(btn.dataset.editTipo));
      if (tipo) {
        openTipoActividadFormModal(tipo, () => renderTiposActividadView(container));
      }
    });
  });

  container.querySelectorAll('[data-delete-tipo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tipo = store.tiposActividad.find((item) => Number(item.id) === Number(btn.dataset.deleteTipo));
      if (!tipo) return;

      confirmDialog({
        title: `Eliminar tipo de actividad`,
        message: `¿Seguro que deseas eliminar "${tipo.nombre}"? Esta acción solo se permite si no tiene actividades asociadas.`,
        onConfirm: async () => {
          try {
            await tiposActividadApi.remove(tipo.id);
            await loadAllData();
            showToast('Tipo de actividad eliminado', 'success');
            renderTiposActividadView(container);
          } catch (err) {
            showToast(err.message, 'error');
            throw err;
          }
        },
      });
    });
  });
}

