import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { sesiones } from "../../api/client";

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

export default function AdminResultados() {
  const { sesionId } = useParams();
  const navigate = useNavigate();

  const [resultados, setResultados] = useState([]);
  const [expandido, setExpandido] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargar();
  }, [sesionId]);

  async function cargar() {
    setCargando(true);
    try {
      const data = await sesiones.resultados(sesionId);
      setResultados(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.headerRow}>
        <button onClick={() => navigate(`/admin/sesion/${sesionId}`)} style={s.back}>‹ Volver</button>
        <h1 style={s.title}>Resultados</h1>
      </div>

      {error && <p style={s.error}>{error}</p>}
      {cargando ? (
        <p style={s.muted}>Cargando...</p>
      ) : resultados.length === 0 ? (
        <p style={s.muted}>Nadie ha rendido el examen todavía.</p>
      ) : (
        <div style={s.list}>
          {resultados.map((r, i) => {
            const abierto = expandido === i;
            return (
              <div key={i} style={s.card}>
                <button onClick={() => setExpandido(abierto ? null : i)} style={s.cardHeader}>
                  <div style={{ textAlign: "left" }}>
                    <p style={s.nombre}>{r.alumno?.nombre}</p>
                    <p style={s.rut}>{r.alumno?.rut} · {r.paquete}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ ...s.nota, color: r.nota >= 4 ? "#7FB685" : "#D1495B" }}>{r.nota ?? "—"}</p>
                    <p style={s.pct}>{r.porcentaje}% · {r.finalizado ? "finalizado" : "en curso"}</p>
                    {r.salidas_detectadas > 0 && (
                      <p style={s.salidas}>⚠ {r.salidas_detectadas} salida{r.salidas_detectadas > 1 ? "s" : ""}</p>
                    )}
                  </div>
                </button>

                {abierto && (
                  <div style={s.detalle}>
                    <p style={s.resumen}>{r.n_correctas} correctas · {r.n_incorrectas} incorrectas · {r.n_preguntas_respondidas} respondidas</p>
                    {r.detalle_preguntas.map((d, j) => (
                      <div key={j} style={{ ...s.pregunta, borderColor: d.correcta ? "rgba(127,182,133,0.3)" : "rgba(209,73,91,0.3)" }}>
                        <p style={s.preguntaMeta}>{REGION_LABEL[d.region] || d.region} · {d.complejidad}</p>
                        <p style={s.preguntaTexto}>{d.pregunta}</p>
                        <p style={{ ...s.respuesta, color: d.correcta ? "#7FB685" : "#D1495B" }}>
                          Respondió: {d.respuesta_alumno}
                        </p>
                        {!d.correcta && <p style={s.correcta}>Correcta: {d.respuesta_correcta}</p>}
                        {d.explicacion && <p style={s.explicacion}>{d.explicacion}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, overflow: "hidden" },
  cardHeader: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: "12px 14px", cursor: "pointer" },
  nombre: { color: "#F4F1EA", fontSize: 14, margin: 0 },
  rut: { color: "#94A3B8", fontSize: 11.5, margin: "2px 0 0" },
  nota: { fontSize: 18, fontWeight: 700, margin: 0 },
  pct: { color: "#94A3B8", fontSize: 11, margin: "2px 0 0" },
  salidas: { color: "#E0793E", fontSize: 11, margin: "2px 0 0", fontWeight: 600 },
  detalle: { borderTop: "1px solid rgba(244,241,233,0.1)", padding: "10px 14px 14px" },
  resumen: { color: "#94A3B8", fontSize: 12, marginBottom: 10 },
  pregunta: { border: "1px solid", borderRadius: 8, padding: 10, marginBottom: 8 },
  preguntaMeta: { color: "#4FC3D9", fontSize: 10, margin: 0, textTransform: "uppercase" },
  preguntaTexto: { color: "#F4F1EA", fontSize: 13, margin: "4px 0 6px" },
  respuesta: { fontSize: 12.5, margin: "2px 0" },
  correcta: { color: "#7FB685", fontSize: 12.5, margin: "2px 0" },
  explicacion: { color: "#94A3B8", fontSize: 12, margin: "4px 0 0", fontStyle: "italic" },
};
