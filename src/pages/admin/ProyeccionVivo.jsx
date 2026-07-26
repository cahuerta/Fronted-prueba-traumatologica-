import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { casosVivoAdmin } from "../../api/client";

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
const LETRAS = ["A", "B", "C", "D", "E"];

export default function ProyeccionVivo() {
  const navigate = useNavigate();
  const { sesionId } = useParams();

  const [panel, setPanel] = useState(null);
  const [error, setError] = useState("");

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

  const estado = panel?.estado || "esperando";
  const tieneImagen = Boolean(panel?.media_url);

  const linkAlumno = panel?.codigo_acceso ? `${APP_URL}/alumno-vivo/${panel.codigo_acceso}` : "";
  const qrUrl = linkAlumno
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(linkAlumno)}`
    : "";

  const totalPresentes = panel?.asistencia?.total_presentes || 0;
  const totalVotos = panel?.resultados?.total || 0;
  const porcentajeVotado = totalPresentes > 0 ? totalVotos / totalPresentes : 0;
  const umbralAlcanzado = porcentajeVotado >= 0.5;

  // Con imagen: se muestra grande y sola hasta llegar al 50% de votos.
  // Sin imagen: se muestra pregunta+opciones de inmediato, no hay nada que mostrar grande.
  const esInicioAbsoluto = estado === "esperando" && panel?.caso_actual_orden === 1 && panel?.pregunta_actual_orden === 1;
  const mostrarSoloImagen = tieneImagen && (
    (estado === "votando" && !umbralAlcanzado) ||
    (estado === "esperando" && !esInicioAbsoluto)
  );
  const mostrarImagenChica = tieneImagen && (estado !== "votando" || umbralAlcanzado) && estado !== "esperando";

  if (error && !panel) {
    return (
      <div style={s.wrapCentrado}>
        <p style={s.error}>{error}</p>
      </div>
    );
  }

  if (!panel) {
    return (
      <div style={s.wrapCentrado}>
        <p style={s.muted}>Cargando...</p>
      </div>
    );
  }

  // Solo el arranque absoluto de la sesion (antes de abrir la primera
  // pregunta) muestra el QR. En "esperando" de preguntas siguientes -que
  // pasa cada vez que el admin avanza- ya no se repite el QR.
  if (esInicioAbsoluto || !panel.pregunta) {
    return (
      <div style={s.wrapCentrado}>
        {qrUrl ? (
          <div style={s.qrBox}>
            <img src={qrUrl} alt="QR de la sesión" style={s.qrImg} />
            <p style={s.codigoLabel}>Código de acceso</p>
            <p style={s.codigo}>{panel.codigo_acceso}</p>
          </div>
        ) : (
          <p style={s.esperando}>Esperando...</p>
        )}
      </div>
    );
  }

  if (mostrarSoloImagen) {
    return (
      <div style={s.wrapCentrado}>
        <img src={panel.media_url} alt="" style={s.imagenGrande} />
      </div>
    );
  }

  const maxVotos = Math.max(1, ...Object.values(panel?.resultados?.conteo || {}));

  return (
    <div style={s.wrap}>
      <div style={s.contenido}>
        {mostrarImagenChica && (
          <img src={panel.media_url} alt="" style={s.imagenChica} />
        )}

        <div style={s.preguntaBox}>
          <p style={s.pregunta}>{panel.pregunta}</p>

          <div style={s.opciones}>
            {panel.opciones?.map((op, i) => {
              const votos = panel?.resultados?.conteo?.[i] || 0;
              const anchoPct = Math.round((votos / maxVotos) * 100);
              const esCorrecta = estado === "cerrada" && panel.correcta === i;
              return (
                <div key={i} style={{ ...s.opcionRow, ...(esCorrecta ? s.opcionRowCorrecta : {}) }}>
                  <div style={s.opcionHeader}>
                    <span style={s.opcionLetra}>{LETRAS[i]}</span>
                    <span style={s.opcionTexto}>{op}</span>
                    <span style={s.opcionNumero}>{votos}</span>
                  </div>
                  <div style={s.barraFondo}>
                    <div style={{ ...s.barraLlena, width: `${anchoPct}%`, ...(esCorrecta ? s.barraLlenaCorrecta : {}) }} />
                  </div>
                </div>
              );
            })}
          </div>

          {estado === "cerrada" && panel.explicacion && (
            <div style={s.explicacionBox}>
              <p style={s.explicacionTitulo}>Fundamento</p>
              <p style={s.explicacionTexto}>{panel.explicacion}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { height: "100vh", width: "100vw", background: "#0E1526", color: "#F4F1EA", fontFamily: "sans-serif", padding: "32px 48px", boxSizing: "border-box", overflow: "hidden", display: "flex", alignItems: "center" },
  wrapCentrado: { height: "100vh", width: "100vw", background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, boxSizing: "border-box", overflow: "hidden" },

  muted: { color: "#94A3B8", fontSize: 20, textAlign: "center" },
  error: { color: "#D1495B", fontSize: 20, textAlign: "center" },
  esperando: { color: "#94A3B8", fontSize: 28 },

  imagenGrande: { maxWidth: "92vw", maxHeight: "92vh", borderRadius: 12, objectFit: "contain" },

  qrBox: { textAlign: "center" },
  qrImg: { width: "min(40vw, 40vh)", height: "min(40vw, 40vh)", borderRadius: 14, background: "#F4F1EA", padding: 14, marginBottom: 18 },
  codigoLabel: { fontSize: "1.4vw", color: "#94A3B8", margin: 0 },
  codigo: { fontSize: "3vw", fontWeight: 800, letterSpacing: 6, color: "#4FC3D9", margin: "6px 0 0" },

  contenido: { display: "flex", gap: 40, alignItems: "center", maxWidth: 1400, width: "100%", margin: "0 auto", maxHeight: "88vh" },
  imagenChica: { width: "26vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 12, background: "#000", flexShrink: 0 },

  preguntaBox: { flex: 1, minWidth: 0 },
  pregunta: { fontSize: "clamp(20px, 2.6vw, 34px)", fontWeight: 700, lineHeight: 1.25, margin: "0 0 24px" },

  opciones: { display: "flex", flexDirection: "column", gap: "1.4vh" },
  opcionRow: { background: "#16213A", border: "2px solid rgba(244,241,233,0.12)", borderRadius: 14, padding: "1.2vh 22px" },
  opcionRowCorrecta: { border: "2px solid #7FD98F", background: "rgba(127,217,143,0.08)" },
  opcionHeader: { display: "flex", alignItems: "center", gap: 16, marginBottom: 8 },
  opcionLetra: { width: 36, height: 36, borderRadius: "50%", background: "rgba(79,195,217,0.15)", color: "#4FC3D9", fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  opcionTexto: { flex: 1, fontSize: "clamp(14px, 1.6vw, 22px)" },
  opcionNumero: { fontSize: "clamp(16px, 1.8vw, 24px)", fontWeight: 800, color: "#4FC3D9", minWidth: 36, textAlign: "right" },
  barraFondo: { height: 12, background: "#0E1526", borderRadius: 8, overflow: "hidden" },
  barraLlena: { height: "100%", background: "#4FC3D9", borderRadius: 8, transition: "width 0.4s ease" },
  barraLlenaCorrecta: { background: "#7FD98F" },

  explicacionBox: { marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(244,241,233,0.15)" },
  explicacionTitulo: { fontSize: 13, color: "#4FC3D9", fontWeight: 700, textTransform: "uppercase", margin: "0 0 8px" },
  explicacionTexto: { fontSize: "clamp(13px, 1.3vw, 17px)", lineHeight: 1.5, margin: 0 },
};
