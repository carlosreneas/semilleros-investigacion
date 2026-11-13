import { store, loadAllData, getIntegrantesBySemillero } from '../state/store.js';
import { semillerosApi } from '../api/semillerosApi.js';
import { integrantesApi } from '../api/integrantesApi.js';
import { productosApi } from '../api/productosApi.js';
import { tiposActividadApi } from '../api/tiposActividadApi.js';
import { actividadesApi } from '../api/actividadesApi.js';
import { openModal, closeModal } from './modal.js';
import { showToast } from './toast.js';

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
          <label class="form-label" for="semGrupo">Grupo de investigación *</label>
          <input class="form-control" id="semGrupo" name="grupoInvestigacion" required maxlength="180"
            value="${escapeHtml(semillero?.grupoInvestigacion || '')}" placeholder="Ej. Grupo de Sistemas Inteligentes" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="semDirector">Director responsable *</label>
          <select class="form-control" id="semDirector" name="directorId" required>
            <option value="">Seleccione un director...</option>
            ${directorOptions}
          </select>
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

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.innerHTML = '';

        const formData = new FormData(form);
        const lineaIds = formData.getAll('lineaIds').map((id) => Number(id));
        const payload = {
          nombre: String(formData.get('nombre') || '').trim(),
          sigla: String(formData.get('sigla') || '').trim(),
          grupoInvestigacion: String(formData.get('grupoInvestigacion') || '').trim(),
          mision: String(formData.get('mision') || '').trim(),
          vision: String(formData.get('vision') || '').trim(),
          objetivoGeneral: String(formData.get('objetivoGeneral') || '').trim(),
          directorId: Number(formData.get('directorId')),
          lineaIds,
        };

        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        try {
          if (isEdit) {
            await semillerosApi.update(semillero.id, payload);
            showToast('Semillero actualizado correctamente', 'success');
          } else {
            await semillerosApi.create(payload);
            showToast('Semillero creado correctamente', 'success');
          }
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

  openModal({
    title: isEdit ? `Editar Integrante · ${integrante.nombre}` : 'Agregar Integrante a Semillero',
    bodyHtml: `
      <form id="integranteForm" class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label" for="intSemillero">Semillero *</label>
          <select class="form-control" id="intSemillero" name="semilleroId" required ${lockSemillero ? 'disabled' : ''}>
            <option value="">Seleccione un semillero...</option>
            ${semilleroOptions}
          </select>
          ${lockSemillero ? `<input type="hidden" name="semilleroId" value="${escapeHtml(selectedSemilleroId)}" />` : ''}
        </div>
        <div class="form-field">
          <label class="form-label" for="intCodigo">Código estudiantil *</label>
          <input class="form-control" id="intCodigo" name="codigo" required maxlength="40"
            value="${escapeHtml(integrante?.codigo || '')}" placeholder="Ej. 1152104" />
        </div>
        <div class="form-field">
          <label class="form-label" for="intPrograma">Programa académico *</label>
          <input class="form-control" id="intPrograma" name="programa" required maxlength="160"
            value="${escapeHtml(integrante?.programa || '')}" placeholder="Ej. Ingeniería de Sistemas" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="intNombre">Nombre completo *</label>
          <input class="form-control" id="intNombre" name="nombre" required maxlength="160"
            value="${escapeHtml(integrante?.nombre || '')}" placeholder="Ej. Carlos Andrés Gómez" />
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

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorBox.innerHTML = '';

        const formData = new FormData(form);
        const payload = {
          semilleroId: Number(formData.get('semilleroId')),
          codigo: String(formData.get('codigo') || '').trim(),
          nombre: String(formData.get('nombre') || '').trim(),
          programa: String(formData.get('programa') || '').trim(),
          esLider: Boolean(formData.get('esLider')),
        };

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
            ${escapeHtml(semillero.grupoInvestigacion)}
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
            ${
              i.esLider
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
      ${
        onEdit
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

