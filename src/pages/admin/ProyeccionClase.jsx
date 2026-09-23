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

// Bloque de una pagina "titulo_texto": imagen manual (config.imagen_path,
// respetando config.disposicion_imagen) y grafico IA (config.imagen_svg)
// pueden coexistir -no se pisan-.
//
// Todo el contenido llena el area disponible de la pantalla (s.cuerpo,
// altura definida): los visuales reciben SIEMPRE una caja de tamaño
// definido y se escalan adentro preservando su proporcion. Antes la caja
// solo tenia maxWidth/maxHeight dentro de contenedores que median segun
// su contenido: una imagen lo resistia (tiene tamaño natural), pero el
// SVG del grafico IA no tiene tamaño propio y colapsaba a 0x0 -se veia
// solo un punto (el padding de la caja)-.
//
// - "grande": visuales arriba ocupando todo el alto que sobra, bullets
//   debajo (en 2 columnas si son varios, para no robarle alto al visual).
// - "lado_izquierda"/"lado_derecha": visuales en una columna de la mitad
//   del ancho y alto completo, bullets al otro lado.
//
// La imagen manual vive en un bucket PRIVADO (compartido con Casos
// Clinicos): el path es permanente, pero para mostrarla hace falta un
// token de acceso temporal fresco -se pide solo cuando cambia el path de
// la pagina activa (no en cada poll de 2s)-.
function ContenidoTituloTexto({ pagina }) {
  const bullets = pagina.config?.bullets || [];
  const imagenPath = pagina.config?.imagen_path || extraerPathDeUrlVencida(pagina.config?.imagen_url);
  const imagenSvg = pagina.config?.imagen_svg;
  const disposicion = pagina.config?.disposicion_imagen || "grande";

  const imagenUrl = useUrlImagen(imagenPath);
  const hayVisuales = Boolean(imagenUrl || imagenSvg);
  const hayBullets = bullets.length > 0;

  const bloqueSvg = imagenSvg && (
    <div style={s.cajaVisual}>
      <div className="grafico-ia-proyeccion" style={s.marcoGrafico} dangerouslySetInnerHTML={{ __html: imagenSvg }} />
    </div>
  );
  const bloqueImg = imagenUrl && (
    <div style={s.cajaVisual}>
      <img src={imagenUrl} alt="" style={s.imagen} />
    </div>
  );

  function listaBullets(variante) {
    if (!hayBullets) return null;
    const estiloLista =
      variante === "lado" ? s.bulletsLado
      : variante === "bajo" ? { ...s.bulletsBajo, gridTemplateColumns: bullets.length > 2 ? "1fr 1fr" : "1fr" }
      : { ...s.bullets, gridTemplateColumns: bullets.length > 7 ? "1fr 1fr" : "1fr" };
    const estiloItem = variante === "bajo" ? s.bulletItemBajo : variante === "lado" ? s.bulletItemLado : s.bulletItem;
    return (
      <ul style={estiloLista}>
        {bullets.map((linea, i) => (
          <li key={i} style={estiloItem}>
            <span style={s.bulletMarcador}>•</span>
            <span>{linea}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (!hayVisuales) {
    return listaBullets("solo");
  }

  if (disposicion === "grande" || !hayBullets) {
    return (
      <div style={s.columnaGrande}>
        <div style={s.filaVisuales}>{bloqueSvg}{bloqueImg}</div>
        {listaBullets("bajo")}
      </div>
    );
  }

  // lado_izquierda / lado_derecha
  return (
    <div style={{ ...s.filaLado, flexDirection: disposicion === "lado_derecha" ? "row-reverse" : "row" }}>
      <div style={s.columnaVisual}>{bloqueSvg}{bloqueImg}</div>
      {listaBullets("lado")}
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
      <div style={s.pantallaCentrada}>
        <LogoBar />
        <div style={s.qrBox}>
          <img src={qrUrl} alt="QR de la sesión" style={s.qrImg} />
          <p style={s.codigoLabel}>Código de acceso</p>
          <p style={s.codigo}>{codigo}</p>
        </div>
      </div>
    );
  }

  const esquina = (
    <div style={s.esquina}>
      <p style={s.esquinaLabel}>Código de acceso</p>
      <p style={s.esquinaCodigo}>{codigo}</p>
    </div>
  );

  if (mostrarSoloImagen) {
    return (
      <div style={s.pantallaCentrada}>
        <LogoBar />
        <img src={imagenTriviaUrl} alt="" style={s.imagenGrande} />
      </div>
    );
  }

  const totalRespuestas = trivia && (
    <p style={s.triviaTotal}>
      {trivia.total} {trivia.total === 1 ? "respuesta" : "respuestas"}
    </p>
  );

  return (
    <div style={s.pantalla}>
      <LogoBar />
      {esquina}

      <h1 style={s.titulo}>{pagina.titulo}</h1>

      <div style={s.cuerpo}>
        {pagina.tipo_herramienta === "titulo_texto" && <ContenidoTituloTexto pagina={pagina} />}

        {/* Trivia con imagen, fase 2 (50% votado o revelada): pregunta +
            alternativas con votacion en vivo a la izquierda, imagen
            completa a la derecha. */}
        {mostrarImagenLado && (
          <div style={s.filaLado}>
            <div style={s.triviaTexto}>
              <p style={s.pregunta}>{pagina.config.pregunta}</p>
              <AlternativasTrivia pagina={pagina} trivia={trivia} />
              {totalRespuestas}
            </div>
            <div style={s.columnaVisual}>
              <div style={s.cajaVisual}>
                <img src={imagenTriviaUrl} alt="" style={s.imagen} />
              </div>
            </div>
          </div>
        )}

        {/* Trivia sin imagen */}
        {esTrivia && !imagenTriviaUrl && (
          <div style={s.triviaTextoSolo}>
            <p style={s.pregunta}>{pagina.config.pregunta}</p>
            <AlternativasTrivia pagina={pagina} trivia={trivia} />
            {totalRespuestas}
          </div>
        )}

        {pagina.tipo_herramienta === "semaforo" && (
          <p style={s.subtitulo}>Responde en tu celular: ¿sigo la clase?</p>
        )}
      </div>

      {/* El SVG del grafico IA trae viewBox propio (800x600): con
          width/height 100% llena su marco y el navegador lo escala
          preservando la proporcion (preserveAspectRatio por defecto),
          sin deformarlo. */}
      <style>{`.grafico-ia-proyeccion svg { width: 100%; height: 100%; display: block; }`}</style>
    </div>
  );
}

const ACENTO = "#4FC3D9";
const FONDO = "#0E1526";
const TARJETA = "#16213A";
const BORDE = "1px solid rgba(244,241,233,0.12)";

const s = {
  // position:fixed + inset:0 -en vez de 100vw/100vh-: ocupa exactamente
  // la pantalla sin importar el margen por defecto del body (el proyecto
  // no tiene CSS global), sin barras de scroll ni borde claro.
  pantalla: { position: "fixed", inset: 0, boxSizing: "border-box", overflow: "hidden", background: FONDO, color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", flexDirection: "column", padding: "clamp(96px, 14vh, 140px) 5vw 5vh" },
  pantallaCentrada: { position: "fixed", inset: 0, boxSizing: "border-box", overflow: "hidden", background: FONDO, color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "4vh 4vw" },

  logoBar: { position: "absolute", top: 32, left: 40, display: "flex", alignItems: "center", gap: 20, zIndex: 50 },
  logoImg: { height: 32, width: "auto", objectFit: "contain", opacity: 0.92 },

  esquina: { position: "absolute", top: 28, right: 40, textAlign: "right" },
  esquinaLabel: { fontSize: 14, color: "#94A3B8", margin: "0 0 2px" },
  esquinaCodigo: { fontSize: 28, fontWeight: 800, letterSpacing: 4, color: ACENTO, margin: 0 },

  qrBox: { textAlign: "center" },
  qrImg: { width: "min(40vw, 40vh)", height: "min(40vw, 40vh)", borderRadius: 14, background: "#F4F1EA", padding: 14, marginBottom: 18 },
  codigoLabel: { fontSize: "1.4vw", color: "#94A3B8", margin: 0 },
  codigo: { fontSize: "3vw", fontWeight: 800, letterSpacing: 6, color: ACENTO, margin: "6px 0 0" },

  // Titulo alineado a la izquierda con una barra de acento: ancla la
  // pagina arriba y deja todo el resto del alto para el contenido.
  titulo: { flexShrink: 0, fontSize: "clamp(30px, 6.2vh, 68px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 3.5vh", paddingLeft: 22, borderLeft: `7px solid ${ACENTO}` },
  subtitulo: { fontSize: "clamp(20px, 3.6vh, 36px)", color: "#94A3B8", margin: 0 },

  // Area de contenido: altura definida (flex:1 + minHeight:0), la base
  // para que imagenes y graficos sepan cuanto pueden crecer.
  cuerpo: { flex: "1 1 auto", minHeight: 0, width: "100%", display: "flex", flexDirection: "column", justifyContent: "center" },

  // ---- visuales ----
  cajaVisual: { flex: "1 1 0", minWidth: 0, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  // Marco del grafico IA: fondo claro -los SVG vienen con fondo blanco o
  // transparente y texto oscuro-, proporcion 4:3 como su viewBox.
  marcoGrafico: { height: "100%", maxWidth: "100%", aspectRatio: "4 / 3", boxSizing: "border-box", background: "#FFFFFF", borderRadius: 14, padding: "1.5vh" },
  imagen: { maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", borderRadius: 14, display: "block" },
  imagenGrande: { maxWidth: "92vw", maxHeight: "86vh", borderRadius: 12, objectFit: "contain", display: "block" },

  // "grande": visuales arriba con todo el alto que sobra, bullets debajo
  columnaGrande: { flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", gap: "3vh" },
  filaVisuales: { flex: "1 1 0", minHeight: 0, display: "flex", gap: "3vw" },

  // "lado": columna visual de la mitad del ancho, alto completo
  filaLado: { flex: "1 1 auto", minHeight: 0, display: "flex", gap: "4vw", alignItems: "stretch" },
  columnaVisual: { flex: "0 0 48%", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: "2vh" },

  // ---- bullets ----
  bulletMarcador: { color: ACENTO, fontWeight: 800, flexShrink: 0 },
  // Sin visuales: ocupan todo el ancho util
  bullets: { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "2vh 3vw", width: "100%" },
  bulletItem: { display: "flex", alignItems: "flex-start", gap: 18, background: TARJETA, border: BORDE, borderRadius: 14, padding: "2vh 2vw", fontSize: "clamp(20px, 3.4vh, 38px)", lineHeight: 1.3 },
  // Al lado de un visual: centrados en vertical en su mitad
  bulletsLado: { listStyle: "none", padding: 0, margin: 0, flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: "2vh" },
  bulletItemLado: { display: "flex", alignItems: "flex-start", gap: 16, background: TARJETA, border: BORDE, borderRadius: 14, padding: "1.8vh 1.6vw", fontSize: "clamp(18px, 3vh, 32px)", lineHeight: 1.3 },
  // Debajo de un visual grande: compactos, en 2 columnas si son varios
  bulletsBajo: { listStyle: "none", padding: 0, margin: 0, flexShrink: 0, display: "grid", gap: "1.4vh 2vw" },
  bulletItemBajo: { display: "flex", alignItems: "flex-start", gap: 14, background: TARJETA, border: BORDE, borderRadius: 12, padding: "1.2vh 1.4vw", fontSize: "clamp(16px, 2.5vh, 26px)", lineHeight: 1.3 },

  // ---- trivia ----
  triviaTexto: { flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" },
  triviaTextoSolo: { width: "100%", maxWidth: 1300, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center" },
  pregunta: { fontSize: "clamp(22px, 3.6vh, 40px)", fontWeight: 700, lineHeight: 1.25, margin: "0 0 3vh" },
  alternativas: { display: "flex", flexDirection: "column", gap: "1.6vh", textAlign: "left" },
  alternativa: { display: "flex", alignItems: "center", gap: 20, background: TARJETA, border: BORDE, borderRadius: 16, padding: "1.6vh 1.6vw", fontSize: "clamp(16px, 2.6vh, 28px)" },
  // Mismo verde que AdminClaseVivo/Casos Clinicos para la opcion correcta
  // al revelar -#7FD98F-, consistente en todo el ecosistema.
  alternativaCorrecta: { border: "2px solid #7FD98F", background: "rgba(127,217,143,0.08)" },
  alternativaTexto: { flex: "0 1 auto", minWidth: 0 },
  letra: { width: "clamp(32px, 4.6vh, 48px)", height: "clamp(32px, 4.6vh, 48px)", borderRadius: "50%", background: ACENTO, color: FONDO, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "clamp(16px, 2.4vh, 24px)", flexShrink: 0 },
  letraCorrecta: { background: "#7FD98F" },
  // Barra de conteo en vivo, crece con el % de respuestas.
  alternativaBarraFondo: { flex: 1, height: 14, borderRadius: 8, background: FONDO, overflow: "hidden", minWidth: 60 },
  alternativaBarraLlena: { height: "100%", background: ACENTO, borderRadius: 8, transition: "width 0.4s ease" },
  alternativaBarraLlenaCorrecta: { background: "#7FD98F" },
  alternativaConteo: { flexShrink: 0, minWidth: 32, textAlign: "right", fontWeight: 800, color: "#94A3B8" },
  triviaTotal: { marginTop: "2vh", fontSize: 18, color: "#64748B" },
};
