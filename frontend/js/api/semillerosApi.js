import { request } from './httpClient.js';
import { API_BASE_URL } from '../config.js';

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
  uploadLogo: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/semilleros/${id}/logo`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Error al subir el logo' }));
      throw new Error(err.message || 'Error al subir el logo');
    }
    return res.json();
  },
  uploadFoto: (id, file) => {
    const formData = new FormData();
    formData.append('foto', file);
    return request(`/semilleros/${id}/foto`, {
      method: 'POST',
      body: formData,
    });
  },
  removeFoto: (id) => request(`/semilleros/${id}/foto`, { method: 'DELETE' }),
  enviarCorreo: (id, payload) =>
    request(`/semilleros/${id}/correo`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
