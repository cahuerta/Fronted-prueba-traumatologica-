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

  const [empezado, setEmpezado] = useState(false);
  const [warning, setWarning] = useState(null); // { salidas, maxSalidas, ultima }

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const timerIniciado = useRef(false);
  const registrandoSalida = useRef(false);

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

  // ---------------- Detección de salida (cambio de pestaña/app) ----------------
  useEffect(() => {
    if (!empezado) return;

    async function handleVisibilityChange() {
      if (document.hidden && !registrandoSalida.current && instanciaId) {
        registrandoSalida.current = true;
        try {
          const res = await examen.registrarSalida(instanciaId);
          if (res.finalizado) {
            sessionStorage.setItem(`resultado_${sesionId}`, JSON.stringify(res.resultado));
            navigate(`/alumno/${sesionId}/resultado`);
          } else {
            setWarning({ salidas: res.salidas, maxSalidas: res.max_salidas, ultima: res.salidas === res.max_salidas - 1 });
          }
        } catch (err) {
          // si falla el registro, no bloqueamos al alumno
        } finally {
          registrandoSalida.current = false;
        }
      }
    }

    function handleBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = "";
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [empezado, instanciaId, sesionId]);

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

  async function handleComenzar() {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      // si el navegador no permite pantalla completa, igual dejamos avanzar
    }
    setEmpezado(true);
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

  function irA(i) {
    setIdx(i);
    setMenuAbierto(false);
  }

  function atras() {
    if (idx > 0) setIdx(idx - 1);
  }

  function avanzar() {
    if (idx + 1 < preguntas.length) setIdx(idx + 1);
  }

  async function handleFinalizar() {
    if (enviando) return;
    setEnviando(true);
    try {
      const res = await examen.finalizar(instanciaId);
      sessionStorage.setItem(`resultado_${sesionId}`, JSON.stringify(res));
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
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

  if (!empezado) {
    return (
      <div style={s.wrap}>
        <div style={s.startCard}>
          <h1 style={s.startTitle}>Antes de comenzar</h1>
          <p style={s.startText}>
            El examen se rinde en pantalla completa. Salir de la aplicación o cambiar de pestaña queda
            registrado como advertencia — a la 3ª vez el examen se finaliza automáticamente con lo ya respondido.
            Puedes navegar libremente entre preguntas y cambiar tus respuestas hasta finalizar.
          </p>
          <button onClick={handleComenzar} style={s.nextBtn}>Comenzar examen</button>
        </div>
      </div>
    );
  }

  const pregunta = preguntas[idx];
  const min = segundosRestantes !== null ? Math.floor(segundosRestantes / 60) : null;
  const seg = segundosRestantes !== null ? segundosRestantes % 60 : null;
  const respondidas = Object.keys(seleccion).length;
  const sinResponder = preguntas.length - respondidas;

  return (
    <div style={s.wrap}>
      {warning && (
        <div style={s.warningBanner}>
          ⚠ Saliste del examen ({warning.salidas}/{warning.maxSalidas}).
          {warning.ultima ? " Última advertencia: la próxima vez se finaliza automáticamente." : ""}
          <button onClick={() => setWarning(null)} style={s.warningClose}>✕</button>
        </div>
      )}

      <div style={s.header}>
        <button onClick={() => setMenuAbierto(true)} style={s.menuBtn}>☰ Preguntas</button>
        <span style={s.progreso}>{idx + 1} / {preguntas.length}</span>
        {segundosRestantes !== null && (
          <span style={{ ...s.timer, color: segundosRestantes < 60 ? "#D1495B" : "#F4F1EA" }}>
            {min}:{String(seg).padStart(2, "0")}
          </span>
        )}
      </div>

      <div style={s.card}>
        <p style={s.region}>{pregunta.region}</p>

        {pregunta.media_url && pregunta.media_tipo === "foto" && (
          <img src={pregunta.media_url} alt="" style={s.media} />
        )}
        {pregunta.media_url && pregunta.media_tipo === "video" && (
          <video src={pregunta.media_url} controls style={s.media} />
        )}

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

      <div style={s.navRow}>
        <button onClick={atras} disabled={idx === 0} style={{ ...s.navBtn, opacity: idx === 0 ? 0.4 : 1 }}>‹ Atrás</button>
        <button onClick={avanzar} disabled={idx === preguntas.length - 1} style={{ ...s.navBtn, opacity: idx === preguntas.length - 1 ? 0.4 : 1 }}>Avanzar ›</button>
      </div>

      {/* ---------------- Menú lateral de preguntas ---------------- */}
      {menuAbierto && (
        <div style={s.overlay} onClick={() => setMenuAbierto(false)}>
          <div style={s.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={s.drawerHeader}>
              <p style={s.drawerTitle}>Preguntas</p>
              <button onClick={() => setMenuAbierto(false)} style={s.drawerClose}>✕</button>
            </div>

            <p style={s.drawerResumen}>{respondidas} respondidas · {sinResponder} sin responder</p>

            <div style={s.grid}>
              {preguntas.map((p, i) => {
                const resp = seleccion[p.id] !== undefined;
                const actual = i === idx;
                return (
                  <button
                    key={p.id}
                    onClick={() => irA(i)}
                    style={{
                      ...s.gridItem,
                      ...(resp ? s.gridItemResp : {}),
                      ...(actual ? s.gridItemActual : {}),
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <button onClick={() => { setMenuAbierto(false); setConfirmando(true); }} style={s.finalizarBtn}>
              Finalizar examen
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Confirmación antes de finalizar ---------------- */}
      {confirmando && (
        <div style={s.overlay}>
          <div style={s.confirmCard}>
            <h2 style={s.confirmTitle}>¿Finalizar el examen?</h2>
            <div style={s.confirmResumen}>
              <p style={s.confirmLinea}><span style={s.confirmOk}>{respondidas}</span> preguntas respondidas</p>
              <p style={s.confirmLinea}><span style={s.confirmWarn}>{sinResponder}</span> preguntas sin responder</p>
            </div>
            {sinResponder > 0 && (
              <p style={s.confirmAviso}>Las preguntas sin responder no suman ni restan puntaje. Si no sabes, es mejor omitir que adivinar.</p>
            )}
            <div style={s.confirmBtnRow}>
              <button onClick={() => setConfirmando(false)} style={s.confirmCancelBtn}>Seguir respondiendo</button>
              <button onClick={handleFinalizar} disabled={enviando} style={s.confirmFinalBtn}>
                {enviando ? "Enviando..." : "Sí, finalizar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10 },
  menuBtn: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, color: "#F4F1EA", padding: "8px 12px", fontSize: 13, cursor: "pointer" },
  progreso: { color: "#94A3B8", fontSize: 13 },
  timer: { fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  muted: { color: "#94A3B8", fontSize: 14, textAlign: "center", marginTop: 60 },
  error: { color: "#D1495B", fontSize: 14, textAlign: "center", marginTop: 60 },
  card: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 14, padding: 18, marginBottom: 16 },
  region: { color: "#4FC3D9", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 },
  media: { width: "100%", borderRadius: 10, marginBottom: 14, background: "#000" },
  pregunta: { fontSize: 16, lineHeight: 1.4, marginBottom: 16 },
  opciones: { display: "flex", flexDirection: "column", gap: 8 },
  opcionBtn: { display: "flex", alignItems: "center", gap: 10, background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "12px 14px", cursor: "pointer", textAlign: "left", color: "#F4F1EA", fontSize: 14 },
  opcionBtnActiva: { borderColor: "#4FC3D9", background: "rgba(79,195,217,0.1)" },
  letra: { width: 26, height: 26, borderRadius: 8, border: "1px solid rgba(244,241,233,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  letraActiva: { borderColor: "#4FC3D9", color: "#4FC3D9" },
  navRow: { display: "flex", gap: 8 },
  navBtn: { flex: 1, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, color: "#F4F1EA", padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  nextBtn: { width: "100%", background: "#4FC3D9", border: "none", borderRadius: 10, color: "#0E1526", padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer" },
  startCard: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 16, padding: 26, maxWidth: 380, margin: "60px auto 0" },
  startTitle: { fontSize: 18, marginBottom: 12, textAlign: "center" },
  startText: { color: "#94A3B8", fontSize: 13.5, lineHeight: 1.5, marginBottom: 20, textAlign: "center" },
  warningBanner: { background: "rgba(224,121,62,0.15)", border: "1px solid #E0793E", color: "#E0793E", borderRadius: 10, padding: "10px 36px 10px 12px", fontSize: 13, marginBottom: 14, position: "relative" },
  warningClose: { position: "absolute", right: 10, top: 8, background: "none", border: "none", color: "#E0793E", fontSize: 14, cursor: "pointer" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", zIndex: 50 },
  drawer: { width: "82%", maxWidth: 320, height: "100%", background: "#0E1526", borderRight: "1px solid rgba(244,241,233,0.12)", padding: "20px 16px", display: "flex", flexDirection: "column" },
  drawerHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  drawerTitle: { fontSize: 16, fontWeight: 700, margin: 0 },
  drawerClose: { background: "none", border: "none", color: "#94A3B8", fontSize: 18, cursor: "pointer" },
  drawerResumen: { color: "#94A3B8", fontSize: 12, marginBottom: 16 },
  grid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, overflowY: "auto", flex: 1, alignContent: "start" },
  gridItem: { aspectRatio: "1", borderRadius: 8, border: "1px solid rgba(244,241,233,0.15)", background: "#16213A", color: "#94A3B8", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  gridItemResp: { background: "rgba(79,195,217,0.14)", borderColor: "#4FC3D9", color: "#4FC3D9" },
  gridItemActual: { borderColor: "#F4F1EA", borderWidth: 2, color: "#F4F1EA" },
  finalizarBtn: { marginTop: 16, background: "#D1495B", border: "none", borderRadius: 10, color: "#F4F1EA", padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" },

  confirmCard: { margin: "auto", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 16, padding: 24, maxWidth: 340, width: "90%" },
  confirmTitle: { fontSize: 17, marginBottom: 16, textAlign: "center" },
  confirmResumen: { marginBottom: 14 },
  confirmLinea: { fontSize: 14, margin: "6px 0", textAlign: "center" },
  confirmOk: { color: "#7FB685", fontWeight: 700 },
  confirmWarn: { color: "#E0793E", fontWeight: 700 },
  confirmAviso: { color: "#94A3B8", fontSize: 12.5, lineHeight: 1.4, textAlign: "center", marginBottom: 18 },
  confirmBtnRow: { display: "flex", flexDirection: "column", gap: 8 },
  confirmCancelBtn: { background: "transparent", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 10, color: "#F4F1EA", padding: "12px 0", fontSize: 14, cursor: "pointer" },
  confirmFinalBtn: { background: "#D1495B", border: "none", borderRadius: 10, color: "#F4F1EA", padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" },
};
