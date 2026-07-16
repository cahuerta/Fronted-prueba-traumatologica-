import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

export default function AlumnoIngreso() {
  const { sesionId } = useParams();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/sesiones/${sesionId}/asistencia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), rut: rut.trim() }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || "No pudimos verificarte, revisa tu nombre y RUT");
      }
      const data = await res.json();
      sessionStorage.setItem(`alumno_id_${sesionId}`, data.alumno_id);
      navigate(`/alumno/${sesionId}/espera`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={s.wrap}>
      <form onSubmit={handleSubmit} style={s.card}>
        <h1 style={s.title}>Examen Musculoesquelético</h1>
        <p style={s.subtitle}>Ingresa tus datos para marcar tu asistencia</p>

        <label style={s.label}>Nombre completo</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required style={s.input} />

        <label style={s.label}>RUT</label>
        <input value={rut} onChange={(e) => setRut(e.target.value)} required style={s.input} placeholder="12345678-9" />

        {error && <p style={s.error}>{error}</p>}

        <button type="submit" disabled={cargando} style={s.button}>
          {cargando ? "Verificando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0E1526", padding: 20 },
  card: { width: "100%", maxWidth: 360, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column" },
  title: { color: "#F4F1EA", fontSize: 19, fontWeight: 700, marginBottom: 4, textAlign: "center" },
  subtitle: { color: "#94A3B8", fontSize: 13, textAlign: "center", marginBottom: 24 },
  label: { color: "#94A3B8", fontSize: 12, marginBottom: 4 },
  input: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "10px 12px", color: "#F4F1EA", fontSize: 14, marginBottom: 16 },
  error: { color: "#D1495B", fontSize: 13, marginBottom: 12 },
  button: { background: "#4FC3D9", color: "#0E1526", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 15, fontWeight: 600, cursor: "pointer" },
};
