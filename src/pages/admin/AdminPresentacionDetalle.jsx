import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { casosVivoAdmin } from "../../api/client";

export default function AdminPresentacionDetalle() {
  const navigate = useNavigate();
  const { presentacionId } = useParams();

  const [presentacion, setPresentacion] = useState(null);
  const [todosLosCasos, setTodosLosCasos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargar();
  }, [presentacionId]);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const [pres, casos] = await Promise.all([
        casosVivoAdmin.obtenerPresentacion(presentacionId),
        casosVivoAdmin.listarCasos(),
      ]);
      setPresentacion(pres);
      setTodosLosCasos(casos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  const casosDeLaPresentacion = presentacion?.casos || [];
  const idsYaAgregados = new Set(casosDeLaPresentacion.map((c) => c.casos_clinicos.id));
  const siguienteOrden = casosDeLaPresentacion.length
    ? Math.max(...casosDeLaPresentacion.map((c) => c.orden)) + 1
    : 1;

  async function handleAgregarCaso(casoId) {
    setError("");
    try {
      await casosVivoAdmin.agregarCasoPresentacion(presentacionId, casoId, siguienteOrden);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleQuitarCaso(presentacionCasoId) {
    setError("");
    try {
      await casosVivoAdmin.quitarCasoPresentacion(presentacionId, presentacionCasoId);
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (cargando) {
    return (
      <div style={s.wrap}>
        <p style={s.muted}>Cargando...</p>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate("/admin/presentaciones")} style={s.back}>‹ Presentaciones</button>
        <h1 style={s.h1}>{presentacion?.titulo}</h1>
      </header>

      {error && <p style={s.error}>{error}</p>}

      <div style={s.grid2}>
        <div>
          <h3 style={s.h3}>Casos en esta presentación ({casosDeLaPresentacion.length})</h3>
          {casosDeLaPresentacion.length === 0 && <p style={s.muted}>Ninguno agregado todavía.</p>}
          <div style={s.list}>
            {casosDeLaPresentacion
              .slice()
              .sort((a, b) => a.orden - b.orden)
              .map((c) => (
                <div key={c.id} style={s.itemOrdenado}>
                  <span style={s.orden}>{c.orden}</span>
                  <div style={{ flex: 1 }}>
                    <p style={s.itemTitulo}>{c.casos_clinicos.titulo}</p>
                    <p style={s.itemMeta}>
                      {c.casos_clinicos.region} · {c.preguntas?.length || 0} pregunta(s)
                    </p>
                  </div>
                  <button onClick={() => handleQuitarCaso(c.id)} style={s.quitarBtn}>Quitar</button>
                </div>
              ))}
          </div>
        </div>

        <div>
          <h3 style={s.h3}>Todos los casos clínicos</h3>
          {todosLosCasos.length === 0 ? (
            <p style={s.muted}>No hay casos clínicos creados. Ve a "Casos clínicos" para crear uno.</p>
          ) : (
            <div style={s.list}>
              {todosLosCasos.map((c) => (
                <div key={c.id} style={s.itemBanco}>
                  <div style={{ flex: 1 }}>
                    <p style={s.itemTitulo}>{c.titulo}</p>
                    <p style={s.itemMeta}>{c.region}</p>
                  </div>
                  <button
                    onClick={() => handleAgregarCaso(c.id)}
                    disabled={idsYaAgregados.has(c.id)}
                    style={s.agregarBtn}
                  >
                    {idsYaAgregados.has(c.id) ? "Agregado" : "+ Agregar"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  h3: { fontSize: 14, marginBottom: 10 },
  list: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  itemOrdenado: { display: "flex", alignItems: "center", gap: 10, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "10px 12px" },
  orden: { background: "#4FC3D9", color: "#0E1526", fontWeight: 700, fontSize: 12, borderRadius: 6, padding: "2px 8px" },
  itemTitulo: { fontSize: 13, margin: 0, color: "#F4F1EA", fontWeight: 600 },
  itemMeta: { fontSize: 11, margin: "2px 0 0", color: "#94A3B8" },
  quitarBtn: { background: "none", border: "1px solid rgba(209,73,91,0.4)", color: "#D1495B", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" },
  itemBanco: { display: "flex", alignItems: "center", gap: 10, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "10px 12px" },
  agregarBtn: { background: "#4FC3D9", border: "none", borderRadius: 6, color: "#0E1526", padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
};
