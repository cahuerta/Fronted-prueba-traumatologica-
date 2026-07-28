import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clasesFormalesContenido } from "../../api/clasesFormalesCliente";

const ACENTO = "#4FC3D9";

// Listado del contenido reutilizable de Clases Formales -ya no de
// sesiones-. Cada item aca es una clase armada (nombre + sus paginas),
// independiente de cuando se dicte. Iniciar una sesion en vivo a
// partir de este contenido se hace desde "Presentar" (boton C del hub
// mixto), no desde aca.
export default function AdminClasesFormales() {
  const navigate = useNavigate();

  const [clases, setClases] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const data = await clasesFormalesContenido.listar();
      setClases(data);
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
        + Nueva clase
      </button>

      {cargando && <p style={s.info}>Cargando...</p>}
      {error && <p style={s.error}>{error}</p>}
      {!cargando && !error && clases.length === 0 && (
        <p style={s.info}>Aún no hay clases armadas.</p>
      )}

      <div style={s.list}>
        {clases.map((clase) => (
          <button
            key={clase.id}
            onClick={() => navigate(`/admin/clases-formales/${clase.id}`)}
            style={s.btn}
          >
            <p style={s.btnTitulo}>{clase.nombre}</p>
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
  btnTitulo: { fontSize: 15, fontWeight: 700, margin: 0 },
};
