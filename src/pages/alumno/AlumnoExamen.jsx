import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { examen } from "../../api/client";

const LETRAS = ["A", "B", "C", "D", "E"];

export default function AlumnoExamen() {
  const { sesionId } = useParams();
  const navigate = useNavigate();
  const alumnoId = sessionStorage.getItem(`alumno_id_${sesionId}`);

  const [instanciaId, setInstanciaId] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [minutosTotales, setMinutosTotales] = useState(null);
  const [idx, setIdx] = useState(0);
  const [seleccion, setSeleccion] = useState({}); // { preguntaId: opcionIdx }
  const [segundosRestantes, setSegundosRestantes] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const timerIniciado = useRef(false);

  useEffect(() => {
    if (!alumnoId) {
      navigate(`/alumno/${sesionId}`);
      return;
    }
    iniciar();
  }, [sesionId]);

  useEffect(() => {
    if (segundosRestantes === null) return;
    if (segundosRestantes <= 0) {
      handleFinalizar();
      return;
    }
    const t = setTimeout(() => setSegundosRestantes((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [segundosRestantes]);

  async function iniciar() {
    setCargando(true);
    try {
      const res = await examen.iniciar(sesionId, alumnoId);
      setInstanciaId(res.instancia_id);
      setPreguntas(res.preguntas);
      setMinutosTotales(res.minutos_totales);
      if (res.iniciado_at) {
        timerIniciado.current = true;
        setSegundosRestantes(res.minutos_totales * 60); // aproximado si ya había arrancado antes
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleResponder(opcionIdx) {
    const pregunta = preguntas[idx];
    setSeleccion((s) => ({ ...s, [pregunta.id]: opcionIdx }));

    if (!timerIniciado.current) {
      timerIniciado.current = true;
      setSegundosRestantes(minutosTotales * 60);
    }

    try {
      await examen.responder(instanciaId, pregunta.id, opcionIdx);
    } catch (err) {
      setError(err.message);
    }
  }

  function siguiente() {
    if (idx + 1 < preguntas.length) setIdx(idx + 1);
    else handleFinalizar();
  }

  async function handleFinalizar() {
    if (enviando) return;
    setEnviando(true);
    try {
      const res = await examen.finalizar(instanciaId);
      sessionStorage.setItem(`resultado_${sesionId}`, JSON.stringify(res));
      navigate(`/alumno/${sesionId}/resultado`);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <div style={s.wrap}><p style={s.muted}>Cargando examen...</p></div>;
  if (error) return <div style={s.wrap}><p style={s.error}>{error}</p></div>;
  if (preguntas.length === 0) return <div style={s.wrap}><p style={s.muted}>No hay preguntas disponibles.</p></div>;

  const pregunta = preguntas[idx];
  const min = segundosRestantes !== null ? Math.floor(segundosRestantes / 60) : null;
  const seg = segundosRestantes !== null ? segundosRestantes % 60 : null;

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.progreso}>{idx + 1} / {preguntas.length}</span>
        {segundosRestantes !== null && (
          <span style={{ ...s.timer, color: segundosRestantes < 60 ? "#D1495B" : "#F4F1EA" }}>
            {min}:{String(seg).padStart(2, "0")}
          </span>
        )}
      </div>

      <div style={s.card}>
        <p style={s.region}>{pregunta.region}</p>
        <p style={s.pregunta}>{pregunta.pregunta}</p>

        <div style={s.opciones}>
          {pregunta.opciones.map((op, i) => {
            const elegida = seleccion[pregunta.id] === i;
            return (
              <button
                key={i}
                onClick={() => handleResponder(i)}
                style={{ ...s.opcionBtn, ...(elegida ? s.opcionBtnActiva : {}) }}
              >
                <span style={{ ...s.letra, ...(elegida ? s.letraActiva : {}) }}>{LETRAS[i]}</span>
                <span>{op}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={siguiente}
        disabled={seleccion[pregunta.id] === undefined || enviando}
        style={s.nextBtn}
      >
        {idx + 1 < preguntas.length ? "Siguiente" : (enviando ? "Enviando..." : "Finalizar examen")}
      </button>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  progreso: { color: "#94A3B8", fontSize: 13 },
  timer: { fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  muted: { color: "#94A3B8", fontSize: 14, textAlign: "center", marginTop: 60 },
  error: { color: "#D1495B", fontSize: 14, textAlign: "center", marginTop: 60 },
  card: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 14, padding: 18, marginBottom: 16 },
  region: { color: "#4FC3D9", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 },
  pregunta: { fontSize: 16, lineHeight: 1.4, marginBottom: 16 },
  opciones: { display: "flex", flexDirection: "column", gap: 8 },
  opcionBtn: { display: "flex", alignItems: "center", gap: 10, background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "12px 14px", cursor: "pointer", textAlign: "left", color: "#F4F1EA", fontSize: 14 },
  opcionBtnActiva: { borderColor: "#4FC3D9", background: "rgba(79,195,217,0.1)" },
  letra: { width: 26, height: 26, borderRadius: 8, border: "1px solid rgba(244,241,233,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  letraActiva: { borderColor: "#4FC3D9", color: "#4FC3D9" },
  nextBtn: { width: "100%", background: "#4FC3D9", border: "none", borderRadius: 10, color: "#0E1526", padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer" },
};
                                             
