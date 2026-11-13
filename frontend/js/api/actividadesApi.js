import { request } from './httpClient.js';

export const actividadesApi = {
  getAll: () => request('/actividades'),
  getBySemilleroId: (semilleroId) => request(`/actividades/semillero/${semilleroId}`),
  getById: (id) => request(`/actividades/${id}`),
  create: (payload) =>
    request('/actividades', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) =>
    request(`/actividades/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id) => request(`/actividades/${id}`, { method: 'DELETE' }),
};

