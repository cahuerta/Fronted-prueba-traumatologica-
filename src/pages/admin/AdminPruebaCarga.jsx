import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { casosVivoAlumno, casosVivoAdmin } from "../../api/client";
import {
  clasesFormalesSesiones,
  clasesFormalesActual,
  clasesFormalesSemaforo,
  clasesFormalesPreguntas,
  clasesFormalesAvatar,
  clasesFormalesTrivia,
} from "../../api/clasesFormalesCliente";

const ALUMNO_INTERVALO_MS = 6000;
const ADMIN_INTERVALO_MS = 2000;
// Clases Formales: el telefono del alumno consulta cada 6 s (igual que
// Casos Clinicos); el mando y la proyeccion cada 2 s (ver
// AlumnoClaseInteraccion, AdminClaseVivo y ProyeccionClase).
const CLASE_ALUMNO_INTERVALO_MS = 6000;
const CLASE_INTERVALO_MS = 2000;

const TIPOS = {
  casos: "Casos Clínicos",
  clases: "Clases Formales",
};
const N_ALUMNOS_DEFAULT = 90;
const DURACION_SEG_DEFAULT = 90;

function nuevaMetrica(nombre) {
  return { nombre, ok: 0, error: 0, latencias: [], erroresDetalle: [] };
}

function registrarOk(metrica, latenciaMs) {
  metrica.ok += 1;
  metrica.latencias.push(latenciaMs);
}

function registrarError(metrica, err) {
  metrica.error += 1;
  if (metrica.erroresDetalle.length < 5) {
    metrica.erroresDetalle.push(String(err.message || err).slice(0, 150));
  }
}

function resumen(metrica) {
  const total = metrica.ok + metrica.error;
  if (total === 0) return { ...metrica, total, pctError: 0, latProm: 0, latMax: 0 };
  const pctError = Math.round((metrica.error / total) * 1000) / 10;
  const latProm = metrica.latencias.length
    ? Math.round(metrica.latencias.reduce((a, b) => a + b, 0) / metrica.latencias.length)
    : 0;
  const latMax = metrica.latencias.length ? Math.round(Math.max(...metrica.latencias)) : 0;
  return { ...metrica, total, pctError, latProm, latMax };
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mide una llamada y la anota en la metrica. En /actual, el 404 "sin
// pagina activa" es una respuesta valida (la clase aun no inicia), no una
// falla: se cuenta como ok. Devuelve el resultado o null.
async function medir(metrica, llamada, { aceptar404 = false } = {}) {
  const inicio = performance.now();
  try {
    const r = await llamada();
    registrarOk(metrica, performance.now() - inicio);
    return r;
  } catch (err) {
    if (aceptar404 && err?.status === 404) {
      registrarOk(metrica, performance.now() - inicio);
    } else {
      registrarError(metrica, err);
    }
    return null;
  }
}

function tituloSesion(tipo, ses) {
  if (!ses) return "";
  return tipo === "clases" ? ses.nombre || "Clase formal" : ses.presentaciones?.titulo || "Presentación";
}

export default function AdminPruebaCarga() {
  const navigate = useNavigate();

  const [tipo, setTipo] = useState("casos"); // "casos" | "clases"
  const [sesionesActivas, setSesionesActivas] = useState([]);
  const [sesionElegida, setSesionElegida] = useState(null);
  const [cargandoSesiones, setCargandoSesiones] = useState(true);

  const [corriendo, setCorriendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [resultados, setResultados] = useState(null);
  const [error, setError] = useState("");

  const cancelarRef = useRef(false);

  useEffect(() => {
    buscarSesiones(tipo);
  }, [tipo]);

  async function buscarSesiones(tipoBuscado) {
    setCargandoSesiones(true);
    setError("");
    setSesionesActivas([]);
    setSesionElegida(null);
    setResultados(null);
    try {
      const activas = tipoBuscado === "clases"
        ? (await clasesFormalesSesiones.listar()).filter((ses) => ses.estado === "activa")
        : await casosVivoAdmin.listarSesionesActivas();
      setSesionesActivas(activas);
      if (activas.length === 1) setSesionElegida(activas[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoSesiones(false);
    }
  }

  async function simularAlumno(hasta, codigoAcceso, metrica) {
    while (Date.now() < hasta && !cancelarRef.current) {
      const inicio = performance.now();
      try {
        await casosVivoAlumno.estadoActual(codigoAcceso);
        registrarOk(metrica, performance.now() - inicio);
      } catch (err) {
        registrarError(metrica, err);
      }
      await esperar(ALUMNO_INTERVALO_MS);
    }
  }

  async function simularPanel(hasta, sesionId, metrica) {
    // Refleja la arquitectura real: admin y proyeccion hacen UNA sola
    // llamada al endpoint combinado /panel, no 3 en paralelo (eso era
    // el comportamiento viejo, ya reemplazado).
    while (Date.now() < hasta && !cancelarRef.current) {
      const inicio = performance.now();
      try {
        await casosVivoAdmin.panelSesion(sesionId);
        registrarOk(metrica, performance.now() - inicio);
      } catch (err) {
        registrarError(metrica, err);
      }
      await esperar(ADMIN_INTERVALO_MS);
    }
  }

  // ---------------- Clases Formales ----------------
  // Alumno: solo consulta la pagina activa (para saber si hay trivia).
  // Parten desfasados al azar dentro de los 6 s, como en una sala real
  // (cada telefono abrio la pagina en un momento distinto).
  async function simularAlumnoClase(hasta, codigo, metrica) {
    await esperar(Math.random() * CLASE_ALUMNO_INTERVALO_MS);
    while (Date.now() < hasta && !cancelarRef.current) {
      await medir(metrica, () => clasesFormalesActual.leer(codigo), { aceptar404: true });
      await esperar(CLASE_ALUMNO_INTERVALO_MS);
    }
  }

  // Mando del interrogador: las mismas 5 llamadas en paralelo que hace
  // AdminClaseVivo cada 2 s (+ conteo y detalle si la pagina es trivia).
  async function simularMandoClase(hasta, codigo, sesionId, metrica) {
    while (Date.now() < hasta && !cancelarRef.current) {
      const [pagina] = await Promise.all([
        medir(metrica, () => clasesFormalesActual.leer(codigo), { aceptar404: true }),
        medir(metrica, () => clasesFormalesSemaforo.resultado(sesionId)),
        medir(metrica, () => clasesFormalesPreguntas.listar(sesionId)),
        medir(metrica, () => clasesFormalesSesiones.asistencia(sesionId)),
        medir(metrica, () => clasesFormalesAvatar.estados(sesionId)),
      ]);
      if (pagina?.tipo_herramienta === "trivia") {
        await Promise.all([
          medir(metrica, () => clasesFormalesTrivia.resultado(pagina.id)),
          medir(metrica, () => clasesFormalesTrivia.detalle(pagina.id)),
        ]);
      }
      await esperar(CLASE_INTERVALO_MS);
    }
  }

  // Proyeccion: pagina activa + capa del avatar cada 2 s (+ conteo de la
  // trivia y asistencia si la pagina es trivia), igual que ProyeccionClase.
  async function simularProyeccionClase(hasta, codigo, sesionId, metrica) {
    while (Date.now() < hasta && !cancelarRef.current) {
      const [pagina] = await Promise.all([
        medir(metrica, () => clasesFormalesActual.leer(codigo), { aceptar404: true }),
        medir(metrica, () => clasesFormalesAvatar.actual(sesionId)),
      ]);
      if (pagina?.tipo_herramienta === "trivia") {
        await medir(metrica, () => clasesFormalesTrivia.resultado(pagina.id));
        await medir(metrica, () => clasesFormalesSesiones.asistencia(sesionId));
      }
      await esperar(CLASE_INTERVALO_MS);
    }
  }

  async function iniciarPrueba() {
    if (!sesionElegida) return;
    setError("");
    cancelarRef.current = false;
    setResultados(null);
    setCorriendo(true);
    setProgreso(0);

    const { codigo_acceso, id: sesionId } = sesionElegida;
    const esClase = tipo === "clases";
    const metricaAlumnos = nuevaMetrica(
      esClase
        ? `Alumnos (${N_ALUMNOS_DEFAULT}, página activa cada 6s)`
        : `Alumnos (${N_ALUMNOS_DEFAULT}, público)`
    );
    const metricaAdmin = nuevaMetrica(
      esClase ? "Mando (5 llamadas cada 2s)" : "Admin (1 llamada a /panel)"
    );
    const metricaProyeccion = nuevaMetrica(
      esClase ? "Proyección (página activa + avatar cada 2s)" : "Proyección (1 llamada a /panel)"
    );

    const hasta = Date.now() + DURACION_SEG_DEFAULT * 1000;

    const cronometro = setInterval(() => {
      const restante = Math.max(0, hasta - Date.now());
      setProgreso(Math.round(100 * (1 - restante / (DURACION_SEG_DEFAULT * 1000))));
    }, 500);

    const tareas = [];
    if (esClase) {
      for (let i = 0; i < N_ALUMNOS_DEFAULT; i++) {
        tareas.push(simularAlumnoClase(hasta, codigo_acceso, metricaAlumnos));
      }
      tareas.push(simularMandoClase(hasta, codigo_acceso, sesionId, metricaAdmin));
      tareas.push(simularProyeccionClase(hasta, codigo_acceso, sesionId, metricaProyeccion));
    } else {
      for (let i = 0; i < N_ALUMNOS_DEFAULT; i++) {
        tareas.push(simularAlumno(hasta, codigo_acceso, metricaAlumnos));
      }
      tareas.push(simularPanel(hasta, sesionId, metricaAdmin));
      tareas.push(simularPanel(hasta, sesionId, metricaProyeccion));
    }

    await Promise.all(tareas);
    clearInterval(cronometro);

    setResultados([resumen(metricaAlumnos), resumen(metricaAdmin), resumen(metricaProyeccion)]);
    setCorriendo(false);
    setProgreso(100);
  }

  function cancelarPrueba() {
    cancelarRef.current = true;
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate(-1)} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>Prueba de carga</h1>
      </header>

      <div style={s.selector}>
        {Object.entries(TIPOS).map(([clave, nombre]) => (
          <button
            key={clave}
            onClick={() => !corriendo && setTipo(clave)}
            disabled={corriendo}
            style={{ ...s.selectorBtn, ...(tipo === clave ? s.selectorBtnActivo : null) }}
          >
            {nombre}
          </button>
        ))}
      </div>

      {tipo === "clases" ? (
        <p style={s.ayuda}>
          Simula, desde este navegador, el tráfico de una clase formal real: {N_ALUMNOS_DEFAULT} alumnos
          consultando la página activa cada 6s, el mando con sus 5 llamadas cada 2s (página, semáforo,
          preguntas, asistencia y avatar) y la proyección con página activa + avatar cada 2s. Usa una sesión
          de Clases Formales ya activa. Si la clase aún no inicia, la respuesta "sin página activa" cuenta
          como correcta.
        </p>
      ) : (
        <p style={s.ayuda}>
          Simula, desde este navegador, el tráfico de una clase real: {N_ALUMNOS_DEFAULT} alumnos pidiendo el
          estado cada 6s, más admin y proyección pidiendo el panel combinado cada 2s — igual a como funciona
          hoy. Usa automáticamente una sesión en vivo ya activa.
        </p>
      )}

      {cargandoSesiones ? (
        <p style={s.muted}>Buscando sesiones activas...</p>
      ) : error && !corriendo ? (
        <p style={s.error}>{error}</p>
      ) : sesionesActivas.length === 0 ? (
        <p style={s.muted}>
          {tipo === "clases"
            ? "No hay ninguna sesión de Clases Formales activa. Inicia una clase y vuelve aquí."
            : 'No hay ninguna sesión en vivo activa. Crea una desde "Iniciar presentación" y vuelve aquí.'}
        </p>
      ) : sesionesActivas.length > 1 && !sesionElegida ? (
        <>
          <p style={s.muted}>Hay varias sesiones activas. Elige con cuál probar:</p>
          <div style={s.listaSesiones}>
            {sesionesActivas.map((ses) => (
              <button key={ses.id} onClick={() => setSesionElegida(ses)} style={s.sesionCard}>
                <p style={s.sesionTitulo}>{tituloSesion(tipo, ses)}</p>
                <p style={s.sesionMeta}>código {ses.codigo_acceso}</p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={s.form}>
          <p style={s.sesionElegidaTexto}>
            Sesión: <strong>{tituloSesion(tipo, sesionElegida)}</strong> (código {sesionElegida?.codigo_acceso})
          </p>

          {error && <p style={s.error}>{error}</p>}

          {!corriendo ? (
            <button onClick={iniciarPrueba} style={s.submitBtn}>▶ Iniciar prueba</button>
          ) : (
            <>
              <div style={s.progresoFondo}>
                <div style={{ ...s.progresoLlena, width: `${progreso}%` }} />
              </div>
              <p style={s.progresoTexto}>{progreso}% — corriendo...</p>
              <button onClick={cancelarPrueba} style={s.cancelarBtn}>Cancelar</button>
            </>
          )}
        </div>
      )}

      {resultados && (
        <div style={s.resultadosBox}>
          <h3 style={s.h3}>Resultados</h3>
          {resultados.map((r, i) => (
            <div key={i} style={s.resultadoCard}>
              <p style={s.resultadoNombre}>{r.nombre}</p>
              <p style={s.resultadoLinea}>
                {r.total} peticiones · <span style={s.ok}>{r.ok} ok</span> · <span style={s.errorTexto}>{r.error} fallidas ({r.pctError}%)</span>
              </p>
              <p style={s.resultadoLinea}>Latencia promedio: {r.latProm}ms · máxima: {r.latMax}ms</p>
              {r.erroresDetalle.length > 0 && (
                <div style={s.erroresDetalleBox}>
                  {r.erroresDetalle.map((e, j) => (
                    <p key={j} style={s.erroresDetalleLinea}>{e}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "24px 20px 60px", fontFamily: "sans-serif" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 16 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 20, margin: 0 },
  ayuda: { color: "#94A3B8", fontSize: 13, lineHeight: 1.5, marginBottom: 20, maxWidth: 560 },
  muted: { color: "#94A3B8", fontSize: 14 },

  selector: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  selectorBtn: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 20, color: "#94A3B8", padding: "8px 16px", fontSize: 13, cursor: "pointer" },
  selectorBtnActivo: { background: "#4FC3D9", borderColor: "#4FC3D9", color: "#0E1526", fontWeight: 700 },
  error: { color: "#D1495B", fontSize: 13, marginTop: 8 },

  listaSesiones: { display: "flex", flexDirection: "column", gap: 8, maxWidth: 460 },
  sesionCard: { background: "#16213A", border: "1px solid rgba(79,195,217,0.35)", borderRadius: 10, padding: "12px 16px", cursor: "pointer", textAlign: "left" },
  sesionTitulo: { fontSize: 14, fontWeight: 600, margin: 0, color: "#F4F1EA" },
  sesionMeta: { fontSize: 12, color: "#94A3B8", margin: "2px 0 0" },

  form: { display: "flex", flexDirection: "column", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: 20, maxWidth: 460, marginBottom: 24 },
  sesionElegidaTexto: { fontSize: 14, color: "#C7CDD9", margin: 0 },

  submitBtn: { marginTop: 18, background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  cancelarBtn: { marginTop: 10, background: "none", border: "1px solid rgba(209,73,91,0.4)", borderRadius: 8, color: "#D1495B", padding: "10px 0", fontSize: 13, cursor: "pointer" },
  progresoFondo: { marginTop: 18, height: 10, background: "#0E1526", borderRadius: 6, overflow: "hidden" },
  progresoLlena: { height: "100%", background: "#4FC3D9", transition: "width 0.3s ease" },
  progresoTexto: { fontSize: 12, color: "#94A3B8", marginTop: 6, textAlign: "center" },

  resultadosBox: { maxWidth: 560 },
  h3: { fontSize: 15, margin: "0 0 12px" },
  resultadoCard: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "14px 16px", marginBottom: 10 },
  resultadoNombre: { fontSize: 14, fontWeight: 700, margin: "0 0 6px", color: "#F4F1EA" },
  resultadoLinea: { fontSize: 13, color: "#C7CDD9", margin: "2px 0" },
  ok: { color: "#7FD98F", fontWeight: 600 },
  errorTexto: { color: "#D1495B", fontWeight: 600 },
  erroresDetalleBox: { marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(244,241,233,0.1)" },
  erroresDetalleLinea: { fontSize: 11, color: "#94A3B8", margin: "2px 0", fontFamily: "monospace" },
};
