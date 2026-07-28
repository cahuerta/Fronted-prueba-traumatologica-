import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { casosVivoAdmin } from "../../api/client";
import { clasesFormalesContenido, clasesFormalesSesiones } from "../../api/clasesFormalesCliente";

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

  const [activasCasos, setActivasCasos] = useState([]);
  const [activasClases, setActivasClases] = useState([]);
  const [presentacionesCasos, setPresentacionesCasos] = useState([]);
  const [contenidoClases, setContenidoClases] = useState([]);

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
      const [activasC, presentacionesC, sesionesClase, contenidoC] = await Promise.all([
        casosVivoAdmin.listarSesionesActivas(),
        casosVivoAdmin.listarPresentaciones(),
        clasesFormalesSesiones.listar(),
        clasesFormalesContenido.listar(),
      ]);

      setActivasCasos(activasC);
      setPresentacionesCasos(presentacionesC);

      const sesionesClaseActivas = sesionesClase.filter((s) => s.estado === "activa");
      setActivasClases(sesionesClaseActivas);

      // No mostrar como "para iniciar" el contenido que ya tiene una sesion activa
      const idsClaseFormalEnVivo = new Set(sesionesClaseActivas.map((s) => s.clase_formal_id));
      setContenidoClases(contenidoC.filter((c) => !idsClaseFormalEnVivo.has(c.id)));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleIniciarCaso(presentacionId) {
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

  async function handleIniciarClase(claseFormalId) {
    setError("");
    setIniciandoId(claseFormalId);
    try {
      const sesion = await clasesFormalesSesiones.iniciar(claseFormalId);
      navigate(`/admin/clases-vivo/${sesion.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIniciandoId(null);
    }
  }

  async function handleBorrarSesionCaso(sesionId) {
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

  async function handleCerrarSesionClase(sesionId) {
    setError("");
    setBorrandoId(sesionId);
    try {
      await clasesFormalesSesiones.cerrar(sesionId);
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

  const hayActivas = activasCasos.length > 0 || activasClases.length > 0;

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
          {hayActivas && (
            <>
              <h3 style={s.h3}>Sesiones activas</h3>
              <div style={s.listaActivas}>
                {activasCasos.map((ses) => (
                  <div key={`caso-${ses.id}`} style={s.cardActiva}>
                    <div style={{ flex: 1 }}>
                      <span style={s.badgeCaso}>Caso clínico</span>
                      <p style={s.cardTitle}>{ses.presentaciones?.titulo || "Presentación"}</p>
                      <p style={s.cardEstado}>{ESTADO_LABEL[ses.estado] || ses.estado} · código {ses.codigo_acceso}</p>
                    </div>
                    <button onClick={() => navigate(`/admin/vivo/${ses.id}`)} style={s.continuarBtn}>
                      Continuar
                    </button>
                    <button onClick={() => navigate(`/proyeccion-vivo/${ses.id}`)} style={s.proyeccionBtn}>
                      Proyección
                    </button>
                    <button
                      onClick={() => handleBorrarSesionCaso(ses.id)}
                      disabled={borrandoId === ses.id}
                      style={s.borrarBtn}
                    >
                      {borrandoId === ses.id ? "..." : "Borrar"}
                    </button>
                  </div>
                ))}

                {activasClases.map((ses) => (
                  <div key={`clase-${ses.id}`} style={s.cardActiva}>
                    <div style={{ flex: 1 }}>
                      <span style={s.badgeClase}>Clase formal</span>
                      <p style={s.cardTitle}>{ses.nombre}</p>
                      <p style={s.cardEstado}>Activa · código {ses.codigo_acceso}</p>
                    </div>
                    <button onClick={() => navigate(`/admin/clases-vivo/${ses.id}`)} style={s.continuarBtn}>
                      Continuar
                    </button>
                    <button
                      onClick={() => handleCerrarSesionClase(ses.id)}
                      disabled={borrandoId === ses.id}
                      style={s.borrarBtn}
                    >
                      {borrandoId === ses.id ? "..." : "Cerrar"}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <h3 style={s.h3}>Iniciar una nueva</h3>
          {presentacionesCasos.length === 0 && contenidoClases.length === 0 ? (
            <p style={s.muted}>No hay nada armado todavía.</p>
          ) : (
            <div style={s.grid}>
              {presentacionesCasos.map((p) => (
                <button
                  key={`caso-${p.id}`}
                  onClick={() => handleIniciarCaso(p.id)}
                  disabled={iniciandoId === p.id}
                  style={s.card}
                >
                  <span style={s.badgeCaso}>Caso clínico</span>
                  {p.region && <p style={s.cardRegion}>{etiquetaDeRegion(p.region)}</p>}
                  <p style={s.cardTitle}>{p.titulo}</p>
                  <p style={s.cardAccion}>{iniciandoId === p.id ? "Iniciando..." : "▶ Tocar para iniciar"}</p>
                </button>
              ))}

              {contenidoClases.map((c) => (
                <button
                  key={`clase-${c.id}`}
                  onClick={() => handleIniciarClase(c.id)}
                  disabled={iniciandoId === c.id}
                  style={s.card}
                >
                  <span style={s.badgeClase}>Clase formal</span>
                  <p style={s.cardTitle}>{c.nombre}</p>
                  <p style={s.cardAccion}>{iniciandoId === c.id ? "Iniciando..." : "▶ Tocar para iniciar"}</p>
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

  badgeCaso: { display: "inline-block", fontSize: 10.5, fontWeight: 700, color: "#4FC3D9", background: "rgba(79,195,217,0.15)", borderRadius: 6, padding: "2px 8px", marginBottom: 6 },
  badgeClase: { display: "inline-block", fontSize: 10.5, fontWeight: 700, color: "#B98BE0", background: "rgba(185,139,224,0.15)", borderRadius: 6, padding: "2px 8px", marginBottom: 6 },

  listaActivas: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 },
  cardActiva: { display: "flex", alignItems: "center", gap: 10, background: "#16213A", border: "1px solid rgba(127,217,143,0.35)", borderRadius: 12, padding: "12px 16px", flexWrap: "wrap" },
  cardEstado: { color: "#7FD98F", fontSize: 12, margin: "2px 0 0" },
  continuarBtn: { background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  proyeccionBtn: { background: "none", border: "1px solid #4FC3D9", borderRadius: 8, color: "#4FC3D9", padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  borrarBtn: { background: "none", border: "1px solid rgba(209,73,91,0.4)", color: "#D1495B", borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 },
  card: { display: "flex", flexDirection: "column", gap: 6, background: "#16213A", border: "1px solid rgba(79,195,217,0.35)", borderRadius: 12, padding: "16px 18px", cursor: "pointer", textAlign: "left" },
  cardRegion: { color: "#4FC3D9", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, margin: 0, fontWeight: 600 },
  cardTitle: { color: "#F4F1EA", fontSize: 15, fontWeight: 600, margin: 0 },
  cardAccion: { color: "#4FC3D9", fontSize: 12, fontWeight: 700, margin: "6px 0 0" },
};
