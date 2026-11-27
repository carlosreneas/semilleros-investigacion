import { store, loadAllData } from '../state/store.js';
import { programasApi } from '../api/programasApi.js';
import { openModal, closeModal, confirmDialog } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml, renderEmptyState } from '../ui/components.js';

let searchQuery = '';

export function openProgramaModal(programa = null, onSaved) {
  const isEdit = Boolean(programa);

  const facultadOptions = (store.facultades || [])
    .map(
      (f) => `
      <option value="${f.id}" ${Number(programa?.facultad?.id) === Number(f.id) ? 'selected' : ''}>
        ${escapeHtml(f.sigla)} - ${escapeHtml(f.nombre)}
      </option>`
    )
    .join('');

  openModal({
    title: isEdit ? 'Editar Programa Académico' : 'Nuevo Programa Académico',
    size: 'sm',
    bodyHtml: `
      <form id="programaForm" class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label" for="progNombre">Nombre del programa académico *</label>
          <input
            class="form-control"
            id="progNombre"
            name="nombre"
            required
            maxlength="160"
            value="${escapeHtml(programa?.nombre || '')}"
            placeholder="Ej. Ingeniería de Sistemas"
            autofocus
          />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="progFacultad">Facultad a la que pertenece</label>
          <select class="form-control" id="progFacultad" name="facultadId">
            <option value="">Seleccione una facultad...</option>
            ${facultadOptions}
          </select>
        </div>
        <div class="form-field form-field--full" id="progFormError"></div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn--secondary" data-modal-close>Cancelar</button>
      <button type="submit" form="programaForm" class="btn btn--primary" id="saveProgBtn">
        ${isEdit ? 'Guardar cambios' : 'Crear programa'}
      </button>
    `,
    onMount: (backdrop) => {
      const form = backdrop.querySelector('#programaForm');
      const errorBox = backdrop.querySelector('#progFormError');
      const saveBtn = backdrop.querySelector('#saveProgBtn');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.innerHTML = '';
        const fd = new FormData(form);
        const facVal = fd.get('facultadId');
        const payload = {
          nombre: String(fd.get('nombre') || '').trim(),
          facultadId: facVal ? Number(facVal) : null,
        };

        if (!payload.nombre) {
          errorBox.innerHTML = '<div class="form-error">El nombre del programa es obligatorio</div>';
          return;
        }

        saveBtn.disabled = true;
        try {
          if (isEdit) {
            await programasApi.update(programa.id, payload);
            showToast('Programa académico actualizado exitosamente', 'success');
          } else {
            await programasApi.create(payload);
            showToast('Programa académico creado exitosamente', 'success');
          }
          await loadAllData();
          closeModal();
          if (onSaved) onSaved();
        } catch (err) {
          errorBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
          saveBtn.disabled = false;
        }
      });
    },
  });
}

export function renderProgramasView(container) {
  const { programas, integrantes, semilleros } = store;
  const q = searchQuery.trim().toLowerCase();

  const filtered = programas.filter(
    (p) => !q || p.nombre.toLowerCase().includes(q)
  );

  const totalEstudiantes = integrantes.filter((i) => i.programaId).length;

  const rowsHtml = filtered.length
    ? `
      <div class="table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 80px;">ID</th>
                <th>Programa Académico</th>
                <th>Facultad</th>
                <th>Estudiantes Vinculados</th>
                <th>Semilleros con Estudiantes</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${filtered
                .map((p) => {
                  const students = integrantes.filter((i) => Number(i.programaId) === Number(p.id));
                  const semilleroIds = new Set(students.map((i) => i.semilleroId).filter(Boolean));
                  const associatedSemilleros = semilleros.filter((s) => semilleroIds.has(s.id));

                  const semBadges = associatedSemilleros.length
                    ? associatedSemilleros
                        .map(
                          (s) =>
                            `<a href="#/semilleros/${s.id}" class="semillero-link-btn" style="margin-right: 4px;" title="${escapeHtml(s.nombre)}">
                              <span>${escapeHtml(s.sigla)}</span>
                            </a>`
                        )
                        .join('')
                    : '<span class="text-sm text-muted">Sin semilleros vinculados</span>';

                  return `
                  <tr>
                    <td><code>#${p.id}</code></td>
                    <td>
                      <div class="table-title"><strong>${escapeHtml(p.nombre)}</strong></div>
                    </td>
                    <td>
                      ${p.facultad
                        ? `<span class="sigla-badge" style="margin-right: 4px;">${escapeHtml(p.facultad.sigla)}</span><span class="text-sm">${escapeHtml(p.facultad.nombre)}</span>`
                        : '<span class="text-sm text-muted">Sin facultad</span>'
                      }
                    </td>
                    <td>
                      <span class="badge ${students.length > 0 ? 'badge--member' : ''}" style="${students.length === 0 ? 'background: #f1f5f9; color: #64748b;' : ''}">
                        🎓 ${students.length} estudiante${students.length === 1 ? '' : 's'}
                      </span>
                    </td>
                    <td>${semBadges}</td>
                    <td style="text-align: right;">
                      <div class="card-actions" style="justify-content: flex-end;">
                        <button type="button" class="btn btn--secondary btn--sm" data-edit-prog="${p.id}">Editar</button>
                        <button type="button" class="btn btn--danger btn--sm" data-delete-prog="${p.id}">Eliminar</button>
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
        'No se encontraron programas académicos',
        programas.length
          ? 'Intenta con otro término de búsqueda.'
          : 'Aún no hay programas académicos registrados en el catálogo.',
        `<button type="button" class="btn btn--primary" id="emptyCreateProgBtn">+ Crear Primer Programa</button>`
      );

  container.innerHTML = `
    <section>
      <div class="page-header">
        <div>
          <h1 class="page-title">Programas Académicos UFPS</h1>
          <p class="page-subtitle">Catálogo institucional de carreras de pregrado y posgrado a las que pertenecen los integrantes de los semilleros.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn--primary" id="newProgBtn">+ Nuevo Programa</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Total Programas</span>
          <span class="kpi-value">${programas.length}</span>
          <span class="kpi-hint">Carreras activas en catálogo</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Estudiantes Vinculados</span>
          <span class="kpi-value">${totalEstudiantes}</span>
          <span class="kpi-hint">Integrantes asociados a carreras</span>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <span class="search-box__icon">🔍</span>
          <input type="search" class="search-box__input" id="progSearchInput"
            placeholder="Buscar por nombre de programa académico..."
            value="${escapeHtml(searchQuery)}" />
        </div>
      </div>

      ${rowsHtml}
    </section>
  `;

  const openNew = () => openProgramaModal(null, () => renderProgramasView(container));
  container.querySelector('#newProgBtn')?.addEventListener('click', openNew);
  container.querySelector('#emptyCreateProgBtn')?.addEventListener('click', openNew);

  const searchInput = container.querySelector('#progSearchInput');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderProgramasView(container);
    const next = container.querySelector('#progSearchInput');
    if (next) {
      next.focus();
      next.setSelectionRange(next.value.length, next.value.length);
    }
  });

  container.querySelectorAll('[data-edit-prog]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = store.programas.find((item) => Number(item.id) === Number(btn.dataset.editProg));
      if (p) openProgramaModal(p, () => renderProgramasView(container));
    });
  });

  container.querySelectorAll('[data-delete-prog]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = store.programas.find((item) => Number(item.id) === Number(btn.dataset.deleteProg));
      if (!p) return;

      const studentsCount = store.integrantes.filter((i) => Number(i.programaId) === Number(p.id)).length;
      if (studentsCount > 0) {
        showToast(`No se puede eliminar "${p.nombre}" porque tiene ${studentsCount} integrante(s) asociado(s).`, 'error');
        return;
      }

      confirmDialog({
        title: 'Eliminar programa académico',
        message: `¿Estás seguro de que deseas eliminar el programa "${p.nombre}"? Esta acción no se puede deshacer.`,
        onConfirm: async () => {
          try {
            await programasApi.remove(p.id);
            await loadAllData();
            showToast('Programa académico eliminado correctamente', 'success');
            renderProgramasView(container);
          } catch (err) {
            showToast(err.message, 'error');
            throw err;
          }
        },
      });
    });
  });
}

