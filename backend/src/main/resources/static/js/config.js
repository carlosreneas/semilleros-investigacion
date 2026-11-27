export const API_BASE_URL =
  window.localStorage.getItem('UFPS_API_URL') || 'http://localhost:8080/api';

/**
 * Resuelve una ruta de archivo (ej. /api/archivos/logos/...) ante la URL del backend
 * si es relativa, para evitar que el navegador la solicite al host del frontend (puerto 3000).
 */
export function resolveFileUrl(path) {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) {
    return path;
  }
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

