// URL base del backend (Render).
// Se toma de VITE_API_URL, pero si viene vacia o con el nombre mal escrito
// ("traumatologiautalservices", sin la "l") se usa la direccion correcta.
// Ese nombre mal escrito no existe en el DNS y producia "Failed to fetch".
const API_CORRECTA = "https://traumatologiaultalservices.icarticular.cl";

function resolverApiUrl() {
  const desdeEnv = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
  if (!desdeEnv || desdeEnv.includes("traumatologiautalservices")) return API_CORRECTA;
  return desdeEnv;
}

export const API_URL = resolverApiUrl();
