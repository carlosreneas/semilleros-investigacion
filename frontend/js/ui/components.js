import { store, loadAllData, getIntegrantesBySemillero } from '../state/store.js';
import { resolveFileUrl } from '../config.js';
import { semillerosApi } from '../api/semillerosApi.js';
import { integrantesApi } from '../api/integrantesApi.js';
import { productosApi } from '../api/productosApi.js';
import { tiposActividadApi } from '../api/tiposActividadApi.js';
import { actividadesApi } from '../api/actividadesApi.js';
import { capacitacionesApi } from '../api/capacitacionesApi.js';
import { API_BASE_URL } from '../config.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';
export {
  createPageHeader,
  createKpiCard,
  createKpiGrid,
  createToolbar,
  createViewToggle,
  createProgressBar,
} from './designModel.js';

export function resolveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'UF';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function renderEmptyState(title, description, actionHtml = '') {
  return `
    <div class="empty-state">
      <h3 class="empty-state__title">${escapeHtml(title)}</h3>
      <p>${escapeHtml(description)}</p>
      ${actionHtml ? `<div class="mt-2">${actionHtml}</div>` : ''}
    </div>
  `;
}

/**
 * Abre el modal compartido para crear o editar un Semillero.
 */
export function openSemilleroFormModal(semillero = null, onSaved = null) {
  const isEdit = Boolean(semillero);
  const selectedLineaIds = new Set((semillero?.lineas || []).map((l) => Number(l.id)));

  const directorOptions = store.directores
    .map(
      (d) => `
      <option value="${d.id}" ${Number(semillero?.director?.id) === Number(d.id) ? 'selected' : ''}>
        ${escapeHtml(d.nombre)} (${escapeHtml(d.correo)})
      </option>`
    )
    .join('');

  const grupoOptions = (store.gruposInvestigacion || [])
    .map(
      (g) => `
      <option value="${g.id}" ${Number(semillero?.grupoInvestigacion?.id) === Number(g.id) ? 'selected' : ''}>
        ${escapeHtml(g.sigla)} - ${escapeHtml(g.nombre)} (${escapeHtml(g.facultad)})
      </option>`
    )
    .join('');

  const lineasCheckboxes = store.lineas.length
    ? store.lineas
      .map(
        (l) => `
        <label class="checkbox-chip">
          <input type="checkbox" name="lineaIds" value="${l.id}" ${selectedLineaIds.has(Number(l.id)) ? 'checked' : ''} />
          <span>${escapeHtml(l.nombre)}</span>
        </label>`
      )
      .join('')
    : '<p class="text-sm text-muted">No hay líneas registradas en el catálogo.</p>';

  openModal({
    title: isEdit ? `Editar Semillero · ${semillero.sigla}` : 'Nuevo Semillero de Investigación',
    bodyHtml: `
      <form id="semilleroForm" class="form-grid">
        <div class="form-field">
          <label class="form-label" for="semNombre">Nombre del semillero *</label>
          <input class="form-control" id="semNombre" name="nombre" required maxlength="180"
            value="${escapeHtml(semillero?.nombre || '')}" placeholder="Ej. Semillero de Inteligencia Artificial" />
        </div>
        <div class="form-field">
          <label class="form-label" for="semSigla">Sigla *</label>
          <input class="form-control" id="semSigla" name="sigla" required maxlength="30"
            value="${escapeHtml(semillero?.sigla || '')}" placeholder="Ej. SIAA" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="semGrupo">Grupo de investigación UFPS *</label>
          <select class="form-control" id="semGrupo" name="grupoInvestigacionId" required>
            <option value="">Seleccione un grupo de investigación...</option>
            ${grupoOptions}
          </select>
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="semDirector">Director responsable *</label>
          <select class="form-control" id="semDirector" name="directorId" required>
            <option value="">Seleccione un director...</option>
            ${directorOptions}
          </select>
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="semLogoFile">Logo / Emblema del semillero (opcional)</label>
          <div style="display: flex; align-items: center; gap: 16px;">
            <div id="semLogoPreviewContainer" style="width: 64px; height: 64px; border-radius: var(--radius-sm); border: 1px dashed var(--border-strong); display: flex; align-items: center; justify-content: center; overflow: hidden; background: var(--bg-page);">
              ${semillero?.logoUrl
        ? `<img src="${escapeHtml(resolveFileUrl(semillero.logoUrl))}" id="semLogoImgPreview" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.onerror=null; this.parentElement.innerHTML='<span style=\\'font-size: 0.75rem; color: var(--text-muted); text-align: center;\\'>Sin logo</span>';" />`
        : (semillero?.fotoUrl
            ? `<img src="${escapeHtml(resolveImageUrl(semillero.fotoUrl))}" id="semLogoImgPreview" style="width: 100%; height: 100%; object-fit: contain;" />`
            : `<span id="semLogoTextPreview" style="font-size: 0.75rem; color: var(--text-muted); text-align: center;">Sin logo</span>`
          )
      }
            </div>
            <div style="flex: 1;">
              <input class="form-control" type="file" id="semLogoFile" name="logoFile" accept="image/png, image/jpeg, image/webp, image/svg+xml" />
              <div class="text-xs text-muted" style="margin-top: 4px;">Formatos aceptados: PNG, JPG, WEBP, SVG (máx. 10MB)</div>
            </div>
          </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="semMision">Misión</label>
          <textarea class="form-control" id="semMision" name="mision" placeholder="Propósito formativo del semillero...">${escapeHtml(semillero?.mision || '')}</textarea>
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="semVision">Visión</label>
          <textarea class="form-control" id="semVision" name="vision" placeholder="Proyección del semillero...">${escapeHtml(semillero?.vision || '')}</textarea>
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="semObjetivo">Objetivo general</label>
          <textarea class="form-control" id="semObjetivo" name="objetivoGeneral" placeholder="Objetivo principal...">${escapeHtml(semillero?.objetivoGeneral || '')}</textarea>
        </div>
        <div class="form-field form-field--full">
          <span class="form-label">Líneas de investigación asociadas</span>
          <div class="checkbox-grid">${lineasCheckboxes}</div>
        </div>
        <div class="form-field form-field--full" id="semFormError"></div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn--secondary" data-modal-close>Cancelar</button>
      <button type="submit" form="semilleroForm" class="btn btn--primary" id="saveSemilleroBtn">
        ${isEdit ? 'Guardar cambios' : 'Crear semillero'}
      </button>
    `,
    onMount: (backdrop) => {
      const form = backdrop.querySelector('#semilleroForm');
      const errorBox = backdrop.querySelector('#semFormError');
      const saveBtn = backdrop.querySelector('#saveSemilleroBtn');
      const fileInput = backdrop.querySelector('#semLogoFile');
      const previewContainer = backdrop.querySelector('#semLogoPreviewContainer');

      fileInput?.addEventListener('change', () => {
        const file = fileInput.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            previewContainer.innerHTML = `<img src="${ev.target.result}" style="width: 100%; height: 100%; object-fit: contain;" />`;
          };
          reader.readAsDataURL(file);
        }
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.innerHTML = '';

        const formData = new FormData(form);
        const lineaIds = formData.getAll('lineaIds').map((id) => Number(id));
        const payload = {
          nombre: String(formData.get('nombre') || '').trim(),
          sigla: String(formData.get('sigla') || '').trim(),
          grupoInvestigacionId: Number(formData.get('grupoInvestigacionId')),
          mision: String(formData.get('mision') || '').trim(),
          vision: String(formData.get('vision') || '').trim(),
          objetivoGeneral: String(formData.get('objetivoGeneral') || '').trim(),
          directorId: Number(formData.get('directorId')),
          lineaIds,
        };

        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
          let savedSemillero;
          if (isEdit) {
            savedSemillero = await semillerosApi.update(semillero.id, payload);
          } else {
            savedSemillero = await semillerosApi.create(payload);
          }

          const file = fileInput?.files?.[0];
          if (file) {
            saveBtn.textContent = 'Subiendo logo...';
            await semillerosApi.uploadLogo(savedSemillero.id, file);
          }

          showToast(isEdit ? 'Semillero actualizado correctamente' : 'Semillero creado correctamente', 'success');
          await loadAllData();
          closeModal();
          if (onSaved) onSaved();
        } catch (err) {
          errorBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
          saveBtn.disabled = false;
          saveBtn.textContent = isEdit ? 'Guardar cambios' : 'Crear semillero';
        }
      });
    },
  });
}

/**
 * Abre el modal compartido para crear o editar un Integrante.
 */
export function openIntegranteFormModal({ integrante = null, defaultSemilleroId = null, lockSemillero = false } = {}, onSaved = null) {
  const isEdit = Boolean(integrante);
  const selectedSemilleroId = integrante?.semilleroId ?? defaultSemilleroId ?? '';

  const semilleroOptions = store.semilleros
    .map(
      (s) => `
      <option value="${s.id}" ${Number(selectedSemilleroId) === Number(s.id) ? 'selected' : ''}>
        ${escapeHtml(s.sigla)} — ${escapeHtml(s.nombre)}
      </option>`
    )
    .join('');

  const programaOptions = (store.programas || [])
    .map(
      (p) => `
      <option value="${p.id}" ${Number(integrante?.programaId) === Number(p.id) ? 'selected' : ''}>
        ${escapeHtml(p.nombre)}
      </option>`
    )
    .join('');

  const semestres = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const semestreOptions = semestres
    .map(
      (s) => `
      <option value="${s}" ${Number(integrante?.semestreActual || 1) === s ? 'selected' : ''}>
        Semestre ${s}
      </option>`
    )
    .join('');

  const initialFechaNac = integrante?.fechaNacimiento || '';

  openModal({
    title: isEdit ? `Editar Integrante · ${escapeHtml(integrante.nombre)}` : 'Agregar Integrante a Semillero',
    size: 'md',
    bodyHtml: `
      <form id="integranteForm" class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label" for="intSemillero">Semillero al que pertenece *</label>
          <select class="form-control" id="intSemillero" name="semilleroId" required ${lockSemillero ? 'disabled' : ''}>
            <option value="">Seleccione un semillero...</option>
            ${semilleroOptions}
          </select>
          ${lockSemillero ? `<input type="hidden" name="semilleroId" value="${escapeHtml(selectedSemilleroId)}" />` : ''}
        </div>

        <div class="form-field form-field--full">
          <label class="form-label" for="intPrograma">Programa académico *</label>
          <select class="form-control" id="intPrograma" name="programaId" required>
            <option value="">Seleccione el programa académico...</option>
            ${programaOptions}
          </select>
        </div>

        <div class="form-field">
          <label class="form-label" for="intCodigo">Código estudiantil *</label>
          <input class="form-control" id="intCodigo" name="codigo" required maxlength="40"
            value="${escapeHtml(integrante?.codigo || '')}" placeholder="Ej. 1152104" />
        </div>

        <div class="form-field">
          <label class="form-label" for="intIdentificacion">Número de Identificación (C.C. / T.I.) *</label>
          <input class="form-control" id="intIdentificacion" name="identificacion" required maxlength="20"
            pattern="\\d+" title="Solo dígitos numéricos"
            value="${escapeHtml(integrante?.identificacion || '')}" placeholder="Ej. 1090123456" />
        </div>

        <div class="form-field form-field--full">
          <label class="form-label" for="intNombre">Nombre completo *</label>
          <input class="form-control" id="intNombre" name="nombre" required maxlength="160"
            value="${escapeHtml(integrante?.nombre || '')}" placeholder="Ej. Carlos Andrés Gómez" />
        </div>

        <div class="form-field">
          <label class="form-label" for="intSemestre">Semestre actual *</label>
          <select class="form-control" id="intSemestre" name="semestreActual" required>
            ${semestreOptions}
          </select>
        </div>

        <div class="form-field">
          <label class="form-label" for="intFechaNacimiento">Fecha de nacimiento *</label>
          <input class="form-control" id="intFechaNacimiento" name="fechaNacimiento" type="date" required
            value="${escapeHtml(initialFechaNac)}" />
          <span id="intCalculatedAge" class="text-sm" style="margin-top: 4px; display: block; color: var(--text-secondary); font-weight: 500;">
            ${integrante?.edad ? `Edad: ${integrante.edad} años (calculada automáticamente)` : 'Seleccione fecha para calcular edad'}
          </span>
        </div>

        <div class="form-field">
          <label class="form-label" for="intEmail">Correo electrónico *</label>
          <input class="form-control" id="intEmail" name="email" type="email" required maxlength="160"
            value="${escapeHtml(integrante?.email || '')}" placeholder="estudiante@ufps.edu.co" />
        </div>

        <div class="form-field">
          <label class="form-label" for="intCelular">Celular de contacto *</label>
          <input class="form-control" id="intCelular" name="celular" type="tel" required maxlength="20"
            value="${escapeHtml(integrante?.celular || '')}" placeholder="Ej. 3123456789" />
        </div>

        <div class="form-field form-field--full">
          <label class="form-label" for="intDireccion">Dirección de residencia *</label>
          <input class="form-control" id="intDireccion" name="direccion" required maxlength="255"
            value="${escapeHtml(integrante?.direccion || '')}" placeholder="Ej. Av. Gran Colombia # 12E-96, Cúcuta" />
        </div>

        <div class="form-field form-field--full">
          <label class="checkbox-row">
            <input type="checkbox" name="esLider" ${integrante?.esLider ? 'checked' : ''} />
            <span><strong>Es líder del semillero</strong> (solo puede haber un líder activo por semillero)</span>
          </label>
        </div>

        <div class="form-field form-field--full" id="intFormError"></div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn--secondary" data-modal-close>Cancelar</button>
      <button type="submit" form="integranteForm" class="btn btn--primary" id="saveIntegranteBtn">
        ${isEdit ? 'Actualizar integrante' : 'Registrar integrante'}
      </button>
    `,
    onMount: (backdrop) => {
      const form = backdrop.querySelector('#integranteForm');
      const errorBox = backdrop.querySelector('#intFormError');
      const saveBtn = backdrop.querySelector('#saveIntegranteBtn');
      const dobInput = backdrop.querySelector('#intFechaNacimiento');
      const ageLabel = backdrop.querySelector('#intCalculatedAge');

      const updateAge = () => {
        const val = dobInput?.value;
        if (!val) {
          if (ageLabel) ageLabel.textContent = 'Seleccione fecha para calcular edad';
          return;
        }
        const birthDate = new Date(val + 'T00:00:00');
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (isNaN(age) || age < 0) {
          if (ageLabel) ageLabel.textContent = 'Fecha de nacimiento inválida';
        } else {
          if (ageLabel) {
            ageLabel.innerHTML = `<strong>Edad:</strong> ${age} años <span class="text-muted">(campo calculado transient)</span>`;
          }
        }
      };

      dobInput?.addEventListener('input', updateAge);
      dobInput?.addEventListener('change', updateAge);
      if (initialFechaNac) updateAge();

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.innerHTML = '';

        const formData = new FormData(form);
        const payload = {
          semilleroId: Number(formData.get('semilleroId')),
          programaId: Number(formData.get('programaId')),
          codigo: String(formData.get('codigo') || '').trim(),
          identificacion: String(formData.get('identificacion') || '').trim(),
          nombre: String(formData.get('nombre') || '').trim(),
          semestreActual: Number(formData.get('semestreActual')),
          fechaNacimiento: String(formData.get('fechaNacimiento') || ''),
          direccion: String(formData.get('direccion') || '').trim(),
          email: String(formData.get('email') || '').trim().toLowerCase(),
          celular: String(formData.get('celular') || '').trim(),
          esLider: Boolean(formData.get('esLider')),
        };

        if (!payload.semilleroId) {
          errorBox.innerHTML = '<div class="form-error">Debe seleccionar un semillero</div>';
          return;
        }
        if (!payload.programaId) {
          errorBox.innerHTML = '<div class="form-error">Debe seleccionar un programa académico</div>';
          return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
          if (isEdit) {
            await integrantesApi.update(integrante.id, payload);
            showToast('Integrante actualizado correctamente', 'success');
          } else {
            await integrantesApi.create(payload);
            showToast('Integrante agregado correctamente', 'success');
          }
          await loadAllData();
          closeModal();
          if (onSaved) onSaved();
        } catch (err) {
          errorBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
          saveBtn.disabled = false;
          saveBtn.textContent = isEdit ? 'Actualizar integrante' : 'Registrar integrante';
        }
      });
    },
  });
}

/**
 * Muestra el perfil completo de un Integrante en un modal institucional.
 */
export function openIntegranteDetailModal(integrante) {
  if (!integrante) return;

  const semillero = store.semilleros.find((s) => Number(s.id) === Number(integrante.semilleroId));

  openModal({
    title: `Ficha de Integrante · ${escapeHtml(integrante.nombre)}`,
    size: 'md',
    bodyHtml: `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div style="display: flex; align-items: center; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
          <div class="avatar ${integrante.esLider ? 'avatar--leader' : ''}" style="width: 56px; height: 56px; font-size: 1.3rem;">
            ${escapeHtml(getInitials(integrante.nombre))}
          </div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <h2 style="font-size: 1.25rem; font-weight: 700; margin: 0; color: var(--text-primary);">${escapeHtml(integrante.nombre)}</h2>
              ${integrante.esLider
        ? '<span class="badge badge--leader">★ Líder del Semillero</span>'
        : '<span class="badge badge--member">Integrante</span>'
      }
            </div>
            <p style="margin: 4px 0 0; color: var(--text-secondary); font-size: 0.9rem;">
              Código: <strong>${escapeHtml(integrante.codigo)}</strong> &bull; Identificación: <strong>${escapeHtml(integrante.identificacion || 'No registrada')}</strong>
            </p>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
          <div style="background: var(--bg-page); padding: 14px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 4px;">Programa Académico</span>
            <strong style="color: var(--text-primary); font-size: 0.95rem;">${escapeHtml(integrante.programaNombre || 'No asignado')}</strong>
          </div>

          <div style="background: var(--bg-page); padding: 14px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 4px;">Semestre Cursado</span>
            <strong style="color: var(--text-primary); font-size: 0.95rem;">Semestre ${escapeHtml(String(integrante.semestreActual || 1))}</strong>
          </div>

          <div style="background: var(--bg-page); padding: 14px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 4px;">Fecha Nacimiento y Edad</span>
            <strong style="color: var(--text-primary); font-size: 0.95rem;">
              ${escapeHtml(integrante.fechaNacimiento || 'Sin fecha')}
              ${integrante.edad ? ` (${integrante.edad} años)` : ''}
            </strong>
          </div>

          <div style="background: var(--bg-page); padding: 14px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 4px;">Semillero Vinculado</span>
            <strong style="color: var(--ufps-red-700); font-size: 0.95rem;">
              ${escapeHtml(integrante.semilleroSigla || 'SEM')} — ${escapeHtml(integrante.semilleroNombre || '')}
            </strong>
          </div>
        </div>

        <div style="background: var(--bg-page); padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
          <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 8px;">Información de Contacto y Residencia</span>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; font-size: 0.88rem;">
            <div>
              <span class="text-muted">Correo:</span><br />
              <strong>${escapeHtml(integrante.email || 'Sin correo registrado')}</strong>
            </div>
            <div>
              <span class="text-muted">Celular:</span><br />
              <strong>${escapeHtml(integrante.celular || 'Sin celular registrado')}</strong>
            </div>
            <div style="grid-column: 1 / -1;">
              <span class="text-muted">Dirección:</span><br />
              <strong>${escapeHtml(integrante.direccion || 'Sin dirección registrada')}</strong>
            </div>
          </div>
        </div>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn--secondary" data-modal-close>Cerrar</button>
    `,
  });
}

/**
 * Muestra la ficha rápida del semillero desde un integrante, con acceso directo a la vista detalle.
 */
export function openSemilleroPreviewModal(semillero, integrante = null) {
  if (!semillero) {
    showToast('No se encontró la información del semillero asociado', 'error');
    return;
  }

  const lineasHtml = (semillero.lineas || []).length
    ? semillero.lineas.map((l) => `<span class="tag">${escapeHtml(l.nombre)}</span>`).join('')
    : '<span class="text-sm text-muted">Sin líneas asociadas</span>';

  openModal({
    title: `Semillero ${semillero.sigla}`,
    bodyHtml: `
      ${semillero.logoUrl
        ? `<div style="text-align: center; margin-bottom: 16px;">
              <img src="${escapeHtml(resolveFileUrl(semillero.logoUrl))}" alt="${escapeHtml(semillero.sigla)}" style="max-height: 75px; max-width: 160px; object-fit: contain; border-radius: var(--radius-sm); border: 1px solid var(--border-color); padding: 4px; background: #fff; box-shadow: var(--shadow-xs);" />
            </div>`
        : (semillero.fotoUrl
            ? `<div style="text-align: center; margin-bottom: 16px;">
                 <img src="${escapeHtml(resolveImageUrl(semillero.fotoUrl))}" alt="${escapeHtml(semillero.nombre)}" style="max-height: 160px; max-width: 100%; border-radius: var(--radius-md); object-fit: cover; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm);" />
               </div>`
            : '')
      }
      ${
        integrante
          ? `<p class="text-sm text-muted" style="margin-bottom: 12px;">
              Integrante consultado: <strong>${escapeHtml(integrante.nombre)}</strong> (${escapeHtml(integrante.codigo)})
            </p>`
        : ''
      }
      <div class="info-blocks">
        <div class="info-block">
          <div class="info-block__label">Nombre y Grupo de Investigación</div>
          <div class="info-block__text">
            <strong>${escapeHtml(semillero.nombre)}</strong><br/>
            ${escapeHtml(semillero.grupoInvestigacion?.sigla ? `${semillero.grupoInvestigacion.sigla} · ${semillero.grupoInvestigacion.nombre}` : (semillero.grupoInvestigacion?.nombre || 'No asignado'))}
          </div>
        </div>
        <div class="info-block">
          <div class="info-block__label">Director Responsable</div>
          <div class="info-block__text">
            ${escapeHtml(semillero.director?.nombre || 'No asignado')}
            ${semillero.director?.correo ? `<br/><span class="text-muted">${escapeHtml(semillero.director.correo)}</span>` : ''}
          </div>
        </div>
        <div class="info-block">
          <div class="info-block__label">Misión</div>
          <div class="info-block__text">${escapeHtml(semillero.mision || 'No registrada')}</div>
        </div>
        <div class="info-block">
          <div class="info-block__label">Visión</div>
          <div class="info-block__text">${escapeHtml(semillero.vision || 'No registrada')}</div>
        </div>
        <div class="info-block">
          <div class="info-block__label">Líneas de Investigación</div>
          <div class="tags-wrap mt-1">${lineasHtml}</div>
        </div>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn--secondary" data-modal-close>Cerrar</button>
      <button type="button" class="btn btn--primary" id="goToSemilleroDetailBtn">Ver detalle completo →</button>
    `,
    onMount: (backdrop) => {
      backdrop.querySelector('#goToSemilleroDetailBtn').addEventListener('click', () => {
        closeModal();
        window.location.hash = `#/semilleros/${semillero.id}`;
      });
    },
  });
}

/**
 * Abre el modal compartido para crear o editar un Producto de investigación (tipología Minciencias).
 */
export function openProductoFormModal({ producto = null, defaultSemilleroId = null, lockSemillero = false } = {}, onSaved = null) {
  const isEdit = Boolean(producto);
  const selectedSemilleroId = producto?.semilleroId ?? defaultSemilleroId ?? '';
  const selectedIntegranteIds = new Set((producto?.integrantes || []).map((i) => Number(i.id)));

  const semilleroOptions = store.semilleros
    .map(
      (s) => `
      <option value="${s.id}" ${Number(selectedSemilleroId) === Number(s.id) ? 'selected' : ''}>
        ${escapeHtml(s.sigla)} — ${escapeHtml(s.nombre)}
      </option>`
    )
    .join('');

  // Agrupar tipos de producto por categoría Minciencias
  const tiposByCategoria = new Map();
  (store.tiposProducto || []).forEach((t) => {
    if (!tiposByCategoria.has(t.categoria)) {
      tiposByCategoria.set(t.categoria, []);
    }
    tiposByCategoria.get(t.categoria).push(t);
  });

  const tipoOptionsHtml = Array.from(tiposByCategoria.entries())
    .map(
      ([categoria, tipos]) => `
      <optgroup label="${escapeHtml(categoria)}">
        ${tipos
          .map(
            (t) => `
          <option value="${escapeHtml(t.codigo)}" ${producto?.tipo === t.codigo ? 'selected' : ''}>
            ${escapeHtml(t.nombre)}
          </option>`
          )
          .join('')}
      </optgroup>`
    )
    .join('');

  const renderIntegrantesChecklist = (semId) => {
    if (!semId) {
      return '<p class="text-sm text-muted">Selecciona primero un semillero para ver sus integrantes disponibles.</p>';
    }
    const integrantes = getIntegrantesBySemillero(semId);
    if (!integrantes.length) {
      return '<p class="text-sm text-muted">Este semillero aún no tiene integrantes registrados. Agrega integrantes antes de registrar productos.</p>';
    }
    return `
      <div class="checkbox-grid">
        ${integrantes
        .map(
          (i) => `
          <label class="checkbox-row">
            <input type="checkbox" name="integranteIds" value="${i.id}"
              ${selectedIntegranteIds.has(Number(i.id)) ? 'checked' : ''} />
            <span>
              <strong>${escapeHtml(i.nombre)}</strong>
              <span class="text-muted text-sm">(${escapeHtml(i.codigo)}${i.esLider ? ' · ★ Líder' : ''})</span>
            </span>
          </label>`
        )
        .join('')}
      </div>
    `;
  };

  openModal({
    title: isEdit ? `Editar Producto · ${producto.nombre}` : 'Registrar Producto de Semillero',
    bodyHtml: `
      <form id="productoForm" class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label" for="prodSemillero">Semillero *</label>
          <select class="form-control" id="prodSemillero" name="semilleroId" required ${lockSemillero ? 'disabled' : ''}>
            <option value="">Seleccione un semillero...</option>
            ${semilleroOptions}
          </select>
          ${lockSemillero ? `<input type="hidden" name="semilleroId" value="${escapeHtml(selectedSemilleroId)}" />` : ''}
        </div>

        <div class="form-field form-field--full">
          <label class="form-label" for="prodNombre">Nombre del producto *</label>
          <input class="form-control" id="prodNombre" name="nombre" required maxlength="200"
            value="${escapeHtml(producto?.nombre || '')}" placeholder="Ej. Asistente Virtual Académico con RAG" />
        </div>

        <div class="form-field form-field--full">
          <label class="form-label" for="prodTipo">Tipo de producto (Tipología Minciencias) *</label>
          <select class="form-control" id="prodTipo" name="tipo" required>
            <option value="">Seleccione el tipo según Minciencias...</option>
            ${tipoOptionsHtml}
          </select>
        </div>

        <div class="form-field form-field--full">
          <label class="form-label" for="prodDescripcion">Descripción *</label>
          <textarea class="form-control" id="prodDescripcion" name="descripcion" required rows="3"
            placeholder="Describe el producto, su alcance y resultados obtenidos...">${escapeHtml(producto?.descripcion || '')}</textarea>
        </div>

        <div class="form-field form-field--full">
          <label class="form-label">Integrantes participantes *</label>
          <div id="prodIntegrantesContainer">
            ${renderIntegrantesChecklist(selectedSemilleroId)}
          </div>
        </div>

        <div class="form-field form-field--full" id="prodFormError"></div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn--secondary" data-modal-close>Cancelar</button>
      <button type="submit" form="productoForm" class="btn btn--primary" id="saveProductoBtn">
        ${isEdit ? 'Actualizar producto' : 'Registrar producto'}
      </button>
    `,
    onMount: (backdrop) => {
      const form = backdrop.querySelector('#productoForm');
      const semSelect = backdrop.querySelector('#prodSemillero');
      const integrantesContainer = backdrop.querySelector('#prodIntegrantesContainer');
      const errorBox = backdrop.querySelector('#prodFormError');
      const saveBtn = backdrop.querySelector('#saveProductoBtn');

      if (!lockSemillero && semSelect) {
        semSelect.addEventListener('change', (e) => {
          selectedIntegranteIds.clear();
          integrantesContainer.innerHTML = renderIntegrantesChecklist(e.target.value);
        });
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.innerHTML = '';

        const formData = new FormData(form);
        const integranteIds = formData.getAll('integranteIds').map(Number).filter(Boolean);

        if (!integranteIds.length) {
          errorBox.innerHTML = `<div class="form-error">Debes seleccionar al menos un integrante participante del semillero.</div>`;
          return;
        }

        const payload = {
          semilleroId: Number(formData.get('semilleroId')),
          nombre: String(formData.get('nombre') || '').trim(),
          descripcion: String(formData.get('descripcion') || '').trim(),
          tipo: String(formData.get('tipo') || '').trim(),
          integranteIds,
        };

        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
          if (isEdit) {
            await productosApi.update(producto.id, payload);
            showToast('Producto actualizado correctamente', 'success');
          } else {
            await productosApi.create(payload);
            showToast('Producto registrado correctamente', 'success');
          }
          await loadAllData();
          closeModal();
          if (onSaved) onSaved();
        } catch (err) {
          errorBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
          saveBtn.disabled = false;
          saveBtn.textContent = isEdit ? 'Actualizar producto' : 'Registrar producto';
        }
      });
    },
  });
}

/**
 * Muestra el modal con toda la información detallada de un Producto.
 */
export function openProductoDetailModal(producto, onEdit = null) {
  if (!producto) return;

  const integrantesHtml = (producto.integrantes || []).length
    ? `
      <div class="info-blocks" style="gap: 8px;">
        ${producto.integrantes
      .map(
        (i) => `
          <div class="meta-row" style="padding: 8px 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-app); justify-content: space-between; align-items: center;">
            <div class="person-cell">
              <div class="avatar ${i.esLider ? 'avatar--leader' : ''}">${escapeHtml(getInitials(i.nombre))}</div>
              <div>
                <strong>${escapeHtml(i.nombre)}</strong>
                <div class="text-sm text-muted">${escapeHtml(i.codigo)} · ${escapeHtml(i.programa)}</div>
              </div>
            </div>
            ${i.esLider
            ? '<span class="badge badge--leader">★ Líder</span>'
            : '<span class="badge badge--member">Participante</span>'
          }
          </div>`
      )
      .join('')}
      </div>`
    : '<p class="text-sm text-muted">Sin participantes registrados.</p>';

  openModal({
    title: producto.nombre,
    bodyHtml: `
      <div class="info-blocks">
        <div class="semillero-card__meta">
          <div class="meta-row">
            <span class="meta-row__label">Semillero:</span>
            <strong>${escapeHtml(producto.semilleroSigla)} — ${escapeHtml(producto.semilleroNombre)}</strong>
          </div>
          <div class="meta-row">
            <span class="meta-row__label">Categoría Minciencias:</span>
            <span class="badge badge--member">${escapeHtml(producto.tipoCategoria)}</span>
          </div>
          <div class="meta-row">
            <span class="meta-row__label">Tipo de producto:</span>
            <strong>${escapeHtml(producto.tipoNombre)}</strong>
          </div>
        </div>

        <div class="info-block">
          <div class="info-block__label">Descripción</div>
          <div class="info-block__text">${escapeHtml(producto.descripcion || 'Sin descripción')}</div>
        </div>

        <div class="info-block">
          <div class="info-block__label">Integrantes participantes (${(producto.integrantes || []).length})</div>
          <div class="mt-1">${integrantesHtml}</div>
        </div>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn--secondary" data-modal-close>Cerrar</button>
      ${onEdit
        ? '<button type="button" class="btn btn--primary" id="editFromDetailBtn">Editar producto</button>'
        : ''
      }
    `,
    onMount: (backdrop) => {
      backdrop.querySelector('#editFromDetailBtn')?.addEventListener('click', () => {
        closeModal();
        onEdit(producto);
      });
    },
  });
}

/**
 * Abre el modal compartido para crear o editar una Actividad de Investigación.
 */
export function openActividadFormModal({ actividad = null, defaultSemilleroId = null, lockSemillero = false } = {}, onSaved = null) {
  const isEdit = Boolean(actividad);
  const selectedSemilleroId = actividad?.semilleroId ?? defaultSemilleroId ?? '';
  const selectedTipoId = actividad?.tipoActividadId ?? '';

  const semilleroOptions = store.semilleros
    .map(
      (s) => `
      <option value="${s.id}" ${Number(selectedSemilleroId) === Number(s.id) ? 'selected' : ''}>
        ${escapeHtml(s.sigla)} — ${escapeHtml(s.nombre)}
      </option>`
    )
    .join('');

  const tipoOptions = store.tiposActividad
    .map(
      (t) => `
      <option value="${t.id}" ${Number(selectedTipoId) === Number(t.id) ? 'selected' : ''}>
        ${escapeHtml(t.nombre)}
      </option>`
    )
    .join('');

  openModal({
    title: isEdit ? `Editar Actividad · ${actividad.nombre}` : 'Registrar Actividad de Investigación',
    bodyHtml: `
      <form id="actividadForm" class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label" for="actSemillero">Semillero *</label>
          <select class="form-control" id="actSemillero" name="semilleroId" required ${lockSemillero ? 'disabled' : ''}>
            <option value="">Seleccione un semillero...</option>
            ${semilleroOptions}
          </select>
          ${lockSemillero ? `<input type="hidden" name="semilleroId" value="${escapeHtml(selectedSemilleroId)}" />` : ''}
        </div>

        <div class="form-field">
          <label class="form-label" for="actTipo">Tipo de Actividad *</label>
          <select class="form-control" id="actTipo" name="tipoActividadId" required>
            <option value="">Seleccione el tipo de actividad...</option>
            ${tipoOptions}
          </select>
        </div>

        <div class="form-field">
          <label class="form-label" for="actCumplimiento">% de Cumplimiento (0 - 100%) *</label>
          <input type="number" class="form-control" id="actCumplimiento" name="porcentajeCumplimiento"
            required min="0" max="100" step="1"
            value="${actividad?.porcentajeCumplimiento ?? 100}" placeholder="Ej. 100" />
        </div>

        <div class="form-field form-field--full">
          <label class="form-label" for="actNombre">Nombre de la actividad *</label>
          <input class="form-control" id="actNombre" name="nombre" required maxlength="255"
            value="${escapeHtml(actividad?.nombre || '')}"
            placeholder="Ej. Apertura Semana Internacional Ciencia y Tecnología" />
        </div>

        <div class="form-field form-field--full" id="actFormError"></div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn--secondary" data-modal-close>Cancelar</button>
      <button type="submit" form="actividadForm" class="btn btn--primary" id="saveActividadBtn">
        ${isEdit ? 'Actualizar actividad' : 'Registrar actividad'}
      </button>
    `,
    onMount: (backdrop) => {
      const form = backdrop.querySelector('#actividadForm');
      const errorBox = backdrop.querySelector('#actFormError');
      const saveBtn = backdrop.querySelector('#saveActividadBtn');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.innerHTML = '';

        const formData = new FormData(form);
        const payload = {
          semilleroId: Number(formData.get('semilleroId')),
          tipoActividadId: Number(formData.get('tipoActividadId')),
          nombre: String(formData.get('nombre') || '').trim(),
          porcentajeCumplimiento: Number(formData.get('porcentajeCumplimiento')),
        };

        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
          if (isEdit) {
            await actividadesApi.update(actividad.id, payload);
            showToast('Actividad actualizada correctamente', 'success');
          } else {
            await actividadesApi.create(payload);
            showToast('Actividad registrada correctamente', 'success');
          }
          await loadAllData();
          closeModal();
          if (onSaved) onSaved();
        } catch (err) {
          errorBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
          saveBtn.disabled = false;
          saveBtn.textContent = isEdit ? 'Actualizar actividad' : 'Registrar actividad';
        }
      });
    },
  });
}

/**
 * Abre el modal para crear o editar un Tipo de Actividad en el catálogo.
 */
export function openTipoActividadFormModal(tipoActividad = null, onSaved = null) {
  const isEdit = Boolean(tipoActividad);

  openModal({
    title: isEdit ? `Editar Tipo de Actividad · ${tipoActividad.nombre}` : 'Nuevo Tipo de Actividad',
    bodyHtml: `
      <form id="tipoActividadForm" class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label" for="tipoActNombre">Nombre del tipo de actividad *</label>
          <input class="form-control" id="tipoActNombre" name="nombre" required maxlength="160"
            value="${escapeHtml(tipoActividad?.nombre || '')}" placeholder="Ej. Espacio de socialización" />
        </div>
        <div class="form-field form-field--full" id="tipoActFormError"></div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn--secondary" data-modal-close>Cancelar</button>
      <button type="submit" form="tipoActividadForm" class="btn btn--primary" id="saveTipoActBtn">
        ${isEdit ? 'Actualizar tipo' : 'Guardar tipo'}
      </button>
    `,
    onMount: (backdrop) => {
      const form = backdrop.querySelector('#tipoActividadForm');
      const errorBox = backdrop.querySelector('#tipoActFormError');
      const saveBtn = backdrop.querySelector('#saveTipoActBtn');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.innerHTML = '';

        const formData = new FormData(form);
        const payload = {
          nombre: String(formData.get('nombre') || '').trim(),
        };

        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
          if (isEdit) {
            await tiposActividadApi.update(tipoActividad.id, payload);
            showToast('Tipo de actividad actualizado', 'success');
          } else {
            await tiposActividadApi.create(payload);
            showToast('Tipo de actividad creado', 'success');
          }
          await loadAllData();
          closeModal();
          if (onSaved) onSaved();
        } catch (err) {
          errorBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
          saveBtn.disabled = false;
          saveBtn.textContent = isEdit ? 'Actualizar tipo' : 'Guardar tipo';
        }
      });
    },
  });
}

export function openCapacitacionFormModal({ capacitacion = null, defaultSemilleroId = null, lockSemillero = false } = {}, onSaved = null) {
  const isEdit = Boolean(capacitacion);
  const selectedSemilleroId = capacitacion?.semilleroId ?? defaultSemilleroId ?? '';

  const semilleroOptions = store.semilleros
    .map(
      (s) => `
      <option value="${s.id}" ${Number(selectedSemilleroId) === Number(s.id) ? 'selected' : ''}>
        ${escapeHtml(s.sigla)} — ${escapeHtml(s.nombre)}
      </option>`
    )
    .join('');

  openModal({
    title: isEdit ? `Editar Capacitación · ${capacitacion.nombreCapacitacion}` : 'Registrar Nueva Capacitación',
    bodyHtml: `
      <form id="capacitacionForm" class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label" for="capSemillero">Semillero Responsable *</label>
          <select class="form-control" id="capSemillero" name="semilleroId" required ${lockSemillero ? 'disabled' : ''}>
            <option value="">Seleccione un semillero...</option>
            ${semilleroOptions}
          </select>
          ${lockSemillero ? `<input type="hidden" name="semilleroId" value="${escapeHtml(selectedSemilleroId)}" />` : ''}
        </div>

        <div class="form-field form-field--full">
          <label class="form-label" for="capNombre">Nombre de la Capacitación *</label>
          <input class="form-control" id="capNombre" name="nombreCapacitacion" required maxlength="200"
            value="${escapeHtml(capacitacion?.nombreCapacitacion || '')}"
            placeholder="Ej. Taller de Redes Neuronales y Deep Learning con PyTorch" />
        </div>

        <div class="form-field">
          <label class="form-label" for="capFecha">Fecha de Realización *</label>
          <input type="date" class="form-control" id="capFecha" name="fecha" required
            value="${escapeHtml(capacitacion?.fecha || new Date().toISOString().slice(0, 10))}" />
        </div>

        <div class="form-field">
          <label class="form-label" for="capParticipantes">Cantidad de Participantes *</label>
          <input type="number" class="form-control" id="capParticipantes" name="cantidadParticipantes"
            required min="0" step="1"
            value="${capacitacion?.cantidadParticipantes ?? 25}" placeholder="Ej. 25" />
        </div>

        <div class="form-field form-field--full">
          <label class="form-label" for="capCumplimiento">% de Cumplimiento (0 - 100%) *</label>
          <input type="number" class="form-control" id="capCumplimiento" name="porcentajeCumplimiento"
            required min="0" max="100" step="0.1"
            value="${capacitacion?.porcentajeCumplimiento ?? 100}" placeholder="Ej. 100" />
        </div>

        <div class="form-field form-field--full">
          <label class="form-label" for="capObjetivo">Objetivo de la Capacitación *</label>
          <textarea class="form-control" id="capObjetivo" name="objetivoCapacitacion" rows="3" required
            placeholder="Describa el objetivo principal y los aprendizajes esperados de la capacitación...">${escapeHtml(capacitacion?.objetivoCapacitacion || '')}</textarea>
        </div>

        <div class="form-field form-field--full" id="capFormError"></div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn--secondary" data-modal-close>Cancelar</button>
      <button type="submit" form="capacitacionForm" class="btn btn--primary" id="saveCapacitacionBtn">
        ${isEdit ? 'Actualizar capacitación' : 'Guardar capacitación'}
      </button>
    `,
    onMount: (backdrop) => {
      const form = backdrop.querySelector('#capacitacionForm');
      const errorBox = backdrop.querySelector('#capFormError');
      const saveBtn = backdrop.querySelector('#saveCapacitacionBtn');

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.innerHTML = '';

        const formData = new FormData(form);
        const payload = {
          semilleroId: Number(formData.get('semilleroId')),
          nombreCapacitacion: String(formData.get('nombreCapacitacion') || '').trim(),
          fecha: String(formData.get('fecha') || '').trim(),
          objetivoCapacitacion: String(formData.get('objetivoCapacitacion') || '').trim(),
          porcentajeCumplimiento: Number(formData.get('porcentajeCumplimiento')),
          cantidadParticipantes: Number(formData.get('cantidadParticipantes')),
        };

        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
          if (isEdit) {
            await capacitacionesApi.update(capacitacion.id, payload);
            showToast('Capacitación actualizada correctamente', 'success');
          } else {
            await capacitacionesApi.create(payload);
            showToast('Capacitación registrada correctamente', 'success');
          }
          await loadAllData();
          closeModal();
          if (onSaved) onSaved();
        } catch (err) {
          errorBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
          saveBtn.disabled = false;
          saveBtn.textContent = isEdit ? 'Actualizar capacitación' : 'Guardar capacitación';
        }
      });
    },
  });
}

/**
 * Abre el modal para redactar y enviar un correo a los participantes de un semillero específico.
 */
export function openEnviarCorreoModal(semillero, integrantes = [], onSent = null) {
  if (!semillero) return;

  const validIntegrantes = integrantes.filter((i) => i.email && i.email.trim() !== '');

  const integrantesCheckboxesHtml = validIntegrantes.length
    ? `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <label class="form-label" style="margin-bottom: 0;">Destinatarios (${validIntegrantes.length} participantes con correo) *</label>
          <button type="button" class="btn btn--link text-xs" id="toggleAllIntegrantesBtn" style="padding: 0; color: var(--primary-color); cursor: pointer; background: none; border: none;">
            Desmarcar todos
          </button>
        </div>
        <div class="recipients-selector" style="max-height: 150px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: var(--radius-sm, 6px); padding: 8px 12px; background: var(--bg-surface, #f8fafc);">
          ${validIntegrantes
            .map(
              (i) => `
            <label style="display: flex; align-items: center; gap: 10px; font-size: 0.86rem; padding: 5px 0; border-bottom: 1px solid rgba(0,0,0,0.04); cursor: pointer;">
              <input type="checkbox" name="integranteIds" value="${i.id}" checked class="integrante-checkbox" />
              <span>
                <strong>${escapeHtml(i.nombre)}</strong>
                <span class="text-sm text-muted">(${escapeHtml(i.email)})</span>
                ${i.esLider ? '<span class="badge badge--leader" style="font-size: 0.7rem; padding: 1px 6px; margin-left: 4px;">Líder</span>' : ''}
              </span>
            </label>`
            )
            .join('')}
        </div>
        <div class="text-xs text-muted" style="margin-top: 4px;">Solo se enviará a los participantes seleccionados que pertenecen exclusivamente al semillero <strong>${escapeHtml(semillero.sigla)}</strong>.</div>
      </div>`
    : `
      <div class="empty-state" style="padding: 16px; margin-bottom: 16px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px;">
        <p style="color: #be123c; margin: 0; font-size: 0.9rem;">
          Este semillero no tiene integrantes con correo electrónico registrado. Registra o actualiza los correos de los integrantes para habilitar el envío.
        </p>
      </div>`;

  openModal({
    title: `✉ Enviar correo a participantes · ${escapeHtml(semillero.sigla)}`,
    bodyHtml: `
      <form id="enviarCorreoForm" class="form-grid">
        <div class="form-field form-field--full" id="correoErrorBox"></div>

        <div class="form-field form-field--full">
          <div style="background: var(--ufps-red-50, #fdf2f4); border: 1px solid var(--ufps-red-200, #f9d0d7); border-radius: 6px; padding: 12px 14px; margin-bottom: 4px; font-size: 0.88rem; color: var(--text-primary);">
            <strong>Semillero:</strong> ${escapeHtml(semillero.nombre)} (<code>${escapeHtml(semillero.sigla)}</code>)<br/>
            <span class="text-sm text-muted">Los correos se enviarán con copia oculta (BCC) garantizando la privacidad de los participantes.</span>
          </div>
        </div>

        <div class="form-field form-field--full">
          ${integrantesCheckboxesHtml}
        </div>

        <div class="form-field form-field--full">
          <label class="form-label" for="correoAsunto">Asunto del correo *</label>
          <input class="form-control" id="correoAsunto" name="asunto" required maxlength="200"
            placeholder="Ej. Convocatoria a reunión de avance o socialización" />
        </div>

        <div class="form-field form-field--full">
          <label class="form-label" for="correoMensaje">Mensaje *</label>
          <textarea class="form-control" id="correoMensaje" name="mensaje" required rows="6" maxlength="10000"
            placeholder="Escribe el mensaje que recibirán los participantes del semillero..."></textarea>
        </div>

        <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; width: 100%;">
          <button type="button" class="btn btn--secondary btn--sm" data-modal-close>Cancelar</button>
          <button type="submit" class="btn btn--primary btn--sm" id="enviarCorreoSubmitBtn" ${validIntegrantes.length === 0 ? 'disabled' : ''}>
            ✉ Enviar correo
          </button>
        </div>
      </form>
    `,
    onMount: (modalEl) => {
      const form = modalEl.querySelector('#enviarCorreoForm');
      const submitBtn = modalEl.querySelector('#enviarCorreoSubmitBtn');
      const errorBox = modalEl.querySelector('#correoErrorBox');
      const toggleBtn = modalEl.querySelector('#toggleAllIntegrantesBtn');
      const checkboxes = modalEl.querySelectorAll('.integrante-checkbox');

      let allChecked = true;
      toggleBtn?.addEventListener('click', () => {
        allChecked = !allChecked;
        checkboxes.forEach((cb) => {
          cb.checked = allChecked;
        });
        toggleBtn.textContent = allChecked ? 'Desmarcar todos' : 'Marcar todos';
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.innerHTML = '';

        const formData = new FormData(form);
        const asunto = String(formData.get('asunto') || '').trim();
        const mensaje = String(formData.get('mensaje') || '').trim();

        const selectedIds = Array.from(modalEl.querySelectorAll('.integrante-checkbox:checked')).map((cb) =>
          Number(cb.value)
        );

        if (validIntegrantes.length > 0 && selectedIds.length === 0) {
          errorBox.innerHTML = '<div class="form-error">Debes seleccionar al menos un participante destinatario.</div>';
          return;
        }

        const payload = {
          asunto,
          mensaje,
          integranteIds: selectedIds.length > 0 ? selectedIds : null,
        };

        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando correo...';

        try {
          const res = await semillerosApi.enviarCorreo(semillero.id, payload);
          showToast(res.mensaje || 'Correo enviado exitosamente a los participantes', 'success');
          closeModal();
          if (onSent) onSent(res);
        } catch (err) {
          errorBox.innerHTML = `<div class="form-error">${escapeHtml(err.message)}</div>`;
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });
    },
  });
}



