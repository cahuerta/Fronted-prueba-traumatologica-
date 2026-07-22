import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { materiales } from "../../api/client";

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

export default function AdminMaterialesAnalisis() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    try {
      const res = await materiales.analisis();
      setData(res);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.headerRow}>
        <button onClick={() => navigate("/admin/materiales")} style={s.back}>‹ Volver</button>
        <h1 style={s.title}>Análisis de materiales</h1>
      </div>

      {error && <p style={s.error}>{error}</p>}
      {!data ? (
        <p style={s.muted}>Cargando...</p>
      ) : (
        <>
          <h2 style={s.h2}>Descargas por archivo</h2>
          {data.por_material.length === 0 ? (
            <p style={s.muted}>Sin descargas todavía.</p>
          ) : (
            <div style={s.list}>
              {data.por_material.map((m) => (
                <div key={m.material_id} style={s.card}>
                  <div>
                    <p style={s.cardMeta}>{REGION_LABEL[m.region] || m.region} · {m.tipo}</p>
                    <p style={s.cardTitle}>{m.titulo}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={s.bigNum}>{m.total_descargas}</p>
                    <p style={s.smallLabel}>{m.alumnos_distintos} alumno(s)</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ ...s.h2, marginTop: 24 }}>Actividad por alumno</h2>
          {data.por_alumno.length === 0 ? (
            <p style={s.muted}>Sin actividad todavía.</p>
          ) : (
            <div style={s.list}>
              {data.por_alumno.map((a) => (
                <div key={a.alumno_id} style={s.card}>
                  <div>
                    <p style={s.cardTitle}>{a.nombre || "(sin nombre)"}</p>
                    <p style={s.cardMeta}>{a.rut}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={s.smallLabel}>{a.total_visitas} visita(s)</p>
                    <p style={s.smallLabel}>{a.total_descargas} descarga(s)</p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
  h2: { fontSize: 14, margin: "0 0 10px", color: "#4FC3D9" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "12px 14px" },
  cardMeta: { color: "#94A3B8", fontSize: 11, margin: 0, textTransform: "uppercase" },
  cardTitle: { color: "#F4F1EA", fontSize: 14, margin: "2px 0 0" },
  bigNum: { fontSize: 18, fontWeight: 700, margin: 0, color: "#4FC3D9" },
  smallLabel: { fontSize: 11, color: "#94A3B8", margin: "2px 0 0" },
};
