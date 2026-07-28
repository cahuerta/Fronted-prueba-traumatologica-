import { useNavigate } from "react-router-dom";

// Sub-hub de casos clinicos -contenido identico al que antes vivia en
// AdminCasosVivoHub.jsx (opciones A y B originales), movido un nivel
// adentro porque el hub principal ahora es mixto (casos clinicos +
// Clases Formales).
export default function AdminCasosClinicosHub() {
  const navigate = useNavigate();

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate("/admin/casos-vivo")} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>Casos clínicos</h1>
      </header>

      <div style={s.list}>
        <button onClick={() => navigate("/admin/casos-vivo/lista")} style={s.btn}>
          <span style={s.letra}>A</span>
          <div>
            <p style={s.btnTitulo}>Crear caso clínico</p>
            <p style={s.btnDesc}>Ver, editar o crear casos clínicos y sus preguntas</p>
          </div>
        </button>

        <button onClick={() => navigate("/admin/presentaciones")} style={s.btn}>
          <span style={s.letra}>B</span>
          <div>
            <p style={s.btnTitulo}>Crear presentación</p>
            <p style={s.btnDesc}>Ordena varios casos en una presentación reutilizable</p>
          </div>
        </button>
      </div>
    </div>
  );
}

const ACENTO = "#4FC3D9";

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 18, margin: 0 },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  btn: { display: "flex", alignItems: "center", gap: 14, background: "#16213A", border: "1px solid rgba(244,241,233,0.1)", borderRadius: 14, color: "#F4F1EA", cursor: "pointer", padding: "16px 18px", textAlign: "left" },
  letra: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: "rgba(79,195,217,0.18)", color: ACENTO, fontSize: 14, fontWeight: 800, flexShrink: 0 },
  btnTitulo: { fontSize: 15, fontWeight: 700, margin: 0 },
  btnDesc: { fontSize: 12.5, color: "#94A3B8", margin: "3px 0 0" },
};
