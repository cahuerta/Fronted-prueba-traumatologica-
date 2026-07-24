import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { casosVivoAdmin, casosVivoAlumno } from "../../api/client";

const LETRAS = ["A", "B", "C", "D", "E"];

export default function AdminVivoDetalle() {
  const navigate = useNavigate();
  const { sesionId } = useParams();

  const [sesion, setSesion] = useState(null);
  const [actual, setActual] = useState(null);
  const [detalle, setDetalle] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarSesion();
  }, [sesionId]);

  async function cargarSesion() {
    try {
      const data = await casosVivoAdmin.obtenerSesion(sesionId);
      setSesion(data);
    } catch (err) {
      setError(err.message);
    }
  }

  const refrescar = useCallback(async () => {
    if (!sesion?.codigo_acceso) return;
    try {
      const [est, det] = await Promise.all([
        casosVivoAlumno.estadoActual(sesion.codigo_acceso),
        casosVivoAdmin.detalleVotos(sesionId),
      ]);
      setActual(est);
      setDetalle(det);
    } catch (err) {
      setError(err.message);
    }
  }, [sesion, sesionId]);

  useEffect(() => {
    if (!sesion?.codigo_acceso) return;
    refrescar();
    const intervalo = setInterval(refrescar, 2000);
    return () => clearInterval(intervalo);
  }, [sesion, refrescar]);

  if (error) {
    return (
      <div style={s.wrap}>
        <button onClick={() => navigate(-1)} style={s.back}>‹ Volver</button>
        <p style={s.error}>{error}</p>
      </div>
    );
  }

  if (!actual?.pregunta) {
    return (
      <div style={s.wrap}>
        <button onClick={() => navigate(-1)} style={s.back}>‹ Volver</button>
        <p style={s.muted}>Cargando...</p>
      </div>
    );
  }

  const porOpcion = (actual.opciones || []).map((_, i) =>
    detalle.filter((v) => v.opcion === i)
  );

  return (
    <div style={s.wrap}>
      <button onClick={() => navigate(-1)} style={s.back}>‹ Volver</button>

      <p style={s.pregunta}>{actual.pregunta}</p>

      <div style={s.grupos}>
        {actual.opciones?.map((op, i) => (
          <div key={i} style={s.grupo}>
            <div style={s.grupoHeader}>
              <span style={s.letra}>{LETRAS[i]}</span>
              <span style={s.opcionTexto}>{op}</span>
              <span style={s.opcionCantidad}>{porOpcion[i].length}</span>
            </div>

            {porOpcion[i].length === 0 ? (
              <p style={s.muted}>Nadie ha votado esta opción.</p>
            ) : (
              <div style={s.nombresList}>
                {porOpcion[i].map((v, j) => (
                  <span key={j} style={s.nombre}>{v.alumnos?.nombre}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "24px 18px 40px", fontFamily: "sans-serif" },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer", marginBottom: 20 },
  error: { color: "#D1495B", fontSize: 14 },
  muted: { color: "#94A3B8", fontSize: 13 },

  pregunta: { fontSize: 18, fontWeight: 700, margin: "0 0 20px", lineHeight: 1.4 },

  grupos: { display: "flex", flexDirection: "column", gap: 14 },
  grupo: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: 16 },
  grupoHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  letra: { width: 28, height: 28, borderRadius: "50%", background: "rgba(79,195,217,0.15)", color: "#4FC3D9", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  opcionTexto: { flex: 1, fontSize: 14 },
  opcionCantidad: { background: "#4FC3D9", color: "#0E1526", fontWeight: 700, fontSize: 12, borderRadius: 20, padding: "2px 10px", minWidth: 18, textAlign: "center" },

  nombresList: { display: "flex", flexWrap: "wrap", gap: 8 },
  nombre: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.1)", borderRadius: 8, padding: "5px 10px", fontSize: 13 },
};
    
