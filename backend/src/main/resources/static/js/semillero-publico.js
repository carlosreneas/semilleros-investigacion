/**
 * semillero-publico.js
 * Lógica del cliente para la página pública del semillero.
 * Lee el parámetro ?id=<semilleroId> de la URL y consume
 * GET /api/publico/semilleros/{id}
 */

const API_BASE = window.localStorage.getItem('UFPS_API_URL') || 'http://localhost:8080/api';
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

function resolveAssetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return `${BACKEND_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function formatDate(isoDate) {
  if (!isoDate) return { day: '—', month: '—', year: '' };
  const d = new Date(isoDate + 'T00:00:00');
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''),
    year: d.getFullYear(),
  };
}

function el(id) {
  return document.getElementById(id);
}

// ── Render functions ─────────────────────────────────────────────────────

function renderHero(s) {
  const logoEl = el('heroLogo');
  if (s.logoUrl) {
    logoEl.src = resolveAssetUrl(s.logoUrl);
    logoEl.alt = `Logo ${s.sigla || s.nombre}`;
    logoEl.hidden = false;
  } else {
    logoEl.hidden = true;
  }
  el('heroSigla').textContent = s.sigla || '';
  el('heroNombre').textContent = s.nombre || '';

  const metaParts = [];
  if (s.grupoSigla) metaParts.push(`${s.grupoSigla} — ${s.grupoNombre}`);
  if (s.directorNombre) metaParts.push(`Director: ${s.directorNombre}`);
  el('heroMeta').textContent = metaParts.join('  ·  ');

  const lineasEl = el('heroLineas');
  if (s.lineas && s.lineas.length) {
    lineasEl.innerHTML = s.lineas
      .map((l) => `<span class="pub-linea-tag">${esc(l.nombre)}</span>`)
      .join('');
  }
}

function renderIdentidad(s) {
  el('mision').textContent = s.mision || 'No registrada.';
  el('vision').textContent = s.vision || 'No registrada.';
  el('objetivoGeneral').textContent = s.objetivoGeneral || 'No registrado.';
}

function renderGrupo(s) {
  el('grupoSigla').textContent = s.grupoSigla || '—';
  el('grupoNombre').textContent = s.grupoNombre || '—';

  const metaParts = [];
  if (s.grupoFacultad) metaParts.push(s.grupoFacultad);
  if (s.grupoCategoria) metaParts.push(`Categoría Minciencias: ${s.grupoCategoria}`);
  el('grupoMeta').textContent = metaParts.join('  ·  ');

  if (s.grupoSitioWeb) {
    const link = el('grupoLink');
    link.href = s.grupoSitioWeb;
    link.hidden = false;
  }
}

function renderDirector(s) {
  if (s.directorNombre) {
    el('directorAvatar').textContent = getInitials(s.directorNombre);
    el('directorNombre').textContent = s.directorNombre;
  }
  if (s.directorCorreo) {
    const correoEl = el('directorCorreo');
    correoEl.textContent = s.directorCorreo;
    correoEl.href = `mailto:${s.directorCorreo}`;
  }
}

function renderIntegrantes(integrantes) {
  el('integrantesCount').textContent = integrantes.length;
  const grid = el('integrantesGrid');
  if (!integrantes.length) {
    grid.innerHTML = '<div class="pub-empty">Este semillero aún no tiene integrantes registrados.</div>';
    return;
  }
  grid.innerHTML = integrantes
    .map((i) => {
      const isLider = Boolean(i.esLider);
      return `
        <div class="pub-integrante-card">
          <div class="pub-integrante-card__avatar ${isLider ? 'pub-integrante-card__avatar--leader' : ''}">
            ${esc(getInitials(i.nombre))}
          </div>
          <div class="pub-integrante-card__nombre">${esc(i.nombre)}</div>
          <div class="pub-integrante-card__programa">${esc(i.programa || 'Programa no especificado')}</div>
          ${i.semestreActual ? `<div class="pub-integrante-card__semestre">Semestre ${esc(String(i.semestreActual))}</div>` : ''}
          <span class="${isLider ? 'pub-badge-leader' : 'pub-badge-member'}">
            ${isLider ? '★ Líder' : 'Integrante'}
          </span>
        </div>`;
    })
    .join('');
}

function renderProductos(productos) {
  el('productosCount').textContent = productos.length;
  const container = el('productosContainer');
  if (!productos.length) {
    container.innerHTML = '<div class="pub-empty">No hay productos de investigación registrados aún.</div>';
    return;
  }
  container.innerHTML = productos
    .map(
      (p) => `
      <div class="pub-producto-card">
        <div class="pub-producto-card__header">
          <div class="pub-producto-card__nombre">${esc(p.nombre)}</div>
          ${p.tipoNombre ? `<span class="pub-tipo-badge">${esc(p.tipoNombre)}</span>` : ''}
        </div>
        ${p.descripcion ? `<div class="pub-producto-card__desc">${esc(p.descripcion)}</div>` : ''}
        ${
          p.participantes && p.participantes.length
            ? `<div class="pub-producto-card__participantes">
                ${p.participantes.map((n) => `<span class="pub-participante-chip">👤 ${esc(n)}</span>`).join('')}
               </div>`
            : ''
        }
      </div>`
    )
    .join('');
}

function renderCapacitaciones(capacitaciones) {
  el('capacitacionesCount').textContent = capacitaciones.length;
  const container = el('capacitacionesContainer');
  if (!capacitaciones.length) {
    container.innerHTML = '<div class="pub-empty">No hay capacitaciones registradas aún.</div>';
    return;
  }
  container.innerHTML = capacitaciones
    .map((c) => {
      const { day, month, year } = formatDate(c.fecha);
      return `
        <div class="pub-cap-card">
          <div class="pub-cap-card__fecha-col">
            <div class="pub-cap-card__fecha-day">${day}</div>
            <div class="pub-cap-card__fecha-month">${month}</div>
            <div class="pub-cap-card__fecha-year">${year}</div>
          </div>
          <div class="pub-cap-card__divider"></div>
          <div class="pub-cap-card__body">
            <div class="pub-cap-card__nombre">${esc(c.nombre)}</div>
            ${c.objetivo ? `<div class="pub-cap-card__objetivo">${esc(c.objetivo)}</div>` : ''}
            ${c.participantes ? `<div class="pub-cap-card__meta">👥 ${c.participantes} participantes</div>` : ''}
          </div>
        </div>`;
    })
    .join('');
}

// ── Estado de UI ─────────────────────────────────────────────────────────

function showLoading(visible) {
  el('loadingState').style.display = visible ? 'flex' : 'none';
}
function showError(title, message) {
  el('loadingState').style.display = 'none';
  if (title) el('errorTitle').textContent = title;
  if (message) el('errorMessage').textContent = message;
  el('errorState').hidden = false;
}
function showData() {
  el('loadingState').style.display = 'none';
  el('semilleroData').hidden = false;
}
function showDirectory() {
  el('loadingState').style.display = 'none';
  el('directoryData').hidden = false;
}

function renderDirectory(semilleros) {
  el('heroSigla').textContent = 'UFPS';
  el('heroNombre').textContent = 'Semilleros de Investigación';
  el('heroMeta').textContent = 'Explora los semilleros de investigación activos de la Universidad Francisco de Paula Santander.';
  el('directoryCount').textContent = semilleros.length;

  const grid = el('directoryGrid');
  if (!semilleros.length) {
    grid.innerHTML = '<div class="pub-empty">No hay semilleros registrados en este momento.</div>';
    return;
  }

  grid.innerHTML = semilleros
    .map(
      (s) => `
      <div class="pub-directory-card">
        <div style="display: flex; align-items: center; gap: 10px;">
          ${s.logoUrl ? `<img src="${esc(resolveAssetUrl(s.logoUrl))}" alt="Logo ${esc(s.sigla)}" style="width: 42px; height: 42px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border-color); background: #fff;" />` : ''}
          <span class="pub-directory-card__sigla">${esc(s.sigla)}</span>
        </div>
        <div class="pub-directory-card__nombre">${esc(s.nombre)}</div>
        <div class="pub-directory-card__meta">
          ${s.grupoSigla ? `Grupo: <strong>${esc(s.grupoSigla)}</strong><br>` : ''}
          ${s.directorNombre ? `Director: ${esc(s.directorNombre)}` : ''}
        </div>
        <a href="semillero-publico.html?id=${s.id}" class="pub-btn pub-btn--primary pub-btn--sm">
          Ver información →
        </a>
      </div>`
    )
    .join('');
}

// ── Main ─────────────────────────────────────────────────────────────────

async function init() {
  // Año en el footer
  el('footerYear').textContent = new Date().getFullYear();

  // Leer el ID del semillero desde ?id=X
  const params = new URLSearchParams(window.location.search);
  const semilleroId = params.get('id');

  showLoading(true);

  if (!semilleroId) {
    try {
      const response = await fetch(`${API_BASE}/publico/semilleros`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const semilleros = await response.json();
      document.title = 'Semilleros de Investigación · UFPS';
      renderDirectory(semilleros);
      showDirectory();
    } catch (err) {
      console.error('Error cargando directorio público:', err);
      showError(
        'No se pudo cargar la información',
        `No fue posible conectar con el servidor (${err.message}). Asegúrate de que el backend esté iniciado y actualizado.`
      );
    }
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/publico/semilleros/${semilleroId}`);
    if (response.status === 404) {
      showError(
        'Semillero no encontrado',
        'El semillero que estás buscando no existe o el backend aún no ha sido reiniciado con los cambios recientes.'
      );
      return;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const semillero = await response.json();

    // Actualizar título de la pestaña
    document.title = `${semillero.sigla} · ${semillero.nombre} · UFPS`;

    renderHero(semillero);
    renderIdentidad(semillero);
    renderGrupo(semillero);
    renderDirector(semillero);
    renderIntegrantes(semillero.integrantes || []);
    renderProductos(semillero.productos || []);
    renderCapacitaciones(semillero.capacitaciones || []);

    showData();
  } catch (err) {
    console.error('Error cargando semillero público:', err);
    showError(
      'No se pudo cargar el semillero',
      `Ocurrió un error al consultar el servidor (${err.message}). Verifica que el backend esté encendido en el puerto 8080.`
    );
  }
}

init();
