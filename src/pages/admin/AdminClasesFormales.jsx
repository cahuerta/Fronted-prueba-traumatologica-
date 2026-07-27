import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clasesFormalesSesiones } from "../../api/clasesFormalesCliente";

const ACENTO = "#4FC3D9";

const ESTADO_LABEL = {
  preparacion: "En preparación",
  activa: "Activa",
  cerrada: "Cerrada",
};

export default function AdminClasesFormales() {
  const navigate = useNavigate();

  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const data = await clasesFormalesSesiones.listar();
      setSesiones(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate("/admin/dashboard")} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>Clases Formales</h1>
      </header>

      <button onClick={() => navigate("/admin/clases-formales/nueva")} style={s.btnNueva}>
        + Nueva sesión
      </button>

      {cargando && <p style={s.info}>Cargando...</p>}
      {error && <p style={s.error}>{error}</p>}
      {!cargando && !error && sesiones.length === 0 && (
        <p style={s.info}>Aún no hay sesiones creadas.</p>
      )}

      <div style={s.list}>
        {sesiones.map((sesion) => (
          <button
            key={sesion.id}
            onClick={() => navigate(`/admin/clases-formales/${sesion.id}`)}
            style={s.btn}
          >
            <div style={s.btnFila}>
              <p style={s.btnTitulo}>{sesion.nombre}</p>
              <span style={{ ...s.badge, ...s.badgeEstado[sesion.estado] }}>
                {ESTADO_LABEL[sesion.estado] || sesion.estado}
              </span>
            </div>
            <p style={s.btnDesc}>Código {sesion.codigo_acceso}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 18, margin: 0 },
  btnNueva: { display: "block", width: "100%", background: ACENTO, border: "none", borderRadius: 12, color: "#0E1526", cursor: "pointer", padding: "14px 0", fontSize: 15, fontWeight: 700, marginBottom: 20 },
  info: { color: "#94A3B8", fontSize: 14, textAlign: "center", margin: "20px 0" },
  error: { color: "#D1495B", fontSize: 14, textAlign: "center", margin: "20px 0" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  btn: { display: "block", width: "100%", background: "#16213A", border: "1px solid rgba(244,241,233,0.1)", borderRadius: 14, color: "#F4F1EA", cursor: "pointer", padding: "16px 18px", textAlign: "left" },
  btnFila: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  btnTitulo: { fontSize: 15, fontWeight: 700, margin: 0 },
  btnDesc: { fontSize: 12.5, color: "#94A3B8", margin: "5px 0 0" },
  badge: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, flexShrink: 0 },
  badgeEstado: {
    preparacion: { background: "rgba(148,163,184,0.18)", color: "#94A3B8" },
    activa: { background: "rgba(47,191,113,0.18)", color: "#2FBF71" },
    cerrada: { background: "rgba(209,73,91,0.18)", color: "#D1495B" },
  },
};
  
