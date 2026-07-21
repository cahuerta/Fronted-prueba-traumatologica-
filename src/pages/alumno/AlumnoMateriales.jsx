import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { materiales } from "../../api/client";

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

export default function AlumnoMateriales() {
  const navigate = useNavigate();
  const alumnoId = sessionStorage.getItem("materiales_alumno_id");

  const [lista, setLista] = useState([]);
  const [filtroRegion, setFiltroRegion] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(null);

  useEffect(() => {
    if (!alumnoId) {
      navigate("/materiales");
      return;
    }
    cargar();
  }, [filtroRegion]);

  async function cargar() {
    setCargando(true);
    try {
      const data = await materiales.listar(filtroRegion || undefined);
      setLista(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleDescargar(materialId) {
    setError("");
    setDescargando(materialId);
    try {
      const res = await materiales.descargar(materialId, alumnoId);
      window.open(res.url, "_blank");
    } catch (err) {
      setError(err.message);
    } finally {
      setDescargando(null);
    }
  }

  function etiquetaDeRegion(valor) {
    return REGIONES.find((r) => r.valor === valor)?.etiqueta || valor;
  }

  return (
    <div style={s.wrap}>
      <h1 style={s.title}>Material de estudio</h1>

      <div style={s.filterRow}>
        <button onClick={() => setFiltroRegion("")} style={{ ...s.chip, ...(filtroRegion === "" ? s.chipActiva : {}) }}>Todas</button>
        {REGIONES.map((r) => (
          <button key={r.valor} onClick={() => setFiltroRegion(r.valor)} style={{ ...s.chip, ...(filtroRegion === r.valor ? s.chipActiva : {}) }}>{r.etiqueta}</button>
        ))}
      </div>

      {error && <p style={s.error}>{error}</p>}

      {cargando ? (
        <p style={s.muted}>Cargando...</p>
      ) : lista.length === 0 ? (
        <p style={s.muted}>No hay materiales disponibles todavía.</p>
      ) : (
        <div style={s.list}>
          {lista.map((m) => (
            <div key={m.id} style={s.card}>
              <div>
                <p style={s.cardMeta}>{etiquetaDeRegion(m.region)} · {m.tipo}</p>
                <p style={s.cardTitle}>{m.titulo}</p>
              </div>
              <button onClick={() => handleDescargar(m.id)} disabled={descargando === m.id} style={s.downloadBtn}>
                {descargando === m.id ? "..." : "↓"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  title: { fontSize: 18, marginBottom: 16, textAlign: "center" },
  filterRow: { display: "flex", gap: 6, overflowX: "auto", marginBottom: 18, paddingBottom: 4 },
  chip: { flexShrink: 0, background: "transparent", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 999, color: "#94A3B8", padding: "6px 12px", fontSize: 12.5, cursor: "pointer" },
  chipActiva: { background: "rgba(79,195,217,0.14)", borderColor: "#4FC3D9", color: "#4FC3D9" },
  error: { color: "#D1495B", fontSize: 13, marginBottom: 12, textAlign: "center" },
  muted: { color: "#94A3B8", fontSize: 13, textAlign: "center" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "12px 14px" },
  cardMeta: { color: "#4FC3D9", fontSize: 10.5, margin: 0, textTransform: "uppercase", letterSpacing: "0.03em" },
  cardTitle: { color: "#F4F1EA", fontSize: 14, margin: "2px 0 0" },
  downloadBtn: { background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", width: 38, height: 38, fontSize: 16, cursor: "pointer", flexShrink: 0 },
};
