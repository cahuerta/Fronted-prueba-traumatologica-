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

export default function AdminIniciarPresentacion() {
  const navigate = useNavigate();

  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [iniciandoId, setIniciandoId] = useState(null);

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

  async function handleIniciar(presentacionId) {
    setError("");
    setIniciandoId(presentacionId);
    try {
      const sesion = await casosVivoAdmin.iniciarSesion(presentacionId);
      navigate(`/admin/vivo/${sesion.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIniciandoId(null);
    }
  }

  function etiquetaDeRegion(valor) {
    return REGIONES.find((r) => r.valor === valor)?.etiqueta || valor;
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate("/admin/casos-vivo")} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>Iniciar presentación</h1>
      </header>

      {error && <p style={s.error}>{error}</p>}

      {cargando ? (
        <p style={s.muted}>Cargando...</p>
      ) : lista.length === 0 ? (
        <p style={s.muted}>No hay presentaciones armadas todavía.</p>
      ) : (
        <div style={s.grid}>
          {lista.map((p) => (
            <button
              key={p.id}
              onClick={() => handleIniciar(p.id)}
              disabled={iniciandoId === p.id}
              style={s.card}
            >
              {p.region && <p style={s.cardRegion}>{etiquetaDeRegion(p.region)}</p>}
              <p style={s.cardTitle}>{p.titulo}</p>
              <p style={s.cardAccion}>{iniciandoId === p.id ? "Iniciando..." : "▶ Tocar para iniciar"}</p>
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
  error: { color: "#D1495B", fontSize: 13, marginBottom: 12 },
  muted: { color: "#94A3B8", fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 },
  card: { display: "flex", flexDirection: "column", gap: 6, background: "#16213A", border: "1px solid rgba(79,195,217,0.35)", borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left" },
  cardRegion: { color: "#4FC3D9", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, margin: 0, fontWeight: 600 },
  cardTitle: { color: "#F4F1EA", fontSize: 15, fontWeight: 600, margin: 0 },
  cardAccion: { color: "#4FC3D9", fontSize: 12, fontWeight: 700, margin: "6px 0 0" },
};
