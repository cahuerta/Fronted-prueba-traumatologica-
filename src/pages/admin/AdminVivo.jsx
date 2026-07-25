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
      setError("");
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
      </div>
      <div style={s.datosBar}>
        {actual?.pregunta && (
          <span style={s.estadoDato}>Caso {actual.caso_actual_orden} · Pregunta {actual.pregunta_actual_orden}</span>
        )}
        <span style={s.estadoDato}>{resultados.total} votos</span>
        <span style={s.estadoDato}>{asistencia.total_presentes}/{asistencia.total_habilitados} presentes</span>
      </div>

      {error && <p style={s.error}>{error}</p>}

      {actual?.pregunta ? (
        <div style={s.preguntaBox}>
          <div style={s.preguntaHeader}>
            {thumbUrl && <img src={thumbUrl} alt="" style={s.thumb} />}
            <p style={s.pregunta}>{actual.pregunta}</p>
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
  wrap: { height: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "10px 12px", fontFamily: "sans-serif", boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden" },

  topBar: { display: "flex", alignItems: "center", gap: 12, marginBottom: "1vh", background: "#16213A", border: "1px solid rgba(244,241,233,0.15)", borderRadius: 12, padding: "8px 12px", flexShrink: 0 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 6, color: "#94A3B8", padding: "4px 10px", fontSize: 14, cursor: "pointer" },
  estadoBadge: { fontSize: 15, fontWeight: 800, color: "#94A3B8" },
  estadoBadgeActiva: { color: "#4FC3D9" },

  datosBar: { display: "flex", flexWrap: "wrap", gap: "4px 14px", marginBottom: "1vh", padding: "0 4px", flexShrink: 0 },
  estadoDato: { fontSize: 16, color: "#F4F1EA", fontWeight: 800 },

  error: { color: "#D1495B", fontSize: 13, marginBottom: "1vh", flexShrink: 0 },
  muted: { color: "#94A3B8", fontSize: 14 },

  preguntaBox: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 14, padding: "2vh 16px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" },
  preguntaHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: "1.6vh", flexShrink: 0 },
  thumb: { width: 40, height: 40, borderRadius: 8, objectFit: "cover", background: "#000", flexShrink: 0 },
  pregunta: { fontSize: "clamp(15px, 2.6vh, 20px)", fontWeight: 800, margin: 0, color: "#F4F1EA", lineHeight: 1.2, flex: 1 },

  opciones: { display: "flex", flexDirection: "column", gap: "1vh", flex: 1, minHeight: 0, justifyContent: "center" },
  opcion: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "1.2vh 14px", cursor: "pointer", textAlign: "left", width: "100%", boxSizing: "border-box" },
  opcionCorrecta: { border: "2px solid #7FD98F", background: "rgba(127,217,143,0.08)" },
  opcionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6vh" },
  opcionTexto: { fontSize: "clamp(13px, 1.9vh, 16px)", color: "#F4F1EA" },
  opcionVotos: { fontSize: "clamp(20px, 3.4vh, 30px)", fontWeight: 800, color: "#4FC3D9", minWidth: 40, textAlign: "right" },
  barraFondo: { height: 8, background: "#16213A", borderRadius: 5, overflow: "hidden" },
  barraLlena: { height: "100%", background: "#4FC3D9", borderRadius: 5, transition: "width 0.4s ease" },
  barraLlenaCorrecta: { background: "#7FD98F" },

  controlWrap: { flexShrink: 0, paddingTop: "1vh" },
  controlBtn: { display: "block", width: "100%", background: "#4FC3D9", border: "none", borderRadius: 14, padding: "1.8vh 0", cursor: "pointer" },
  controlBtnTexto: { fontSize: 17, fontWeight: 800, color: "#0E1526" },
};
