import { request } from './httpClient.js';

export const tiposActividadApi = {
  getAll: () => request('/tipos-actividad'),
  getById: (id) => request(`/tipos-actividad/${id}`),
  create: (payload) =>
    request('/tipos-actividad', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) =>
    request(`/tipos-actividad/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id) => request(`/tipos-actividad/${id}`, { method: 'DELETE' }),
};

