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
    throw new Error(detail.detail || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
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
  registrar: (data) => request("/materiales", { method: "POST", body: data, auth: true }),
  listar: (region) => request(`/materiales${region ? `?region=${region}` : ""}`),
};

// ---------------- SESIONES ----------------
export const sesiones = {
  crear: (data) => request("/sesiones", { method: "POST", body: data, auth: true }),
  listar: () => request("/sesiones", { auth: true }),
  ver: (id) => request(`/sesiones/${id}`, { auth: true }),

  abrirAsistencia: (id) => request(`/sesiones/${id}/abrir-asistencia`, { method: "POST", auth: true }),
  alumnos: (id) => request(`/sesiones/${id}/alumnos`),
  marcarAsistencia: (id, alumnoId) => request(`/sesiones/${id}/asistencia`, { method: "POST", body: { alumno_id: alumnoId } }),
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
};
