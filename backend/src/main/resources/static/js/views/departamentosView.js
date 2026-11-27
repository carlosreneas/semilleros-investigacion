import { store, loadAllData } from '../state/store.js';
import { departamentosApi } from '../api/departamentosApi.js';
import { openModal, closeModal, confirmDialog } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml, renderEmptyState } from '../ui/components.js';
import { renderPersonaSearchSelectHtml, setupPersonaSearchSelect } from '../ui/personaSearchSelect.js';

let searchQuery = '';
let filterFacultadId = '';

function openDepartamentoModal(departamento = null, onSaved = null) {
  const isEdit = Boolean(departamento);

  const facultadOptions = (store.facultades || [])
    .map(
      (f) => `
      <option value="${f.id}" ${Number(departamento?.facultad?.id) === Number(f.id) ? 'selected' : ''}>
        ${escapeHtml(f.sigla)} - ${escapeHtml(f.nombre)}
      </option>`
    )
    .join('');

  openModal({
    title: isEdit ? `Editar Departamento · ${departamento.nombre}` : 'Nuevo Departamento Académico',
    size: 'sm',
    bodyHtml: `
      <form id="deptoForm" class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label" for="depNombre">Nombre del departamento *</label>
          <input class="form-control" id="depNombre" name="nombre" required maxlength="180"
            value="${escapeHtml(departamento?.nombre || '')}" placeholder="Ej. Sistemas e Informática" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="depFacultad">Facultad a la que pertenece *</label>
          <select class="form-control" id="depFacultad" name="facultadId" required>
            <option value="">Seleccione una facultad...</option>
            ${facultadOptions}
          </select>
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="depDirectorId">Director del Departamento</label>
          ${renderPersonaSearchSelectHtml({
            inputName: 'directorId',
            inputId: 'depDirectorId',
            selectedPersonaId: departamento?.director?.id,
            placeholder: 'Buscar director por nombre o correo...',
            emptyLabel: 'Sin director asignado',
          })}
          <span class="text-xs text-muted" style="margin-top: 4px;">Director responsable de avalar semilleros y firmar formatos</span>
        </div>
        <div class="form-field form-field--full" id="depFormError"></div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn--secondary" data-modal-close>Cancelar</button>
      <button type="submit" form="deptoForm" class="btn btn--primary" id="saveDepBtn">
        ${isEdit ? 'Guardar cambios' : 'Crear departamento'}
      </button>
    `,
    onMount: (backdrop) => {
      const form = backdrop.querySelector('#deptoForm');
      const errorBox = backdrop.querySelector('#depFormError');
      const saveBtn = backdrop.querySelector('#saveDepBtn');

      setupPersonaSearchSelect(backdrop.querySelector('[data-persona-select="depDirectorId"]'), {
        emptyLabel: 'Sin director asignado',
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.innerHTML = '';
        const fd = new FormData(form);
        const dirVal = fd.get('directorId');

        const payload = {
          nombre: String(fd.get('nombre') || '').trim(),
          facultadId: Number(fd.get('facultadId')),
          directorId: dirVal ? Number(dirVal) : null,
        };

        saveBtn.disabled = true;
        try {
          if (isEdit) {
            await departamentosApi.update(departamento.id, payload);
            showToast('Departamento actualizado exitosamente', 'success');
          } else {
            await departamentosApi.create(payload);
            showToast('Departamento creado exitosamente', 'success');
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

export function renderDepartamentosView(container) {
  const { departamentos, facultades } = store;
  const q = searchQuery.trim().toLowerCase();

  const filtered = (departamentos || []).filter((d) => {
    const matchQ = !q || d.nombre.toLowerCase().includes(q) || (d.facultad?.nombre || '').toLowerCase().includes(q);
    const matchFac = !filterFacultadId || Number(d.facultad?.id) === Number(filterFacultadId);
    return matchQ && matchFac;
  });

  const conDirector = (departamentos || []).filter((d) => d.director).length;

  const facultadFilterOptions = (facultades || [])
    .map(
      (f) => `<option value="${f.id}" ${Number(filterFacultadId) === Number(f.id) ? 'selected' : ''}>${escapeHtml(f.sigla)} - ${escapeHtml(f.nombre)}</option>`
    )
    .join('');

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Departamentos Académicos</h1>
        <p class="page-subtitle">Unidades académicas adscritas a las facultades UFPS a las que pertenecen los directores e investigadores.</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn--primary" id="openCreateDepBtn">+ Nuevo Departamento</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Total Departamentos</span>
        <span class="kpi-value">${(departamentos || []).length}</span>
        <span class="kpi-hint">Departamentos registrados</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Con Director Asignado</span>
        <span class="kpi-value">${conDirector}</span>
        <span class="kpi-hint">Firma de aval institucional</span>
      </div>
    </div>

    <div class="toolbar">
      <div class="toolbar__search">
        <input class="form-control" type="search" id="depSearchInput"
          placeholder="Buscar departamento..." value="${escapeHtml(searchQuery)}" />
      </div>
      <div class="toolbar__filters">
        <select class="form-control" id="depFilterFacultad">
          <option value="">Todas las facultades</option>
          ${facultadFilterOptions}
        </select>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Departamento</th>
            <th>Facultad</th>
            <th>Director de Departamento</th>
            <th style="text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length ? filtered.map((d) => `
            <tr>
              <td><strong>${escapeHtml(d.nombre)}</strong></td>
              <td>
                ${d.facultad
                  ? `<span class="sigla-badge" style="margin-right: 6px;">${escapeHtml(d.facultad.sigla)}</span>${escapeHtml(d.facultad.nombre)}`
                  : '<span class="text-sm text-muted">Sin facultad</span>'
                }
              </td>
              <td>
                ${d.director
                  ? `<div><strong>${escapeHtml(d.director.nombreCompleto)}</strong><br/><span class="text-sm text-muted">${escapeHtml(d.director.correo)}</span></div>`
                  : '<span class="text-sm text-muted">Sin director asignado</span>'
                }
              </td>
              <td style="text-align: right;">
                <button type="button" class="btn btn--secondary btn--sm" data-edit-dep="${d.id}">Editar</button>
                <button type="button" class="btn btn--danger btn--sm" data-delete-dep="${d.id}">Eliminar</button>
              </td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="4">
                ${renderEmptyState('No se encontraron departamentos', 'Registra un departamento académico para comenzar.')}
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;

  container.querySelector('#openCreateDepBtn')?.addEventListener('click', () => {
    openDepartamentoModal(null, () => renderDepartamentosView(container));
  });

  container.querySelector('#depSearchInput')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderDepartamentosView(container);
  });

  container.querySelector('#depFilterFacultad')?.addEventListener('change', (e) => {
    filterFacultadId = e.target.value;
    renderDepartamentosView(container);
  });

  container.querySelectorAll('[data-edit-dep]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dep = (store.departamentos || []).find((d) => Number(d.id) === Number(btn.dataset.editDep));
      if (dep) openDepartamentoModal(dep, () => renderDepartamentosView(container));
    });
  });

  container.querySelectorAll('[data-delete-dep]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const depId = Number(btn.dataset.deleteDep);
      confirmDialog({
        title: 'Eliminar departamento',
        message: '¿Estás seguro de que deseas eliminar este departamento?',
        confirmText: 'Sí, eliminar',
        onConfirm: async () => {
          try {
            await departamentosApi.delete(depId);
            showToast('Departamento eliminado', 'info');
            await loadAllData();
            renderDepartamentosView(container);
          } catch (err) {
            showToast(err.message, 'error');
          }
        },
      });
    });
  });
}
