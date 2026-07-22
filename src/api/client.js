const API_URL = import.meta.env.VITE_API_URL;

// ---------------- TOKEN (interrogador logueado) ----------------
export function getToken() {
  return localStorage.getItem("token");
}
export function setToken(token) {
  localStorage.setItem("token", token);
}
export function clearToken() {
  localStorage.removeItem("token");
}

// ---------------- FETCH BASE ----------------
async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    let mensaje = `Error ${res.status}`;
    if (typeof detail.detail === "string") {
      mensaje = detail.detail;
    } else if (Array.isArray(detail.detail)) {
      mensaje = detail.detail.map((d) => `${d.loc?.join(".")}: ${d.msg}`).join(" · ");
    }
    throw new Error(mensaje);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---------------- FETCH DE ARCHIVOS (multipart, subida) ----------------
async function requestArchivo(path, formData) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }, // sin Content-Type: el browser pone el boundary solo
    body: formData,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Error ${res.status}`);
  }
  return res.json();
}

// ---------------- AUTH ----------------
export const auth = {
  login: (rut, password) => request("/auth/login", { method: "POST", body: { rut, password } }),
  crearInterrogador: (data) => request("/auth/interrogadores", { method: "POST", body: data, auth: true }),
  me: () => request("/auth/me", { auth: true }),
};

// ---------------- PREGUNTAS ----------------
export const preguntas = {
  generarAlternativas: (data) => request("/preguntas/generar-alternativas", { method: "POST", body: data, auth: true }),
  crear: (data) => request("/preguntas", { method: "POST", body: data, auth: true }),
  crearBulk: (lista) => request("/preguntas/bulk", { method: "POST", body: lista, auth: true }),
  listar: (region) => request(`/preguntas${region ? `?region=${region}` : ""}`, { auth: true }),
  borrar: (id) => request(`/preguntas/${id}`, { method: "DELETE", auth: true }),
};

// ---------------- MATERIALES ----------------
export const materiales = {
  listar: (region) => request(`/materiales${region ? `?region=${region}` : ""}`),
  ingreso: (nombre, rut) => request("/materiales/ingreso", { method: "POST", body: { nombre, rut } }),
  descargar: (materialId, alumnoId) => request(`/materiales/${materialId}/descargar`, { method: "POST", body: { alumno_id: alumnoId } }),
  analisis: () => request("/materiales/analisis", { auth: true }),
};

// ---------------- SESIONES ----------------
export const sesiones = {
  crear: (data) => request("/sesiones", { method: "POST", body: data, auth: true }),
  listar: () => request("/sesiones", { auth: true }),
  ver: (id) => request(`/sesiones/${id}`, { auth: true }),

  abrirAsistencia: (id) => request(`/sesiones/${id}/abrir-asistencia`, { method: "POST", auth: true }),
  marcarAsistencia: (id, nombre, rut) => request(`/sesiones/${id}/asistencia`, { method: "POST", body: { nombre, rut } }),
  verAsistencia: (id) => request(`/sesiones/${id}/asistencia`, { auth: true }),

  abrirEncuesta: (id) => request(`/sesiones/${id}/abrir-encuesta`, { method: "POST", auth: true }),
  votar: (id, alumnoId, paquete) => request(`/sesiones/${id}/votar`, { method: "POST", body: { alumno_id: alumnoId, paquete } }),
  verEncuesta: (id) => request(`/sesiones/${id}/encuesta`),
  cerrarEncuesta: (id) => request(`/sesiones/${id}/cerrar-encuesta`, { method: "POST", auth: true }),

  resultados: (id) => request(`/sesiones/${id}/resultados`, { auth: true }),
  analisis: (id) => request(`/sesiones/${id}/analisis`, { auth: true }),
};

// ---------------- EXAMEN ----------------
export const examen = {
  iniciar: (sesionId, alumnoId) => request("/examen/iniciar", { method: "POST", body: { sesion_id: sesionId, alumno_id: alumnoId } }),
  responder: (instanciaId, preguntaId, opcionElegida) =>
    request(`/examen/${instanciaId}/responder`, { method: "POST", body: { pregunta_id: preguntaId, opcion_elegida: opcionElegida } }),
  finalizar: (instanciaId) => request(`/examen/${instanciaId}/finalizar`, { method: "POST" }),
  registrarSalida: (instanciaId) => request(`/examen/${instanciaId}/registrar-salida`, { method: "POST" }),
};

// ---------------- DOCUMENTOS ----------------
async function descargarArchivo(path, body, nombreFallback) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Error ${res.status}`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const nombre = match ? match[1] : nombreFallback;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export const documentos = {
  ping: () => request("/documentos/ping", { auth: true }),
  buscar: (tema, maxResults = 20) => request("/documentos/buscar", { method: "POST", body: { tema, max_results: maxResults }, auth: true }),
  generar: (papers, tema) => request("/documentos/generar", { method: "POST", body: { papers, tema }, auth: true }),
  descargarPdf: (doc) => descargarArchivo("/documentos/pdf", doc, "documento.pdf"),
  descargarPpt: (doc) => descargarArchivo("/documentos/ppt", doc, "documento.pptx"),
};

// ---------------- CASOS EN VIVO — PROFESOR (requieren login) ----------------
export const casosVivoAdmin = {
  // Casos clinicos
  crearCaso: (data) => request("/casos-vivo/casos", { method: "POST", body: data, auth: true }),
  listarCasos: (region) => request(`/casos-vivo/casos${region ? `?region=${region}` : ""}`, { auth: true }),
  obtenerCaso: (casoId) => request(`/casos-vivo/casos/${casoId}`, { auth: true }),
  borrarCaso: (casoId) => request(`/casos-vivo/casos/${casoId}`, { method: "DELETE", auth: true }),

  subirMediaCaso: (tipo, archivo) => {
    const formData = new FormData();
    formData.append("tipo", tipo);
    formData.append("archivo", archivo);
    return requestArchivo("/casos-vivo/casos/media", formData);
  },
  asociarMediaCaso: (casoId, mediaUrl, mediaTipo) =>
    request(`/casos-vivo/casos/${casoId}/media?media_url=${encodeURIComponent(mediaUrl)}&media_tipo=${mediaTipo}`, {
      method: "POST",
      auth: true,
    }),
  obtenerMediaCaso: (casoId) => request(`/casos-vivo/casos/${casoId}/media`, { auth: true }),

  // Preguntas del caso: independientes del banco de examen. Se escriben una a
  // una, en orden, con Claude generando solo las 4 alternativas falsas.
  generarAlternativasPreguntaCaso: (casoId, data) =>
    request(`/casos-vivo/casos/${casoId}/preguntas/generar-alternativas`, { method: "POST", body: data, auth: true }),
  subirMediaPreguntaCaso: (casoId, tipo, archivo) => {
    const formData = new FormData();
    formData.append("tipo", tipo);
    formData.append("archivo", archivo);
    return requestArchivo(`/casos-vivo/casos/${casoId}/preguntas/media`, formData);
  },
  crearPreguntaCaso: (casoId, data) =>
    request(`/casos-vivo/casos/${casoId}/preguntas`, { method: "POST", body: data, auth: true }),
  actualizarPreguntaCaso: (casoId, casoPreguntaId, data) =>
    request(`/casos-vivo/casos/${casoId}/preguntas/${casoPreguntaId}`, { method: "PUT", body: data, auth: true }),
  quitarPreguntaCaso: (casoId, casoPreguntaId) =>
    request(`/casos-vivo/casos/${casoId}/preguntas/${casoPreguntaId}`, { method: "DELETE", auth: true }),

  // Fundamento: borrador (Claude) -> revision -> guardado
  generarFundamentoBorrador: (casoId, casoPreguntaId) =>
    request(`/casos-vivo/casos/${casoId}/preguntas/${casoPreguntaId}/generar-fundamento`, { method: "POST", auth: true }),
  guardarFundamento: (casoId, casoPreguntaId, explicacion, fuentes) =>
    request(`/casos-vivo/casos/${casoId}/preguntas/${casoPreguntaId}/fundamento`, {
      method: "PUT",
      body: { explicacion, fuentes },
      auth: true,
    }),

  // Presentaciones (reemplazo reutilizable del PPT)
  crearPresentacion: (data) => request("/casos-vivo/presentaciones", { method: "POST", body: data, auth: true }),
  listarPresentaciones: () => request("/casos-vivo/presentaciones", { auth: true }),
  obtenerPresentacion: (id) => request(`/casos-vivo/presentaciones/${id}`, { auth: true }),
  borrarPresentacion: (presentacionId) => request(`/casos-vivo/presentaciones/${presentacionId}`, { method: "DELETE", auth: true }),
  agregarCasoPresentacion: (presentacionId, casoId, orden) =>
    request(`/casos-vivo/presentaciones/${presentacionId}/casos`, { method: "POST", body: { caso_id: casoId, orden }, auth: true }),
  quitarCasoPresentacion: (presentacionId, presentacionCasoId) =>
    request(`/casos-vivo/presentaciones/${presentacionId}/casos/${presentacionCasoId}`, { method: "DELETE", auth: true }),

  // Control de la sesion en vivo (panel de proyeccion)
  iniciarSesion: (presentacionId) =>
    request("/casos-vivo/vivo/iniciar", { method: "POST", body: { presentacion_id: presentacionId }, auth: true }),
  obtenerSesion: (sesionId) => request(`/casos-vivo/vivo/${sesionId}`, { auth: true }),
  detalleVotos: (sesionId) => request(`/casos-vivo/vivo/${sesionId}/detalle`, { auth: true }),
  accionSesion: (sesionId, accion) =>
    request(`/casos-vivo/vivo/${sesionId}/accion`, { method: "POST", body: { accion }, auth: true }),
};

// ---------------- CASOS EN VIVO — ALUMNO (publico, sin login) ----------------
export const casosVivoAlumno = {
  ingreso: (codigo, nombre, rut) =>
    request(`/casos-vivo/vivo/${codigo}/ingreso`, { method: "POST", body: { nombre, rut } }),
  estadoActual: (codigo) => request(`/casos-vivo/vivo/${codigo}/actual`),
  votar: (sesionId, alumnoId, preguntaId, opcion) =>
    request("/casos-vivo/vivo/votar", { method: "POST", body: { sesion_id: sesionId, alumno_id: alumnoId, pregunta_id: preguntaId, opcion } }),
  resultados: (sesionId) => request(`/casos-vivo/vivo/${sesionId}/resultados`),
};
