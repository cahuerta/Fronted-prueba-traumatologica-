import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { materiales } from "../../api/client";

export default function AlumnoMaterialesIngreso() {
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
      const res = await materiales.ingreso(nombre.trim(), rut.trim());
      sessionStorage.setItem("materiales_alumno_id", res.alumno_id);
      navigate("/materiales/ver");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={s.wrap}>
      <form onSubmit={handleSubmit} style={s.card}>
        <h1 style={s.title}>Material de estudio</h1>
        <p style={s.subtitle}>Ingresa tus datos para ver los materiales</p>

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
