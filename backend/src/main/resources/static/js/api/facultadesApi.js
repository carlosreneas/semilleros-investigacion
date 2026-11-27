import { request } from './httpClient.js';

export const facultadesApi = {
  getAll: () => request('/facultades'),
  getById: (id) => request(`/facultades/${id}`),
  create: (payload) => request('/facultades', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/facultades/${id}`, { method: 'PUT', body: payload }),
  delete: (id) => request(`/facultades/${id}`, { method: 'DELETE' }),
};
