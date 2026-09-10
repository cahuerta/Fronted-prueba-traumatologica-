import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { clasesFormalesActual, clasesFormalesTrivia } from "../../api/clasesFormalesCliente";

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

// Bloque visual de una pagina "titulo_texto": imagen manual
// (config.imagen_url, respetando config.disposicion_imagen) y grafico IA
// (config.imagen_svg) pueden coexistir -no se pisan-. Si disposicion es
// "grande", ambos visuales van arriba de los bullets, uno al lado del
// otro. Si es "lado_izquierda"/"lado_derecha", ambos visuales quedan
// apilados en una columna al costado, y los bullets ocupan el resto del
// ancho -mismo criterio que ya se uso en el preview del constructor,
// llevado ahora a la disposicion real de pantalla-.
function ContenidoTituloTexto({ pagina }) {
  const bullets = pagina.config?.bullets || [];
  const imagenUrl = pagina.config?.imagen_url;
  const imagenSvg = pagina.config?.imagen_svg;
  const disposicion = pagina.config?.disposicion_imagen || "grande";
  const hayVisuales = Boolean(imagenUrl || imagenSvg);

  const bloqueSvg = imagenSvg && (
    <div className="grafico-ia-proyeccion" style={s.visualBox} dangerouslySetInnerHTML={{ __html: imagenSvg }} />
  );
  const bloqueImg = imagenUrl && (
    <img src={imagenUrl} alt="" style={{ ...s.visualBox, objectFit: "contain" }} />
  );

  const listaBullets = bullets.length > 0 && (
    <ul style={disposicion === "grande" ? s.bullets : s.bulletsLado}>
      {bullets.map((linea, i) => (
        <li key={i} style={s.bulletItem}>
          <span style={s.bulletMarcador}>•</span>
          <span>{linea}</span>
        </li>
      ))}
    </ul>
  );

  if (!hayVisuales) {
    return listaBullets || null;
  }

  if (disposicion === "grande") {
    return (
      <>
        <div style={s.visualesRowGrande}>{bloqueSvg}{bloqueImg}</div>
        {listaBullets}
      </>
    );
  }

  // lado_izquierda / lado_derecha
  return (
    <div style={{ ...s.filaLado, flexDirection: disposicion === "lado_derecha" ? "row-reverse" : "row" }}>
      <div style={s.columnaVisual}>{bloqueSvg}{bloqueImg}</div>
      {listaBullets}
    </div>
  );
}

// Pantalla grande (proyector). Publica, sin auth -mismo patron que el
// alumno y el admin usan para leer la pagina activa-. Aca SI se
// muestran pregunta y alternativas de la trivia -es la contraparte
// visual del selector ciego de letras que ve el alumno en su celular,
// como un sistema de clickers real-. Ademas se muestran las barras de
// conteo en vivo y, al revelar, la alternativa correcta resaltada en
// verde -mismo criterio que Casos Clinicos usa en su Proyeccion-.
//
// Mientras la sesion aun no tiene pagina activa (pagina_actual_orden
// null en el backend -> este endpoint responde 404), se muestra el QR
// grande, igual que ProyeccionVivo muestra el QR mientras "esperando".
export default function ProyeccionClase() {
  const { codigo } = useParams();
  const [pagina, setPagina] = useState(null);
  const [trivia, setTrivia] = useState(null);

  useEffect(() => {
    async function poll() {
      try {
        const data = await clasesFormalesActual.leer(codigo);
        setPagina(data);

        // Mismo poll, sin llamada nueva y separada: solo cuando la pagina
        // activa es trivia se pide tambien su resultado (conteos +
        // revelada) -no toca Supabase, es lectura en RAM, sin costo real-.
        if (data?.tipo_herramienta === "trivia") {
          const resultadoTrivia = await clasesFormalesTrivia.resultado(data.id);
          setTrivia(resultadoTrivia);
        } else {
          setTrivia(null);
        }
      } catch {
        // Sin pagina activa todavia (o cualquier otro fallo transitorio):
        // se muestra el QR, el proximo poll reintenta solo.
        setPagina(null);
        setTrivia(null);
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

        {pagina.tipo_herramienta === "titulo_texto" && <ContenidoTituloTexto pagina={pagina} />}

        {pagina.tipo_herramienta === "trivia" && pagina.config?.pregunta && (
          <div style={s.trivia}>
            <p style={s.pregunta}>{pagina.config.pregunta}</p>
            <div style={s.alternativas}>
              {(pagina.config.alternativas || []).map((alt, i) => {
                const letra = String.fromCharCode(65 + i);
                const total = trivia?.total || 0;
                const conteo = trivia?.conteos?.[letra] || 0;
                const pct = total > 0 ? Math.round((conteo / total) * 100) : 0;
                const esCorrecta = Boolean(trivia?.revelada) && pagina.config.correcta === i;
                return (
                  <div key={i} style={{ ...s.alternativa, ...(esCorrecta ? s.alternativaCorrecta : {}) }}>
                    <span style={{ ...s.letra, ...(esCorrecta ? s.letraCorrecta : {}) }}>{letra}</span>
                    <span style={s.alternativaTexto}>{alt}</span>
                    <div style={s.alternativaBarraFondo}>
                      <div
                        style={{
                          ...s.alternativaBarraLlena,
                          width: `${pct}%`,
                          ...(esCorrecta ? s.alternativaBarraLlenaCorrecta : {}),
                        }}
                      />
                    </div>
                    <span style={s.alternativaConteo}>{conteo}</span>
                  </div>
                );
              })}
            </div>
            {trivia && (
              <p style={s.triviaTotal}>
                {trivia.total} {trivia.total === 1 ? "respuesta" : "respuestas"}
              </p>
            )}
          </div>
        )}

        {pagina.tipo_herramienta === "semaforo" && (
          <p style={s.subtitulo}>Responde en tu celular: ¿sigo la clase?</p>
        )}
      </div>
      {/* Escala el SVG del grafico IA preservando su propia proporcion
          (viewBox propio) para caber en su contenedor -max-width/max-height,
          no width/height fijos que lo distorsionarian estirandolo-. */}
      <style>{`.grafico-ia-proyeccion svg { max-width: 100%; max-height: 100%; width: auto; height: auto; display: block; }`}</style>
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

  bullets: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16, textAlign: "left", maxWidth: 800, marginLeft: "auto", marginRight: "auto" },
  bulletsLado: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14, textAlign: "left", flex: 1 },
  // Antes dependia de un marcador ::before en un objeto de estilos inline
  // -que nunca se aplica en React-, por eso quedaba sin separacion visual
  // real. Ahora cada bullet es su propia fila con fondo, borde y marcador
  // explicito, mismo lenguaje visual que 'alternativa' (trivia).
  bulletItem: { display: "flex", alignItems: "flex-start", gap: 14, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: "14px 20px", fontSize: 28, lineHeight: 1.4 },
  bulletMarcador: { color: "#4FC3D9", fontWeight: 800, flexShrink: 0 },

  // "grande": ambos visuales (grafico IA + imagen manual) uno al lado del
  // otro, arriba de los bullets, hasta 42% del ancho cada uno.
  visualesRowGrande: { display: "flex", gap: 24, justifyContent: "center", alignItems: "center", width: "100%", maxHeight: "38vh", marginBottom: 32 },

  // "lado_izquierda"/"lado_derecha": columna de visuales (apilados si hay
  // dos) al costado, bullets ocupando el resto del ancho.
  filaLado: { display: "flex", gap: 40, alignItems: "center", width: "100%", textAlign: "left" },
  columnaVisual: { display: "flex", flexDirection: "column", gap: 16, flex: "0 0 38%", maxHeight: "60vh" },

  // Centrado para que el grafico/imagen -con ancho/alto "auto" preservando
  // su propia proporcion- quede bien posicionado dentro de la caja, no
  // pegado a una esquina.
  visualBox: { maxWidth: "100%", maxHeight: "38vh", borderRadius: 12, background: "#F4F1EA", padding: 10, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" },

  trivia: { marginTop: 20 },
  pregunta: { fontSize: 34, margin: "0 0 40px" },
  alternativas: { display: "flex", flexDirection: "column", gap: 18, textAlign: "left", maxWidth: 700, margin: "0 auto" },
  alternativa: { display: "flex", alignItems: "center", gap: 20, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 16, padding: "20px 28px", fontSize: 26 },
  // Mismo verde que AdminClaseVivo/Casos Clinicos para la opcion correcta
  // al revelar -#7FD98F-, consistente en todo el ecosistema.
  alternativaCorrecta: { border: "2px solid #7FD98F", background: "rgba(127,217,143,0.08)" },
  alternativaTexto: { flexShrink: 0, minWidth: 0 },
  letra: { width: 44, height: 44, borderRadius: "50%", background: "#4FC3D9", color: "#0E1526", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, flexShrink: 0 },
  letraCorrecta: { background: "#7FD98F" },
  // Barra de conteo en vivo, aparece junto al texto y crece con el % de
  // respuestas -mismo lenguaje visual que las barras de AdminClaseVivo,
  // escalado al tamaño de pantalla grande de proyeccion-.
  alternativaBarraFondo: { flex: 1, height: 14, borderRadius: 8, background: "#0E1526", overflow: "hidden", minWidth: 60 },
  alternativaBarraLlena: { height: "100%", background: "#4FC3D9", borderRadius: 8, transition: "width 0.4s ease" },
  alternativaBarraLlenaCorrecta: { background: "#7FD98F" },
  alternativaConteo: { flexShrink: 0, minWidth: 32, textAlign: "right", fontWeight: 800, color: "#94A3B8" },
  triviaTotal: { marginTop: 24, fontSize: 18, color: "#64748B" },
};
      
