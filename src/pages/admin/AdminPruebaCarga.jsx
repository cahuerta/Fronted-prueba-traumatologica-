import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { casosVivoAlumno, casosVivoAdmin } from "../../api/client";

const ALUMNO_INTERVALO_MS = 6000;
const ADMIN_INTERVALO_MS = 2000;
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

export default function AdminPruebaCarga() {
  const navigate = useNavigate();

  const [sesionesActivas, setSesionesActivas] = useState([]);
  const [sesionElegida, setSesionElegida] = useState(null);
  const [cargandoSesiones, setCargandoSesiones] = useState(true);

  const [corriendo, setCorriendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [resultados, setResultados] = useState(null);
  const [error, setError] = useState("");

  const cancelarRef = useRef(false);

  useEffect(() => {
    buscarSesiones();
  }, []);

  async function buscarSesiones() {
    setCargandoSesiones(true);
    setError("");
    try {
      const activas = await casosVivoAdmin.listarSesionesActivas();
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

  async function simularPanelTriple(hasta, codigoAcceso, sesionId, metrica) {
    // Reproduce el Promise.all de 3 llamadas que hoy hacen AdminVivo y ProyeccionVivo.
    while (Date.now() < hasta && !cancelarRef.current) {
      const inicio = performance.now();
      try {
        await Promise.all([
          casosVivoAlumno.estadoActual(codigoAcceso),
          casosVivoAlumno.resultados(sesionId),
          casosVivoAdmin.verAsistenciaVivo(sesionId),
        ]);
        registrarOk(metrica, performance.now() - inicio);
      } catch (err) {
        registrarError(metrica, err);
      }
      await esperar(ADMIN_INTERVALO_MS);
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
    const metricaAlumnos = nuevaMetrica(`Alumnos (${N_ALUMNOS_DEFAULT}, público)`);
    const metricaAdmin = nuevaMetrica("Admin (3 llamadas en paralelo)");
    const metricaProyeccion = nuevaMetrica("Proyección (3 llamadas en paralelo)");

    const hasta = Date.now() + DURACION_SEG_DEFAULT * 1000;

    const cronometro = setInterval(() => {
      const restante = Math.max(0, hasta - Date.now());
      setProgreso(Math.round(100 * (1 - restante / (DURACION_SEG_DEFAULT * 1000))));
    }, 500);

    const tareas = [];
    for (let i = 0; i < N_ALUMNOS_DEFAULT; i++) {
      tareas.push(simularAlumno(hasta, codigo_acceso, metricaAlumnos));
    }
    tareas.push(simularPanelTriple(hasta, codigo_acceso, sesionId, metricaAdmin));
    tareas.push(simularPanelTriple(hasta, codigo_acceso, sesionId, metricaProyeccion));

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

      <p style={s.ayuda}>
        Simula, desde este navegador, el tráfico de una clase real: {N_ALUMNOS_DEFAULT} alumnos pidiendo el
        estado cada 6s, más admin y proyección haciendo sus 3 llamadas en paralelo cada 2s — igual a como
        funciona hoy. Usa automáticamente una sesión en vivo ya activa.
      </p>

      {cargandoSesiones ? (
        <p style={s.muted}>Buscando sesiones activas...</p>
      ) : error && !corriendo ? (
        <p style={s.error}>{error}</p>
      ) : sesionesActivas.length === 0 ? (
        <p style={s.muted}>
          No hay ninguna sesión en vivo activa. Crea una desde "Iniciar presentación" y vuelve aquí.
        </p>
      ) : sesionesActivas.length > 1 && !sesionElegida ? (
        <>
          <p style={s.muted}>Hay varias sesiones activas. Elige con cuál probar:</p>
          <div style={s.listaSesiones}>
            {sesionesActivas.map((ses) => (
              <button key={ses.id} onClick={() => setSesionElegida(ses)} style={s.sesionCard}>
                <p style={s.sesionTitulo}>{ses.presentaciones?.titulo || "Presentación"}</p>
                <p style={s.sesionMeta}>código {ses.codigo_acceso}</p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div style={s.form}>
          <p style={s.sesionElegidaTexto}>
            Sesión: <strong>{sesionElegida?.presentaciones?.titulo || "Presentación"}</strong> (código {sesionElegida?.codigo_acceso})
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
      
