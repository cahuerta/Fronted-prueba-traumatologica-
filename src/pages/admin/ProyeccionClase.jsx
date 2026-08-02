import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { clasesFormalesActual } from "../../api/clasesFormalesCliente";

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

// Barra de logos institucionales — misma que ProyeccionVivo, ubicada
// arriba a la izquierda para no chocar con el código de acceso (arriba a la derecha).
function LogoBar() {
  return (
    <div style={s.logoBar}>
      <img src="/logo-utal.png" alt="UTAL" style={s.logoImg} />
      <img src="/logo-ica.png" alt="ICA" style={s.logoImg} />
      <img src="/logo-hipokratia.png" alt="Hipokratia" style={s.logoImg} />
    </div>
  );
}

// Pantalla grande (proyector). Publica, sin auth -mismo patron que el
// alumno y el admin usan para leer la pagina activa-. Aca SI se
// muestran pregunta y alternativas de la trivia -es la contraparte
// visual del selector ciego de letras que ve el alumno en su celular,
// como un sistema de clickers real-.
//
// Mientras la sesion aun no tiene pagina activa (pagina_actual_orden
// null en el backend -> este endpoint responde 404), se muestra el QR
// grande, igual que ProyeccionVivo muestra el QR mientras "esperando".
export default function ProyeccionClase() {
  const { codigo } = useParams();
  const [pagina, setPagina] = useState(null);

  useEffect(() => {
    async function poll() {
      try {
        const data = await clasesFormalesActual.leer(codigo);
        setPagina(data);
      } catch {
        // Sin pagina activa todavia (o cualquier otro fallo transitorio):
        // se muestra el QR, el proximo poll reintenta solo.
        setPagina(null);
      }
    }
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [codigo]);

  const linkAlumno = `${APP_URL}/alumno-vivo/${codigo}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(linkAlumno)}`;

  if (!pagina) {
    return (
      <div style={s.wrap}>
        <LogoBar />
        <div style={s.qrBox}>
          <img src={qrUrl} alt="QR de la sesión" style={s.qrImg} />
          <p style={s.codigoLabel}>Código de acceso</p>
          <p style={s.codigo}>{codigo}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <LogoBar />
      <div style={s.esquina}>
        <p style={s.esquinaLabel}>Código de acceso</p>
        <p style={s.esquinaCodigo}>{codigo}</p>
      </div>

      <div style={s.contenido}>
        <h1 style={s.titulo}>{pagina.titulo}</h1>

        {pagina.tipo_herramienta === "titulo_texto" && (
          <ul style={s.bullets}>
            {(pagina.config?.bullets || []).map((linea, i) => (
              <li key={i} style={s.bulletItem}>{linea}</li>
            ))}
          </ul>
        )}

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
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 80px", position: "relative" },

  logoBar: { position: "absolute", top: 32, left: 40, display: "flex", alignItems: "center", gap: 20, zIndex: 50 },
  logoImg: { height: 32, width: "auto", objectFit: "contain", opacity: 0.92 },

  esquina: { position: "absolute", top: 32, right: 40, textAlign: "right" },
  esquinaLabel: { fontSize: 16, color: "#94A3B8", margin: "0 0 4px" },
  esquinaCodigo: { fontSize: 32, fontWeight: 800, letterSpacing: 4, color: "#4FC3D9", margin: 0 },

  qrBox: { textAlign: "center" },
  qrImg: { width: "min(40vw, 40vh)", height: "min(40vw, 40vh)", borderRadius: 14, background: "#F4F1EA", padding: 14, marginBottom: 18 },
  codigoLabel: { fontSize: "1.4vw", color: "#94A3B8", margin: 0 },
  codigo: { fontSize: "3vw", fontWeight: 800, letterSpacing: 6, color: "#4FC3D9", margin: "6px 0 0" },

  contenido: { textAlign: "center", maxWidth: 1000 },
  titulo: { fontSize: 56, fontWeight: 800, margin: "0 0 24px" },
  subtitulo: { fontSize: 28, color: "#94A3B8", margin: 0 },

  bullets: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 20, textAlign: "left", maxWidth: 800, marginLeft: "auto", marginRight: "auto" },
  bulletItem: { fontSize: 30, lineHeight: 1.4, paddingLeft: 36, position: "relative" },

  trivia: { marginTop: 20 },
  pregunta: { fontSize: 34, margin: "0 0 40px" },
  alternativas: { display: "flex", flexDirection: "column", gap: 18, textAlign: "left", maxWidth: 700, margin: "0 auto" },
  alternativa: { display: "flex", alignItems: "center", gap: 20, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 16, padding: "20px 28px", fontSize: 26 },
  letra: { width: 44, height: 44, borderRadius: "50%", background: "#4FC3D9", color: "#0E1526", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, flexShrink: 0 },
};
