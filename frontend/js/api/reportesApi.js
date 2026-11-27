import { API_BASE_URL } from '../config.js';
import { ApiError } from './httpClient.js';

/**
 * Cliente API para la generación y descarga de reportes y formatos institucionales (PDF, Excel y Word).
 */

/**
 * Descarga un archivo generado por el backend y dispara la descarga en el navegador.
 *
 * @param {string} url URL completa del endpoint de reporte.
 * @param {string} defaultFilename Nombre de archivo si el backend no envía Content-Disposition.
 * @param {string} reportLabel Nombre del reporte para los mensajes de error (ej. "FO-IN-14").
 * @returns {Promise<string>} Nombre del archivo descargado.
 */
async function descargarArchivo(url, defaultFilename, reportLabel) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor backend (http://localhost:8080). Verifica que Spring Boot esté activo.',
      0
    );
  }

  if (!response.ok) {
    let errorMsg = `Error HTTP ${response.status} al generar el reporte ${reportLabel}`;
    try {
      const text = await response.text();
      const json = JSON.parse(text);
      if (json.message) errorMsg = json.message;
    } catch {
      // En caso de que no sea JSON legible
    }
    throw new ApiError(errorMsg, response.status);
  }

  const blob = await response.blob();

  // Extraer filename de Content-Disposition o fallback predeterminado
  let filename = defaultFilename;
  const disposition = response.headers.get('content-disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, '').trim();
    }
  }

  // Crear enlace temporal para la descarga en el cliente
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);

  return filename;
}

function reportesBaseUrl() {
  return API_BASE_URL.replace(/\/api\/?$/, '');
}

export const reportesApi = {
  /**
   * Solicita al backend la generación del formato FO-IN-14 en PDF y dispara la descarga en el navegador.
   *
   * @param {number|string} semilleroId Identificador del semillero.
   * @param {string} [periodo] Periodo académico (ej. "2024-1", "2025-1").
   * @returns {Promise<string>} Nombre del archivo descargado.
   */
  async descargarReporteFoIn14(semilleroId, periodo = '') {
    const params = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
    const url = `${reportesBaseUrl()}/api/reportes/semilleros/${semilleroId}/fo-in-14${params}`;
    return descargarArchivo(url, `FO-IN-14_${semilleroId}.pdf`, 'FO-IN-14');
  },

  /**
   * Solicita al backend la generación del formato FO-IN-12 (estudiantes que cumplen el requerimiento
   * de participación) en Excel y dispara la descarga en el navegador.
   *
   * @param {number|string} semilleroId Identificador del semillero.
   * @returns {Promise<string>} Nombre del archivo descargado.
   */
  async descargarReporteFoIn12(semilleroId) {
    const url = `${reportesBaseUrl()}/api/reportes/semilleros/${semilleroId}/fo-in-12`;
    return descargarArchivo(url, `FO-IN-12_${semilleroId}.xlsx`, 'FO-IN-12');
  },

  /**
   * Solicita al backend la generación del formato FO-IN-19 (Plan de Acción) en Word y dispara la descarga
   * en el navegador.
   *
   * @param {number|string} semilleroId Identificador del semillero.
   * @param {string} [periodo] Periodo académico (ej. "2025-1", "2025-2").
   * @returns {Promise<string>} Nombre del archivo descargado.
   */
  async descargarReporteFoIn19(semilleroId, periodo = '') {
    const params = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
    const url = `${reportesBaseUrl()}/api/reportes/semilleros/${semilleroId}/fo-in-19${params}`;
    return descargarArchivo(url, `FO-IN-19_${semilleroId}.docx`, 'FO-IN-19');
  },
};
