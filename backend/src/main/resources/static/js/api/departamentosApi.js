import { request } from './httpClient.js';

export const departamentosApi = {
  getAll: (facultadId = null) => {
    const qs = facultadId ? `?facultadId=${encodeURIComponent(facultadId)}` : '';
    return request(`/departamentos${qs}`);
  },
  getById: (id) => request(`/departamentos/${id}`),
  create: (payload) => request('/departamentos', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/departamentos/${id}`, { method: 'PUT', body: payload }),
  delete: (id) => request(`/departamentos/${id}`, { method: 'DELETE' }),
};
