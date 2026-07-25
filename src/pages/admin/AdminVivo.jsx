import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { casosVivoAdmin, casosVivoAlumno } from "../../api/client";

const ESTADO_LABEL = {
  esperando: "Esperando",
  votando: "Votación abierta",
  discusion: "En discusión",
  cerrada: "Respuesta revelada",
};

const ACCION_LABEL = {
  esperando: "Abrir votación",
  votando: "Cerrar votación",
  discusion: "Revelar respuesta",
  cerrada: "Siguiente pregunta →",
};

const ACCION_KEY = {
  esperando: "abrir_votacion",
  votando: "cerrar_votacion",
  discusion: "revelar",
  cerrada: "siguiente",
};

export default function AdminVivo() {
  const navigate = useNavigate();
  const { sesionId } = useParams();

  const [sesion, setSesion] = useState(null);
  const [actual, setActual] = useState(null);
  const [resultados, setResultados] = useState({ total: 0, conteo: {} });
  const [asistencia, setAsistencia] = useState({ total_presentes: 0, total_habilitados: 0 });
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
      const [est, res, asis] = await Promise.all([
        casosVivoAlumno.estadoActual(sesion.codigo_acceso),
        casosVivoAlumno.resultados(sesionId),
        casosVivoAdmin.verAsistenciaVivo(sesionId),
      ]);
      setActual(est);
      setResultados(res);
      setAsistencia(asis);
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
  const maxVotos = Math.max(1, ...Object.values(resultados.conteo || {}));
  const thumbUrl = actual?.media_url || actual?.caso?.media_url;

  return (
    <div style={s.wrap}>
      <div style={s.topBar}>
        <button onClick={() => navigate(-1)} style={s.back}>‹</button>
        <span style={{ ...s.estadoBadge, ...(estado === "votando" ? s.estadoBadgeActiva : {}) }}>
          ● {ESTADO_LABEL[estado] || estado}
        </span>
        {actual?.pregunta && (
          <span style={s.estadoDato}>C{actual.caso_actual_orden}·P{actual.pregunta_actual_orden}</span>
        )}
        <span style={s.estadoDato}>{resultados.total} votos</span>
        <span style={s.estadoDato}>{asistencia.total_presentes}/{asistencia.total_habilitados}</span>
      </div>

      {error && <p style={s.error}>{error}</p>}

      {actual?.pregunta ? (
        <div style={s.preguntaBox}>
          <div style={s.preguntaHeader}>
            <p style={s.pregunta}>{actual.pregunta}</p>
            {thumbUrl && <img src={thumbUrl} alt="" style={s.thumb} />}
          </div>

          <div style={s.opciones}>
            {actual.opciones?.map((op, i) => {
              const votosOpcion = resultados.conteo?.[i] || 0;
              const anchoPct = Math.round((votosOpcion / maxVotos) * 100);
              const esCorrecta = estado === "cerrada" && actual.correcta === i;
              return (
                <button
                  key={i}
                  onClick={() => navigate(`/admin/vivo/${sesionId}/detalle?opcion=${i}`)}
                  style={{ ...s.opcion, ...(esCorrecta ? s.opcionCorrecta : {}) }}
                >
                  <div style={s.opcionHeader}>
                    <span style={s.opcionTexto}>{op}</span>
                    <span style={s.opcionVotos}>{votosOpcion}</span>
                  </div>
                  <div style={s.barraFondo}>
                    <div style={{ ...s.barraLlena, width: `${anchoPct}%`, ...(esCorrecta ? s.barraLlenaCorrecta : {}) }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p style={s.muted}>Sin pregunta activa (¿presentación finalizada?)</p>
      )}

      {actual?.pregunta && (
        <div style={s.controlWrap}>
          <button
            onClick={() => ejecutarAccion(ACCION_KEY[estado])}
            disabled={procesando}
            style={s.controlBtn}
          >
            <span style={s.controlBtnTexto}>
              {procesando ? "..." : ACCION_LABEL[estado]}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "10px 12px 96px", fontFamily: "sans-serif", boxSizing: "border-box" },

  topBar: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12, background: "#16213A", border: "1px solid rgba(244,241,233,0.15)", borderRadius: 12, padding: "8px 12px" },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 6, color: "#94A3B8", padding: "4px 10px", fontSize: 14, cursor: "pointer" },
  estadoBadge: { fontSize: 14, fontWeight: 800, color: "#94A3B8" },
  estadoBadgeActiva: { color: "#4FC3D9" },
  estadoDato: { fontSize: 12.5, color: "#C7CDD9", fontWeight: 600 },

  error: { color: "#D1495B", fontSize: 13, marginBottom: 10 },
  muted: { color: "#94A3B8", fontSize: 14 },

  preguntaBox: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 14, padding: 14 },
  preguntaHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 12 },
  thumb: { width: 30, height: 30, borderRadius: 6, objectFit: "cover", background: "#000", flexShrink: 0, opacity: 0.85 },
  pregunta: { fontSize: 19, fontWeight: 800, margin: 0, color: "#F4F1EA", lineHeight: 1.25, flex: 1 },

  opciones: { display: "flex", flexDirection: "column", gap: 8 },
  opcion: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "9px 12px", cursor: "pointer", textAlign: "left", width: "100%", boxSizing: "border-box" },
  opcionCorrecta: { border: "2px solid #7FD98F", background: "rgba(127,217,143,0.08)" },
  opcionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  opcionTexto: { fontSize: 14, color: "#F4F1EA" },
  opcionVotos: { fontSize: 22, fontWeight: 800, color: "#4FC3D9", minWidth: 36, textAlign: "right" },
  barraFondo: { height: 7, background: "#16213A", borderRadius: 5, overflow: "hidden" },
  barraLlena: { height: "100%", background: "#4FC3D9", borderRadius: 5, transition: "width 0.4s ease" },
  barraLlenaCorrecta: { background: "#7FD98F" },

  controlWrap: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#0E1526", borderTop: "1px solid rgba(244,241,233,0.15)", padding: "12px", boxSizing: "border-box" },
  controlBtn: { display: "block", width: "100%", background: "#4FC3D9", border: "none", borderRadius: 14, padding: "16px 0", cursor: "pointer" },
  controlBtnTexto: { fontSize: 18, fontWeight: 800, color: "#0E1526" },
};
