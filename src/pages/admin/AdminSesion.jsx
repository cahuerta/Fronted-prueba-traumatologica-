import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { sesiones } from "../../api/client";

const PAQUETES = { agil: "Ágil", estandar: "Estándar", exigente: "Exigente" };

export default function AdminSesion() {
  const { sesionId } = useParams();
  const navigate = useNavigate();
  const rol = localStorage.getItem("rol");
  const esAdmin = rol === "admin";

  const [sesion, setSesion] = useState(null);
  const [asistencia, setAsistencia] = useState({ presentes: [], total_habilitados: 0, total_presentes: 0 });
  const [encuesta, setEncuesta] = useState({ agil: 0, estandar: 0, exigente: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 4000);
    return () => clearInterval(interval);
  }, [sesionId]);

  async function cargar() {
    try {
      const ses = await sesiones.ver(sesionId);
      setSesion(ses);
      if (ses.estado === "asistencia" || ses.estado === "encuesta" || ses.estado === "en_curso") {
        const a = await sesiones.verAsistencia(sesionId);
        setAsistencia(a);
      }
      if (ses.estado === "encuesta" || ses.estado === "en_curso") {
        const e = await sesiones.verEncuesta(sesionId);
        setEncuesta(e);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function accion(fn) {
    setError("");
    try {
      await fn();
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!sesion) return <div style={s.wrap}><p style={s.muted}>Cargando...</p></div>;

  const linkAlumno = `${window.location.origin}/alumno/${sesionId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(linkAlumno)}`;
  const totalVotos = encuesta.agil + encuesta.estandar + encuesta.exigente;

  return (
    <div style={s.wrap}>
      <div style={s.headerRow}>
        <button onClick={() => navigate("/admin/dashboard")} style={s.back}>‹ Volver</button>
        <h1 style={s.title}>{sesion.nombre}</h1>
      </div>
      <p style={s.estado}>Estado: {sesion.estado}</p>

      <div style={s.qrBox}>
        <img src={qrUrl} alt="QR del examen" style={s.qrImg} />
        <p style={s.linkLabel}>Link para alumnos</p>
        <p style={s.linkValue}>{linkAlumno}</p>
      </div>

      {error && <p style={s.error}>{error}</p>}

      {/* ---------- ASISTENCIA ---------- */}
      <div style={s.card}>
        <h2 style={s.h2}>Asistencia</h2>
        <p style={s.big}>{asistencia.total_presentes} / {asistencia.total_habilitados}</p>
        {esAdmin && sesion.estado === "creada" && (
          <button onClick={() => accion(() => sesiones.abrirAsistencia(sesionId))} style={s.primaryBtn}>Abrir asistencia</button>
        )}
        {asistencia.presentes.length > 0 && (
          <div style={s.miniList}>
            {asistencia.presentes.map((p) => (
              <p key={p.alumno_id} style={s.miniItem}>{p.alumnos?.nombre}</p>
            ))}
          </div>
        )}
      </div>

      {/* ---------- ENCUESTA ---------- */}
      <div style={s.card}>
        <h2 style={s.h2}>Encuesta en vivo</h2>
        {esAdmin && sesion.estado === "asistencia" && (
          <button onClick={() => accion(() => sesiones.abrirEncuesta(sesionId))} style={s.primaryBtn}>Abrir encuesta</button>
        )}
        {(sesion.estado === "encuesta" || sesion.estado === "en_curso" || sesion.estado === "finalizada") && (
          <>
            {Object.entries(PAQUETES).map(([key, label]) => (
              <div key={key} style={s.votoRow}>
                <span style={s.votoLabel}>{label}</span>
                <span style={s.votoCount}>{encuesta[key]}</span>
              </div>
            ))}
            <p style={s.muted}>{totalVotos} votos totales</p>
          </>
        )}
        {esAdmin && sesion.estado === "encuesta" && (
          <button onClick={() => accion(() => sesiones.cerrarEncuesta(sesionId))} style={s.primaryBtn}>Cerrar encuesta e iniciar examen</button>
        )}
        {sesion.paquete_elegido && (
          <p style={s.paqueteElegido}>Paquete elegido: {PAQUETES[sesion.paquete_elegido]}</p>
        )}
      </div>

      {(sesion.estado === "en_curso" || sesion.estado === "finalizada") && (
        <div style={s.linksRow}>
          <button onClick={() => navigate(`/admin/sesion/${sesionId}/resultados`)} style={s.secondaryBtn}>Ver resultados</button>
          <button onClick={() => navigate(`/admin/sesion/${sesionId}/analisis`)} style={s.secondaryBtn}>Ver análisis</button>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  headerRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 4 },
  back: { background: "none", border: "none", color: "#94A3B8", fontSize: 14, cursor: "pointer" },
  title: { fontSize: 17, margin: 0 },
  estado: { color: "#94A3B8", fontSize: 12, textTransform: "capitalize", marginBottom: 16 },
  qrBox: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: 16, marginBottom: 18, textAlign: "center" },
  qrImg: { width: 160, height: 160, borderRadius: 8, background: "#F4F1EA", padding: 8, marginBottom: 10 },
  linkLabel: { fontSize: 10.5, color: "#4FC3D9", margin: 0, textTransform: "uppercase" },
  linkValue: { fontSize: 12, color: "#F4F1EA", margin: "4px 0 0", wordBreak: "break-all" },
  error: { color: "#D1495B", fontSize: 13, marginBottom: 12 },
  card: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: 16, marginBottom: 14 },
  h2: { fontSize: 14, margin: "0 0 8px" },
  big: { fontSize: 28, fontWeight: 700, margin: "0 0 10px" },
  muted: { color: "#94A3B8", fontSize: 12.5 },
  primaryBtn: { width: "100%", background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8 },
  secondaryBtn: { flex: 1, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, color: "#F4F1EA", padding: "12px 8px", fontSize: 13, cursor: "pointer" },
  linksRow: { display: "flex", gap: 8 },
  miniList: { marginTop: 8, maxHeight: 140, overflowY: "auto" },
  miniItem: { fontSize: 12.5, color: "#94A3B8", margin: "3px 0" },
  votoRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(244,241,233,0.08)" },
  votoLabel: { fontSize: 13.5 },
  votoCount: { fontSize: 13.5, fontWeight: 600, color: "#4FC3D9" },
  paqueteElegido: { marginTop: 10, fontSize: 13, color: "#7FB685" },
};
    
