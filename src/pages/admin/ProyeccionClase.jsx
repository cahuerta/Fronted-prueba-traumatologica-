import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  clasesFormalesActual,
  clasesFormalesTrivia,
  clasesFormalesMedia,
  clasesFormalesSesiones,
  sesionResolver,
} from "../../api/clasesFormalesCliente";

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

// Paginas guardadas ANTES del arreglo de imagenes tienen config.imagen_url
// (el link firmado que vencia, ya vencido) pero nunca guardaron
// config.imagen_path -el backend lo devolvia, pero el frontend viejo no lo
// tomaba-. El path real sigue adentro de ese link vencido, como texto: se
// extrae con esta regex para no obligar a resubir nada (misma logica que
// en AdminClaseConstructor.jsx).
function extraerPathDeUrlVencida(urlVieja) {
  if (!urlVieja) return null;
  const match = urlVieja.match(/\/object\/sign\/casos\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

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
// (config.imagen_path, respetando config.disposicion_imagen) y grafico IA
// (config.imagen_svg) pueden coexistir -no se pisan-. Si disposicion es
// "grande", ambos visuales van arriba de los bullets, uno al lado del
// otro. Si es "lado_izquierda"/"lado_derecha", ambos visuales quedan
// apilados en una columna al costado, y los bullets ocupan el resto del
// ancho -mismo criterio que ya se uso en el preview del constructor,
// llevado ahora a la disposicion real de pantalla-.
//
// La imagen manual vive en un bucket PRIVADO (compartido con Casos
// Clinicos): el path es permanente, pero para mostrarla hace falta un
// token de acceso temporal fresco -se pide aca, solo cuando cambia el
// path de la pagina activa (no en cada poll de 2s de la pagina).
function ContenidoTituloTexto({ pagina }) {
  const bullets = pagina.config?.bullets || [];
  const imagenPath = pagina.config?.imagen_path || extraerPathDeUrlVencida(pagina.config?.imagen_url);
  const imagenSvg = pagina.config?.imagen_svg;
  const disposicion = pagina.config?.disposicion_imagen || "grande";

  const [imagenUrl, setImagenUrl] = useState(null);

  useEffect(() => {
    let cancelado = false;
    if (!imagenPath) {
      setImagenUrl(null);
      return;
    }
    clasesFormalesMedia.obtenerUrl(imagenPath)
      .then((r) => { if (!cancelado) setImagenUrl(r.url); })
      .catch(() => { if (!cancelado) setImagenUrl(null); });
    return () => { cancelado = true; };
  }, [imagenPath]);

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

// Imagen opcional de una pagina "trivia" (config.imagen_path). Ahora es
// un hook -no un componente- porque la URL resuelta decide el LAYOUT
// completo de la pantalla (imagen sola vs imagen al lado), no solo si se
// dibuja un <img>. Mismo patron de resolucion que ContenidoTituloTexto:
// token fresco solo cuando cambia el path, no en cada poll de 2s.
function useUrlImagen(imagenPath) {
  const [imagenUrl, setImagenUrl] = useState(null);

  useEffect(() => {
    let cancelado = false;
    if (!imagenPath) {
      setImagenUrl(null);
      return;
    }
    clasesFormalesMedia.obtenerUrl(imagenPath)
      .then((r) => { if (!cancelado) setImagenUrl(r.url); })
      .catch(() => { if (!cancelado) setImagenUrl(null); });
    return () => { cancelado = true; };
  }, [imagenPath]);

  return imagenUrl;
}

// Alternativas de la trivia con barra de conteo en vivo. Compartido por
// el layout sin imagen (centrado) y el layout con imagen al lado.
function AlternativasTrivia({ pagina, trivia }) {
  return (
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
  const [sesionId, setSesionId] = useState(null);
  const [presentes, setPresentes] = useState(0);

  // sesion_id a partir del codigo (una sola vez): hace falta para leer la
  // asistencia, que es la base del umbral del 50% -mismo criterio que
  // Casos Clinicos: votos / presentes-.
  useEffect(() => {
    let cancelado = false;
    sesionResolver.resolver(codigo)
      .then((r) => { if (!cancelado) setSesionId(r.sesion_id); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [codigo]);

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

          // Asistencia aparte: si falla, no debe tumbar el resultado de
          // la trivia (se mantiene el ultimo valor conocido).
          if (sesionId) {
            try {
              const a = await clasesFormalesSesiones.asistencia(sesionId);
              setPresentes(a?.presentes || 0);
            } catch {
              // se reintenta en el proximo poll
            }
          }
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
  }, [codigo, sesionId]);

  // Hook antes de cualquier return temprano (reglas de hooks).
  const esTrivia = pagina?.tipo_herramienta === "trivia" && Boolean(pagina?.config?.pregunta);
  const imagenTriviaUrl = useUrlImagen(esTrivia ? pagina.config.imagen_path : null);

  // Mismo flujo que Casos Clinicos (ProyeccionVivo): mientras se vota y
  // aun no responde el 50% de los presentes, la imagen va SOLA y completa
  // a pantalla grande. Al llegar al 50% (o al revelar), pasa al layout
  // con la pregunta + alternativas con votacion en vivo y la imagen a la
  // derecha. Sin imagen, la trivia se muestra como siempre.
  const totalVotos = trivia?.total || 0;
  const umbralAlcanzado = presentes > 0 && totalVotos / presentes >= 0.5;
  const revelada = Boolean(trivia?.revelada);
  const mostrarSoloImagen = esTrivia && Boolean(imagenTriviaUrl) && !revelada && !umbralAlcanzado;
  const mostrarImagenLado = esTrivia && Boolean(imagenTriviaUrl) && (revelada || umbralAlcanzado);

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

  if (mostrarSoloImagen) {
    return (
      <div style={s.wrap}>
        <LogoBar />
        <img src={imagenTriviaUrl} alt="" style={s.imagenGrande} />
      </div>
    );
  }

  if (mostrarImagenLado) {
    return (
      <div style={s.wrap}>
        <LogoBar />
        <div style={s.esquina}>
          <p style={s.esquinaLabel}>Código de acceso</p>
          <p style={s.esquinaCodigo}>{codigo}</p>
        </div>

        <div style={s.contenidoLado}>
          <h1 style={s.tituloLado}>{pagina.titulo}</h1>
          <div style={s.filaTrivia}>
            <div style={s.triviaTextoLado}>
              <p style={s.pregunta}>{pagina.config.pregunta}</p>
              <AlternativasTrivia pagina={pagina} trivia={trivia} />
              {trivia && (
                <p style={s.triviaTotal}>
                  {trivia.total} {trivia.total === 1 ? "respuesta" : "respuestas"}
                </p>
              )}
            </div>
            <div style={s.triviaImagenLado}>
              <img src={imagenTriviaUrl} alt="" style={s.triviaImagen} />
            </div>
          </div>
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

        {esTrivia && (
          <div style={s.trivia}>
            <p style={s.pregunta}>{pagina.config.pregunta}</p>
            <AlternativasTrivia pagina={pagina} trivia={trivia} />
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
  // Pantalla fija, sin scroll -igual que ProyeccionVivo-: un proyector
  // nunca debe hacer scroll. Antes era minHeight y la trivia con imagen
  // + 5 alternativas crecia por sobre 100vh.
  wrap: { height: "100vh", width: "100vw", boxSizing: "border-box", overflow: "hidden", background: "#0E1526", color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 80px", position: "relative" },

  // Fase 1 de trivia con imagen: imagen sola y completa (mismo tope que
  // imagenGrande de ProyeccionVivo).
  imagenGrande: { maxWidth: "92vw", maxHeight: "86vh", borderRadius: 12, objectFit: "contain", display: "block" },

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
  titulo: { fontSize: "clamp(28px, 5.2vh, 56px)", fontWeight: 800, margin: "0 0 2.4vh" },
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
  // Tamaños en vh (con tope en px) para que 5 alternativas quepan tambien
  // en proyectores de baja resolucion -mismo criterio que ProyeccionVivo-.
  pregunta: { fontSize: "clamp(20px, 3.2vh, 34px)", margin: "0 0 3vh" },
  alternativas: { display: "flex", flexDirection: "column", gap: "1.6vh", textAlign: "left", maxWidth: 700, margin: "0 auto" },
  alternativa: { display: "flex", alignItems: "center", gap: 20, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 16, padding: "1.6vh 28px", fontSize: "clamp(16px, 2.4vh, 26px)" },

  // Fase 2 de trivia con imagen: pregunta + alternativas a la izquierda,
  // imagen a la derecha usando toda la altura disponible, completa
  // (contain, nunca recortada).
  contenidoLado: { display: "flex", flexDirection: "column", width: "100%", maxWidth: 1500, height: "100%", minHeight: 0, textAlign: "center" },
  tituloLado: { fontSize: "clamp(24px, 4.4vh, 48px)", fontWeight: 800, margin: "0 0 2.5vh", flexShrink: 0 },
  filaTrivia: { display: "flex", gap: 40, alignItems: "center", flex: "1 1 auto", minHeight: 0, width: "100%" },
  triviaTextoLado: { flex: "1 1 0", minWidth: 0, maxHeight: "100%", display: "flex", flexDirection: "column", justifyContent: "center" },
  triviaImagenLado: { flex: "0 0 44%", height: "100%", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  triviaImagen: { maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", borderRadius: 12, display: "block" },
  // Mismo verde que AdminClaseVivo/Casos Clinicos para la opcion correcta
  // al revelar -#7FD98F-, consistente en todo el ecosistema.
  alternativaCorrecta: { border: "2px solid #7FD98F", background: "rgba(127,217,143,0.08)" },
  // Antes flexShrink:0 -una alternativa larga se salia de la fila-. Ahora
  // puede ajustarse en varias lineas, la barra conserva su minWidth.
  alternativaTexto: { flex: "0 1 auto", minWidth: 0 },
  letra: { width: 44, height: 44, borderRadius: "50%", background: "#4FC3D9", color: "#0E1526", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, flexShrink: 0 },
  letraCorrecta: { background: "#7FD98F" },
  // Barra de conteo en vivo, aparece junto al texto y crece con el % de
  // respuestas -mismo lenguaje visual que las barras de AdminClaseVivo,
  // escalado al tamaño de pantalla grande de proyeccion-.
  alternativaBarraFondo: { flex: 1, height: 14, borderRadius: 8, background: "#0E1526", overflow: "hidden", minWidth: 60 },
  alternativaBarraLlena: { height: "100%", background: "#4FC3D9", borderRadius: 8, transition: "width 0.4s ease" },
  alternativaBarraLlenaCorrecta: { background: "#7FD98F" },
  alternativaConteo: { flexShrink: 0, minWidth: 32, textAlign: "right", fontWeight: 800, color: "#94A3B8" },
  triviaTotal: { marginTop: "2vh", fontSize: 18, color: "#64748B" },
};
