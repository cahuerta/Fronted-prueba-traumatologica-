import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  clasesFormalesSesiones,
  clasesFormalesActual,
  clasesFormalesSemaforo,
  clasesFormalesPreguntas,
} from "../../api/clasesFormalesCliente";

const ACENTO = "#4FC3D9";

const COLOR_SEMAFORO = { verde: "#2FBF71", amarillo: "#E0B23A", rojo: "#D1495B" };

export default function AdminClaseVivo() {
  const { sesionId } = useParams();
  const navigate = useNavigate();

  const [sesion, setSesion] = useState(null);
  const [paginaActual, setPaginaActual] = useState(null);
  const [semaforo, setSemaforo] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [error, setError] = useState("");
  const [avanzando, setAvanzando] = useState(false);

  const codigoRef = useRef(null);

  // Carga inicial: encuentra la sesion (nombre, codigo, estado) dentro del listado
  useEffect(() => {
    (async () => {
      try {
        const todas = await clasesFormalesSesiones.listar();
        const encontrada = todas.find((s) => s.id === sesionId);
        if (!encontrada) {
          setError("Sesión no encontrada");
          return;
        }
        setSesion(encontrada);
        codigoRef.current = encontrada.codigo_acceso;
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [sesionId]);

  // Polling: pagina activa + resultado semaforo + preguntas, cada 2s
  useEffect(() => {
    if (!sesion) return;

    async function poll() {
      try {
        const [pagina, resultadoSemaforo, listaPreguntas] = await Promise.all([
          codigoRef.current ? clasesFormalesActual.leer(codigoRef.current) : Promise.resolve(null),
          clasesFormalesSemaforo.resultado(sesionId),
          clasesFormalesPreguntas.listar(sesionId),
        ]);
        setPaginaActual(pagina);
        setSemaforo(resultadoSemaforo);
        setPreguntas(listaPreguntas);
      } catch {
        // silencioso: el proximo poll reintenta solo
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [sesion, sesionId]);

  async function handleAvanzar() {
    setAvanzando(true);
    setError("");
    try {
      await clasesFormalesActual.avanzar(sesionId);
    } catch (err) {
      setError(err.message);
    } finally {
      setAvanzando(false);
    }
  }

  async function handleResponder(preguntaId) {
    try {
      await clasesFormalesPreguntas.responder(preguntaId, sesionId);
      setPreguntas((prev) => prev.map((p) => (p.id === preguntaId ? { ...p, respondida: true } : p)));
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !sesion) {
    return (
      <div style={s.wrap}>
        <p style={s.error}>{error}</p>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate("/admin/clases-formales")} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>{sesion?.nombre || "Cargando..."}</h1>
      </header>

      {/* ---------------- PAGINA ACTUAL ---------------- */}
      <div style={s.card}>
        <p style={s.label}>Página en pantalla</p>
        <p style={s.paginaTitulo}>{paginaActual?.titulo || "—"}</p>
        <button onClick={handleAvanzar} disabled={avanzando} style={s.btnAvanzar}>
          {avanzando ? "..." : "Siguiente página →"}
        </button>
      </div>

      {/* ---------------- SEMAFORO ---------------- */}
      <div style={s.card}>
        <p style={s.label}>Semáforo</p>
        {semaforo && (
          <div style={s.semaforoFila}>
            <span style={{ ...s.semaforoLuz, background: COLOR_SEMAFORO[semaforo.color] }} />
            <p style={s.semaforoTexto}>
              {semaforo.porcentaje_sigo}% dice que sigue ({semaforo.total} respuestas)
            </p>
          </div>
        )}
      </div>

      {/* ---------------- PREGUNTAS ---------------- */}
      <div style={s.card}>
        <p style={s.label}>Preguntas ({preguntas.filter((p) => !p.respondida).length} pendientes)</p>
        {preguntas.length === 0 && <p style={s.info}>Sin preguntas todavía.</p>}
        <div style={s.listaPreguntas}>
          {preguntas.map((p) => (
            <div key={p.id} style={{ ...s.pregunta, opacity: p.respondida ? 0.45 : 1 }}>
              <p style={s.preguntaTexto}>{p.texto}</p>
              <div style={s.preguntaFila}>
                <span style={s.upvotes}>▲ {p.upvotes}</span>
                {!p.respondida && (
                  <button onClick={() => handleResponder(p.id)} style={s.btnResponder}>
                    Marcar respondida
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p style={s.error}>{error}</p>}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 20 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 17, margin: 0 },
  card: { background: "#16213A", border: "1px solid rgba(244,241,233,0.1)", borderRadius: 14, padding: 18, marginBottom: 14 },
  label: { fontSize: 12.5, color: "#94A3B8", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.4 },
  paginaTitulo: { fontSize: 18, fontWeight: 700, margin: "0 0 14px" },
  btnAvanzar: { display: "block", width: "100%", background: ACENTO, border: "none", borderRadius: 10, color: "#0E1526", padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  semaforoFila: { display: "flex", alignItems: "center", gap: 10 },
  semaforoLuz: { width: 22, height: 22, borderRadius: "50%", flexShrink: 0 },
  semaforoTexto: { fontSize: 14, margin: 0 },
  info: { color: "#94A3B8", fontSize: 13, margin: 0 },
  listaPreguntas: { display: "flex", flexDirection: "column", gap: 8 },
  pregunta: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.08)", borderRadius: 10, padding: "12px 14px" },
  preguntaTexto: { fontSize: 14, margin: "0 0 8px" },
  preguntaFila: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  upvotes: { fontSize: 12.5, color: ACENTO, fontWeight: 700 },
  btnResponder: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#F4F1EA", fontSize: 12, padding: "6px 10px", cursor: "pointer" },
  error: { color: "#D1495B", fontSize: 13, textAlign: "center" },
};
          
