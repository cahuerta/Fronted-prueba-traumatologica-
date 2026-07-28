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

// ---------------- CONTENIDO (se arma una vez, se reutiliza) ----------------
export const clasesFormalesContenido = {
  crear: (nombre) => request("/clases-formales/contenido", { method: "POST", body: { nombre }, auth: true }),
  listar: () => request("/clases-formales/contenido", { auth: true }),
  editar: (claseFormalId, nombre) =>
    request(`/clases-formales/contenido/${claseFormalId}`, { method: "PATCH", body: { nombre }, auth: true }),
  eliminar: (claseFormalId) =>
    request(`/clases-formales/contenido/${claseFormalId}`, { method: "DELETE", auth: true }),
};

// ---------------- SESIONES (elige contenido ya armado, nace activa) ----------------
export const clasesFormalesSesiones = {
  iniciar: (claseFormalId) =>
    request("/clases-formales/sesiones", { method: "POST", body: { clase_formal_id: claseFormalId }, auth: true }),
  listar: () => request("/clases-formales/sesiones", { auth: true }),
  cerrar: (sesionId) => request(`/clases-formales/sesiones/${sesionId}/cerrar`, { method: "PATCH", auth: true }),
};

// ---------------- PAGINAS (constructor, cuelgan del contenido) ----------------
export const clasesFormalesPaginas = {
  crear: (claseFormalId, titulo, tipoHerramienta = "ninguna", config = {}) =>
    request("/clases-formales/paginas", {
      method: "POST",
      body: { clase_formal_id: claseFormalId, titulo, tipo_herramienta: tipoHerramienta, config },
      auth: true,
    }),
  listar: (claseFormalId) => request(`/clases-formales/paginas/${claseFormalId}`, { auth: true }),
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

// ---------------- INGRESO (asistencia, publico, sin login) ----------------
export const clasesFormalesIngreso = {
  ingresar: (sesionId, rut) =>
    request("/clases-formales/ingreso", { method: "POST", body: { sesion_id: sesionId, rut } }),
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

// ---------------- SEMAFORO (continuo por sesion completa, no por pagina) ----------------
export const clasesFormalesSemaforo = {
  // Alumno (publico, sin login) — puede cambiar su respuesta en cualquier momento
  responder: (sesionId, rut, sigo) =>
    request(`/clases-formales/semaforo/${sesionId}/responder`, { method: "POST", body: { rut, sigo } }),

  // Interrogador (auth)
  resultado: (sesionId) => request(`/clases-formales/semaforo/${sesionId}/resultado`, { auth: true }),
};

// ---------------- TRIVIA (por pagina, sin reinicio explicito) ----------------
export const clasesFormalesTrivia = {
  // Alumno (publico, sin login)
  responder: (paginaId, rut, letra) =>
    request(`/clases-formales/trivia/${paginaId}/responder`, { method: "POST", body: { rut, letra } }),
  miRespuesta: (paginaId, rut) =>
    request(`/clases-formales/trivia/${paginaId}/mi-respuesta?rut=${encodeURIComponent(rut)}`),

  // Interrogador (auth)
  resultado: (paginaId) => request(`/clases-formales/trivia/${paginaId}/resultado`, { auth: true }),
  revelar: (paginaId) => request(`/clases-formales/trivia/${paginaId}/revelar`, { method: "PATCH", auth: true }),
};

// ---------------- PAGINA ACTUAL (avance secuencial en vivo) ----------------
export const clasesFormalesActual = {
  // Interrogador (auth) — mueve a la siguiente pagina de la secuencia
  avanzar: (sesionId) => request(`/clases-formales/sesiones/${sesionId}/avanzar`, { method: "PATCH", auth: true }),

  // Publico (admin control remoto + proyeccion, nunca el alumno)
  leer: (codigo) => request(`/clases-formales/actual/${codigo}`),
};

// ---------------- SUPRASELECTOR (publico, lo usan alumno/interrogador/proyeccion) ----------------
export const sesionResolver = {
  resolver: (codigo) => request(`/sesion-activa/${codigo}`),
};
