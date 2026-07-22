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

      {/* 1. Presentación casos clínicos — A/B/C */}
      <div style={s.bigCard}>
        <p style={s.bigCardTitulo}>1. Presentación casos clínicos</p>
        <div style={s.subGrid}>
          <button onClick={() => navigate("/admin/casos-vivo/nuevo")} style={s.subBtn}>
            <span style={s.subLetra}>A</span> Crear caso clínico
          </button>
          <button onClick={() => navigate("/admin/presentaciones")} style={s.subBtn}>
            <span style={s.subLetra}>B</span> Crear presentación
          </button>
          <button onClick={() => navigate("/admin/presentaciones")} style={s.subBtn}>
            <span style={s.subLetra}>C</span> Iniciar presentación
          </button>
        </div>
      </div>

      <div style={s.grid}>
        <button onClick={() => navigate("/admin/preguntas")} style={s.card}>
          <p style={s.cardTitulo}>2. Preguntas exámenes</p>
        </button>
        <button onClick={() => navigate("/admin/materiales")} style={s.card}>
          <p style={s.cardTitulo}>3. Material docente alumnos</p>
        </button>
        <button onClick={() => navigate("/admin/documentos")} style={s.card}>
          <p style={s.cardTitulo}>4. Crear documentos</p>
        </button>
      </div>

      {esAdmin && (
        <div style={s.grid}>
          <button onClick={() => navigate("/admin/interrogadores")} style={s.card}>
            <p style={s.cardTitulo}>5. Configuración</p>
          </button>
          <button onClick={() => navigate("/admin/examen")} style={s.card}>
            <p style={s.cardTitulo}>6. Examen</p>
          </button>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  hola: { fontSize: 16, fontWeight: 600, margin: 0 },
  rol: { fontSize: 12, color: "#94A3B8", margin: 0, textTransform: "capitalize" },
  logout: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },

  bigCard: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 14, padding: 18, marginBottom: 16 },
  bigCardTitulo: { color: "#F4F1EA", fontSize: 15, fontWeight: 700, margin: "0 0 12px" },
  subGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 },
  subBtn: { display: "flex", alignItems: "center", gap: 8, background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, color: "#F4F1EA", fontSize: 13, cursor: "pointer", padding: "10px 12px", textAlign: "left" },
  subLetra: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 6, background: "#4FC3D9", color: "#0E1526", fontSize: 12, fontWeight: 700, flexShrink: 0 },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 },
  card: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: "16px", cursor: "pointer", textAlign: "left" },
  cardTitulo: { color: "#F4F1EA", fontSize: 14, fontWeight: 600, margin: 0 },
};
