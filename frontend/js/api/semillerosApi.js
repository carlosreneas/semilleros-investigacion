import { API_BASE_URL } from '../config.js';
import { ApiError, request } from './httpClient.js';

export const semillerosApi = {
  getAll: () => request('/semilleros'),
  getById: (id) => request(`/semilleros/${id}`),
  create: (payload) =>
    request('/semilleros', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) =>
    request(`/semilleros/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id) => request(`/semilleros/${id}`, { method: 'DELETE' }),
  addLinea: (semilleroId, lineaId) =>
    request(`/semilleros/${semilleroId}/lineas/${lineaId}`, { method: 'POST' }),
  removeLinea: (semilleroId, lineaId) =>
    request(`/semilleros/${semilleroId}/lineas/${lineaId}`, { method: 'DELETE' }),
  uploadLogo: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/archivos/logo`, {
        method: 'POST',
        body: formData,
      });
    } catch {
      throw new ApiError('No se pudo conectar con el servidor para subir el logo.', 0);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(data?.message || `Error HTTP ${response.status}`, response.status);
    }
    return data;
  },
};
