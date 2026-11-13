import { semillerosApi } from '../api/semillerosApi.js';
import { integrantesApi } from '../api/integrantesApi.js';
import { lineasApi } from '../api/lineasApi.js';
import { directoresApi } from '../api/directoresApi.js';
import { productosApi } from '../api/productosApi.js';
import { tiposActividadApi } from '../api/tiposActividadApi.js';
import { actividadesApi } from '../api/actividadesApi.js';

const listeners = new Set();

export const store = {
  semilleros: [],
  integrantes: [],
  lineas: [],
  directores: [],
  productos: [],
  tiposProducto: [],
  tiposActividad: [],
  actividades: [],
  apiOnline: false,
  lastError: null,
};

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((fn) => fn(store));
}

export async function loadAllData() {
  try {
    const [semilleros, integrantes, lineas, directores, productos, tiposProducto, tiposActividad, actividades] = await Promise.all([
      semillerosApi.getAll(),
      integrantesApi.getAll(),
      lineasApi.getAll(),
      directoresApi.getAll(),
      productosApi.getAll(),
      productosApi.getTipos(),
      tiposActividadApi.getAll(),
      actividadesApi.getAll(),
    ]);

    store.semilleros = semilleros;
    store.integrantes = integrantes;
    store.lineas = lineas;
    store.directores = directores;
    store.productos = productos;
    store.tiposProducto = tiposProducto;
    store.tiposActividad = tiposActividad;
    store.actividades = actividades;
    store.apiOnline = true;
    store.lastError = null;
  } catch (error) {
    store.apiOnline = false;
    store.lastError = error.message;
    throw error;
  } finally {
    notify();
  }
}

export function getSemilleroById(id) {
  return store.semilleros.find((s) => Number(s.id) === Number(id)) || null;
}

export function getIntegrantesBySemillero(semilleroId) {
  return store.integrantes.filter((i) => Number(i.semilleroId) === Number(semilleroId));
}

export function getProductosBySemillero(semilleroId) {
  return store.productos.filter((p) => Number(p.semilleroId) === Number(semilleroId));
}

export function getActividadesBySemillero(semilleroId) {
  return store.actividades.filter((a) => Number(a.semilleroId) === Number(semilleroId));
}

