import { store, subscribe, loadAllData } from './state/store.js';
import { renderCurrentRoute } from './router.js';
import { showToast } from './ui/toast.js';
import { API_BASE_URL } from './config.js';

function updateSidebarStatus(state) {
  const semCount = document.getElementById('navCountSemilleros');
  const intCount = document.getElementById('navCountIntegrantes');
  const prodCount = document.getElementById('navCountProductos');
  const actCount = document.getElementById('navCountActividades');
  const linCount = document.getElementById('navCountLineas');
  const tipoActCount = document.getElementById('navCountTiposActividad');
  const dirCount = document.getElementById('navCountDirectores');
  const dot = document.getElementById('apiStatusDot');
  const text = document.getElementById('apiStatusText');
  const url = document.getElementById('apiStatusUrl');

  if (semCount) semCount.textContent = String(state.semilleros.length);
  if (intCount) intCount.textContent = String(state.integrantes.length);
  if (prodCount) prodCount.textContent = String(state.productos.length);
  if (actCount) actCount.textContent = String(state.actividades.length);
  if (linCount) linCount.textContent = String(state.lineas.length);
  if (tipoActCount) tipoActCount.textContent = String(state.tiposActividad.length);
  if (dirCount) dirCount.textContent = String(state.directores.length);

  if (url) {
    url.textContent = API_BASE_URL.replace(/^https?:\/\//, '');
  }

  if (dot && text) {
    dot.classList.toggle('is-online', state.apiOnline);
    dot.classList.toggle('is-offline', !state.apiOnline);
    text.textContent = state.apiOnline ? 'API Conectada' : 'API Desconectada';
  }
}

function setupMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const openBtn = document.getElementById('mobileMenuBtn');
  const closeBtn = document.getElementById('sidebarCloseBtn');

  const closeMenu = () => {
    sidebar?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
  };

  openBtn?.addEventListener('click', () => {
    sidebar?.classList.add('is-open');
    backdrop?.classList.add('is-open');
  });

  closeBtn?.addEventListener('click', closeMenu);
  backdrop?.addEventListener('click', closeMenu);

  sidebar?.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
}

async function syncData(showFeedback = false) {
  try {
    await loadAllData();
    if (showFeedback) {
      showToast('Datos sincronizados con el backend', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    renderCurrentRoute();
  }
}

async function bootstrap() {
  setupMobileSidebar();
  subscribe(updateSidebarStatus);

  window.addEventListener('hashchange', renderCurrentRoute);
  window.addEventListener('app:refresh', () => syncData(true));

  document.getElementById('refreshAllBtn')?.addEventListener('click', () => {
    syncData(true);
  });

  if (!window.location.hash) {
    window.location.hash = '#/semilleros';
  }

  await syncData(false);
}

bootstrap();

