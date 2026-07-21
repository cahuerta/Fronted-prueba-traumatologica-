import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { casosVivoAdmin } from "../../api/client";

export default function AdminPresentaciones() {
  const navigate = useNavigate();

  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [region, setRegion] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const data = await casosVivoAdmin.listarPresentaciones();
      setLista(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleCrear(e) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      const nueva = await casosVivoAdmin.crearPresentacion({ titulo, region: region || undefined });
      setMostrarForm(false);
      setTitulo("");
      setRegion("");
      navigate(`/admin/presentaciones/${nueva.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate("/admin/dashboard")} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>Presentaciones — reemplazo del PPT</h1>
      </header>

      <div style={s.actions}>
        <button onClick={() => navigate("/admin/casos-vivo")} style={s.actionBtn}>Casos clínicos</button>
        <button onClick={() => setMostrarForm((v) => !v)} style={s.newBtn}>
          {mostrarForm ? "Cancelar" : "+ Nueva presentación"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleCrear} style={s.form}>
          <label style={s.label}>Título de la presentación</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required style={s.input} />

          <label style={s.label}>Región (opcional)</label>
          <input value={region} onChange={(e) => setRegion(e.target.value)} style={s.input} />

          <button type="submit" disabled={guardando} style={s.submitBtn}>
            {guardando ? "Creando..." : "Crear y armar →"}
          </button>
        </form>
      )}

      {error && <p style={s.error}>{error}</p>}

      {cargando ? (
        <p style={s.muted}>Cargando...</p>
      ) : lista.length === 0 ? (
        <p style={s.muted}>No hay presentaciones todavía.</p>
      ) : (
        <div style={s.grid}>
          {lista.map((p) => (
            <button key={p.id} onClick={() => navigate(`/admin/presentaciones/${p.id}`)} style={s.card}>
              {p.region && <p style={s.cardRegion}>{p.region}</p>}
              <p style={s.cardTitle}>{p.titulo}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "24px 32px 60px", fontFamily: "sans-serif" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 20, margin: 0 },
  actions: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 },
  actionBtn: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, color: "#F4F1EA", padding: "10px 16px", fontSize: 13, cursor: "pointer" },
  newBtn: { background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  form: { display: "flex", flexDirection: "column", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: 20, maxWidth: 420, marginBottom: 20 },
  label: { fontSize: 11, color: "#94A3B8", marginTop: 10, marginBottom: 4 },
  input: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "9px 11px", color: "#F4F1EA", fontSize: 14 },
  submitBtn: { marginTop: 16, background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" },
  error: { color: "#D1495B", fontSize: 13, marginBottom: 12 },
  muted: { color: "#94A3B8", fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 },
  card: { display: "flex", flexDirection: "column", gap: 6, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left" },
  cardRegion: { color: "#4FC3D9", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, margin: 0, fontWeight: 600 },
  cardTitle: { color: "#F4F1EA", fontSize: 15, fontWeight: 600, margin: 0 },
};
  
