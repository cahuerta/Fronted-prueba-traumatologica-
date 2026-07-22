import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { casosVivoAdmin } from "../../api/client";

const REGIONES = [
  { valor: "hombro", etiqueta: "Hombro" },
  { valor: "codo", etiqueta: "Codo" },
  { valor: "mano_muneca", etiqueta: "Mano y muñeca" },
  { valor: "columna", etiqueta: "Columna" },
  { valor: "cadera_pelvis", etiqueta: "Cadera y pelvis" },
  { valor: "rodilla", etiqueta: "Rodilla" },
  { valor: "tobillo_pie", etiqueta: "Tobillo y pie" },
  { valor: "ortogeriatria", etiqueta: "Ortogeriatría" },
  { valor: "imagenologia", etiqueta: "Imagenología" },
  { valor: "ciencias_basicas", etiqueta: "Ciencias básicas" },
];

export default function AdminCasosVivo() {
  const navigate = useNavigate();

  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [region, setRegion] = useState("");

  useEffect(() => {
    cargar();
  }, [region]);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const data = await casosVivoAdmin.listarCasos(region || undefined);
      setLista(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  function etiquetaDeRegion(valor) {
    return REGIONES.find((r) => r.valor === valor)?.etiqueta || valor;
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate("/admin/dashboard")} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>Casos clínicos — presentación en vivo</h1>
      </header>

      <div style={s.actions}>
        <button onClick={() => navigate("/admin/presentaciones")} style={s.actionBtn}>Presentaciones</button>
        <button onClick={() => navigate("/admin/casos-vivo/nuevo")} style={s.newBtn}>+ Nuevo caso</button>
      </div>

      <select value={region} onChange={(e) => setRegion(e.target.value)} style={s.filtro}>
        <option value="">Todas las regiones</option>
        {REGIONES.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
      </select>

      {error && <p style={s.error}>{error}</p>}

      {cargando ? (
        <p style={s.muted}>Cargando...</p>
      ) : lista.length === 0 ? (
        <p style={s.muted}>No hay casos clínicos todavía.</p>
      ) : (
        <div style={s.grid}>
          {lista.map((c) => (
            <button key={c.id} onClick={() => navigate(`/admin/casos-vivo/${c.id}`)} style={s.card}>
              <p style={s.cardRegion}>{etiquetaDeRegion(c.region)}</p>
              <p style={s.cardTitle}>{c.titulo}</p>
              <p style={s.cardVineta}>{c.vineta_clinica?.slice(0, 100)}{c.vineta_clinica?.length > 100 ? "…" : ""}</p>
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
  filtro: { width: "100%", maxWidth: 360, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "9px 12px", color: "#F4F1EA", fontSize: 14, marginBottom: 20 },
  error: { color: "#D1495B", fontSize: 13, marginBottom: 12 },
  muted: { color: "#94A3B8", fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 },
  card: { display: "flex", flexDirection: "column", gap: 6, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left" },
  cardRegion: { color: "#4FC3D9", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, margin: 0, fontWeight: 600 },
  cardTitle: { color: "#F4F1EA", fontSize: 15, fontWeight: 600, margin: 0 },
  cardVineta: { color: "#94A3B8", fontSize: 12, margin: 0, lineHeight: 1.4 },
};
