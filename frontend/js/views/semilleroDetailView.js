import {
  store,
  loadAllData,
  getSemilleroById,
  getIntegrantesBySemillero,
  getProductosBySemillero,
  getActividadesBySemillero,
} from '../state/store.js';
import { semillerosApi } from '../api/semillerosApi.js';
import { integrantesApi } from '../api/integrantesApi.js';
import { productosApi } from '../api/productosApi.js';
import { actividadesApi } from '../api/actividadesApi.js';
import { confirmDialog } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import {
  escapeHtml,
  getInitials,
  openIntegranteFormModal,
  openProductoFormModal,
  openActividadFormModal,
  openSemilleroFormModal,
  renderEmptyState,
} from '../ui/components.js';

export function renderSemilleroDetailView(container, semilleroId) {
  const semillero = getSemilleroById(semilleroId);

  if (!semillero) {
    container.innerHTML = renderEmptyState(
      'Semillero no encontrado',
      'El semillero solicitado no existe o fue eliminado.',
      `<a href="#/semilleros" class="btn btn--primary">← Volver al listado</a>`
    );
    return;
  }

  const integrantes = getIntegrantesBySemillero(semillero.id);
  const productos = getProductosBySemillero(semillero.id);
  const actividades = getActividadesBySemillero(semillero.id);
  const associatedIds = new Set((semillero.lineas || []).map((l) => Number(l.id)));
  const availableLineas = store.lineas.filter((l) => !associatedIds.has(Number(l.id)));

  const lineasTagsHtml = (semillero.lineas || []).length
    ? semillero.lineas
        .map(
          (l) => `
        <span class="tag">
          <span>${escapeHtml(l.nombre)}</span>
          <button type="button" class="tag__remove" data-remove-linea="${l.id}" title="Desasociar línea" aria-label="Desasociar ${escapeHtml(l.nombre)}">✕</button>
        </span>`
        )
        .join('')
    : '<p class="text-sm text-muted">Este semillero aún no tiene líneas de investigación asociadas.</p>';

  const addLineaControlHtml = availableLineas.length
    ? `
      <form class="inline-add-form" id="addLineaForm">
        <select class="form-control" name="lineaId" required aria-label="Seleccionar línea para asociar">
          <option value="">Asociar línea de investigación...</option>
          ${availableLineas.map((l) => `<option value="${l.id}">${escapeHtml(l.nombre)}</option>`).join('')}
        </select>
        <button type="submit" class="btn btn--soft-red btn--sm">Asociar</button>
      </form>`
    : '<p class="text-sm text-muted mt-2">Todas las líneas del catálogo ya están asociadas a este semillero.</p>';

  const integrantesRowsHtml = integrantes.length
    ? `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Integrante</th>
              <th>Código</th>
              <th>Programa Académico</th>
              <th>Rol</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${integrantes
              .map(
                (i) => `
              <tr>
                <td>
                  <div class="person-cell">
                    <div class="avatar ${i.esLider ? 'avatar--leader' : ''}">${escapeHtml(getInitials(i.nombre))}</div>
                    <strong>${escapeHtml(i.nombre)}</strong>
                  </div>
                </td>
                <td><code>${escapeHtml(i.codigo)}</code></td>
                <td>${escapeHtml(i.programa)}</td>
                <td>
                  ${
                    i.esLider
                      ? '<span class="badge badge--leader">★ Líder</span>'
                      : '<span class="badge badge--member">Integrante</span>'
                  }
                </td>
                <td style="text-align: right;">
                  <div class="card-actions" style="justify-content: flex-end;">
                    <button type="button" class="btn btn--secondary btn--sm" data-edit-integrante="${i.id}">Editar</button>
                    <button type="button" class="btn btn--danger btn--sm" data-delete-integrante="${i.id}">Eliminar</button>
                  </div>
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`
    : renderEmptyState(
        'Sin integrantes registrados',
        'Agrega estudiantes a este semillero usando el botón "+ Agregar integrante".'
      );

  const productosRowsHtml = productos.length
    ? `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Tipología Minciencias</th>
              <th>Participantes</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${productos
              .map(
                (p) => `
              <tr>
                <td>
                  <strong>${escapeHtml(p.nombre)}</strong>
                  <div class="text-sm text-muted" style="margin-top: 4px; max-width: 420px;">${escapeHtml(p.descripcion)}</div>
                </td>
                <td>
                  <div class="text-sm" style="font-weight: 600;">${escapeHtml(p.tipoNombre)}</div>
                  <span class="badge badge--member" style="margin-top: 4px;">${escapeHtml(p.tipoCategoria)}</span>
                </td>
                <td>
                  <div class="tags-wrap">
                    ${(p.integrantes || [])
                      .map((i) => `<span class="tag"><span>${escapeHtml(i.nombre)}</span></span>`)
                      .join('')}
                  </div>
                </td>
                <td style="text-align: right;">
                  <div class="card-actions" style="justify-content: flex-end;">
                    <button type="button" class="btn btn--secondary btn--sm" data-edit-producto="${p.id}">Editar</button>
                    <button type="button" class="btn btn--danger btn--sm" data-delete-producto="${p.id}">Eliminar</button>
                  </div>
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`
    : renderEmptyState(
        'Sin productos registrados',
        'Registra los productos desarrollados por este semillero según la tipología de Minciencias.'
      );

  const actividadesRowsHtml = actividades.length
    ? `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo de Actividad</th>
              <th style="width: 220px;">% de Cumplimiento</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${actividades
              .map(
                (a) => `
              <tr>
                <td>
                  <strong>${escapeHtml(a.nombre)}</strong>
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
      </div>`
    : renderEmptyState(
        'Sin actividades de investigación registradas',
        'Registra las actividades de investigación desarrolladas por este semillero.'
      );

  container.innerHTML = `
    <section>
      <div class="hero-banner">
        <div>
          <span class="hero-banner__sigla">${escapeHtml(semillero.sigla)}</span>
          <h1 class="hero-banner__title">${escapeHtml(semillero.nombre)}</h1>
          <p class="hero-banner__subtitle">
            ${escapeHtml(semillero.grupoInvestigacion)} · Director: <strong>${escapeHtml(semillero.director?.nombre || 'No asignado')}</strong>
            ${semillero.director?.correo ? `(${escapeHtml(semillero.director.correo)})` : ''}
          </p>
        </div>
        <div class="hero-banner__actions">
          <a href="#/semilleros" class="btn btn--white-outline btn--sm">← Volver</a>
          <button type="button" class="btn btn--white-outline btn--sm" id="editSemilleroDetailBtn">Editar semillero</button>
          <button type="button" class="btn btn--primary btn--sm" id="addIntegranteDetailBtn">+ Agregar integrante</button>
        </div>
      </div>

      <div class="detail-grid">
        <div class="panel panel--span-7">
          <div class="panel__header">
            <h2 class="panel__title">Identidad y Propósito</h2>
          </div>
          <div class="info-blocks">
            <div class="info-block">
              <div class="info-block__label">Misión</div>
              <div class="info-block__text">${escapeHtml(semillero.mision || 'No registrada')}</div>
            </div>
            <div class="info-block">
              <div class="info-block__label">Visión</div>
              <div class="info-block__text">${escapeHtml(semillero.vision || 'No registrada')}</div>
            </div>
            <div class="info-block">
              <div class="info-block__label">Objetivo General</div>
              <div class="info-block__text">${escapeHtml(semillero.objetivoGeneral || 'No registrado')}</div>
            </div>
          </div>
        </div>

        <div class="panel panel--span-5">
          <div class="panel__header">
            <h2 class="panel__title">Líneas de Investigación (${(semillero.lineas || []).length})</h2>
          </div>
          <div class="tags-wrap">${lineasTagsHtml}</div>
          ${addLineaControlHtml}
        </div>

        <div class="panel panel--span-12" style="padding: 0; overflow: hidden;">
          <div class="panel__header" style="padding: 18px 20px 14px; margin-bottom: 0; border-bottom: 1px solid var(--border-color);">
            <h2 class="panel__title">Integrantes del Semillero (${integrantes.length})</h2>
            <button type="button" class="btn btn--primary btn--sm" id="addIntegranteTableBtn">+ Nuevo integrante</button>
          </div>
          ${integrantesRowsHtml}
        </div>

        <div class="panel panel--span-12" style="padding: 0; overflow: hidden;">
          <div class="panel__header" style="padding: 18px 20px 14px; margin-bottom: 0; border-bottom: 1px solid var(--border-color);">
            <h2 class="panel__title">Productos Desarrollados (${productos.length})</h2>
            <button type="button" class="btn btn--primary btn--sm" id="addProductoTableBtn">+ Nuevo producto</button>
          </div>
          ${productosRowsHtml}
        </div>

        <div class="panel panel--span-12" style="padding: 0; overflow: hidden;">
          <div class="panel__header" style="padding: 18px 20px 14px; margin-bottom: 0; border-bottom: 1px solid var(--border-color);">
            <h2 class="panel__title">3. Otras Actividades de Investigación (${actividades.length})</h2>
            <button type="button" class="btn btn--primary btn--sm" id="addActividadTableBtn">+ Nueva actividad</button>
          </div>
          ${actividadesRowsHtml}
        </div>
      </div>
    </section>
  `;

  // Editar semillero
  container.querySelector('#editSemilleroDetailBtn')?.addEventListener('click', () => {
    openSemilleroFormModal(semillero, () => renderSemilleroDetailView(container, semillero.id));
  });

  // Agregar integrante preseleccionando este semillero
  const openAddIntegrante = () => {
    openIntegranteFormModal(
      { defaultSemilleroId: semillero.id, lockSemillero: true },
      () => renderSemilleroDetailView(container, semillero.id)
    );
  };
  container.querySelector('#addIntegranteDetailBtn')?.addEventListener('click', openAddIntegrante);
  container.querySelector('#addIntegranteTableBtn')?.addEventListener('click', openAddIntegrante);

  // Asociar línea
  container.querySelector('#addLineaForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const lineaId = Number(new FormData(e.target).get('lineaId'));
    if (!lineaId) return;

    try {
      await semillerosApi.addLinea(semillero.id, lineaId);
      await loadAllData();
      showToast('Línea asociada al semillero', 'success');
      renderSemilleroDetailView(container, semillero.id);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Desasociar línea
  container.querySelectorAll('[data-remove-linea]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const lineaId = Number(btn.dataset.removeLinea);
      try {
        await semillerosApi.removeLinea(semillero.id, lineaId);
        await loadAllData();
        showToast('Línea desasociada', 'success');
        renderSemilleroDetailView(container, semillero.id);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  // Editar integrante
  container.querySelectorAll('[data-edit-integrante]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const integrante = store.integrantes.find((i) => Number(i.id) === Number(btn.dataset.editIntegrante));
      if (integrante) {
        openIntegranteFormModal({ integrante }, () => renderSemilleroDetailView(container, semillero.id));
      }
    });
  });

  // Eliminar integrante
  container.querySelectorAll('[data-delete-integrante]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const integrante = store.integrantes.find((i) => Number(i.id) === Number(btn.dataset.deleteIntegrante));
      if (!integrante) return;

      confirmDialog({
        title: 'Eliminar integrante',
        message: `¿Deseas retirar a "${integrante.nombre}" (${integrante.codigo}) del semillero ${semillero.sigla}?`,
        onConfirm: async () => {
          try {
            await integrantesApi.remove(integrante.id);
            await loadAllData();
            showToast('Integrante eliminado', 'success');
            renderSemilleroDetailView(container, semillero.id);
          } catch (err) {
            showToast(err.message, 'error');
            throw err;
          }
        },
      });
    });
  });

  // Agregar producto preseleccionando este semillero
  container.querySelector('#addProductoTableBtn')?.addEventListener('click', () => {
    openProductoFormModal(
      { defaultSemilleroId: semillero.id, lockSemillero: true },
      () => renderSemilleroDetailView(container, semillero.id)
    );
  });

  // Editar producto
  container.querySelectorAll('[data-edit-producto]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const producto = store.productos.find((p) => Number(p.id) === Number(btn.dataset.editProducto));
      if (producto) {
        openProductoFormModal(
          { producto, lockSemillero: true },
          () => renderSemilleroDetailView(container, semillero.id)
        );
      }
    });
  });

  // Eliminar producto
  container.querySelectorAll('[data-delete-producto]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const producto = store.productos.find((p) => Number(p.id) === Number(btn.dataset.deleteProducto));
      if (!producto) return;

      confirmDialog({
        title: 'Eliminar producto',
        message: `¿Deseas eliminar el producto "${producto.nombre}" del semillero ${semillero.sigla}?`,
        onConfirm: async () => {
          try {
            await productosApi.remove(producto.id);
            await loadAllData();
            showToast('Producto eliminado', 'success');
            renderSemilleroDetailView(container, semillero.id);
          } catch (err) {
            showToast(err.message, 'error');
            throw err;
          }
        },
      });
    });
  });

  // Agregar actividad preseleccionando este semillero
  container.querySelector('#addActividadTableBtn')?.addEventListener('click', () => {
    openActividadFormModal(
      { defaultSemilleroId: semillero.id, lockSemillero: true },
      () => renderSemilleroDetailView(container, semillero.id)
    );
  });

  // Editar actividad
  container.querySelectorAll('[data-edit-actividad]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const actividad = store.actividades.find((a) => Number(a.id) === Number(btn.dataset.editActividad));
      if (actividad) {
        openActividadFormModal(
          { actividad, lockSemillero: true },
          () => renderSemilleroDetailView(container, semillero.id)
        );
      }
    });
  });

  // Eliminar actividad
  container.querySelectorAll('[data-delete-actividad]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const actividad = store.actividades.find((a) => Number(a.id) === Number(btn.dataset.deleteActividad));
      if (!actividad) return;

      confirmDialog({
        title: 'Eliminar actividad de investigación',
        message: `¿Deseas eliminar la actividad "${actividad.nombre}" del semillero ${semillero.sigla}?`,
        onConfirm: async () => {
          try {
            await actividadesApi.remove(actividad.id);
            await loadAllData();
            showToast('Actividad eliminada', 'success');
            renderSemilleroDetailView(container, semillero.id);
          } catch (err) {
            showToast(err.message, 'error');
            throw err;
          }
        },
      });
    });
  });
}

