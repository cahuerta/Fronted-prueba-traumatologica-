import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  clasesFormalesPreguntas,
  clasesFormalesSemaforo,
  clasesFormalesTrivia,
  clasesFormalesActual,
} from "../../api/clasesFormalesCliente";

const LETRAS = ["A", "B", "C", "D", "E"];

// Pantalla del alumno durante toda la clase. Preguntas y semaforo son
// FIJOS -no dependen de la pagina que va mostrando el profesor-. La
// trivia es la unica excepcion: como cada pregunta es especifica de su
// pagina, el alumno consulta en silencio (sin mostrar titulo ni
// contenido de la pagina) cual esta activa, solo para saber si hay una
// trivia esperando respuesta y a que pagina_id atarla.
export default function AlumnoClaseInteraccion() {
  const { codigo } = useParams();

  const rut = localStorage.getItem("clase_rut");
  const sesionId = localStorage.getItem("clase_sesion_id");

  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState("");

  const [sigo, setSigo] = useState(null); // null = aun no ha respondido
  const [semaforoError, setSemaforoError] = useState("");

  const [paginaTrivia, setPaginaTrivia] = useState(null); // pagina_id activa si es trivia, o null
  const [miLetra, setMiLetra] = useState(null);
  const [triviaError, setTriviaError] = useState("");

  useEffect(() => {
    if (enviada) {
      const t = setTimeout(() => setEnviada(false), 2500);
      return () => clearTimeout(t);
    }
  }, [enviada]);

  // Consulta silenciosa: solo para saber si hay trivia activa ahora
  useEffect(() => {
    async function poll() {
      try {
        const pagina = await clasesFormalesActual.leer(codigo);
        if (pagina.tipo_herramienta === "trivia") {
          setPaginaTrivia(pagina.id);
        } else {
          setPaginaTrivia(null);
          setMiLetra(null);
        }
      } catch {
        setPaginaTrivia(null);
      }
    }
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [codigo]);

  async function handlePreguntar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setError("");
    setEnviando(true);
    try {
      await clasesFormalesPreguntas.preguntar(sesionId, rut, texto.trim());
      setTexto("");
      setEnviada(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function handleSemaforo(valor) {
    setSemaforoError("");
    setSigo(valor); // optimista, se corrige si falla
    try {
      await clasesFormalesSemaforo.responder(sesionId, rut, valor);
    } catch (err) {
      setSigo((prev) => (prev === valor ? null : prev));
      setSemaforoError(err.message);
    }
  }

  async function handleTrivia(letra) {
    if (!paginaTrivia) return;
    setTriviaError("");
    setMiLetra(letra); // optimista
    try {
      await clasesFormalesTrivia.responder(paginaTrivia, rut, letra);
    } catch (err) {
      setMiLetra(null);
      setTriviaError(err.message);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <p style={s.titulo}>Clase en vivo</p>
        <p style={s.subtitulo}>Código {codigo}</p>

        {/* ---------------- TRIVIA (solo aparece si la pagina activa es trivia) ---------------- */}
        {paginaTrivia && (
          <div style={s.seccion}>
            <p style={s.label}>Pregunta en pantalla</p>
            <div style={s.triviaBtns}>
              {LETRAS.map((letra) => (
                <button
                  key={letra}
                  type="button"
                  onClick={() => handleTrivia(letra)}
                  style={{ ...s.triviaBtn, ...(miLetra === letra ? s.triviaBtnActivo : {}) }}
                >
                  {letra}
                </button>
              ))}
            </div>
            {triviaError && <p style={s.error}>{triviaError}</p>}
          </div>
        )}

        {/* ---------------- SEMAFORO ---------------- */}
        <div style={s.seccion}>
          <p style={s.label}>¿Sigo la clase?</p>
          <div style={s.semaforoBtns}>
            <button
              type="button"
              onClick={() => handleSemaforo(true)}
              style={{ ...s.semaforoBtn, ...(sigo === true ? s.semaforoBtnActivoSi : {}) }}
            >
              Sí
            </button>
            <button
              type="button"
              onClick={() => handleSemaforo(false)}
              style={{ ...s.semaforoBtn, ...(sigo === false ? s.semaforoBtnActivoNo : {}) }}
            >
              No
            </button>
          </div>
          {semaforoError && <p style={s.error}>{semaforoError}</p>}
        </div>

        {/* ---------------- PREGUNTAS ANONIMAS ---------------- */}
        <div style={s.seccion}>
          <p style={s.label}>Pregunta anónima</p>
          <form onSubmit={handlePreguntar} style={s.form}>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe tu duda, nadie sabrá que fuiste tú"
              rows={3}
              style={s.textarea}
            />
            {error && <p style={s.error}>{error}</p>}
            {enviada && <p style={s.ok}>Pregunta enviada</p>}
            <button type="submit" disabled={enviando || !texto.trim()} style={s.btn}>
              {enviando ? "Enviando..." : "Enviar pregunta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "sans-serif" },
  card: { width: "100%", maxWidth: 360 },
  titulo: { fontSize: 22, fontWeight: 700, margin: "0 0 4px", textAlign: "center" },
  subtitulo: { fontSize: 14, color: "#94A3B8", margin: "0 0 24px", textAlign: "center" },
  seccion: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 14, padding: 20, marginBottom: 16 },
  label: { fontSize: 15, fontWeight: 600, margin: "0 0 12px" },
  semaforoBtns: { display: "flex", gap: 12 },
  semaforoBtn: { flex: 1, background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, color: "#F4F1EA", padding: "14px 0", fontSize: 16, fontWeight: 700, cursor: "pointer" },
  semaforoBtnActivoSi: { background: "#2FBF71", color: "#0E1526", border: "none" },
  semaforoBtnActivoNo: { background: "#D1495B", color: "#0E1526", border: "none" },
  triviaBtns: { display: "flex", gap: 8 },
  triviaBtn: { flex: 1, background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, color: "#F4F1EA", padding: "14px 0", fontSize: 16, fontWeight: 700, cursor: "pointer" },
  triviaBtnActivo: { background: "#4FC3D9", color: "#0E1526", border: "none" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  textarea: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "14px 16px", color: "#F4F1EA", fontSize: 15, fontFamily: "sans-serif", resize: "vertical" },
  error: { color: "#D1495B", fontSize: 13, margin: 0 },
  ok: { color: "#2FBF71", fontSize: 13, margin: 0 },
  btn: { background: "#4FC3D9", border: "none", borderRadius: 10, color: "#0E1526", padding: "15px 0", fontSize: 16, fontWeight: 700, cursor: "pointer" },
};
