import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clasesFormalesSesiones } from "../../api/clasesFormalesCliente";

const ACENTO = "#4FC3D9";

export default function AdminClaseNueva() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  async function handleCrear(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setError("");
    setCreando(true);
    try {
      const sesion = await clasesFormalesSesiones.crear(nombre.trim());
      navigate(`/admin/clases-formales/${sesion.id}`);
    } catch (err) {
      setError(err.message);
      setCreando(false);
    }
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate("/admin/clases-formales")} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>Nueva sesión</h1>
      </header>

      <form onSubmit={handleCrear} style={s.form}>
        <label style={s.label}>Nombre de la clase</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Fracturas de pelvis"
          autoFocus
          style={s.input}
        />
        {error && <p style={s.error}>{error}</p>}
        <button type="submit" disabled={creando || !nombre.trim()} style={s.btn}>
          {creando ? "Creando..." : "Crear y armar clase"}
        </button>
      </form>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 18, margin: 0 },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  label: { fontSize: 13, color: "#94A3B8", marginBottom: 2 },
  input: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "14px 16px", color: "#F4F1EA", fontSize: 16 },
  error: { color: "#D1495B", fontSize: 13, margin: 0 },
  btn: { background: ACENTO, border: "none", borderRadius: 10, color: "#0E1526", padding: "15px 0", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8 },
};
