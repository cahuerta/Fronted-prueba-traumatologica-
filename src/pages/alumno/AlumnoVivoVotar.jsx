import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { casosVivoAlumno } from "../../api/client";

export default function AlumnoVivoVotar() {
  const navigate = useNavigate();
  const { codigo } = useParams();

  const alumnoId = localStorage.getItem("vivo_alumno_id");
  const sesionId = localStorage.getItem("vivo_sesion_id");

  const [actual, setActual] = useState(null);
  const [yaVoto, setYaVoto] = useState(false);
  const [votando, setVotando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!alumnoId || !sesionId) {
      navigate(`/alumno-vivo/${codigo}`);
    }
  }, [alumnoId, sesionId, codigo, navigate]);

  const refrescar = useCallback(async () => {
    try {
      const data = await casosVivoAlumno.estadoActual(codigo);
      setActual((prev) => {
        // Si cambio la pregunta, resetear el estado de "ya voto"
        if (prev && prev.pregunta_id !== data.pregunta_id) {
          setYaVoto(false);
        }
        return data;
      });
    } catch (err) {
      setError(err.message);
    }
  }, [codigo]);

  useEffect(() => {
    refrescar();
    const intervalo = setInterval(refrescar, 2000);
    return () => clearInterval(intervalo);
  }, [refrescar]);

  async function handleVotar(opcion) {
    setError("");
    setVotando(true);
    try {
      await casosVivoAlumno.votar(sesionId, alumnoId, actual.pregunta_id, opcion);
      setYaVoto(true);
    } catch (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes("ya voto")) setYaVoto(true);
    } finally {
      setVotando(false);
    }
  }

  if (!actual) {
    return (
      <div style={s.wrap}>
        <p style={s.muted}>Cargando...</p>
      </div>
    );
  }

  const estado = actual.estado;

  return (
    <div style={s.wrap}>
      {actual.caso && (
        <div style={s.casoBox}>
          <p style={s.casoTitulo}>{actual.caso.titulo}</p>
          {estado === "esperando" && actual.pregunta_actual_orden === 1 && (
            <>
              <p style={s.vineta}>{actual.caso.vineta_clinica}</p>
              {actual.caso.media_url && (
                <div style={s.mediaWrap}>
                  {actual.caso.media_tipo === "video" ? (
                    <video src={actual.caso.media_url} controls style={s.media} />
                  ) : (
                    <img src={actual.caso.media_url} alt="" style={s.media} />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {estado === "esperando" && (
        <p style={s.esperando}>Esperando que el profesor abra la votación...</p>
      )}

      {actual.pregunta && estado !== "esperando" && (
        <>
          <p style={s.pregunta}>{actual.pregunta}</p>

          {actual.media_url && (
            <div style={s.mediaWrap}>
              {actual.media_tipo === "video" ? (
                <video src={actual.media_url} controls style={s.media} />
              ) : (
                <img src={actual.media_url} alt="" style={s.media} />
              )}
            </div>
          )}

          <div style={s.opciones}>
            {actual.opciones?.map((op, i) => {
              const esCorrecta = estado === "cerrada" && actual.correcta === i;
              const deshabilitado = estado !== "votando" || yaVoto || votando;
              return (
                <button
                  key={i}
                  onClick={() => handleVotar(i)}
                  disabled={deshabilitado}
                  style={{
                    ...s.opcion,
                    ...(esCorrecta ? s.opcionCorrecta : {}),
                    ...(deshabilitado && estado === "votando" ? s.opcionDeshabilitada : {}),
                  }}
                >
                  {op}
                </button>
              );
            })}
          </div>

          {estado === "votando" && yaVoto && (
            <p style={s.aviso}>Voto registrado. Esperando al resto...</p>
          )}
          {estado === "discusion" && (
            <p style={s.aviso}>Votación cerrada. Se viene la discusión en clase.</p>
          )}
          {estado === "cerrada" && actual.explicacion && (
            <div style={s.explicacionBox}>
              <p style={s.explicacionTitulo}>Fundamento</p>
              <p style={s.explicacionTexto}>{actual.explicacion}</p>
            </div>
          )}
        </>
      )}

      {error && <p style={s.error}>{error}</p>}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "24px 18px 40px", fontFamily: "sans-serif" },
  muted: { color: "#94A3B8", fontSize: 14, textAlign: "center", marginTop: 60 },
  casoBox: { marginBottom: 20 },
  casoTitulo: { fontSize: 17, fontWeight: 700, margin: "0 0 8px" },
  vineta: { fontSize: 14, color: "#C7CDD9", lineHeight: 1.5, margin: 0 },
  mediaWrap: { marginTop: 12, marginBottom: 12 },
  media: { width: "100%", maxHeight: 320, borderRadius: 10, background: "#000", objectFit: "cover" },
  esperando: { color: "#94A3B8", fontSize: 15, textAlign: "center", marginTop: 40 },
  pregunta: { fontSize: 17, fontWeight: 600, lineHeight: 1.4, margin: "0 0 12px" },
  opciones: { display: "flex", flexDirection: "column", gap: 10, marginTop: 12 },
  opcion: { background: "#16213A", border: "1px solid rgba(244,241,233,0.15)", borderRadius: 10, color: "#F4F1EA", padding: "14px 16px", fontSize: 15, textAlign: "left", cursor: "pointer" },
  opcionDeshabilitada: { opacity: 0.5 },
  opcionCorrecta: { border: "2px solid #7FD98F", background: "rgba(127,217,143,0.1)" },
  aviso: { color: "#4FC3D9", fontSize: 14, textAlign: "center", marginTop: 16 },
  explicacionBox: { marginTop: 20, background: "#16213A", borderRadius: 10, padding: 16 },
  explicacionTitulo: { fontSize: 11, color: "#4FC3D9", fontWeight: 700, textTransform: "uppercase", margin: "0 0 6px" },
  explicacionTexto: { fontSize: 14, lineHeight: 1.6, margin: 0 },
  error: { color: "#D1495B", fontSize: 13, marginTop: 12, textAlign: "center" },
};
           
