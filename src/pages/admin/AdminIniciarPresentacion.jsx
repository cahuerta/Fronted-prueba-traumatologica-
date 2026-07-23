import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { casosVivoAdmin } from "../../api/client";

const REGIONES = [
  { valor: "hombro", etiqueta: "Hombro" },
  { valor: "codo", etiqueta: "Codo" },
  { valor: "mano_muneca", etiqueta: "Mano y muñeca" },
  { valor: "columna", etiqueta: "Columna" },
  { valor: "cadera_pelvis", etiqueta: "Cadera y pelvis" },
  { valor: "rodilla", etiqueta: "Rodilla" },
  { valor: "tobillo_pie", etiqueta: "Tobillo y pie" },
  { valor: "ortogeriatria", etiqueta: "Ortogeriatría" },
  { valor: "imagenologia", etiqueta: "Imagenología" },
  { valor: "ciencias_basicas", etiqueta: "Ciencias básicas" },
];

const ESTADO_LABEL = {
  esperando: "Esperando",
  votando: "Votación abierta",
  discusion: "En discusión",
};

export default function AdminIniciarPresentacion() {
  const navigate = useNavigate();

  const [sesionesActivas, setSesionesActivas] = useState([]);
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [iniciandoId, setIniciandoId] = useState(null);
  const [borrandoId, setBorrandoId] = useState(null);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const [activas, presentaciones] = await Promise.all([
        casosVivoAdmin.listarSesionesActivas(),
        casosVivoAdmin.listarPresentaciones(),
      ]);
      setSesionesActivas(activas);
      setLista(presentaciones);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleIniciar(presentacionId) {
    setError("");
    setIniciandoId(presentacionId);
    try {
      const sesion = await casosVivoAdmin.iniciarSesion(presentacionId);
      navigate(`/admin/vivo/${sesion.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIniciandoId(null);
    }
  }

  async function handleBorrarSesion(sesionId) {
    setError("");
    setBorrandoId(sesionId);
    try {
      await casosVivoAdmin.borrarSesion(sesionId);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setBorrandoId(null);
    }
  }

  function etiquetaDeRegion(valor) {
    return REGIONES.find((r) => r.valor === valor)?.etiqueta || valor;
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate(-1)} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>Iniciar presentación</h1>
      </header>

      {error && <p style={s.error}>{error}</p>}

      {cargando ? (
        <p style={s.muted}>Cargando...</p>
      ) : (
        <>
          {sesionesActivas.length > 0 && (
            <>
              <h3 style={s.h3}>Sesiones activas</h3>
              <div style={s.listaActivas}>
                {sesionesActivas.map((ses) => (
                  <div key={ses.id} style={s.cardActiva}>
                    <div style={{ flex: 1 }}>
                      <p style={s.cardTitle}>{ses.presentaciones?.titulo || "Presentación"}</p>
                      <p style={s.cardEstado}>{ESTADO_LABEL[ses.estado] || ses.estado} · código {ses.codigo_acceso}</p>
                    </div>
                    <button onClick={() => navigate(`/admin/vivo/${ses.id}`)} style={s.continuarBtn}>
                      Continuar
                    </button>
                    <button
                      onClick={() => handleBorrarSesion(ses.id)}
                      disabled={borrandoId === ses.id}
                      style={s.borrarBtn}
                    >
                      {borrandoId === ses.id ? "..." : "Borrar"}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <h3 style={s.h3}>Iniciar una nueva</h3>
          {lista.length === 0 ? (
            <p style={s.muted}>No hay presentaciones armadas todavía.</p>
          ) : (
            <div style={s.grid}>
              {lista.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleIniciar(p.id)}
                  disabled={iniciandoId === p.id}
                  style={s.card}
                >
                  {p.region && <p style={s.cardRegion}>{etiquetaDeRegion(p.region)}</p>}
                  <p style={s.cardTitle}>{p.titulo}</p>
                  <p style={s.cardAccion}>{iniciandoId === p.id ? "Iniciando..." : "▶ Tocar para iniciar"}</p>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "24px 32px 60px", fontFamily: "sans-serif" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 20, margin: 0 },
  h3: { fontSize: 13, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 10px" },
  error: { color: "#D1495B", fontSize: 13, marginBottom: 12 },
  muted: { color: "#94A3B8", fontSize: 13 },

  listaActivas: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 },
  cardActiva: { display: "flex", alignItems: "center", gap: 10, background: "#16213A", border: "1px solid rgba(127,217,143,0.35)", borderRadius: 12, padding: "12px 16px" },
  cardEstado: { color: "#7FD98F", fontSize: 12, margin: "2px 0 0" },
  continuarBtn: { background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  borrarBtn: { background: "none", border: "1px solid rgba(209,73,91,0.4)", color: "#D1495B", borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 },
  card: { display: "flex", flexDirection: "column", gap: 6, background: "#16213A", border: "1px solid rgba(79,195,217,0.35)", borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left" },
  cardRegion: { color: "#4FC3D9", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, margin: 0, fontWeight: 600 },
  cardTitle: { color: "#F4F1EA", fontSize: 15, fontWeight: 600, margin: 0 },
  cardAccion: { color: "#4FC3D9", fontSize: 12, fontWeight: 700, margin: "6px 0 0" },
};
