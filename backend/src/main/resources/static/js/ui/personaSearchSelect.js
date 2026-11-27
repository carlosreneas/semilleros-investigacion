import { store } from '../state/store.js';
import { escapeHtml, getInitials } from './components.js';

/**
 * Genera el HTML inicial del componente selector buscable de Persona.
 *
 * @param {Object} options
 * @param {string} options.inputName Nombre del campo en el formulario (ej. "representanteId")
 * @param {string} options.inputId ID del input oculto (ej. "facRepresentanteId")
 * @param {number|string|null} [options.selectedPersonaId] ID de la persona seleccionada actualmente
 * @param {string} [options.placeholder="Buscar persona por nombre o correo..."] Texto del buscador
 * @param {string} [options.emptyLabel="Sin persona asignada"] Texto cuando no hay selección
 */
export function renderPersonaSearchSelectHtml({
  inputName,
  inputId,
  selectedPersonaId = null,
  placeholder = 'Buscar persona por nombre o correo...',
  emptyLabel = 'Sin persona asignada',
}) {
  const persona = (store.personas || []).find((p) => Number(p.id) === Number(selectedPersonaId));

  const displayHtml = persona
    ? `
      <div class="persona-select-chip">
        <span class="persona-select-avatar">${escapeHtml(getInitials(persona.nombreCompleto))}</span>
        <div class="persona-select-info">
          <span class="persona-select-name">${escapeHtml(persona.nombreCompleto)}</span>
          <span class="persona-select-meta">${escapeHtml(persona.correo)}${persona.departamento?.nombre ? ` · ${escapeHtml(persona.departamento.nombre)}` : ''}</span>
        </div>
      </div>
    `
    : `<span class="persona-select-placeholder">${escapeHtml(emptyLabel)}</span>`;

  return `
    <div class="persona-select-wrapper" data-persona-select="${escapeHtml(inputId)}">
      <input type="hidden" name="${escapeHtml(inputName)}" id="${escapeHtml(inputId)}" value="${persona ? persona.id : ''}" />
      <div class="persona-select-display" tabindex="0" role="combobox" aria-expanded="false" aria-haspopup="listbox">
        <div class="persona-select-content">${displayHtml}</div>
        <div class="persona-select-actions">
          ${persona ? `<button type="button" class="persona-select-clear-btn" title="Quitar selección" aria-label="Limpiar">✕</button>` : ''}
          <span style="font-size: 0.75rem; color: #94a3b8;">▼</span>
        </div>
      </div>
      <div class="persona-select-dropdown">
        <div class="persona-select-search-box">
          <input type="text" class="persona-select-search-input" placeholder="${escapeHtml(placeholder)}" autocomplete="off" />
        </div>
        <div class="persona-select-list" role="listbox"></div>
      </div>
    </div>
  `;
}

/**
 * Inicializa los eventos del componente selector de personas dentro del contenedor dado.
 *
 * @param {HTMLElement} wrapperElement Contenedor del selector (.persona-select-wrapper)
 * @param {Object} [options]
 * @param {string} [options.roleFilter] Código de rol opcional para filtrar personas (ej. "DIRECTOR_SEMILLERO")
 * @param {string} [options.emptyLabel="Sin persona asignada"]
 * @param {Function} [options.onSelect] Callback disparado al cambiar de persona
 */
export function setupPersonaSearchSelect(wrapperElement, options = {}) {
  if (!wrapperElement) return;

  const hiddenInput = wrapperElement.querySelector('input[type="hidden"]');
  const displayBox = wrapperElement.querySelector('.persona-select-display');
  const contentBox = wrapperElement.querySelector('.persona-select-content');
  const actionsBox = wrapperElement.querySelector('.persona-select-actions');
  const dropdown = wrapperElement.querySelector('.persona-select-dropdown');
  const searchInput = wrapperElement.querySelector('.persona-select-search-input');
  const listContainer = wrapperElement.querySelector('.persona-select-list');

  const emptyLabel = options.emptyLabel || 'Sin persona asignada';
  const roleFilter = options.roleFilter || '';

  let isOpen = false;

  const getAllowedPersonas = () => {
    let list = store.personas || [];
    if (roleFilter) {
      list = list.filter((p) => (p.roles || []).some((r) => r.codigo === roleFilter));
    }
    return list;
  };

  const renderItems = (query = '') => {
    const q = query.trim().toLowerCase();
    const personas = getAllowedPersonas();
    const currentId = Number(hiddenInput.value);

    const filtered = personas.filter(
      (p) =>
        !q ||
        (p.nombreCompleto || '').toLowerCase().includes(q) ||
        (p.correo || '').toLowerCase().includes(q) ||
        (p.identificacion || '').toLowerCase().includes(q)
    );

    let html = `
      <div class="persona-select-item ${!currentId ? 'is-selected' : ''}" data-person-id="">
        <span class="persona-select-avatar" style="background: #f1f5f9; color: #64748b;">—</span>
        <div class="persona-select-info">
          <span class="persona-select-name">${escapeHtml(emptyLabel)}</span>
        </div>
      </div>
    `;

    if (filtered.length === 0) {
      html += `<div class="persona-select-item--empty">No se encontraron personas con "${escapeHtml(query)}"</div>`;
    } else {
      html += filtered
        .map((p) => {
          const isSel = Number(p.id) === currentId;
          const initials = getInitials(p.nombreCompleto || p.nombres + ' ' + p.apellidos);
          const deptoText = p.departamento?.nombre ? ` · ${escapeHtml(p.departamento.nombre)}` : '';
          return `
            <div class="persona-select-item ${isSel ? 'is-selected' : ''}" data-person-id="${p.id}">
              <span class="persona-select-avatar">${escapeHtml(initials)}</span>
              <div class="persona-select-info">
                <span class="persona-select-name">${escapeHtml(p.nombreCompleto)}</span>
                <span class="persona-select-meta">${escapeHtml(p.correo)}${deptoText}</span>
              </div>
            </div>
          `;
        })
        .join('');
    }

    listContainer.innerHTML = html;

    listContainer.querySelectorAll('.persona-select-item[data-person-id]').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const idVal = item.dataset.personId;
        selectPersona(idVal ? Number(idVal) : null);
        closeDropdown();
      });
    });
  };

  const selectPersona = (personaId) => {
    hiddenInput.value = personaId ? String(personaId) : '';
    const persona = personaId ? (store.personas || []).find((p) => Number(p.id) === Number(personaId)) : null;

    if (persona) {
      contentBox.innerHTML = `
        <div class="persona-select-chip">
          <span class="persona-select-avatar">${escapeHtml(getInitials(persona.nombreCompleto))}</span>
          <div class="persona-select-info">
            <span class="persona-select-name">${escapeHtml(persona.nombreCompleto)}</span>
            <span class="persona-select-meta">${escapeHtml(persona.correo)}${persona.departamento?.nombre ? ` · ${escapeHtml(persona.departamento.nombre)}` : ''}</span>
          </div>
        </div>
      `;
      actionsBox.innerHTML = `
        <button type="button" class="persona-select-clear-btn" title="Quitar selección" aria-label="Limpiar">✕</button>
        <span style="font-size: 0.75rem; color: #94a3b8;">▼</span>
      `;
      actionsBox.querySelector('.persona-select-clear-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        selectPersona(null);
      });
    } else {
      contentBox.innerHTML = `<span class="persona-select-placeholder">${escapeHtml(emptyLabel)}</span>`;
      actionsBox.innerHTML = `<span style="font-size: 0.75rem; color: #94a3b8;">▼</span>`;
    }

    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    if (typeof options.onSelect === 'function') {
      options.onSelect(persona);
    }
  };

  const openDropdown = () => {
    isOpen = true;
    displayBox.classList.add('is-open');
    dropdown.classList.add('is-open');
    displayBox.setAttribute('aria-expanded', 'true');
    searchInput.value = '';
    renderItems('');
    setTimeout(() => searchInput.focus(), 50);
  };

  const closeDropdown = () => {
    isOpen = false;
    displayBox.classList.remove('is-open');
    dropdown.classList.remove('is-open');
    displayBox.setAttribute('aria-expanded', 'false');
  };

  displayBox.addEventListener('click', (e) => {
    if (e.target.closest('.persona-select-clear-btn')) return;
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  searchInput.addEventListener('input', (e) => {
    renderItems(e.target.value);
  });

  // Cerrar al hacer clic fuera del componente
  const handleClickOutside = (e) => {
    if (!wrapperElement.contains(e.target)) {
      if (isOpen) closeDropdown();
    }
  };
  document.addEventListener('click', handleClickOutside);

  // Vincular botón de limpiar inicial si ya había una persona seleccionada
  actionsBox.querySelector('.persona-select-clear-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    selectPersona(null);
  });
}
