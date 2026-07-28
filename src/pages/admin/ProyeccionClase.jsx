import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { clasesFormalesActual } from "../../api/clasesFormalesCliente";

// Pantalla grande (proyector). Publica, sin auth -mismo patron que el
// alumno y el admin usan para leer la pagina activa-. Aca SI se
// muestran pregunta y alternativas de la trivia -es la contraparte
// visual del selector ciego de letras que ve el alumno en su celular,
// como un sistema de clickers real-.
export default function ProyeccionClase() {
  const { codigo } = useParams();

  const [pagina, setPagina] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function poll() {
      try {
        const data = await clasesFormalesActual.leer(codigo);
        setPagina(data);
        setError("");
      } catch (err) {
        setError(err.message);
      }
    }
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [codigo]);

  return (
    <div style={s.wrap}>
      <div style={s.esquina}>
        <p style={s.esquinaLabel}>Código de acceso</p>
        <p style={s.esquinaCodigo}>{codigo}</p>
      </div>

      {error && <p style={s.error}>{error}</p>}

      {pagina && (
        <div style={s.contenido}>
          <h1 style={s.titulo}>{pagina.titulo}</h1>

          {pagina.tipo_herramienta === "trivia" && pagina.config?.pregunta && (
            <div style={s.trivia}>
              <p style={s.pregunta}>{pagina.config.pregunta}</p>
              <div style={s.alternativas}>
                {(pagina.config.alternativas || []).map((alt, i) => (
                  <div key={i} style={s.alternativa}>
                    <span style={s.letra}>{String.fromCharCode(65 + i)}</span>
                    <span>{alt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pagina.tipo_herramienta === "semaforo" && (
            <p style={s.subtitulo}>Responde en tu celular: ¿sigo la clase?</p>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 80px", position: "relative" },
  esquina: { position: "absolute", top: 32, right: 40, textAlign: "right" },
  esquinaLabel: { fontSize: 16, color: "#94A3B8", margin: "0 0 4px" },
  esquinaCodigo: { fontSize: 32, fontWeight: 800, letterSpacing: 4, color: "#4FC3D9", margin: 0 },
  error: { color: "#D1495B", fontSize: 20 },
  contenido: { textAlign: "center", maxWidth: 1000 },
  titulo: { fontSize: 56, fontWeight: 800, margin: "0 0 24px" },
  subtitulo: { fontSize: 28, color: "#94A3B8", margin: 0 },
  trivia: { marginTop: 20 },
  pregunta: { fontSize: 34, margin: "0 0 40px" },
  alternativas: { display: "flex", flexDirection: "column", gap: 18, textAlign: "left", maxWidth: 700, margin: "0 auto" },
  alternativa: { display: "flex", alignItems: "center", gap: 20, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 16, padding: "20px 28px", fontSize: 26 },
  letra: { width: 44, height: 44, borderRadius: "50%", background: "#4FC3D9", color: "#0E1526", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, flexShrink: 0 },
};
    
