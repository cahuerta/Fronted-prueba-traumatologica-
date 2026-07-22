import { useNavigate } from "react-router-dom";

export default function AdminCasosVivoHub() {
  const navigate = useNavigate();

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate("/admin/dashboard")} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>Presentación casos clínicos</h1>
      </header>

      <div style={s.list}>
        <button onClick={() => navigate("/admin/casos-vivo/nuevo")} style={s.btn}>
          <span style={s.letra}>A</span>
          <div>
            <p style={s.btnTitulo}>Crear caso clínico</p>
            <p style={s.btnDesc}>Escribe la viñeta y las preguntas de un caso nuevo</p>
          </div>
        </button>

        <button onClick={() => navigate("/admin/presentaciones")} style={s.btn}>
          <span style={s.letra}>B</span>
          <div>
            <p style={s.btnTitulo}>Crear presentación</p>
            <p style={s.btnDesc}>Ordena varios casos en una presentación reutilizable</p>
          </div>
        </button>

        <button onClick={() => navigate("/admin/presentaciones/iniciar")} style={s.btnDestacado}>
          <span style={s.letraDestacada}>C</span>
          <div>
            <p style={s.btnTitulo}>Iniciar presentación</p>
            <p style={s.btnDescDestacada}>Elige una presentación ya armada y comienza la clase</p>
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
  btnDestacado: { display: "flex", alignItems: "center", gap: 14, background: ACENTO, border: "none", borderRadius: 14, color: "#0E1526", cursor: "pointer", padding: "16px 18px", textAlign: "left" },
  letra: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: "rgba(79,195,217,0.18)", color: ACENTO, fontSize: 14, fontWeight: 800, flexShrink: 0 },
  letraDestacada: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, background: "rgba(14,21,38,0.25)", color: "#0E1526", fontSize: 14, fontWeight: 800, flexShrink: 0 },
  btnTitulo: { fontSize: 15, fontWeight: 700, margin: 0 },
  btnDesc: { fontSize: 12.5, color: "#94A3B8", margin: "3px 0 0" },
  btnDescDestacada: { fontSize: 12.5, color: "#0E1526", opacity: 0.75, margin: "3px 0 0" },
};
