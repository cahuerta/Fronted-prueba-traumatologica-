import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { sesiones } from "../../api/client";

const PAQUETES = [
  { key: "agil", label: "Ágil", desc: "80 preguntas · 50 min" },
  { key: "estandar", label: "Estándar", desc: "60 preguntas · 70 min" },
  { key: "exigente", label: "Exigente", desc: "40 preguntas · 90 min" },
];

export default function AlumnoEspera() {
  const { sesionId } = useParams();
  const navigate = useNavigate();
  const alumnoId = sessionStorage.getItem(`alumno_id_${sesionId}`);

  const [sesion, setSesion] = useState(null);
  const [yaVoto, setYaVoto] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!alumnoId) {
      navigate(`/alumno/${sesionId}`);
      return;
    }
    cargar();
    const interval = setInterval(cargar, 3000);
    return () => clearInterval(interval);
  }, [sesionId]);

  async function cargar() {
    try {
      // Endpoint público de solo lectura del estado de la sesión
      const API_URL = import.meta.env.VITE_API_URL;
      const res = await fetch(`${API_URL}/sesiones/${sesionId}/alumnos`);
      // usamos ver estado vía encuesta/asistencia que ya son públicos; si existe /sesiones/{id} público, se ajusta después
      const ses = await sesiones.ver(sesionId).catch(() => null);
      if (ses) setSesion(ses);
      if (ses?.estado === "en_curso") {
        navigate(`/alumno/${sesionId}/examen`);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleVotar(paquete) {
    setError("");
    try {
      await sesiones.votar(sesionId, alumnoId, paquete);
      setYaVoto(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <h1 style={s.title}>Estás dentro</h1>

        {error && <p style={s.error}>{error}</p>}

        {(!sesion || sesion.estado === "asistencia") && (
          <p style={s.muted}>Esperando a que el docente abra la encuesta...</p>
        )}

        {sesion?.estado === "encuesta" && !yaVoto && (
          <>
            <p style={s.pregunta}>¿Qué modalidad de examen prefieres?</p>
            {PAQUETES.map((p) => (
              <button key={p.key} onClick={() => handleVotar(p.key)} style={s.opcionBtn}>
                <span style={s.opcionLabel}>{p.label}</span>
                <span style={s.opcionDesc}>{p.desc}</span>
              </button>
            ))}
          </>
        )}

        {sesion?.estado === "encuesta" && yaVoto && (
          <p style={s.muted}>Voto registrado. Esperando a que el docente cierre la encuesta...</p>
        )}

        {sesion?.estado === "en_curso" && (
          <p style={s.muted}>El examen está por comenzar...</p>
        )}
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0E1526", padding: 20 },
  card: { width: "100%", maxWidth: 380, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 16, padding: 28 },
  title: { color: "#F4F1EA", fontSize: 19, fontWeight: 700, marginBottom: 16, textAlign: "center" },
  muted: { color: "#94A3B8", fontSize: 13.5, textAlign: "center" },
  error: { color: "#D1495B", fontSize: 13, marginBottom: 12, textAlign: "center" },
  pregunta: { color: "#F4F1EA", fontSize: 14, marginBottom: 14, textAlign: "center" },
  opcionBtn: { width: "100%", display: "flex", flexDirection: "column", background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer", textAlign: "left" },
  opcionLabel: { color: "#F4F1EA", fontSize: 14, fontWeight: 600 },
  opcionDesc: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
};
