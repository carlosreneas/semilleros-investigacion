import { store, loadAllData } from '../state/store.js';
import { facultadesApi } from '../api/facultadesApi.js';
import { openModal, closeModal, confirmDialog } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml, renderEmptyState } from '../ui/components.js';
import { renderPersonaSearchSelectHtml, setupPersonaSearchSelect } from '../ui/personaSearchSelect.js';

let searchQuery = '';

function openFacultadModal(facultad = null, onSaved = null) {
  const isEdit = Boolean(facultad);

  openModal({
    title: isEdit ? `Editar Facultad · ${facultad.sigla}` : 'Nueva Facultad UFPS',
    size: 'sm',
    bodyHtml: `
      <form id="facultadForm" class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label" for="facNombre">Nombre de la facultad *</label>
          <input class="form-control" id="facNombre" name="nombre" required maxlength="180"
            value="${escapeHtml(facultad?.nombre || '')}" placeholder="Ej. Facultad de Ingeniería" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="facSigla">Sigla institucional *</label>
          <input class="form-control" id="facSigla" name="sigla" required maxlength="20"
            value="${escapeHtml(facultad?.sigla || '')}" placeholder="Ej. FING" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="facRepresentanteId">Representante de Facultad ante Investigación</label>
          ${renderPersonaSearchSelectHtml({
            inputName: 'representanteId',
            inputId: 'facRepresentanteId',
            selectedPersonaId: facultad?.representante?.id,
            placeholder: 'Buscar representante por nombre o correo...',
            emptyLabel: 'Sin representante asignado',
          })}
          <span class="text-xs text-muted" style="margin-top: 4px;">Docente investigador designado como representante</span>
        </div>
        <div class="form-field form-field--full" id="facFormError"></div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn--secondary" data-modal-close>Cancelar</button>
      <button type="submit" form="facultadForm" class="btn btn--primary" id="saveFacBtn">
        ${isEdit ? 'Guardar cambios' : 'Crear facultad'}
      </button>
    `,
    onMount: (backdrop) => {
      const form = backdrop.querySelector('#facultadForm');
      const errorBox = backdrop.querySelector('#facFormError');
      const saveBtn = backdrop.querySelector('#saveFacBtn');

      setupPersonaSearchSelect(backdrop.querySelector('[data-persona-select="facRepresentanteId"]'), {
        emptyLabel: 'Sin representante asignado',
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.innerHTML = '';
        const fd = new FormData(form);
        const repVal = fd.get('representanteId');

        const payload = {
          nombre: String(fd.get('nombre') || '').trim(),
          sigla: String(fd.get('sigla') || '').trim().toUpperCase(),
          representanteId: repVal ? Number(repVal) : null,
        };

        saveBtn.disabled = true;
        try {
          if (isEdit) {
            await facultadesApi.update(facultad.id, payload);
            showToast('Facultad actualizada exitosamente', 'success');
          } else {
            await facultadesApi.create(payload);
            showToast('Facultad creada exitosamente', 'success');
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

export function renderFacultadesView(container) {
  const { facultades } = store;
  const q = searchQuery.trim().toLowerCase();

  const filtered = (facultades || []).filter(
    (f) => !q || f.nombre.toLowerCase().includes(q) || f.sigla.toLowerCase().includes(q)
  );

  const conRepresentante = (facultades || []).filter((f) => f.representante).length;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Facultades Institucionales</h1>
        <p class="page-subtitle">Estructura académica mayor de la Universidad Francisco de Paula Santander.</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn--primary" id="openCreateFacBtn">+ Nueva Facultad</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Total Facultades</span>
        <span class="kpi-value">${(facultades || []).length}</span>
        <span class="kpi-hint">Facultades activas</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Con Representante</span>
        <span class="kpi-value">${conRepresentante}</span>
        <span class="kpi-hint">Representante asignado</span>
      </div>
    </div>

    <div class="toolbar">
      <div class="toolbar__search">
        <input class="form-control" type="search" id="facSearchInput"
          placeholder="Buscar por nombre o sigla..." value="${escapeHtml(searchQuery)}" />
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Sigla</th>
            <th>Facultad</th>
            <th>Representante ante Investigación</th>
            <th style="text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length ? filtered.map((f) => `
            <tr>
              <td><span class="sigla-badge">${escapeHtml(f.sigla)}</span></td>
              <td><strong>${escapeHtml(f.nombre)}</strong></td>
              <td>
                ${f.representante
                  ? `<div><strong>${escapeHtml(f.representante.nombreCompleto)}</strong><br/><span class="text-sm text-muted">${escapeHtml(f.representante.correo)}</span></div>`
                  : '<span class="text-sm text-muted">Sin representante asignado</span>'
                }
              </td>
              <td style="text-align: right;">
                <button type="button" class="btn btn--secondary btn--sm" data-edit-fac="${f.id}">Editar</button>
                <button type="button" class="btn btn--danger btn--sm" data-delete-fac="${f.id}">Eliminar</button>
              </td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="4">
                ${renderEmptyState('No se encontraron facultades', 'Crea una nueva facultad para comenzar.')}
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;

  container.querySelector('#openCreateFacBtn')?.addEventListener('click', () => {
    openFacultadModal(null, () => renderFacultadesView(container));
  });

  const searchInput = container.querySelector('#facSearchInput');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderFacultadesView(container);
  });

  container.querySelectorAll('[data-edit-fac]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fac = (store.facultades || []).find((f) => Number(f.id) === Number(btn.dataset.editFac));
      if (fac) openFacultadModal(fac, () => renderFacultadesView(container));
    });
  });

  container.querySelectorAll('[data-delete-fac]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const facId = Number(btn.dataset.deleteFac);
      confirmDialog({
        title: 'Eliminar facultad',
        message: '¿Estás seguro de que deseas eliminar esta facultad? Esto puede afectar a los departamentos asociados.',
        confirmText: 'Sí, eliminar',
        onConfirm: async () => {
          try {
            await facultadesApi.delete(facId);
            showToast('Facultad eliminada', 'info');
            await loadAllData();
            renderFacultadesView(container);
          } catch (err) {
            showToast(err.message, 'error');
          }
        },
      });
    });
  });
}
