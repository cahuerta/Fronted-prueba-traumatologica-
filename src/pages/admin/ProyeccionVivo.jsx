import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { casosVivoAdmin, casosVivoAlumno } from "../../api/client";

const LETRAS = ["A", "B", "C", "D", "E"];

export default function ProyeccionVivo() {
  const navigate = useNavigate();
  const { sesionId } = useParams();

  const [sesion, setSesion] = useState(null);
  const [actual, setActual] = useState(null);
  const [resultados, setResultados] = useState({ total: 0, conteo: {} });
  const [totalPresentes, setTotalPresentes] = useState(0);
  const [error, setError] = useState("");

  const refrescar = useCallback(async () => {
    try {
      const nuevaSesion = await casosVivoAdmin.obtenerSesion(sesionId);
      setSesion(nuevaSesion);

      if (nuevaSesion.codigo_acceso) {
        const [est, res, asistencia] = await Promise.all([
          casosVivoAlumno.estadoActual(nuevaSesion.codigo_acceso),
          casosVivoAlumno.resultados(sesionId),
          casosVivoAdmin.verAsistenciaVivo(sesionId),
        ]);
        setActual(est);
        setResultados(res);
        setTotalPresentes(asistencia.total_presentes);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [sesionId]);

  useEffect(() => {
    refrescar();
    const intervalo = setInterval(refrescar, 2000);
    return () => clearInterval(intervalo);
  }, [refrescar]);

  const estado = actual?.estado || sesion?.estado || "esperando";
  const tieneImagen = Boolean(actual?.media_url);

  const porcentajeVotado = totalPresentes > 0 ? resultados.total / totalPresentes : 0;
  const umbralAlcanzado = porcentajeVotado >= 0.5;

  // Con imagen: se muestra grande y sola hasta llegar al 50% de votos.
  // Sin imagen: se muestra pregunta+opciones de inmediato, no hay nada que mostrar grande.
  const mostrarSoloImagen = tieneImagen && estado === "votando" && !umbralAlcanzado;
  const mostrarImagenChica = tieneImagen && (estado !== "votando" || umbralAlcanzado) && estado !== "esperando";

  if (error) {
    return (
      <div style={s.wrap}>
        <p style={s.error}>{error}</p>
      </div>
    );
  }

  if (!sesion || !actual) {
    return (
      <div style={s.wrap}>
        <p style={s.muted}>Cargando...</p>
      </div>
    );
  }

  if (estado === "esperando" || !actual.pregunta) {
    return (
      <div style={s.wrapCentrado}>
        {actual.caso && <p style={s.casoTitulo}>{actual.caso.titulo}</p>}
        {actual.caso?.media_url ? (
          <img src={actual.caso.media_url} alt="" style={s.imagenGrande} />
        ) : (
          <p style={s.esperando}>Esperando la siguiente pregunta...</p>
        )}
      </div>
    );
  }

  if (mostrarSoloImagen) {
    return (
      <div style={s.wrapCentrado}>
        <img src={actual.media_url} alt="" style={s.imagenGrande} />
      </div>
    );
  }

  const maxVotos = Math.max(1, ...Object.values(resultados.conteo || {}));

  return (
    <div style={s.wrap}>
      <div style={s.contenido}>
        {mostrarImagenChica && (
          <img src={actual.media_url} alt="" style={s.imagenChica} />
        )}

        <div style={s.preguntaBox}>
          <p style={s.pregunta}>{actual.pregunta}</p>

          <div style={s.opciones}>
            {actual.opciones?.map((op, i) => {
              const votos = resultados.conteo?.[i] || 0;
              const anchoPct = Math.round((votos / maxVotos) * 100);
              const esCorrecta = estado === "cerrada" && actual.correcta === i;
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

          {estado === "cerrada" && actual.explicacion && (
            <div style={s.explicacionBox}>
              <p style={s.explicacionTitulo}>Fundamento</p>
              <p style={s.explicacionTexto}>{actual.explicacion}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", width: "100vw", background: "#0E1526", color: "#F4F1EA", fontFamily: "sans-serif", padding: "48px 60px", boxSizing: "border-box" },
  wrapCentrado: { minHeight: "100vh", width: "100vw", background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, boxSizing: "border-box" },

  muted: { color: "#94A3B8", fontSize: 20, textAlign: "center" },
  error: { color: "#D1495B", fontSize: 20, textAlign: "center" },
  esperando: { color: "#94A3B8", fontSize: 28 },

  casoTitulo: { color: "#F4F1EA", fontSize: 32, fontWeight: 700, marginBottom: 24, textAlign: "center" },
  imagenGrande: { maxWidth: "92vw", maxHeight: "82vh", borderRadius: 12, objectFit: "contain" },

  contenido: { display: "flex", gap: 48, alignItems: "flex-start", maxWidth: 1400, margin: "0 auto" },
  imagenChica: { width: 340, maxHeight: "70vh", objectFit: "contain", borderRadius: 12, background: "#000", flexShrink: 0 },

  preguntaBox: { flex: 1, minWidth: 0 },
  pregunta: { fontSize: 34, fontWeight: 700, lineHeight: 1.3, margin: "0 0 32px" },

  opciones: { display: "flex", flexDirection: "column", gap: 20 },
  opcionRow: { background: "#16213A", border: "2px solid rgba(244,241,233,0.12)", borderRadius: 14, padding: "18px 22px" },
  opcionRowCorrecta: { border: "2px solid #7FD98F", background: "rgba(127,217,143,0.08)" },
  opcionHeader: { display: "flex", alignItems: "center", gap: 16, marginBottom: 12 },
  opcionLetra: { width: 40, height: 40, borderRadius: "50%", background: "rgba(79,195,217,0.15)", color: "#4FC3D9", fontWeight: 800, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  opcionTexto: { flex: 1, fontSize: 24 },
  opcionNumero: { fontSize: 26, fontWeight: 800, color: "#4FC3D9", minWidth: 40, textAlign: "right" },
  barraFondo: { height: 16, background: "#0E1526", borderRadius: 8, overflow: "hidden" },
  barraLlena: { height: "100%", background: "#4FC3D9", borderRadius: 8, transition: "width 0.4s ease" },
  barraLlenaCorrecta: { background: "#7FD98F" },

  explicacionBox: { marginTop: 32, paddingTop: 28, borderTop: "1px solid rgba(244,241,233,0.15)" },
  explicacionTitulo: { fontSize: 16, color: "#4FC3D9", fontWeight: 700, textTransform: "uppercase", margin: "0 0 10px" },
  explicacionTexto: { fontSize: 20, lineHeight: 1.6, margin: 0 },
};
          
