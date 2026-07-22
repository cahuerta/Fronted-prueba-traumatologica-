import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { casosVivoAdmin, casosVivoAlumno } from "../../api/client";

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

const ESTADO_LABEL = {
  esperando: "Esperando",
  votando: "Votación abierta",
  discusion: "En discusión",
  cerrada: "Respuesta revelada",
};

export default function AdminVivo() {
  const navigate = useNavigate();
  const { sesionId } = useParams();

  const [sesion, setSesion] = useState(null);
  const [actual, setActual] = useState(null);
  const [resultados, setResultados] = useState({ total: 0, conteo: {} });
  const [detalle, setDetalle] = useState([]);
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarSesion();
  }, [sesionId]);

  async function cargarSesion() {
    try {
      const data = await casosVivoAdmin.obtenerSesion(sesionId);
      setSesion(data);
    } catch (err) {
      setError(err.message);
    }
  }

  const refrescar = useCallback(async () => {
    if (!sesion?.codigo_acceso) return;
    try {
      const [est, res, det] = await Promise.all([
        casosVivoAlumno.estadoActual(sesion.codigo_acceso),
        casosVivoAlumno.resultados(sesionId),
        casosVivoAdmin.detalleVotos(sesionId),
      ]);
      setActual(est);
      setResultados(res);
      setDetalle(det);
    } catch (err) {
      setError(err.message);
    }
  }, [sesion, sesionId]);

  useEffect(() => {
    if (!sesion?.codigo_acceso) return;
    refrescar();
    const intervalo = setInterval(refrescar, 2000);
    return () => clearInterval(intervalo);
  }, [sesion, refrescar]);

  async function ejecutarAccion(accion) {
    setError("");
    setProcesando(true);
    try {
      const nuevaSesion = await casosVivoAdmin.accionSesion(sesionId, accion);
      setSesion(nuevaSesion);
      await refrescar();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  const estado = actual?.estado || sesion?.estado || "esperando";
  const linkAlumno = sesion?.codigo_acceso ? `${APP_URL}/alumno-vivo/${sesion.codigo_acceso}` : "";

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate("/admin/presentaciones")} style={s.back}>‹ Salir de la sesión</button>
        {sesion?.codigo_acceso && (
          <div style={s.codigoBox}>
            <span style={s.codigoLabel}>Código de acceso</span>
            <span style={s.codigo}>{sesion.codigo_acceso}</span>
            <span style={s.link}>{linkAlumno}</span>
          </div>
        )}
      </header>

      <div style={s.estadoBar}>
        <span style={{ ...s.estadoBadge, ...(estado === "votando" ? s.estadoBadgeActiva : {}) }}>
          ● {ESTADO_LABEL[estado] || estado}
        </span>
        {actual?.pregunta && (
          <span style={s.estadoMeta}>
            Caso {actual.caso_actual_orden} · Pregunta {actual.pregunta_actual_orden}
          </span>
        )}
        <span style={s.estadoMeta}>{resultados.total} voto(s)</span>
      </div>

      {error && <p style={s.error}>{error}</p>}

      {actual?.caso && (
        <div style={s.casoBox}>
          <p style={s.casoTitulo}>{actual.caso.titulo}</p>
          <p style={s.vineta}>{actual.caso.vineta_clinica}</p>
          {actual.caso.media_url && (
            <div style={s.mediaWrap}>
              {actual.caso.media_tipo === "video" ? (
                <video src={actual.caso.media_url} controls style={s.mediaCaso} />
              ) : (
                <img src={actual.caso.media_url} alt="" style={s.mediaCaso} />
              )}
            </div>
          )}
        </div>
      )}

      {actual?.pregunta ? (
        <div style={s.grid2}>
          <div style={s.preguntaBox}>
            <p style={s.pregunta}>{actual.pregunta}</p>

            {actual.media_url && (
              <div style={s.mediaWrap}>
                {actual.media_tipo === "video" ? (
                  <video src={actual.media_url} controls style={s.mediaPregunta} />
                ) : (
                  <img src={actual.media_url} alt="" style={s.mediaPregunta} />
                )}
              </div>
            )}

            <div style={s.opciones}>
              {actual.opciones?.map((op, i) => {
                const votosOpcion = resultados.conteo?.[i] || 0;
                const esCorrecta = estado === "cerrada" && actual.correcta === i;
                return (
                  <div key={i} style={{ ...s.opcion, ...(esCorrecta ? s.opcionCorrecta : {}) }}>
                    <span style={s.opcionTexto}>{op}</span>
                    <span style={s.opcionVotos}>{votosOpcion}</span>
                  </div>
                );
              })}
            </div>

            {estado === "cerrada" && actual.explicacion && (
              <div style={s.explicacionBox}>
                <p style={s.explicacionTitulo}>Fundamento</p>
                <p style={s.explicacionTexto}>{actual.explicacion}</p>
                {actual.fuentes?.length > 0 && (
                  <p style={s.fuentes}>Fuente: {actual.fuentes.join(", ")}</p>
                )}
              </div>
            )}

            <div style={s.controles}>
              {estado === "esperando" && (
                <button onClick={() => ejecutarAccion("abrir_votacion")} disabled={procesando} style={s.btnPrimario}>
                  Abrir votación
                </button>
              )}
              {estado === "votando" && (
                <button onClick={() => ejecutarAccion("cerrar_votacion")} disabled={procesando} style={s.btnPrimario}>
                  Cerrar votación → discusión
                </button>
              )}
              {estado === "discusion" && (
                <button onClick={() => ejecutarAccion("revelar")} disabled={procesando} style={s.btnPrimario}>
                  Revelar respuesta
                </button>
              )}
              {estado === "cerrada" && (
                <button onClick={() => ejecutarAccion("siguiente")} disabled={procesando} style={s.btnPrimario}>
                  Siguiente →
                </button>
              )}
            </div>
          </div>

          <div style={s.detalleBox}>
            <h3 style={s.h3}>Quién ha votado</h3>
            {detalle.length === 0 ? (
              <p style={s.muted}>Nadie ha votado todavía.</p>
            ) : (
              <div style={s.detalleList}>
                {detalle.map((v, i) => (
                  <div key={i} style={s.detalleItem}>
                    <span>{v.alumnos?.nombre}</span>
                    <span style={s.detalleOpcion}>Opción {actual?.opciones?.[v.opcion]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <p style={s.muted}>Sin pregunta activa (¿presentación finalizada?)</p>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "24px 32px 60px", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  codigoBox: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  codigoLabel: { fontSize: 11, color: "#94A3B8" },
  codigo: { fontSize: 28, fontWeight: 800, letterSpacing: 4, color: "#4FC3D9" },
  link: { fontSize: 11, color: "#94A3B8" },

  estadoBar: { display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" },
  estadoBadge: { background: "#16213A", border: "1px solid rgba(244,241,233,0.15)", borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#94A3B8" },
  estadoBadgeActiva: { background: "rgba(79,195,217,0.15)", borderColor: "#4FC3D9", color: "#4FC3D9" },
  estadoMeta: { fontSize: 13, color: "#94A3B8" },

  error: { color: "#D1495B", fontSize: 13, marginBottom: 12 },
  muted: { color: "#94A3B8", fontSize: 14 },
  casoBox: { marginBottom: 20 },
  casoTitulo: { fontSize: 22, fontWeight: 700, margin: "0 0 6px" },
  vineta: { fontSize: 15, color: "#C7CDD9", lineHeight: 1.5, margin: 0, maxWidth: 800 },
  mediaWrap: { marginTop: 12 },
  mediaCaso: { maxWidth: "100%", maxHeight: 360, borderRadius: 10, background: "#000" },
  mediaPregunta: { maxWidth: "100%", maxHeight: 420, borderRadius: 10, background: "#000", marginBottom: 4 },

  grid2: { display: "flex", flexWrap: "wrap", gap: 20 },
  preguntaBox: { flex: "2 1 420px", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 14, padding: 24 },
  pregunta: { fontSize: 20, fontWeight: 600, margin: "0 0 12px" },
  opciones: { display: "flex", flexDirection: "column", gap: 8, marginTop: 18 },
  opcion: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "12px 16px" },
  opcionCorrecta: { border: "2px solid #7FD98F", background: "rgba(127,217,143,0.08)" },
  opcionTexto: { fontSize: 15 },
  opcionVotos: { background: "#4FC3D9", color: "#0E1526", fontWeight: 700, fontSize: 13, borderRadius: 20, padding: "2px 12px", minWidth: 20, textAlign: "center" },
  explicacionBox: { marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(244,241,233,0.12)" },
  explicacionTitulo: { fontSize: 12, color: "#4FC3D9", fontWeight: 700, textTransform: "uppercase", margin: "0 0 6px" },
  explicacionTexto: { fontSize: 15, lineHeight: 1.6, margin: 0, color: "#F4F1EA" },
  fuentes: { fontSize: 12, color: "#94A3B8", marginTop: 8 },
  controles: { marginTop: 20 },
  btnPrimario: { background: "#4FC3D9", border: "none", borderRadius: 10, color: "#0E1526", padding: "14px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer" },

  detalleBox: { flex: "1 1 260px", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 14, padding: 18, alignSelf: "flex-start" },
  h3: { fontSize: 13, marginBottom: 10 },
  detalleList: { display: "flex", flexDirection: "column", gap: 6 },
  detalleItem: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(244,241,233,0.06)" },
  detalleOpcion: { color: "#94A3B8" },
};
