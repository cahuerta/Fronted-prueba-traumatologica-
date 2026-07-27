const API_URL = import.meta.env.VITE_API_URL;

// ---------------- TOKEN (interrogador logueado) ----------------
// Duplicado de cliente.js a proposito -mismo localStorage key "token",
// pero este archivo no depende de cliente.js en absoluto-.
function getToken() {
  return localStorage.getItem("token");
}

// ---------------- FETCH BASE ----------------
async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
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

// ---------------- SESIONES ----------------
export const clasesFormalesSesiones = {
  crear: (nombre) => request("/clases-formales/sesiones", { method: "POST", body: { nombre }, auth: true }),
  listar: () => request("/clases-formales/sesiones", { auth: true }),
  activar: (sesionId) => request(`/clases-formales/sesiones/${sesionId}/activar`, { method: "PATCH", auth: true }),
  cerrar: (sesionId) => request(`/clases-formales/sesiones/${sesionId}/cerrar`, { method: "PATCH", auth: true }),
};

// ---------------- PAGINAS (constructor) ----------------
export const clasesFormalesPaginas = {
  crear: (sesionId, titulo, tipoHerramienta = "ninguna", config = {}) =>
    request("/clases-formales/paginas", {
      method: "POST",
      body: { sesion_id: sesionId, titulo, tipo_herramienta: tipoHerramienta, config },
      auth: true,
    }),
  listar: (sesionId) => request(`/clases-formales/paginas/${sesionId}`, { auth: true }),
  editar: (paginaId, cambios) =>
    request(`/clases-formales/paginas/${paginaId}`, { method: "PATCH", body: cambios, auth: true }),
  mover: (paginaId, ordenAnterior, ordenSiguiente) =>
    request(`/clases-formales/paginas/${paginaId}/mover`, {
      method: "PATCH",
      body: { orden_anterior: ordenAnterior, orden_siguiente: ordenSiguiente },
      auth: true,
    }),
  eliminar: (paginaId) => request(`/clases-formales/paginas/${paginaId}`, { method: "DELETE", auth: true }),
};

// ---------------- PREGUNTAS ANONIMAS ----------------
export const clasesFormalesPreguntas = {
  // Alumno (publico, sin login)
  preguntar: (sesionId, rut, texto) =>
    request("/clases-formales/preguntas", { method: "POST", body: { sesion_id: sesionId, rut, texto } }),
  upvote: (preguntaId, sesionId, rut) =>
    request(`/clases-formales/preguntas/${preguntaId}/upvote`, {
      method: "POST",
      body: { sesion_id: sesionId, rut },
    }),

  // Interrogador (auth)
  listar: (sesionId) => request(`/clases-formales/preguntas/${sesionId}`, { auth: true }),
  responder: (preguntaId, sesionId) =>
    request(`/clases-formales/preguntas/${preguntaId}/responder?sesion_id=${sesionId}`, {
      method: "PATCH",
      auth: true,
    }),
};

// ---------------- SEMAFORO ----------------
export const clasesFormalesSemaforo = {
  // Alumno (publico, sin login) — puede cambiar su respuesta en cualquier momento
  responder: (paginaId, rut, sigo) =>
    request(`/clases-formales/semaforo/${paginaId}/responder`, { method: "POST", body: { rut, sigo } }),

  // Interrogador (auth)
  resultado: (paginaId) => request(`/clases-formales/semaforo/${paginaId}/resultado`, { auth: true }),
};

// ---------------- SUPRASELECTOR (publico, lo usan alumno/interrogador/proyeccion) ----------------
export const sesionResolver = {
  resolver: (codigo) => request(`/sesion-activa/${codigo}`),
};
