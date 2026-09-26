import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  clasesFormalesActual,
  clasesFormalesTrivia,
  clasesFormalesMedia,
  clasesFormalesSesiones,
  sesionResolver,
} from "../../api/clasesFormalesCliente";

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;

// ============================================================================
// AJUSTE AUTOMATICO DEL TEXTO AL ALTO DISPONIBLE
// ============================================================================
// La letra se mide en cqh (alto de la pantalla) y las columnas de texto en
// cqw (ancho). Si la pantalla se hace proporcionalmente mas alta -F11 quita
// las barras del navegador y gana ~140px de alto sin ganar ancho-, la letra
// crece pero la columna no: cada linea parte en mas lineas y el total se
// cortaba abajo. Este ajuste mide si el contenido cabe en su caja y, solo si
// no cabe, reduce la variable --ajuste (que multiplica tamaños de letra,
// separaciones y rellenos del texto) lo justo para que entre completo. Si
// cabe, --ajuste queda en 1 y todo se ve exactamente igual que antes.
// Se recalcula en cada render (cambio de pagina, votos) y cuando cambia el
// tamaño de la caja (entrar/salir de F11, redimensionar). Las imagenes no
// se ven afectadas: su tamaño depende de la caja, no de la letra.
const AJUSTE_MINIMO = 0.45;

function ajustarAlAlto(el) {
  if (!el) return;
  el.style.setProperty("--ajuste", "1");
  if (el.scrollHeight <= el.clientHeight + 1) return;
  let cabe = AJUSTE_MINIMO;
  let noCabe = 1;
  for (let i = 0; i < 9; i++) {
    const medio = (cabe + noCabe) / 2;
    el.style.setProperty("--ajuste", String(medio));
    if (el.scrollHeight <= el.clientHeight + 1) cabe = medio;
    else noCabe = medio;
  }
  el.style.setProperty("--ajuste", String(cabe));
}

// Devuelve un ref para la caja cuyo contenido debe caber (callback ref:
// sirve aunque el elemento cambie entre un render y otro).
function useAjusteAlAlto() {
  const elRef = useRef(null);
  const observadorRef = useRef(null);

  const asignar = useCallback((el) => {
    if (observadorRef.current) {
      observadorRef.current.disconnect();
      observadorRef.current = null;
    }
    elRef.current = el;
    if (el && typeof ResizeObserver !== "undefined") {
      const observador = new ResizeObserver(() => ajustarAlAlto(el));
      observador.observe(el);
      observadorRef.current = observador;
    }
  }, []);

  // Sin dependencias a proposito: en cada render el texto puede cambiar.
  useLayoutEffect(() => {
    ajustarAlAlto(elRef.current);
  });

  useEffect(() => () => observadorRef.current?.disconnect(), []);

  return asignar;
}

// ============================================================================
// PANTALLA COMPARTIDA: proyeccion real + preview del constructor
// ============================================================================
// <PantallaClase> es UN SOLO componente que dibuja una pagina de la clase.
// Lo usan esta proyeccion (a pantalla completa) y el preview de
// AdminClaseConstructor.jsx (dentro de su caja 16:9). Como es el mismo
// codigo, el preview es una copia a escala exacta de lo que se proyecta:
// si algo se ve mal en el preview, se ve mal en la proyeccion, y viceversa.
//
// Para que escale igual en ambos lugares, TODAS las medidas estan en
// unidades del contenedor (cqh = % del alto, cqw = % del ancho de la
// pantalla que lo contiene), nunca en px ni en vh/vw (esos dependen de la
// ventana del navegador, no de la pantalla dibujada). El contenedor que lo
// envuelve debe declarar containerType: "size" (ver s.contenedorFijo aca
// y el preview del constructor).
// ============================================================================

// Paginas guardadas ANTES del arreglo de imagenes tienen config.imagen_url
// (el link firmado que vencia, ya vencido) pero nunca guardaron
// config.imagen_path. El path real sigue adentro de ese link vencido, como
// texto: se extrae con esta regex para no obligar a resubir nada (misma
// logica que en AdminClaseConstructor.jsx).
export function extraerPathDeUrlVencida(urlVieja) {
  if (!urlVieja) return null;
  const match = urlVieja.match(/\/object\/sign\/casos\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Path permanente de la imagen manual de una pagina (titulo_texto o trivia).
export function pathImagenPagina(config) {
  return config?.imagen_path || extraerPathDeUrlVencida(config?.imagen_url) || null;
}

// REGLA DE DISPOSICION (unica, la usan proyeccion y constructor):
//   - Hay texto + imagen/grafico -> SIEMPRE al lado. Solo se elige el lado:
//     "lado_derecha" pone la imagen a la derecha; cualquier otro valor
//     (incluido el "grande" antiguo) la deja a la izquierda.
//   - Imagen/grafico SIN texto  -> grande y centrada (automatico).
export function resolverDisposicion(config, hayTexto) {
  if (!hayTexto) return "grande";
  return config?.disposicion_imagen === "lado_derecha" ? "lado_derecha" : "lado_izquierda";
}

// Token de acceso fresco para una imagen del bucket privado "casos": solo
// se pide cuando cambia el path, no en cada poll de 2s.
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

// Logos institucionales, arriba a la izquierda dentro de la franja
// superior. En la portada (pagina de solo titulo) van mas grandes: ahi no
// hay contenido al que quitarle espacio.
//
// variante "columna": apilados en la columna lateral izquierda. Se usa
// solo en imagen/grafico SIN contenido (un 4:3 deja libres los costados
// de una pantalla 16:9; subir los logos ahi le devuelve alto a la imagen).
export function LogoBar({ grandes, columna }) {
  if (columna) {
    return (
      <div style={s.logoColumna}>
        <img src="/logo-utal.png" alt="UTAL" style={s.logoColumnaAncho} />
        <img src="/logo-ica.png" alt="ICA" style={s.logoColumnaCuadrado} />
        <img src="/logo-hipokratia.png" alt="Hipokratia" style={s.logoColumnaCuadrado} />
      </div>
    );
  }
  const estiloImg = grandes ? s.logoImgGrande : s.logoImg;
  return (
    <div style={grandes ? s.logoBarGrande : s.logoBar}>
      <img src="/logo-utal.png" alt="UTAL" style={estiloImg} />
      <img src="/logo-ica.png" alt="ICA" style={estiloImg} />
      <img src="/logo-hipokratia.png" alt="Hipokratia" style={estiloImg} />
    </div>
  );
}

// QR siempre visible en la esquina, con el codigo al lado como respaldo:
// un atrasado se une en cualquier momento. Vive dentro de la franja
// superior (igual que los logos), nunca le quita espacio al contenido.
//
// variante "columna": QR grande arriba en la columna lateral derecha, con
// el codigo debajo (solo imagen/grafico sin contenido, igual que LogoBar).
export function Esquina({ codigo, qrUrl, columna }) {
  if (columna) {
    return (
      <div style={s.qrColumna}>
        {qrUrl && <img src={qrUrl} alt="QR de la sesión" style={s.qrColumnaImg} />}
        <p style={s.esquinaLabel}>Únete a la clase</p>
        <p style={s.qrColumnaCodigo}>{codigo}</p>
      </div>
    );
  }
  return (
    <div style={s.esquina}>
      <div style={s.esquinaTexto}>
        <p style={s.esquinaLabel}>Únete a la clase</p>
        <p style={s.esquinaCodigo}>{codigo}</p>
      </div>
      {qrUrl && <img src={qrUrl} alt="QR de la sesión" style={s.esquinaQr} />}
    </div>
  );
}

// Imagen manual y/o grafico IA, cada uno en una caja de tamaño definido
// (se escala adentro preservando su proporcion). Sin caja definida el SVG
// del grafico IA no tiene tamaño propio y colapsaba a 0x0.
// Proporcion real del grafico IA, leida de su viewBox (hoy todos son
// 800x600 = 4:3, pero se respeta cualquier otro formato sin deformarlo).
function proporcionSvg(svg) {
  const m = (svg || "").match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  const ancho = m ? parseFloat(m[1]) : 0;
  const alto = m ? parseFloat(m[2]) : 0;
  return ancho > 0 && alto > 0 ? `${ancho} / ${alto}` : "4 / 3";
}

function BloqueVisuales({ imagenUrl, imagenSvg, apilados }) {
  return (
    <div style={apilados ? s.visualesApilados : s.visualesFila}>
      {imagenSvg && (
        <div style={s.cajaVisual}>
          <div className="grafico-ia-pantalla" style={{ ...s.marcoGrafico, aspectRatio: proporcionSvg(imagenSvg) }} dangerouslySetInnerHTML={{ __html: imagenSvg }} />
        </div>
      )}
      {imagenUrl && (
        <div style={s.cajaVisual}>
          <img src={imagenUrl} alt="" style={s.imagen} />
        </div>
      )}
    </div>
  );
}

function ContenidoTituloTexto({ config, imagenUrl }) {
  const bullets = config?.bullets || [];
  const imagenSvg = config?.imagen_svg;
  const hayVisuales = Boolean(imagenUrl || imagenSvg);
  const hayTexto = bullets.length > 0;

  if (!hayVisuales && !hayTexto) return null;

  // Solo texto: todo el ancho util (2 columnas si son muchos puntos)
  if (!hayVisuales) {
    return (
      <ul style={{ ...s.bullets, gridTemplateColumns: bullets.length > 7 ? "1fr 1fr" : "1fr" }}>
        {bullets.map((linea, i) => (
          <li key={i} style={s.bulletItem}>
            <span style={s.bulletMarcador}>•</span>
            <span>{linea}</span>
          </li>
        ))}
      </ul>
    );
  }

  const disposicion = resolverDisposicion(config, hayTexto);

  // Imagen/grafico sin texto: grande y centrado, todo el espacio
  if (disposicion === "grande") {
    return <BloqueVisuales imagenUrl={imagenUrl} imagenSvg={imagenSvg} />;
  }

  // Texto + imagen: al lado. Visual en la mitad del ancho con el alto
  // completo, texto al otro lado centrado en vertical.
  return (
    <div style={{ ...s.filaLado, flexDirection: disposicion === "lado_derecha" ? "row-reverse" : "row" }}>
      <div style={s.columnaVisual}>
        <BloqueVisuales imagenUrl={imagenUrl} imagenSvg={imagenSvg} apilados />
      </div>
      <ul style={s.bulletsLado}>
        {bullets.map((linea, i) => (
          <li key={i} style={s.bulletItemLado}>
            <span style={s.bulletMarcador}>•</span>
            <span>{linea}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Alternativas de la trivia con barra de votos en vivo. Cada fila es una
// grilla de columnas FIJAS (letra | texto | barra | conteo): todas las
// barras tienen el mismo ancho y empiezan en el mismo punto, sin importar
// el largo del texto -si no, una barra al 50% se veria distinta en cada
// fila y no se podria comparar cual gana-. El texto largo se ajusta en
// varias lineas dentro de su columna.
function AlternativasTrivia({ config, trivia, compacta }) {
  return (
    <div style={s.alternativas}>
      {(config.alternativas || []).map((alt, i) => {
        const letra = String.fromCharCode(65 + i);
        const total = trivia?.total || 0;
        const conteo = trivia?.conteos?.[letra] || 0;
        const pct = total > 0 ? Math.round((conteo / total) * 100) : 0;
        const esCorrecta = Boolean(trivia?.revelada) && config.correcta === i;
        return (
          <div key={i} style={{ ...s.alternativa, ...(compacta ? s.alternativaCompacta : {}), ...(esCorrecta ? s.alternativaCorrecta : {}) }}>
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

// Una pagina completa (franja con logos + QR, titulo y contenido). Debe ir
// dentro de un contenedor con containerType:"size".
//   pagina    -> { titulo, tipo_herramienta, config }
//   imagenUrl -> token ya resuelto de la imagen manual (o null)
//   trivia    -> { total, conteos, revelada } (o null: barras en cero)
export function PantallaClase({ pagina, imagenUrl, trivia, codigo, qrUrl }) {
  const config = pagina?.config || {};
  const tipo = pagina?.tipo_herramienta;
  const esTrivia = tipo === "trivia";

  // PORTADA: pagina sin contenido (solo titulo, o titulo_texto sin texto
  // ni imagen ni grafico). Titulo grande al centro de la pantalla y
  // logos mas grandes. Se mira el config (no la URL ya resuelta de la
  // imagen) para no mostrar la portada un instante mientras carga.
  const tieneContenidoTituloTexto =
    (config.bullets || []).length > 0 || Boolean(config.imagen_svg) || Boolean(pathImagenPagina(config)) || Boolean(imagenUrl);
  const esPortada = !esTrivia && tipo !== "semaforo" && !(tipo === "titulo_texto" && tieneContenidoTituloTexto);

  // Hooks antes de cualquier return (reglas de hooks): el texto del cuerpo
  // y el titulo se ajustan para caber siempre en su caja.
  const refCuerpo = useAjusteAlAlto();
  const refTitulo = useAjusteAlAlto();

  if (esPortada) {
    return (
      <div style={s.pantalla}>
        <LogoBar grandes />
        <Esquina codigo={codigo} qrUrl={qrUrl} />
        <div ref={refCuerpo} style={s.portadaCentro}>
          <h1 style={s.tituloPortada}>{pagina?.titulo || "Título de la página"}</h1>
          <div style={s.acentoPortada} />
        </div>
      </div>
    );
  }

  // IMAGEN/GRAFICO SIN CONTENIDO (titulo_texto sin texto): logos y QR
  // pasan a columnas laterales -el espacio que un 4:3 deja libre a los
  // lados- y el titulo queda en una franja delgada arriba. La imagen gana
  // todo el alto restante.
  const esSoloVisual = tipo === "titulo_texto" && (config.bullets || []).length === 0;
  if (esSoloVisual) {
    return (
      <div style={s.pantallaLateral}>
        <LogoBar columna />
        <Esquina codigo={codigo} qrUrl={qrUrl} columna />
        <h1 style={s.tituloLateral}>{pagina?.titulo || "Título de la página"}</h1>
        <div ref={refCuerpo} style={s.cuerpo}>
          <ContenidoTituloTexto config={config} imagenUrl={imagenUrl} />
        </div>
        <style>{`.grafico-ia-pantalla svg { width: 100%; height: 100%; display: block; }`}</style>
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
      <Esquina codigo={codigo} qrUrl={qrUrl} />

      {/* Paginas con contenido: titulo DENTRO de la franja superior,
          centrado entre los logos y el QR -no ocupa una fila propia, asi
          todo el alto bajo la franja queda para el contenido-. */}
      <h1 ref={refTitulo} style={s.tituloFranja}>{pagina?.titulo || "Título de la página"}</h1>

      <div ref={refCuerpo} style={s.cuerpo}>
        {tipo === "titulo_texto" && <ContenidoTituloTexto config={config} imagenUrl={imagenUrl} />}

        {/* Trivia con imagen (fase de votacion en vivo): pregunta +
            alternativas a la izquierda, imagen completa a la derecha. */}
        {esTrivia && imagenUrl && (
          <div style={s.filaLado}>
            <div style={s.triviaTexto}>
              <p style={s.pregunta}>{config.pregunta || "Pregunta de la trivia"}</p>
              <AlternativasTrivia config={config} trivia={trivia} compacta />
              {totalRespuestas}
            </div>
            <div style={s.columnaVisualTrivia}>
              <BloqueVisuales imagenUrl={imagenUrl} apilados />
            </div>
          </div>
        )}

        {esTrivia && !imagenUrl && (
          <div style={s.triviaTextoSolo}>
            <p style={s.pregunta}>{config.pregunta || "Pregunta de la trivia"}</p>
            <AlternativasTrivia config={config} trivia={trivia} />
            {totalRespuestas}
          </div>
        )}

        {tipo === "semaforo" && (
          <p style={s.subtitulo}>Responde en tu celular: ¿sigo la clase?</p>
        )}
      </div>

      {/* El SVG del grafico IA trae viewBox propio: con width/height 100%
          llena su marco (de la misma proporcion) sin deformarse. */}
      <style>{`.grafico-ia-pantalla svg { width: 100%; height: 100%; display: block; }`}</style>
    </div>
  );
}

// ============================================================================
// PROYECCION (pantalla grande). Publica, sin auth. Muestra pregunta y
// alternativas de la trivia con barras de conteo en vivo y, al revelar, la
// correcta en verde. Mientras la sesion no tiene pagina activa (404 en
// /actual), muestra el QR grande.
// ============================================================================
export default function ProyeccionClase() {
  const { codigo } = useParams();
  const [pagina, setPagina] = useState(null);
  const [trivia, setTrivia] = useState(null);
  const [sesionId, setSesionId] = useState(null);
  const [presentes, setPresentes] = useState(0);

  // sesion_id a partir del codigo (una sola vez): hace falta para leer la
  // asistencia, base del umbral del 50% (votos / presentes, igual que
  // Casos Clinicos).
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

        if (data?.tipo_herramienta === "trivia") {
          const resultadoTrivia = await clasesFormalesTrivia.resultado(data.id);
          setTrivia(resultadoTrivia);

          // Asistencia aparte: si falla, no tumba el resultado de la trivia.
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
        // Sin pagina activa todavia (o fallo transitorio): QR grande.
        setPagina(null);
        setTrivia(null);
      }
    }
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [codigo, sesionId]);

  // Hook antes de cualquier return temprano (reglas de hooks). Sirve para
  // titulo_texto y trivia (incluye paginas antiguas con imagen_url).
  const imagenUrl = useUrlImagen(pathImagenPagina(pagina?.config));

  // Trivia con imagen, igual que Casos Clinicos: mientras se vota y aun no
  // responde el 50% de los presentes, la imagen va SOLA y completa. Al
  // llegar al 50% (o al revelar) pasa a alternativas + imagen al lado.
  const esTrivia = pagina?.tipo_herramienta === "trivia" && Boolean(pagina?.config?.pregunta);
  const totalVotos = trivia?.total || 0;
  const umbralAlcanzado = presentes > 0 && totalVotos / presentes >= 0.5;
  const revelada = Boolean(trivia?.revelada);
  const mostrarSoloImagen = esTrivia && Boolean(imagenUrl) && !revelada && !umbralAlcanzado;

  const linkAlumno = `${APP_URL}/alumno-vivo/${codigo}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(linkAlumno)}`;
  const qrUrlChico = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(linkAlumno)}`;

  if (!pagina) {
    return (
      <div style={s.contenedorFijo}>
        <div style={s.pantallaCentrada}>
          <LogoBar />
          <div style={s.qrBox}>
            <img src={qrUrl} alt="QR de la sesión" style={s.qrImg} />
            <p style={s.codigoLabel}>Código de acceso</p>
            <p style={s.codigo}>{codigo}</p>
          </div>
        </div>
      </div>
    );
  }

  if (mostrarSoloImagen) {
    return (
      <div style={s.contenedorFijo}>
        {/* Imagen sin contenido: logos y QR en columnas laterales para
            que la imagen use todo el alto. Sin titulo (no adelantar nada
            mientras votan). */}
        <div style={s.pantallaImagenSola}>
          <LogoBar columna />
          <Esquina codigo={codigo} qrUrl={qrUrlChico} columna />
          <img src={imagenUrl} alt="" style={s.imagenGrande} />
        </div>
      </div>
    );
  }

  return (
    <div style={s.contenedorFijo}>
      <PantallaClase pagina={pagina} imagenUrl={imagenUrl} trivia={trivia} codigo={codigo} qrUrl={qrUrlChico} />
    </div>
  );
}

// ============================================================================
// ESTILOS -todo en cqh/cqw (relativo a la pantalla dibujada)-
// ============================================================================
const ACENTO = "#4FC3D9";
const FONDO = "#0E1526";
const TARJETA = "#16213A";
const BORDE = "1px solid rgba(244,241,233,0.12)";
// Franja superior (logos + QR): el contenido empieza debajo de ella.
const FRANJA = 14;   // cqh
const ALTO_LOGO = 10;        // cqh (paginas con contenido, dentro de la franja)
const ALTO_LOGO_PORTADA = 15; // cqh (portada: sin contenido que respetar)
const ALTO_QR = 12;  // cqh
// Imagen/grafico sin contenido: columnas laterales y franja delgada
const LATERAL = 12;         // cqw (ancho de cada columna lateral)
const FRANJA_DELGADA = 9;   // cqh (solo el titulo)

const s = {
  // Contenedor de la proyeccion real: ocupa la ventana exacta
  // (position:fixed + inset:0, sin depender del margen del body, sin
  // scroll) y declara containerType:"size" para que las unidades
  // cqh/cqw de PantallaClase se midan contra la pantalla.
  contenedorFijo: { position: "fixed", inset: 0, containerType: "size", overflow: "hidden", background: FONDO },

  pantalla: { position: "absolute", inset: 0, boxSizing: "border-box", overflow: "hidden", background: FONDO, color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", flexDirection: "column", padding: `${FRANJA}cqh 5cqw 3cqh`, textAlign: "left" },
  // Imagen/grafico sin contenido: columnas laterales (logos | QR) de
  // LATERAL cqw cada una y titulo en una franja delgada arriba.
  pantallaLateral: { position: "absolute", inset: 0, boxSizing: "border-box", overflow: "hidden", background: FONDO, color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", flexDirection: "column", padding: `${FRANJA_DELGADA}cqh ${LATERAL}cqw 3cqh` },
  pantallaCentrada: { position: "absolute", inset: 0, boxSizing: "border-box", overflow: "hidden", color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", alignItems: "center", justifyContent: "center" },
  pantallaImagenSola: { position: "absolute", inset: 0, boxSizing: "border-box", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: `3cqh ${LATERAL}cqw 3cqh` },

  logoBar: { position: "absolute", top: `${(FRANJA - ALTO_LOGO) / 2}cqh`, left: "3cqw", display: "flex", alignItems: "center", gap: "1.6cqw", zIndex: 50 },
  logoImg: { height: `${ALTO_LOGO}cqh`, width: "auto", objectFit: "contain" },
  logoBarGrande: { position: "absolute", top: "4cqh", left: "4cqw", display: "flex", alignItems: "center", gap: "2.2cqw", zIndex: 50 },
  logoImgGrande: { height: `${ALTO_LOGO_PORTADA}cqh`, width: "auto", objectFit: "contain" },
  // Columna lateral izquierda: logos apilados, centrados en su columna
  logoColumna: { position: "absolute", top: "3cqh", left: 0, width: `${LATERAL}cqw`, display: "flex", flexDirection: "column", alignItems: "center", gap: "3cqh", zIndex: 50 },
  logoColumnaAncho: { width: `${LATERAL - 3}cqw`, height: "auto", objectFit: "contain" },
  logoColumnaCuadrado: { width: `${(LATERAL - 3) * 0.72}cqw`, height: "auto", objectFit: "contain" },
  // Columna lateral derecha: QR grande con el codigo debajo
  qrColumna: { position: "absolute", top: "3cqh", right: 0, width: `${LATERAL}cqw`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", zIndex: 50 },
  qrColumnaImg: { width: `${LATERAL - 3}cqw`, height: `${LATERAL - 3}cqw`, boxSizing: "border-box", background: "#FFFFFF", padding: "0.8cqh", borderRadius: "0.8cqh", display: "block", marginBottom: "1.4cqh" },
  qrColumnaCodigo: { fontSize: "3.2cqh", fontWeight: 800, letterSpacing: "0.3cqh", color: ACENTO, margin: 0 },

  esquina: { position: "absolute", top: `${(FRANJA - ALTO_QR) / 2}cqh`, right: "3cqw", display: "flex", alignItems: "center", gap: "1.2cqw", zIndex: 50 },
  esquinaTexto: { textAlign: "right" },
  esquinaLabel: { fontSize: "1.8cqh", color: "#94A3B8", margin: "0 0 0.3cqh" },
  esquinaCodigo: { fontSize: "3.6cqh", fontWeight: 800, letterSpacing: "0.4cqh", color: ACENTO, margin: 0 },
  // Fondo blanco + padding = zona de silencio que necesita el lector de QR
  esquinaQr: { height: `${ALTO_QR}cqh`, width: `${ALTO_QR}cqh`, boxSizing: "border-box", background: "#FFFFFF", padding: "0.8cqh", borderRadius: "0.8cqh", display: "block" },

  qrBox: { textAlign: "center" },
  qrImg: { width: "min(40cqw, 40cqh)", height: "min(40cqw, 40cqh)", borderRadius: "1.5cqh", background: "#F4F1EA", padding: "1.5cqh", marginBottom: "2cqh" },
  codigoLabel: { fontSize: "2.4cqh", color: "#94A3B8", margin: 0 },
  codigo: { fontSize: "5.4cqh", fontWeight: 800, letterSpacing: "0.6cqh", color: ACENTO, margin: "0.6cqh 0 0" },

  // Paginas con contenido: titulo dentro de la franja superior, centrado
  // en el espacio libre ENTRE los logos (terminan ~29cqw) y el bloque del
  // QR + codigo (empieza ~78cqw), hasta 2 lineas.
  tituloFranja: { position: "absolute", top: 0, left: "29cqw", right: "22cqw", height: `${FRANJA}cqh`, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: "calc(var(--ajuste, 1) * 4.6cqh)", fontWeight: 800, lineHeight: 1.1, zIndex: 40 },
  // Imagen/grafico sin contenido: titulo en la franja delgada, entre las
  // columnas laterales, una linea.
  tituloLateral: { position: "absolute", top: 0, left: `${LATERAL}cqw`, right: `${LATERAL}cqw`, height: `${FRANJA_DELGADA}cqh`, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: "4.4cqh", fontWeight: 800, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", zIndex: 40 },

  // Portada: titulo grande al centro exacto del espacio bajo la franja
  portadaCentro: { flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: `${FRANJA / 2}cqh` },
  tituloPortada: { fontSize: "calc(var(--ajuste, 1) * 10cqh)", fontWeight: 800, lineHeight: 1.12, margin: 0, textAlign: "center", maxWidth: "80cqw" },
  acentoPortada: { width: "12cqw", height: "0.9cqh", borderRadius: "0.45cqh", background: ACENTO, marginTop: "3cqh" },
  subtitulo: { fontSize: "calc(var(--ajuste, 1) * 3.6cqh)", color: "#94A3B8", margin: 0 },

  // Area de contenido con alto definido: base para que imagenes y
  // graficos sepan cuanto pueden crecer.
  // "safe center": si algo no cupiera, se recorta abajo, nunca tapa el titulo.
  cuerpo: { flex: "1 1 auto", minHeight: 0, width: "100%", display: "flex", flexDirection: "column", justifyContent: "safe center" },

  // ---- visuales ----
  visualesFila: { flex: "1 1 auto", minHeight: 0, width: "100%", display: "flex", gap: "3cqw" },
  visualesApilados: { flex: "1 1 auto", minHeight: 0, height: "100%", display: "flex", flexDirection: "column", gap: "2cqh" },
  cajaVisual: { flex: "1 1 0", minWidth: 0, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  // Marco del grafico IA: fondo blanco (el SVG viene con fondo blanco o
  // transparente y texto oscuro), proporcion 4:3 como su viewBox.
  marcoGrafico: { height: "100%", maxWidth: "100%", aspectRatio: "4 / 3", boxSizing: "border-box", background: "#FFFFFF", borderRadius: "1.5cqh", padding: "1.5cqh" },
  // La imagen OCUPA toda su caja (width/height 100%) y objectFit:contain
  // la escala -hacia arriba o hacia abajo- hasta llenar el alto o el ancho
  // disponible, completa, sin recortar ni deformar. Antes solo tenia
  // maxWidth/maxHeight: eso achica las grandes pero NUNCA agranda las
  // chicas (una foto de 350px quedaba de 350px en medio de la pantalla).
  imagen: { width: "100%", height: "100%", objectFit: "contain", display: "block" },
  imagenGrande: { width: "100%", height: "100%", objectFit: "contain", display: "block" },

  // Texto + imagen al lado: visual en la mitad del ancho, alto completo
  filaLado: { flex: "1 1 auto", minHeight: 0, display: "flex", gap: "4cqw", alignItems: "stretch" },
  columnaVisual: { flex: "0 0 48%", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" },
  // Trivia con imagen: la imagen cede algo de ancho a las alternativas,
  // que llevan texto + barra en la misma fila.
  columnaVisualTrivia: { flex: "0 0 40%", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" },

  // ---- bullets ----
  bulletMarcador: { color: ACENTO, fontWeight: 800, flexShrink: 0 },
  bullets: { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "calc(var(--ajuste, 1) * 2cqh) 3cqw", width: "100%" },
  bulletItem: { display: "flex", alignItems: "flex-start", gap: "1.2cqw", background: TARJETA, border: BORDE, borderRadius: "calc(var(--ajuste, 1) * 1.5cqh)", padding: "calc(var(--ajuste, 1) * 2cqh) 2cqw", fontSize: "calc(var(--ajuste, 1) * 3.4cqh)", lineHeight: 1.3 },
  bulletsLado: { listStyle: "none", padding: 0, margin: 0, flex: "1 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "safe center", gap: "calc(var(--ajuste, 1) * 2cqh)" },
  bulletItemLado: { display: "flex", alignItems: "flex-start", gap: "1cqw", background: TARJETA, border: BORDE, borderRadius: "calc(var(--ajuste, 1) * 1.5cqh)", padding: "calc(var(--ajuste, 1) * 1.8cqh) 1.6cqw", fontSize: "calc(var(--ajuste, 1) * 3.3cqh)", lineHeight: 1.3 },

  // ---- trivia ----
  triviaTexto: { flex: "1 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "safe center" },
  triviaTextoSolo: { width: "100%", maxWidth: "82cqw", margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center" },
  pregunta: { fontSize: "calc(var(--ajuste, 1) * 3.6cqh)", fontWeight: 700, lineHeight: 1.25, margin: "0 0 calc(var(--ajuste, 1) * 3cqh)" },
  alternativas: { display: "flex", flexDirection: "column", gap: "calc(var(--ajuste, 1) * 1.6cqh)" },
  // Grilla de columnas fijas: letra | texto | barra (40%, igual en todas
  // las filas) | conteo.
  alternativa: { display: "grid", gridTemplateColumns: "auto 1fr 40% 3.2em", alignItems: "center", columnGap: "1.2cqw", background: TARJETA, border: BORDE, borderRadius: "calc(var(--ajuste, 1) * 1.7cqh)", padding: "calc(var(--ajuste, 1) * 1.6cqh) 1.6cqw", fontSize: "calc(var(--ajuste, 1) * 2.6cqh)" },
  // Mismo verde que AdminClaseVivo/Casos Clinicos para la correcta.
  alternativaCorrecta: { border: "2px solid #7FD98F", background: "rgba(127,217,143,0.08)" },
  // Al lado de una imagen: barra algo mas angosta (igual en todas las
  // filas) y un poco menos de padding, para que el texto respire.
  alternativaCompacta: { gridTemplateColumns: "auto 1fr 28% 2.6em", padding: "calc(var(--ajuste, 1) * 1.3cqh) 1.4cqw", fontSize: "calc(var(--ajuste, 1) * 2.5cqh)" },
  alternativaTexto: { minWidth: 0, lineHeight: 1.25 },
  letra: { width: "calc(var(--ajuste, 1) * 4.6cqh)", height: "calc(var(--ajuste, 1) * 4.6cqh)", borderRadius: "50%", background: ACENTO, color: FONDO, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "calc(var(--ajuste, 1) * 2.4cqh)" },
  letraCorrecta: { background: "#7FD98F" },
  alternativaBarraFondo: { height: "calc(var(--ajuste, 1) * 1.5cqh)", borderRadius: "calc(var(--ajuste, 1) * 0.8cqh)", background: FONDO, overflow: "hidden" },
  alternativaBarraLlena: { height: "100%", background: ACENTO, borderRadius: "0.8cqh", transition: "width 0.4s ease" },
  alternativaBarraLlenaCorrecta: { background: "#7FD98F" },
  alternativaConteo: { textAlign: "right", fontWeight: 800, color: "#94A3B8" },
  triviaTotal: { marginTop: "calc(var(--ajuste, 1) * 2cqh)", fontSize: "calc(var(--ajuste, 1) * 2cqh)", color: "#64748B" },
};
