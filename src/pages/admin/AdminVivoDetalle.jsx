import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { casosVivoAdmin, casosVivoAlumno } from "../../api/client";

const LETRAS = ["A", "B", "C", "D", "E"];

export default function AdminVivoDetalle() {
  const navigate = useNavigate();
  const { sesionId } = useParams();
  const [searchParams] = useSearchParams();
  const opcionIdx = Number(searchParams.get("opcion"));

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
      setError("");
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

  if (error && !actual?.pregunta) {
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

  const opcionTexto = actual.opciones?.[opcionIdx] || "";
  const votantes = detalle.filter((v) => v.opcion === opcionIdx);

  return (
    <div style={s.wrap}>
      <div style={s.fijo}>
        <button onClick={() => navigate(-1)} style={s.back}>‹ Volver</button>

        <div style={s.encabezado}>
          <span style={s.letra}>{LETRAS[opcionIdx]}</span>
          <p style={s.opcionTexto}>{opcionTexto}</p>
          <span style={s.contador}>{votantes.length}</span>
        </div>
      </div>

      {votantes.length === 0 ? (
        <p style={s.muted}>Nadie ha votado esta opción.</p>
      ) : (
        <div style={s.listaNombres}>
          {votantes.map((v, i) => (
            <p key={i} style={s.nombreGrande}>{v.alumnos?.nombre}</p>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { height: "100dvh", background: "#0E1526", color: "#F4F1EA", padding: "24px 20px 20px", fontFamily: "sans-serif", boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden" },
  fijo: { flexShrink: 0 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer", marginBottom: 24 },
  error: { color: "#D1495B", fontSize: 14 },
  muted: { color: "#94A3B8", fontSize: 16, textAlign: "center", marginTop: 40 },

  encabezado: { display: "flex", alignItems: "center", gap: 14, marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid rgba(244,241,233,0.15)" },
  letra: { width: 44, height: 44, borderRadius: "50%", background: "rgba(79,195,217,0.15)", color: "#4FC3D9", fontWeight: 800, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  opcionTexto: { flex: 1, fontSize: 20, fontWeight: 700, margin: 0, lineHeight: 1.3 },
  contador: { background: "#4FC3D9", color: "#0E1526", fontWeight: 800, fontSize: 20, borderRadius: 20, padding: "4px 16px", flexShrink: 0 },

  listaNombres: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minHeight: 0, overflowY: "auto" },
  nombreGrande: { fontSize: 28, fontWeight: 700, margin: "10px 0", padding: "12px 4px", borderBottom: "1px solid rgba(244,241,233,0.08)", flexShrink: 0 },
};
