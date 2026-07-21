import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { sesiones } from "../../api/client";

const COMPLEJIDAD_LABEL = { basica: "Básica", intermedia: "Intermedia", compleja: "Compleja" };
const REGION_LABEL = {
  hombro: "Hombro",
  codo: "Codo",
  mano_muneca: "Mano y muñeca",
  columna: "Columna",
  cadera_pelvis: "Cadera y pelvis",
  rodilla: "Rodilla",
  tobillo_pie: "Tobillo y pie",
  ortogeriatria: "Ortogeriatría",
  imagenologia: "Imagenología",
  ciencias_basicas: "Ciencias básicas",
};

export default function AdminAnalisis() {
  const { sesionId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    cargar();
  }, [sesionId]);

  async function cargar() {
    try {
      const res = await sesiones.analisis(sesionId);
      setData(res);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.headerRow}>
        <button onClick={() => navigate(`/admin/sesion/${sesionId}`)} style={s.back}>‹ Volver</button>
        <h1 style={s.title}>Análisis del curso</h1>
      </div>

      {error && <p style={s.error}>{error}</p>}
      {!data ? (
        <p style={s.muted}>Cargando...</p>
      ) : (
        <>
          {/* ---------- RESUMEN ---------- */}
          <div style={s.card}>
            <h2 style={s.h2}>Resumen</h2>
            {data.resumen ? (
              <div style={s.grid}>
                <div>
                  <p style={s.gridValue}>{data.resumen.n_alumnos}</p>
                  <p style={s.gridLabel}>Alumnos</p>
                </div>
                <div>
                  <p style={s.gridValue}>{data.resumen.nota_promedio}</p>
                  <p style={s.gridLabel}>Nota promedio</p>
                </div>
                <div>
                  <p style={s.gridValue}>{data.resumen.pct_aprobacion}%</p>
                  <p style={s.gridLabel}>Aprobación</p>
                </div>
                <div>
                  <p style={s.gridValue}>{data.resumen.nota_minima} – {data.resumen.nota_maxima}</p>
                  <p style={s.gridLabel}>Rango</p>
                </div>
              </div>
            ) : (
              <p style={s.muted}>Nadie ha finalizado el examen todavía.</p>
            )}
          </div>

          {/* ---------- POR COMPLEJIDAD ---------- */}
          <div style={s.card}>
            <h2 style={s.h2}>Rendimiento por complejidad</h2>
            {data.por_complejidad.length === 0 ? (
              <p style={s.muted}>Sin datos todavía.</p>
            ) : (
              data.por_complejidad.map((c) => (
                <div key={c.complejidad} style={s.barRow}>
                  <div style={s.barHead}>
                    <span>{COMPLEJIDAD_LABEL[c.complejidad]}</span>
                    <span>{c.pct_acierto}%</span>
                  </div>
                  <div style={s.barBg}>
                    <div style={{ ...s.barFill, width: `${c.pct_acierto}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ---------- PREGUNTAS MÁS FALLADAS ---------- */}
          <div style={s.card}>
            <h2 style={s.h2}>Preguntas más falladas</h2>
            {data.preguntas_mas_falladas.length === 0 ? (
              <p style={s.muted}>Sin datos todavía.</p>
            ) : (
              data.preguntas_mas_falladas.map((p) => (
                <div key={p.pregunta_id} style={s.preguntaRow}>
                  <div style={{ flex: 1 }}>
                    <p style={s.preguntaMeta}>{REGION_LABEL[p.region] || p.region} · {COMPLEJIDAD_LABEL[p.complejidad]}</p>
                    <p style={s.preguntaTexto}>{p.pregunta}</p>
                  </div>
                  <span style={{ ...s.preguntaPct, color: p.pct_acierto < 50 ? "#D1495B" : "#E0793E" }}>
                    {p.pct_acierto}%
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  headerRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 18 },
  back: { background: "none", border: "none", color: "#94A3B8", fontSize: 14, cursor: "pointer" },
  title: { fontSize: 17, margin: 0 },
  error: { color: "#D1495B", fontSize: 13, marginBottom: 12 },
  muted: { color: "#94A3B8", fontSize: 13 },
  card: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: 16, marginBottom: 14 },
  h2: { fontSize: 14, margin: "0 0 12px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  gridValue: { fontSize: 20, fontWeight: 700, margin: 0, color: "#4FC3D9" },
  gridLabel: { fontSize: 11, color: "#94A3B8", margin: "2px 0 0" },
  barRow: { marginBottom: 12 },
  barHead: { display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 },
  barBg: { height: 6, borderRadius: 4, background: "rgba(244,241,233,0.08)", overflow: "hidden" },
  barFill: { height: "100%", background: "#4FC3D9", borderRadius: 4 },
  preguntaRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(244,241,233,0.08)" },
  preguntaMeta: { color: "#4FC3D9", fontSize: 10, margin: 0, textTransform: "uppercase" },
  preguntaTexto: { color: "#F4F1EA", fontSize: 13, margin: "2px 0 0" },
  preguntaPct: { fontSize: 14, fontWeight: 700, flexShrink: 0 },
};
    
