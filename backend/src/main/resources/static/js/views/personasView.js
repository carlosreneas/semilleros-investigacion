import { store, loadAllData } from '../state/store.js';
import { personasApi } from '../api/personasApi.js';
import { openModal, closeModal, confirmDialog } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { escapeHtml, renderEmptyState } from '../ui/components.js';

let searchQuery = '';
let filterDeptoId = '';
let filterRol = '';

function openPersonaModal(persona = null, onSaved = null) {
  const isEdit = Boolean(persona);
  const selectedRoles = new Set((persona?.roles || []).map((r) => r.codigo));

  const departamentoOptions = (store.departamentos || [])
    .map(
      (d) => `
      <option value="${d.id}" ${Number(persona?.departamento?.id) === Number(d.id) ? 'selected' : ''}>
        ${escapeHtml(d.nombre)} (${escapeHtml(d.facultad?.sigla || '')})
      </option>`
    )
    .join('');

  const rolesCheckboxes = (store.roles || [])
    .map(
      (r) => `
      <label class="checkbox-chip">
        <input type="checkbox" name="rolCodigos" value="${escapeHtml(r.codigo)}" ${selectedRoles.has(r.codigo) ? 'checked' : ''} />
        <span>${escapeHtml(r.nombre)}</span>
      </label>`
    )
    .join('');

  openModal({
    title: isEdit ? `Editar Persona · ${persona.nombreCompleto}` : 'Registrar Nueva Persona',
    size: 'md',
    bodyHtml: `
      <form id="personaForm" class="form-grid">
        <div class="form-field">
          <label class="form-label" for="perTipoDoc">Tipo de documento *</label>
          <select class="form-control" id="perTipoDoc" name="tipoDocumento" required>
            <option value="CC" ${persona?.tipoDocumento === 'CC' ? 'selected' : ''}>Cédula de Ciudadanía (CC)</option>
            <option value="CE" ${persona?.tipoDocumento === 'CE' ? 'selected' : ''}>Cédula de Extranjería (CE)</option>
            <option value="TI" ${persona?.tipoDocumento === 'TI' ? 'selected' : ''}>Tarjeta de Identidad (TI)</option>
            <option value="PASAPORTE" ${persona?.tipoDocumento === 'PASAPORTE' ? 'selected' : ''}>Pasaporte</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label" for="perIdentificacion">Identificación *</label>
          <input class="form-control" id="perIdentificacion" name="identificacion" required maxlength="20"
            value="${escapeHtml(persona?.identificacion || '')}" placeholder="Ej. 1090123456" />
        </div>
        <div class="form-field">
          <label class="form-label" for="perNombres">Nombres *</label>
          <input class="form-control" id="perNombres" name="nombres" required maxlength="100"
            value="${escapeHtml(persona?.nombres || '')}" placeholder="Ej. Ana María" />
        </div>
        <div class="form-field">
          <label class="form-label" for="perApellidos">Apellidos *</label>
          <input class="form-control" id="perApellidos" name="apellidos" required maxlength="100"
            value="${escapeHtml(persona?.apellidos || '')}" placeholder="Ej. Pérez" />
        </div>
        <div class="form-field">
          <label class="form-label" for="perCorreo">Correo electrónico institucional *</label>
          <input class="form-control" type="email" id="perCorreo" name="correo" required maxlength="180"
            value="${escapeHtml(persona?.correo || '')}" placeholder="ejemplo@universidad.edu.co" />
        </div>
        <div class="form-field">
          <label class="form-label" for="perTelefono">Teléfono o celular</label>
          <input class="form-control" id="perTelefono" name="telefono" maxlength="20"
            value="${escapeHtml(persona?.telefono || '')}" placeholder="Ej. 3001234567" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="perCvlac">Enlace CvLAC Minciencias</label>
          <input class="form-control" type="url" id="perCvlac" name="cvlacUrl" maxlength="300"
            value="${escapeHtml(persona?.cvlacUrl || '')}" placeholder="https://scienti.minciencias.gov.co/cvlac/..." />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="perDepartamento">Departamento de adscripción</label>
          <select class="form-control" id="perDepartamento" name="departamentoId">
            <option value="">Seleccione un departamento...</option>
            ${departamentoOptions}
          </select>
        </div>
        <div class="form-field form-field--full">
          <span class="form-label">Roles institucionales ante la investigación</span>
          <div class="checkbox-grid">${rolesCheckboxes}</div>
        </div>
        <div class="form-field form-field--full">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" name="activo" value="true" ${persona ? (persona.activo ? 'checked' : '') : 'checked'} />
            <span class="form-label" style="margin: 0;">Persona activa en el sistema</span>
          </label>
        </div>
        <div class="form-field form-field--full" id="perFormError"></div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn--secondary" data-modal-close>Cancelar</button>
      <button type="submit" form="personaForm" class="btn btn--primary" id="savePerBtn">
        ${isEdit ? 'Guardar cambios' : 'Registrar persona'}
      </button>
    `,
    onMount: (backdrop) => {
      const form = backdrop.querySelector('#personaForm');
      const errorBox = backdrop.querySelector('#perFormError');
      const saveBtn = backdrop.querySelector('#savePerBtn');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.innerHTML = '';
        const fd = new FormData(form);
        const deptoVal = fd.get('departamentoId');
        const rolCodigos = fd.getAll('rolCodigos').map((c) => String(c));

        const payload = {
          identificacion: String(fd.get('identificacion') || '').trim(),
          tipoDocumento: String(fd.get('tipoDocumento') || 'CC').trim(),
          nombres: String(fd.get('nombres') || '').trim(),
          apellidos: String(fd.get('apellidos') || '').trim(),
          correo: String(fd.get('correo') || '').trim(),
          telefono: String(fd.get('telefono') || '').trim() || null,
          cvlacUrl: String(fd.get('cvlacUrl') || '').trim() || null,
          departamentoId: deptoVal ? Number(deptoVal) : null,
          rolCodigos,
          activo: Boolean(fd.get('activo')),
        };

        saveBtn.disabled = true;
        try {
          if (isEdit) {
            await personasApi.update(persona.id, payload);
            showToast('Persona actualizada exitosamente', 'success');
          } else {
            await personasApi.create(payload);
            showToast('Persona registrada exitosamente', 'success');
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

export function renderPersonasView(container) {
  const { personas, departamentos, roles } = store;
  const q = searchQuery.trim().toLowerCase();

  const filtered = (personas || []).filter((p) => {
    const matchQ =
      !q ||
      p.nombreCompleto.toLowerCase().includes(q) ||
      p.identificacion.toLowerCase().includes(q) ||
      p.correo.toLowerCase().includes(q);
    const matchDepto = !filterDeptoId || Number(p.departamento?.id) === Number(filterDeptoId);
    const matchRol = !filterRol || (p.roles || []).some((r) => r.codigo === filterRol);
    return matchQ && matchDepto && matchRol;
  });

  const conCvlac = (personas || []).filter((p) => Boolean(p.cvlacUrl)).length;

  const departamentoFilterOptions = (departamentos || [])
    .map(
      (d) => `<option value="${d.id}" ${Number(filterDeptoId) === Number(d.id) ? 'selected' : ''}>${escapeHtml(d.nombre)}</option>`
    )
    .join('');

  const rolFilterOptions = (roles || [])
    .map(
      (r) => `<option value="${escapeHtml(r.codigo)}" ${filterRol === r.codigo ? 'selected' : ''}>${escapeHtml(r.nombre)}</option>`
    )
    .join('');

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Directorio de Personas</h1>
        <p class="page-subtitle">Docentes, directores, representantes e investigadores de la institución.</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn--primary" id="openCreatePerBtn">+ Nueva Persona</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Total Personas</span>
        <span class="kpi-value">${(personas || []).length}</span>
        <span class="kpi-hint">Investigadores y directivos</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Con CvLAC Registrado</span>
        <span class="kpi-value">${conCvlac}</span>
        <span class="kpi-hint">CvLAC Minciencias</span>
      </div>
    </div>

    <div class="toolbar">
      <div class="toolbar__search">
        <input class="form-control" type="search" id="perSearchInput"
          placeholder="Buscar por nombre, cédula o correo..." value="${escapeHtml(searchQuery)}" />
      </div>
      <div class="toolbar__filters">
        <select class="form-control" id="perFilterDepto">
          <option value="">Todos los departamentos</option>
          ${departamentoFilterOptions}
        </select>
        <select class="form-control" id="perFilterRol">
          <option value="">Todos los roles</option>
          ${rolFilterOptions}
        </select>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Identificación</th>
            <th>Nombre Completo</th>
            <th>Departamento / Facultad</th>
            <th>Roles Institucionales</th>
            <th>CvLAC</th>
            <th style="text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length ? filtered.map((p) => `
            <tr>
              <td><code>${escapeHtml(p.tipoDocumento)} ${escapeHtml(p.identificacion)}</code></td>
              <td>
                <strong>${escapeHtml(p.nombreCompleto)}</strong>
                <br/><span class="text-sm text-muted">${escapeHtml(p.correo)}</span>
              </td>
              <td>
                ${p.departamento
                  ? `<strong>${escapeHtml(p.departamento.nombre)}</strong><br/><span class="text-xs text-muted">${escapeHtml(p.departamento.facultadNombre || '')}</span>`
                  : '<span class="text-sm text-muted">Sin departamento</span>'
                }
              </td>
              <td>
                ${(p.roles || []).length
                  ? p.roles.map((r) => `<span class="tag" style="margin-right: 4px; margin-bottom: 2px;">${escapeHtml(r.nombre)}</span>`).join('')
                  : '<span class="text-xs text-muted">Sin roles</span>'
                }
              </td>
              <td>
                ${p.cvlacUrl
                  ? `<a href="${escapeHtml(p.cvlacUrl)}" target="_blank" rel="noopener noreferrer" class="semillero-link-btn" title="Ver CvLAC">Ver CvLAC ↗</a>`
                  : '<span class="text-xs text-muted">No registrado</span>'
                }
              </td>
              <td style="text-align: right;">
                <button type="button" class="btn btn--secondary btn--sm" data-edit-per="${p.id}">Editar</button>
                <button type="button" class="btn btn--danger btn--sm" data-delete-per="${p.id}">Eliminar</button>
              </td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="6">
                ${renderEmptyState('No se encontraron personas', 'Registra una persona para comenzar.')}
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;

  container.querySelector('#openCreatePerBtn')?.addEventListener('click', () => {
    openPersonaModal(null, () => renderPersonasView(container));
  });

  container.querySelector('#perSearchInput')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderPersonasView(container);
  });

  container.querySelector('#perFilterDepto')?.addEventListener('change', (e) => {
    filterDeptoId = e.target.value;
    renderPersonasView(container);
  });

  container.querySelector('#perFilterRol')?.addEventListener('change', (e) => {
    filterRol = e.target.value;
    renderPersonasView(container);
  });

  container.querySelectorAll('[data-edit-per]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const per = (store.personas || []).find((p) => Number(p.id) === Number(btn.dataset.editPer));
      if (per) openPersonaModal(per, () => renderPersonasView(container));
    });
  });

  container.querySelectorAll('[data-delete-per]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const perId = Number(btn.dataset.deletePer);
      confirmDialog({
        title: 'Eliminar persona',
        message: '¿Estás seguro de que deseas eliminar esta persona?',
        confirmText: 'Sí, eliminar',
        onConfirm: async () => {
          try {
            await personasApi.delete(perId);
            showToast('Persona eliminada', 'info');
            await loadAllData();
            renderPersonasView(container);
          } catch (err) {
            showToast(err.message, 'error');
          }
        },
      });
    });
  });
}
