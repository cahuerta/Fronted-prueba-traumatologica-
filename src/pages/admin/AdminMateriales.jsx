import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { materiales, getToken } from "../../api/client";

const API_URL = import.meta.env.VITE_API_URL;
const REGIONES = ["hombro", "codo", "muneca", "columna", "cadera", "rodilla", "tobillo"];

export default function AdminMateriales() {
  const navigate = useNavigate();

  const [region, setRegion] = useState(REGIONES[0]);
  const [tipo, setTipo] = useState("ppt");
  const [titulo, setTitulo] = useState("");
  const [archivo, setArchivo] = useState(null);

  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const [lista, setLista] = useState([]);
  const [filtroRegion, setFiltroRegion] = useState("");

  useEffect(() => {
    cargarLista();
  }, [filtroRegion]);

  async function cargarLista() {
    try {
      const data = await materiales.listar(filtroRegion || undefined);
      setLista(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubir(e) {
    e.preventDefault();
    setError("");
    setExito("");
    if (!archivo) {
      setError("Selecciona un archivo primero");
      return;
    }
    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append("region", region);
      formData.append("tipo", tipo);
      formData.append("titulo", titulo.trim() || archivo.name);
      formData.append("archivo", archivo);

      const res = await fetch(`${API_URL}/materiales`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Error ${res.status}`);
      }

      setExito("Material subido");
      setTitulo("");
      setArchivo(null);
      cargarLista();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.headerRow}>
        <button onClick={() => navigate("/admin/dashboard")} style={s.back}>‹ Volver</button>
        <h1 style={s.title}>Materiales</h1>
      </div>

      <form onSubmit={handleSubir} style={s.form}>
        <label style={s.label}>Región</label>
        <select value={region} onChange={(e) => setRegion(e.target.value)} style={s.input}>
          {REGIONES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <label style={s.label}>Tipo</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={s.input}>
          <option value="ppt">PPT</option>
          <option value="resumen">Resumen</option>
        </select>

        <label style={s.label}>Título</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Opcional" style={s.input} />

        <label style={s.label}>Archivo</label>
        <input type="file" onChange={(e) => setArchivo(e.target.files[0])} style={s.fileInput} />

        {error && <p style={s.error}>{error}</p>}
        {exito && <p style={s.exito}>{exito}</p>}

        <button type="submit" disabled={subiendo} style={s.submitBtn}>
          {subiendo ? "Subiendo..." : "Subir material"}
        </button>
      </form>

      <div style={s.sectionHead}>
        <h2 style={s.h2}>Materiales cargados ({lista.length})</h2>
        <select value={filtroRegion} onChange={(e) => setFiltroRegion(e.target.value)} style={s.filterSelect}>
          <option value="">Todas</option>
          {REGIONES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div style={s.list}>
        {lista.map((m) => (
          <a key={m.id} href={m.url} target="_blank" rel="noreferrer" style={s.card}>
            <div>
              <p style={s.cardMeta}>{m.region} · {m.tipo}</p>
              <p style={s.cardTitle}>{m.titulo}</p>
            </div>
            <span style={s.chevron}>↓</span>
          </a>
        ))}
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  headerRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 18 },
  back: { background: "none", border: "none", color: "#94A3B8", fontSize: 14, cursor: "pointer" },
  title: { fontSize: 17, margin: 0 },
  form: { display: "flex", flexDirection: "column", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: 16, marginBottom: 24 },
  label: { fontSize: 11, color: "#94A3B8", marginTop: 10, marginBottom: 4 },
  input: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "9px 11px", color: "#F4F1EA", fontSize: 14 },
  fileInput: { color: "#F4F1EA", fontSize: 13 },
  error: { color: "#D1495B", fontSize: 13, marginTop: 12 },
  exito: { color: "#7FB685", fontSize: 13, marginTop: 12 },
  submitBtn: { marginTop: 16, background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  h2: { fontSize: 15, margin: 0 },
  filterSelect: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, color: "#F4F1EA", fontSize: 13, padding: "6px 8px" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "10px 12px", textDecoration: "none" },
  cardMeta: { color: "#4FC3D9", fontSize: 10.5, margin: 0, textTransform: "uppercase", letterSpacing: "0.03em" },
  cardTitle: { color: "#F4F1EA", fontSize: 13.5, margin: "2px 0 0" },
  chevron: { color: "#94A3B8", fontSize: 16 },
};
