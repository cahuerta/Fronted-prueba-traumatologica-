import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  clasesFormalesSesiones,
  clasesFormalesActual,
  clasesFormalesSemaforo,
  clasesFormalesPreguntas,
  clasesFormalesTrivia,
} from "../../api/clasesFormalesCliente";

const ACENTO = "#4FC3D9";

const COLOR_SEMAFORO = { verde: "#2FBF71", amarillo: "#E0B23A", rojo: "#D1495B" };
const LETRAS = ["A", "B", "C", "D", "E"];

export default function AdminClaseVivo() {
  const { sesionId } = useParams();
  const navigate = useNavigate();

  const [sesion, setSesion] = useState(null);
  const [paginaActual, setPaginaActual] = useState(null);
  const [semaforo, setSemaforo] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [trivia, setTrivia] = useState(null);
  const [asistencia, setAsistencia] = useState({ presentes: 0, total_habilitados: 0, lista_presentes: [] });
  // Nombre -> letra de la trivia activa (solo lo ves tu, igual que el
  // detalle de Casos Clinicos) y que letra esta desplegada.
  const [detalleTrivia, setDetalleTrivia] = useState([]);
  const [letraAbierta, setLetraAbierta] = useState(null);
  const [verPresentes, setVerPresentes] = useState(false);
  const [revelando, setRevelando] = useState(false);
  const [error, setError] = useState("");
  const [avanzando, setAvanzando] = useState(false);
  const [retrocediendo, setRetrocediendo] = useState(false);

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

  // Polling: pagina activa + resultado semaforo + preguntas + asistencia, cada 2s
  useEffect(() => {
    if (!sesion) return;

    async function poll() {
      // Cada consulta es independiente (allSettled, no all): antes, si UNA
      // fallaba, se perdian TODAS. Antes de iniciar la clase /actual
      // responde 404 ("sin pagina activa"), y eso tumbaba el poll completo:
      // la asistencia nunca se actualizaba en la pantalla de asistencia.
      const [rPagina, rSemaforo, rPreguntas, rAsistencia] = await Promise.allSettled([
        codigoRef.current ? clasesFormalesActual.leer(codigoRef.current) : Promise.resolve(null),
        clasesFormalesSemaforo.resultado(sesionId),
        clasesFormalesPreguntas.listar(sesionId),
        clasesFormalesSesiones.asistencia(sesionId),
      ]);

      if (rSemaforo.status === "fulfilled") setSemaforo(rSemaforo.value);
      if (rPreguntas.status === "fulfilled") setPreguntas(rPreguntas.value);
      if (rAsistencia.status === "fulfilled") setAsistencia(rAsistencia.value);

      let pagina;
      if (rPagina.status === "fulfilled") {
        pagina = rPagina.value;
      } else if (/pagina activa/i.test(rPagina.reason?.message || "")) {
        // 404 esperado: la clase aun no se inicia -> pantalla de asistencia
        pagina = null;
      } else {
        // Fallo transitorio (red, servidor): se conserva la pagina que se
        // estaba mostrando y el proximo poll reintenta.
        return;
      }
      setPaginaActual(pagina);

      if (pagina?.tipo_herramienta === "trivia") {
        const [rResultado, rDetalle] = await Promise.allSettled([
          clasesFormalesTrivia.resultado(pagina.id),
          clasesFormalesTrivia.detalle(pagina.id),
        ]);
        if (rResultado.status === "fulfilled") setTrivia(rResultado.value);
        if (rDetalle.status === "fulfilled") setDetalleTrivia(rDetalle.value || []);
      } else {
        setTrivia(null);
        setDetalleTrivia([]);
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [sesion, sesionId]);

  // Al cambiar de pagina se cierra la lista de nombres desplegada.
  useEffect(() => {
    setLetraAbierta(null);
  }, [paginaActual?.id]);

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

  // Vuelve a la pagina anterior. Las trivias conservan sus votos (la
  // cache vive por pagina_id). En la primera pagina no hace nada: nunca
  // vuelve a la pantalla de asistencia -el QR ya esta siempre en la
  // esquina de la proyeccion para los atrasados-.
  async function handleRetroceder() {
    setRetrocediendo(true);
    setError("");
    try {
      await clasesFormalesActual.retroceder(sesionId);
    } catch (err) {
      setError(err.message);
    } finally {
      setRetrocediendo(false);
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

  async function handleRevelar() {
    if (!paginaActual) return;
    setRevelando(true);
    try {
      await clasesFormalesTrivia.revelar(paginaActual.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setRevelando(false);
    }
  }

  if (error && !sesion) {
    return (
      <div style={s.wrap}>
        <p style={s.error}>{error}</p>
      </div>
    );
  }

  // ---------------- SIN PAGINA ACTIVA TODAVIA: pantalla de asistencia ----------------
  if (sesion && !paginaActual) {
    const pct = asistencia.total_habilitados > 0
      ? Math.min(100, Math.round((asistencia.presentes / asistencia.total_habilitados) * 100))
      : 0;

    return (
      <div style={s.wrap}>
        <header style={s.header}>
          <button onClick={() => navigate("/admin/clases-formales")} style={s.back}>‹ Volver</button>
          <h1 style={s.h1}>{sesion.nombre}</h1>
        </header>

        <div style={s.asistenciaWrap}>
          <p style={s.asistenciaTitulo}>Asistencia</p>
          <div style={s.asistenciaNumeros}>
            <span style={s.asistenciaPresentes}>{asistencia.presentes}</span>
            <span style={s.asistenciaSeparador}>/</span>
            <span style={s.asistenciaTotal}>{asistencia.total_habilitados}</span>
          </div>
          <p style={s.asistenciaLabel}>han ingresado con el código {sesion.codigo_acceso}</p>
          <div style={s.asistenciaBarraFondo}>
            <div style={{ ...s.asistenciaBarraLlena, width: `${pct}%` }} />
          </div>
        </div>

        {/* Nombres de quienes ingresaron, en orden de llegada (solo tu los ves) */}
        <ListaPresentes lista={asistencia.lista_presentes} />

        {error && <p style={s.error}>{error}</p>}

        <button onClick={handleAvanzar} disabled={avanzando} style={s.btnAvanzar}>
          {avanzando ? "..." : "Iniciar clase"}
        </button>
      </div>
    );
  }

  // Letra correcta de la trivia de la pagina activa -vive en paginas_clase.config,
  // no en la cache de resultados (esa solo trae total/conteos/revelada). Se
  // resuelve aca, en el mismo lugar donde ya se tiene paginaActual completo.
  const letraCorrecta =
    paginaActual?.config?.correcta !== undefined ? LETRAS[paginaActual.config.correcta] : null;

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
        <div style={s.navFila}>
          <button onClick={handleRetroceder} disabled={retrocediendo || avanzando} style={s.btnRetroceder}>
            {retrocediendo ? "..." : "← Anterior"}
          </button>
          <button onClick={handleAvanzar} disabled={avanzando || retrocediendo} style={s.btnAvanzarFila}>
            {avanzando ? "..." : "Siguiente página →"}
          </button>
        </div>
      </div>

      {/* ---------------- TRIVIA (solo si la pagina actual es de tipo trivia) ---------------- */}
      {trivia && (
        <div style={s.card}>
          <p style={s.label}>Trivia ({trivia.total} respuestas) · toca una letra para ver quién la eligió</p>
          <div style={s.triviaBarras}>
            {LETRAS.map((letra) => {
              const n = trivia.conteos[letra] || 0;
              const pct = trivia.total > 0 ? Math.round((n / trivia.total) * 100) : 0;
              const esCorrecta = trivia.revelada && letra === letraCorrecta;
              // Toca una letra para ver QUIEN la eligio (igual que el
              // detalle por opcion de Casos Clinicos).
              const abierta = letraAbierta === letra;
              const nombres = detalleTrivia.filter((d) => d.letra === letra);
              return (
                <div key={letra}>
                  <button
                    type="button"
                    onClick={() => setLetraAbierta(abierta ? null : letra)}
                    style={{ ...s.triviaFila, ...(esCorrecta ? s.triviaFilaCorrecta : {}), ...(abierta ? s.triviaFilaAbierta : {}) }}
                  >
                    <span style={s.triviaLetra}>{letra}</span>
                    <div style={s.triviaBarraFondo}>
                      <div
                        style={{
                          ...s.triviaBarraLlena,
                          width: `${pct}%`,
                          ...(esCorrecta ? s.triviaBarraLlenaCorrecta : {}),
                        }}
                      />
                    </div>
                    <span style={s.triviaConteo}>{n}</span>
                    <span style={s.triviaFlecha}>{abierta ? "▲" : "▼"}</span>
                  </button>
                  {abierta && (
                    <div style={s.triviaNombres}>
                      {nombres.length === 0 ? (
                        <p style={s.info}>Nadie ha elegido la {letra}.</p>
                      ) : (
                        nombres.map((d, i) => (
                          <p key={i} style={s.triviaNombre}>{d.nombre || d.rut}</p>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={handleRevelar} disabled={revelando || trivia.revelada} style={s.btnRevelar}>
            {trivia.revelada ? "Revelada" : revelando ? "..." : "Revelar respuesta correcta"}
          </button>
        </div>
      )}

      {/* ---------------- ASISTENCIA (durante la clase) ---------------- */}
      <div style={s.card}>
        <button type="button" onClick={() => setVerPresentes((v) => !v)} style={s.asistenciaToggle}>
          <span style={s.label}>Asistencia: {asistencia.presentes} / {asistencia.total_habilitados}</span>
          <span style={s.triviaFlecha}>{verPresentes ? "▲" : "▼"}</span>
        </button>
        {verPresentes && <ListaPresentes lista={asistencia.lista_presentes} sinMarco />}
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

// Lista de presentes con nombre, en orden de llegada. Solo en el mando.
function ListaPresentes({ lista, sinMarco }) {
  const presentes = lista || [];
  return (
    <div style={sinMarco ? s.presentesLista : { ...s.card, ...s.presentesLista }}>
      {!sinMarco && <p style={s.label}>Presentes</p>}
      {presentes.length === 0 ? (
        <p style={s.info}>Nadie ha ingresado todavía.</p>
      ) : (
        presentes.map((p, i) => (
          <div key={p.alumno_id || i} style={s.presenteFila}>
            <span style={s.presenteNumero}>{i + 1}</span>
            <span style={s.presenteNombre}>{p.nombre || p.rut}</span>
          </div>
        ))
      )}
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
  // Anterior / Siguiente en una fila: Siguiente mas ancho (es el uso
  // principal), Anterior secundario con borde, para no tocarlo por error.
  navFila: { display: "flex", gap: 10 },
  btnRetroceder: { flex: "0 0 36%", background: "none", border: `1px solid ${ACENTO}`, borderRadius: 10, color: ACENTO, padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" },
  btnAvanzarFila: { flex: 1, background: ACENTO, border: "none", borderRadius: 10, color: "#0E1526", padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" },
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
  triviaBarras: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 },
  // Ahora es un boton (toca para ver nombres): se resetea el estilo nativo.
  triviaFila: { display: "flex", alignItems: "center", gap: 10, borderRadius: 8, padding: "6px 6px", width: "100%", background: "none", border: "2px solid transparent", color: "#F4F1EA", font: "inherit", cursor: "pointer", textAlign: "left" },
  triviaFilaAbierta: { background: "rgba(79,195,217,0.08)" },
  triviaFlecha: { fontSize: 10, color: "#64748B", flexShrink: 0, width: 12, textAlign: "center" },
  triviaNombres: { padding: "4px 8px 10px 40px", display: "flex", flexDirection: "column", gap: 2 },
  triviaNombre: { fontSize: 15, margin: 0, padding: "6px 0", borderBottom: "1px solid rgba(244,241,233,0.06)" },
  asistenciaToggle: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: 0, color: "inherit", cursor: "pointer" },
  presentesLista: { display: "flex", flexDirection: "column", gap: 2, marginTop: 8 },
  presenteFila: { display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(244,241,233,0.06)" },
  presenteNumero: { width: 24, fontSize: 12, color: "#64748B", textAlign: "right", flexShrink: 0 },
  presenteNombre: { fontSize: 15 },
  triviaFilaCorrecta: { border: "2px solid #7FD98F", background: "rgba(127,217,143,0.08)" },
  triviaLetra: { width: 20, fontWeight: 800, fontSize: 13, color: ACENTO, flexShrink: 0 },
  triviaBarraFondo: { flex: 1, height: 10, borderRadius: 6, background: "#0E1526", overflow: "hidden" },
  triviaBarraLlena: { height: "100%", background: ACENTO, borderRadius: 6, transition: "width 0.3s" },
  triviaBarraLlenaCorrecta: { background: "#7FD98F" },
  triviaConteo: { width: 24, textAlign: "right", fontSize: 12.5, color: "#94A3B8", flexShrink: 0 },
  btnRevelar: { display: "block", width: "100%", background: "none", border: `1px solid ${ACENTO}`, borderRadius: 10, color: ACENTO, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  error: { color: "#D1495B", fontSize: 13, textAlign: "center" },

  asistenciaWrap: { background: "#16213A", border: "2px solid rgba(79,195,217,0.4)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5vh 20px", textAlign: "center", marginBottom: 14 },
  asistenciaTitulo: { fontSize: 15, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2vh" },
  asistenciaNumeros: { display: "flex", alignItems: "baseline", gap: 8 },
  asistenciaPresentes: { fontSize: "clamp(56px, 14vh, 96px)", fontWeight: 900, color: ACENTO, lineHeight: 1 },
  asistenciaSeparador: { fontSize: "clamp(30px, 7vh, 48px)", fontWeight: 700, color: "#94A3B8" },
  asistenciaTotal: { fontSize: "clamp(30px, 7vh, 48px)", fontWeight: 700, color: "#F4F1EA" },
  asistenciaLabel: { fontSize: 14, color: "#94A3B8", fontWeight: 700, margin: "1vh 0 3vh" },
  asistenciaBarraFondo: { width: "100%", maxWidth: 360, height: 14, background: "#0E1526", borderRadius: 8, overflow: "hidden" },
  asistenciaBarraLlena: { height: "100%", background: ACENTO, borderRadius: 8, transition: "width 0.4s ease" },
};
