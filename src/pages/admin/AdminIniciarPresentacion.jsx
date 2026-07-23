import { useNavigate } from "react-router-dom";
import { clearToken } from "../../api/client";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const nombre = localStorage.getItem("nombre");
  const rol = localStorage.getItem("rol");
  const esAdmin = rol === "admin";

  function handleLogout() {
    clearToken();
    localStorage.removeItem("nombre");
    localStorage.removeItem("rol");
    navigate("/admin");
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <div>
          <p style={s.hola}>Hola, {nombre}</p>
          <p style={s.rol}>{esAdmin ? "Administrador" : "Interrogador"}</p>
        </div>
        <button onClick={handleLogout} style={s.logout}>Salir</button>
      </header>

      <p style={s.seccionLabel}>Docencia</p>

      <button onClick={() => navigate("/admin/casos-vivo")} style={s.bigBtn}>
        <span style={s.bigBtnIcono}>🩺</span>
        <p style={s.bigBtnTitulo}>Presentación casos clínicos</p>
      </button>

      <div style={s.grid}>
        <button onClick={() => navigate("/admin/preguntas")} style={s.card}>
          <span style={s.cardIcono}>📝</span>
          <p style={s.cardTitulo}>Preguntas exámenes</p>
        </button>
        <button onClick={() => navigate("/admin/materiales")} style={s.card}>
          <span style={s.cardIcono}>📁</span>
          <p style={s.cardTitulo}>Material docente</p>
        </button>
        <button onClick={() => navigate("/admin/documentos")} style={s.card}>
          <span style={s.cardIcono}>📄</span>
          <p style={s.cardTitulo}>Crear documentos</p>
        </button>
      </div>

      {esAdmin && (
        <>
          <p style={s.seccionLabelAdmin}>Administración</p>
          <div style={s.grid}>
            <button onClick={() => navigate("/admin/interrogadores")} style={s.cardAdmin}>
              <span style={s.cardIcono}>⚙️</span>
              <p style={s.cardTitulo}>Configuración</p>
            </button>
            <button onClick={() => navigate("/admin/examen")} style={s.cardAdmin}>
              <span style={s.cardIcono}>🎓</span>
              <p style={s.cardTitulo}>Examen</p>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const ACENTO = "#4FC3D9";
const ACENTO_ADMIN = "#B98BE0";

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  hola: { fontSize: 17, fontWeight: 700, margin: 0 },
  rol: { fontSize: 12, color: "#94A3B8", margin: "2px 0 0" },
  logout: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 14px", fontSize: 13, cursor: "pointer" },

  seccionLabel: { fontSize: 11, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px", fontWeight: 700 },
  seccionLabelAdmin: { fontSize: 11, color: ACENTO_ADMIN, textTransform: "uppercase", letterSpacing: 1, margin: "26px 0 10px", fontWeight: 700 },

  bigBtn: { display: "flex", alignItems: "center", gap: 12, width: "100%", background: "#16213A", border: `1px solid ${ACENTO}55`, borderRadius: 16, padding: "20px 18px", cursor: "pointer", marginBottom: 14, boxSizing: "border-box" },
  bigBtnIcono: { fontSize: 26 },
  bigBtnTitulo: { color: "#F4F1EA", fontSize: 16, fontWeight: 700, margin: 0 },

  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  card: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, background: "#16213A", border: "1px solid rgba(244,241,233,0.1)", borderRadius: 14, padding: "16px 14px", cursor: "pointer" },
  cardAdmin: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, background: "#16213A", border: `1px solid ${ACENTO_ADMIN}40`, borderRadius: 14, padding: "16px 14px", cursor: "pointer" },
  cardIcono: { fontSize: 22 },
  cardTitulo: { color: "#F4F1EA", fontSize: 13.5, fontWeight: 600, margin: 0, lineHeight: 1.3 },
};
