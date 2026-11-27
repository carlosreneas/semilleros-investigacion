import { semillerosApi } from '../api/semillerosApi.js';
import { integrantesApi } from '../api/integrantesApi.js';
import { lineasApi } from '../api/lineasApi.js';
import { directoresApi } from '../api/directoresApi.js';
import { productosApi } from '../api/productosApi.js';
import { tiposActividadApi } from '../api/tiposActividadApi.js';
import { actividadesApi } from '../api/actividadesApi.js';
import { capacitacionesApi } from '../api/capacitacionesApi.js';
import { gruposInvestigacionApi } from '../api/gruposInvestigacionApi.js';
import { programasApi } from '../api/programasApi.js';
import { facultadesApi } from '../api/facultadesApi.js';
import { departamentosApi } from '../api/departamentosApi.js';
import { personasApi } from '../api/personasApi.js';

const listeners = new Set();

export const store = {
  semilleros: [],
  integrantes: [],
  programas: [],
  lineas: [],
  directores: [],
  gruposInvestigacion: [],
  productos: [],
  tiposProducto: [],
  tiposActividad: [],
  actividades: [],
  capacitaciones: [],
  facultades: [],
  departamentos: [],
  personas: [],
  roles: [],
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
    const [
      semilleros,
      integrantes,
      programas,
      lineas,
      directores,
      gruposInvestigacion,
      productos,
      tiposProducto,
      tiposActividad,
      actividades,
      capacitaciones,
      facultades,
      departamentos,
      personas,
      roles,
    ] = await Promise.all([
      semillerosApi.getAll(),
      integrantesApi.getAll(),
      programasApi.getAll(),
      lineasApi.getAll(),
      directoresApi.getAll(),
      gruposInvestigacionApi.getAll(),
      productosApi.getAll(),
      productosApi.getTipos(),
      tiposActividadApi.getAll(),
      actividadesApi.getAll(),
      capacitacionesApi.getAll(),
      facultadesApi.getAll(),
      departamentosApi.getAll(),
      personasApi.getAll(),
      personasApi.getRoles(),
    ]);

    store.semilleros = semilleros;
    store.integrantes = integrantes;
    store.programas = programas;
    store.lineas = lineas;
    store.directores = directores;
    store.gruposInvestigacion = gruposInvestigacion;
    store.productos = productos;
    store.tiposProducto = tiposProducto;
    store.tiposActividad = tiposActividad;
    store.actividades = actividades;
    store.capacitaciones = capacitaciones;
    store.facultades = facultades;
    store.departamentos = departamentos;
    store.personas = personas;
    store.roles = roles;
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

export function getGrupoInvestigacionById(id) {
  return store.gruposInvestigacion.find((g) => Number(g.id) === Number(id)) || null;
}

export function getProgramaById(id) {
  return store.programas.find((p) => Number(p.id) === Number(id)) || null;
}

export function getSemillerosByGrupo(grupoId) {
  return store.semilleros.filter((s) => Number(s.grupoInvestigacion?.id) === Number(grupoId));
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

export function getCapacitacionesBySemillero(semilleroId) {
  return store.capacitaciones.filter((c) => Number(c.semilleroId) === Number(semilleroId));
}
