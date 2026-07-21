import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { casosVivoAlumno } from "../../api/client";

export default function AlumnoVivoIngreso() {
  const navigate = useNavigate();
  const { codigo } = useParams();

  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function handleIngreso(e) {
    e.preventDefault();
    setError("");
    setEntrando(true);
    try {
      const { sesion_id, alumno_id } = await casosVivoAlumno.ingreso(codigo, nombre, rut);
      localStorage.setItem("vivo_alumno_id", alumno_id);
      localStorage.setItem("vivo_sesion_id", sesion_id);
      navigate(`/alumno-vivo/${codigo}/votar`);
    } catch (err) {
      setError(err.message);
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <p style={s.titulo}>Clase en vivo</p>
        <p style={s.subtitulo}>Ingresa tu nombre y RUT para participar</p>

        <form onSubmit={handleIngreso} style={s.form}>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo"
            required
            style={s.input}
          />
          <input
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            placeholder="RUT (ej. 12.345.678-9)"
            required
            style={s.input}
          />
          {error && <p style={s.error}>{error}</p>}
          <button type="submit" disabled={entrando} style={s.btn}>
            {entrando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "sans-serif" },
  card: { width: "100%", maxWidth: 360, textAlign: "center" },
  titulo: { fontSize: 22, fontWeight: 700, margin: "0 0 4px" },
  subtitulo: { fontSize: 14, color: "#94A3B8", margin: "0 0 24px" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "14px 16px", color: "#F4F1EA", fontSize: 16 },
  error: { color: "#D1495B", fontSize: 13, margin: 0 },
  btn: { background: "#4FC3D9", border: "none", borderRadius: 10, color: "#0E1526", padding: "15px 0", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8 },
};
