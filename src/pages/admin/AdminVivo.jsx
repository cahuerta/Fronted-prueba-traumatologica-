import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { casosVivoAdmin } from "../../api/client";

const ESTADO_LABEL = {
  esperando: "Esperando",
  presentando: "Presentando caso",
  votando: "Votación abierta",
  discusion: "En discusión",
  cerrada: "Respuesta revelada",
};

const ACCION_LABEL = {
  presentando: "Abrir votación",
  votando: "Cerrar votación",
  discusion: "Revelar respuesta",
  cerrada: "Siguiente pregunta",
};

const ACCION_SIMBOLO = {
  presentando: "▶",
  votando: "⏹",
  discusion: "✓",
  cerrada: "→",
};

const ACCION_KEY = {
  presentando: "abrir_votacion",
  votando: "cerrar_votacion",
  discusion: "revelar",
  cerrada: "siguiente",
};

export default function AdminVivo() {
  const navigate = useNavigate();
  const { sesionId } = useParams();

  const [panel, setPanel] = useState(null);
  const [error, setError] = useState("");
  const [procesando, setProcesando] = useState(false);

  const refrescar = useCallback(async () => {
    try {
      const data = await casosVivoAdmin.panelSesion(sesionId);
      setPanel(data);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [sesionId]);

  useEffect(() => {
    refrescar();
    const intervalo = setInterval(refrescar, 2000);
    return () => clearInterval(intervalo);
  }, [refrescar]);

  async function ejecutarAccion(accion) {
    setError("");
    setProcesando(true);
    try {
      const resultado = await casosVivoAdmin.accionSesion(sesionId, accion);

      // Si "siguiente" avanzo a otra pregunta DENTRO del mismo caso (no la
      // primera de un caso nuevo), abrimos la votacion de inmediato sin
      // esperar un segundo click: solo la primera pregunta de cada caso
      // requiere el paso manual de "Mostrar caso" + "Abrir votación".
      if (
        accion === "siguiente" &&
        !resultado?.finalizada &&
        resultado?.pregunta_actual_orden !== 1
      ) {
        await casosVivoAdmin.accionSesion(sesionId, "abrir_votacion");
      }

      await refrescar();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  const estado = panel?.estado || "esperando";
  const resultados = panel?.resultados || { total: 0, conteo: {} };
  const asistencia = panel?.asistencia || { total_presentes: 0, total_habilitados: 0 };
  const thumbUrl = panel?.media_url || panel?.caso?.media_url;

  const totalPresentes = asistencia.total_presentes || 0;
  const totalHabilitados = asistencia.total_habilitados || 0;
  const totalVotos = resultados.total || 0;
  const pctVotado = totalPresentes > 0 ? Math.min(100, Math.round((totalVotos / totalPresentes) * 100)) : 0;
  const pctAsistencia = totalHabilitados > 0 ? Math.min(100, Math.round((totalPresentes / totalHabilitados) * 100)) : 0;

  // Arranque absoluto de la sesion: primera pregunta del primer caso, sin
  // haber mostrado nada todavia. Aca se ve la asistencia (presentes vs.
  // habilitados) en vez de la pregunta.
  const esInicioSesion =
    estado === "esperando" &&
    panel?.caso_actual_orden === 1 &&
    panel?.pregunta_actual_orden === 1;

  // Arranque de un caso NUEVO (caso 2, 3...), primera pregunta, todavia sin
  // mostrar la vineta. Ya no hace falta la asistencia (ya se trackeo al
  // inicio de la sesion), solo el boton para mostrar el caso.
  const esInicioCaso =
    estado === "esperando" &&
    panel?.pregunta_actual_orden === 1 &&
    !esInicioSesion;

  if (esInicioSesion) {
    return (
      <div style={s.wrap}>
        <div style={s.topBar}>
          <button onClick={() => navigate(-1)} style={s.back}>‹</button>
          <span style={s.estadoBadge}>● {ESTADO_LABEL.esperando}</span>
        </div>

        <div style={s.asistenciaWrap}>
          <p style={s.asistenciaTitulo}>Asistencia</p>

          <div style={s.asistenciaNumeros}>
            <span style={s.asistenciaPresentes}>{totalPresentes}</span>
            <span style={s.asistenciaSeparador}>/</span>
            <span style={s.asistenciaTotal}>{totalHabilitados}</span>
          </div>
          <p style={s.asistenciaLabel}>han ingresado con el código</p>

          <div style={s.asistenciaBarraFondo}>
            <div style={{ ...s.asistenciaBarraLlena, width: `${pctAsistencia}%` }} />
          </div>

          {error && <p style={s.errorTexto}>{error}</p>}
        </div>

        <div style={s.controlWrap}>
          <button
            onClick={() => ejecutarAccion("mostrar_caso")}
            disabled={procesando}
            style={s.controlBtn}
          >
            <span style={s.controlBtnSimbolo}>{procesando ? "…" : "▶"}</span>
            <span style={s.controlBtnTexto}>
              {procesando ? "Procesando" : "Mostrar caso"}
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (esInicioCaso) {
    return (
      <div style={s.wrap}>
        <div style={s.topBar}>
          <button onClick={() => navigate(-1)} style={s.back}>‹</button>
          <span style={s.estadoBadge}>● {ESTADO_LABEL.esperando}</span>
          <span style={s.posicion}>C{panel.caso_actual_orden}</span>
        </div>

        <div style={s.casoNuevoWrap}>
          <p style={s.casoNuevoTitulo}>Caso siguiente listo</p>
          {error && <p style={s.errorTexto}>{error}</p>}
        </div>

        <div style={s.controlWrap}>
          <button
            onClick={() => ejecutarAccion("mostrar_caso")}
            disabled={procesando}
            style={s.controlBtn}
          >
            <span style={s.controlBtnSimbolo}>{procesando ? "…" : "▶"}</span>
            <span style={s.controlBtnTexto}>
              {procesando ? "Procesando" : "Mostrar caso"}
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (estado === "presentando") {
    return (
      <div style={s.wrap}>
        <div style={s.topBar}>
          <button onClick={() => navigate(-1)} style={s.back}>‹</button>
          <span style={s.estadoBadge}>● {ESTADO_LABEL.presentando}</span>
          <span style={s.posicion}>C{panel.caso_actual_orden}·P{panel.pregunta_actual_orden}</span>
        </div>

        <div style={s.casoNuevoWrap}>
          <p style={s.casoNuevoTitulo}>Mostrando el caso en proyección</p>
          {error && <p style={s.errorTexto}>{error}</p>}
        </div>

        <div style={s.controlWrap}>
          <button
            onClick={() => ejecutarAccion("abrir_votacion")}
            disabled={procesando}
            style={s.controlBtn}
          >
            <span style={s.controlBtnSimbolo}>{procesando ? "…" : "▶"}</span>
            <span style={s.controlBtnTexto}>
              {procesando ? "Procesando" : "Abrir votación"}
            </span>
          </button>
        </div>
      </div>
    );
  }

  // "esperando" con pregunta > 1 es transitorio (el auto-encadenado lo
  // saca de aca casi de inmediato); solo por si la red se demora un poco.
  if (estado === "esperando") {
    return (
      <div style={s.wrap}>
        <div style={s.topBar}>
          <button onClick={() => navigate(-1)} style={s.back}>‹</button>
          <span style={s.estadoBadge}>● {ESTADO_LABEL.esperando}</span>
        </div>
        <p style={s.muted}>Abriendo la siguiente votación...</p>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.topBar}>
        <button onClick={() => navigate(-1)} style={s.back}>‹</button>
        <span style={{ ...s.estadoBadge, ...(estado === "votando" ? s.estadoBadgeActiva : {}) }}>
          ● {ESTADO_LABEL[estado] || estado}
        </span>
        {panel?.pregunta && (
          <span style={s.posicion}>C{panel.caso_actual_orden}·P{panel.pregunta_actual_orden}</span>
        )}
      </div>

      {/* DATO PROTAGONISTA: cuántos han votado de los presentes — lo que decide cuándo cortar.
          A la derecha, caja de tamaño fijo: foto o mensaje de error, nunca ambos a la vez,
          para que el layout no se mueva al aparecer/desaparecer cualquiera de los dos. */}
      <div style={s.heroRow}>
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

        <div style={s.heroSide}>
          {error ? (
            <span style={s.heroSideError} title={error}>⚠</span>
          ) : thumbUrl ? (
            <img src={thumbUrl} alt="" style={s.thumb} />
          ) : null}
        </div>
      </div>

      {panel?.pregunta ? (
        <div style={s.preguntaBox}>
          <div style={s.preguntaCaja}>
            <p style={s.pregunta}>{panel.pregunta}</p>
          </div>

          <div style={s.opciones}>
            {panel.opciones?.map((op, i) => {
              const votosOpcion = resultados.conteo?.[i] || 0;
              const esCorrecta = estado === "cerrada" && panel.correcta === i;
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

      {panel?.pregunta && (
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

  heroRow: { display: "flex", gap: 10, marginBottom: "1vh", flexShrink: 0 },
  heroBox: { background: "#16213A", border: "2px solid rgba(79,195,217,0.4)", borderRadius: 16, padding: "1.4vh 18px", flex: 1, minWidth: 0 },
  heroNumeros: { display: "flex", alignItems: "baseline", gap: 6, marginBottom: "0.8vh" },
  heroVotos: { fontSize: "clamp(38px, 8vh, 56px)", fontWeight: 900, color: "#4FC3D9", lineHeight: 1 },
  heroSeparador: { fontSize: "clamp(24px, 5vh, 34px)", fontWeight: 700, color: "#94A3B8" },
  heroPresentes: { fontSize: "clamp(24px, 5vh, 34px)", fontWeight: 700, color: "#F4F1EA" },
  heroLabel: { fontSize: 15, color: "#94A3B8", fontWeight: 700, marginLeft: 4 },
  heroBarraFondo: { height: 14, background: "#0E1526", borderRadius: 8, overflow: "hidden" },
  heroBarraLlena: { height: "100%", background: "#4FC3D9", borderRadius: 8, transition: "width 0.4s ease" },

  heroSide: { width: 66, flexShrink: 0, borderRadius: 14, background: "#16213A", border: "1px solid rgba(244,241,233,0.15)", display: "flex", alignItems: "center", justifyContent: "center" },
  heroSideError: { fontSize: 30, color: "#D1495B", cursor: "help" },
  thumb: { width: "100%", height: "100%", borderRadius: 13, objectFit: "cover" },

  muted: { color: "#94A3B8", fontSize: 14 },

  preguntaBox: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 14, padding: "1.6vh 16px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" },
  preguntaCaja: { display: "flex", alignItems: "center", gap: 10, marginBottom: "1.2vh", flexShrink: 0, border: "1px solid rgba(244,241,233,0.25)", borderRadius: 10, padding: "1vh 12px" },
  pregunta: { fontSize: "clamp(16px, 2.4vh, 20px)", fontWeight: 800, margin: 0, color: "#F4F1EA", lineHeight: 1.25, flex: 1 },

  opciones: { display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 },
  opcion: { flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "0 16px", cursor: "pointer", textAlign: "left", width: "100%", boxSizing: "border-box" },
  opcionCorrecta: { border: "2px solid #7FD98F", background: "rgba(127,217,143,0.08)" },
  opcionTexto: { fontSize: "clamp(16px, 2.6vh, 21px)", color: "#F4F1EA", lineHeight: 1.2 },
  opcionVotos: { fontSize: "clamp(18px, 2.8vh, 26px)", fontWeight: 800, color: "#4FC3D9", minWidth: 36, textAlign: "center", flexShrink: 0 },

  controlWrap: { flexShrink: 0, paddingTop: "0.6vh" },
  controlBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", background: "#4FC3D9", border: "none", borderRadius: 12, padding: "1.1vh 0", cursor: "pointer" },
  controlBtnSimbolo: { fontSize: 18, fontWeight: 900, color: "#0E1526" },
  controlBtnTexto: { fontSize: 15, fontWeight: 800, color: "#0E1526" },

  asistenciaWrap: { flex: 1, minHeight: 0, background: "#16213A", border: "2px solid rgba(79,195,217,0.4)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3vh 20px", textAlign: "center" },
  asistenciaTitulo: { fontSize: 15, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2vh" },
  asistenciaNumeros: { display: "flex", alignItems: "baseline", gap: 8 },
  asistenciaPresentes: { fontSize: "clamp(56px, 14vh, 96px)", fontWeight: 900, color: "#4FC3D9", lineHeight: 1 },
  asistenciaSeparador: { fontSize: "clamp(30px, 7vh, 48px)", fontWeight: 700, color: "#94A3B8" },
  asistenciaTotal: { fontSize: "clamp(30px, 7vh, 48px)", fontWeight: 700, color: "#F4F1EA" },
  asistenciaLabel: { fontSize: 14, color: "#94A3B8", fontWeight: 700, margin: "1vh 0 3vh" },
  asistenciaBarraFondo: { width: "100%", maxWidth: 360, height: 14, background: "#0E1526", borderRadius: 8, overflow: "hidden" },
  asistenciaBarraLlena: { height: "100%", background: "#4FC3D9", borderRadius: 8, transition: "width 0.4s ease" },
  errorTexto: { color: "#D1495B", fontSize: 13, marginTop: "2vh" },

  casoNuevoWrap: { flex: 1, minHeight: 0, background: "#16213A", border: "2px solid rgba(79,195,217,0.4)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3vh 20px", textAlign: "center" },
  casoNuevoTitulo: { fontSize: 15, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, margin: 0 },
  casoNuevoNombre: { fontSize: "clamp(20px, 3.4vh, 30px)", fontWeight: 800, color: "#F4F1EA", margin: "1.4vh 0 0" },
};
        
