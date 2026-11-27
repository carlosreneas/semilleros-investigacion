import { request } from './httpClient.js';

export const personasApi = {
  getAll: (departamentoId = null, rol = '') => {
    const params = new URLSearchParams();
    if (departamentoId) params.append('departamentoId', departamentoId);
    if (rol) params.append('rol', rol);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request(`/personas${qs}`);
  },
  getById: (id) => request(`/personas/${id}`),
  getRoles: () => request('/personas/roles'),
  create: (payload) => request('/personas', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/personas/${id}`, { method: 'PUT', body: payload }),
  delete: (id) => request(`/personas/${id}`, { method: 'DELETE' }),
};
