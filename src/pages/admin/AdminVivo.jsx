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
  cerrada: "Siguiente pregunta",
};

const ACCION_SIMBOLO = {
  esperando: "▶",
  votando: "⏹",
  discusion: "✓",
  cerrada: "→",
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
  const thumbUrl = actual?.media_url || actual?.caso?.media_url;

  const totalPresentes = asistencia.total_presentes || 0;
  const totalVotos = resultados.total || 0;
  const pctVotado = totalPresentes > 0 ? Math.min(100, Math.round((totalVotos / totalPresentes) * 100)) : 0;

  return (
    <div style={s.wrap}>
      <div style={s.topBar}>
        <button onClick={() => navigate(-1)} style={s.back}>‹</button>
        <span style={{ ...s.estadoBadge, ...(estado === "votando" ? s.estadoBadgeActiva : {}) }}>
          ● {ESTADO_LABEL[estado] || estado}
        </span>
        {actual?.pregunta && (
          <span style={s.posicion}>C{actual.caso_actual_orden}·P{actual.pregunta_actual_orden}</span>
        )}
      </div>

      {/* DATO PROTAGONISTA: cuántos han votado de los presentes — lo que decide cuándo cortar */}
      <div style={s.heroBox}>
        <div style={s.heroNumeros}>
          <span style={s.heroVotos}>{totalVotos}</span>
          <span style={s.heroSeparador}>/</span>
          <span style={s.heroPresentes}>{totalPresentes}</span>
          <span style={s.heroLabel}>votaron</span>
        </div>
        <div style={s.heroBarraFondo}>
          <div style={{ ...s.heroBarraLlena, width: `${pctVotado}%` }} />
        </div>
      </div>

      {error && <p style={s.error}>{error}</p>}

      {actual?.pregunta ? (
        <div style={s.preguntaBox}>
          <div style={s.preguntaCaja}>
            {thumbUrl && <img src={thumbUrl} alt="" style={s.thumb} />}
            <p style={s.pregunta}>{actual.pregunta}</p>
          </div>

          <div style={s.opciones}>
            {actual.opciones?.map((op, i) => {
              const votosOpcion = resultados.conteo?.[i] || 0;
              const esCorrecta = estado === "cerrada" && actual.correcta === i;
              return (
                <button
                  key={i}
                  onClick={() => navigate(`/admin/vivo/${sesionId}/detalle?opcion=${i}`)}
                  style={{ ...s.opcion, ...(esCorrecta ? s.opcionCorrecta : {}) }}
                >
                  <span style={s.opcionTexto}>{op}</span>
                  <span style={s.opcionVotos}>{votosOpcion}</span>
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
            <span style={s.controlBtnSimbolo}>{procesando ? "…" : ACCION_SIMBOLO[estado]}</span>
            <span style={s.controlBtnTexto}>
              {procesando ? "Procesando" : ACCION_LABEL[estado]}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { height: "100dvh", background: "#0E1526", color: "#F4F1EA", padding: "10px 12px", fontFamily: "sans-serif", boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden" },

  topBar: { display: "flex", alignItems: "center", gap: 10, marginBottom: "1vh", flexShrink: 0 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 6, color: "#94A3B8", padding: "4px 10px", fontSize: 14, cursor: "pointer" },
  estadoBadge: { fontSize: 14, fontWeight: 800, color: "#94A3B8" },
  estadoBadgeActiva: { color: "#4FC3D9" },
  posicion: { fontSize: 13, color: "#94A3B8", fontWeight: 700, marginLeft: "auto" },

  heroBox: { background: "#16213A", border: "2px solid rgba(79,195,217,0.4)", borderRadius: 16, padding: "1.4vh 18px", marginBottom: "1vh", flexShrink: 0 },
  heroNumeros: { display: "flex", alignItems: "baseline", gap: 6, marginBottom: "0.8vh" },
  heroVotos: { fontSize: "clamp(38px, 8vh, 56px)", fontWeight: 900, color: "#4FC3D9", lineHeight: 1 },
  heroSeparador: { fontSize: "clamp(24px, 5vh, 34px)", fontWeight: 700, color: "#94A3B8" },
  heroPresentes: { fontSize: "clamp(24px, 5vh, 34px)", fontWeight: 700, color: "#F4F1EA" },
  heroLabel: { fontSize: 15, color: "#94A3B8", fontWeight: 700, marginLeft: 4 },
  heroBarraFondo: { height: 14, background: "#0E1526", borderRadius: 8, overflow: "hidden" },
  heroBarraLlena: { height: "100%", background: "#4FC3D9", borderRadius: 8, transition: "width 0.4s ease" },

  error: { color: "#D1495B", fontSize: 13, marginBottom: "1vh", flexShrink: 0 },
  muted: { color: "#94A3B8", fontSize: 14 },

  preguntaBox: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 14, padding: "1.6vh 16px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" },
  preguntaCaja: { display: "flex", alignItems: "center", gap: 10, marginBottom: "1.2vh", flexShrink: 0, border: "1px solid rgba(244,241,233,0.25)", borderRadius: 10, padding: "1vh 12px" },
  thumb: { width: 34, height: 34, borderRadius: 8, objectFit: "cover", background: "#000", flexShrink: 0, opacity: 0.8 },
  pregunta: { fontSize: "clamp(16px, 2.4vh, 20px)", fontWeight: 800, margin: 0, color: "#F4F1EA", lineHeight: 1.25, flex: 1 },

  opciones: { display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 },
  opcion: { flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "0 16px", cursor: "pointer", textAlign: "left", width: "100%", boxSizing: "border-box" },
  opcionCorrecta: { border: "2px solid #7FD98F", background: "rgba(127,217,143,0.08)" },
  opcionTexto: { fontSize: "clamp(16px, 2.6vh, 21px)", color: "#F4F1EA", lineHeight: 1.2 },
  opcionVotos: { fontSize: "clamp(18px, 2.8vh, 26px)", fontWeight: 800, color: "#4FC3D9", minWidth: 36, textAlign: "center", flexShrink: 0 },

  controlWrap: { flexShrink: 0, paddingTop: "1vh" },
  controlBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, width: "100%", background: "#4FC3D9", border: "none", borderRadius: 14, padding: "1.8vh 0", cursor: "pointer" },
  controlBtnSimbolo: { fontSize: 24, fontWeight: 900, color: "#0E1526" },
  controlBtnTexto: { fontSize: 17, fontWeight: 800, color: "#0E1526" },
};
