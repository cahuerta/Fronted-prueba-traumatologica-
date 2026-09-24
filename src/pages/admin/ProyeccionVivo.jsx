import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { casosVivoAdmin } from "../../api/client";

const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
const LETRAS = ["A", "B", "C", "D", "E"];
const CASOS_POR_PAGINA = 4; // suficiente espacio para letras grandes, sin amontonar

// ============================================================================
// PANTALLA COMPARTIDA: proyeccion real + preview del constructor de casos
// ============================================================================
// <PantallaCaso> dibuja la presentacion del caso y las preguntas. La usan
// esta proyeccion (a pantalla completa) y el preview de AdminCasoNuevo.jsx
// (dentro de su caja 16:9): mismo codigo, asi que el preview es una copia
// a escala exacta de lo que se proyecta.
//
// Todas las medidas estan en unidades del contenedor (cqh = % del alto,
// cqw = % del ancho de la pantalla dibujada), nunca en px ni vh/vw. El
// contenedor que la envuelve debe declarar containerType:"size".
//
// Mismo lenguaje visual que la proyeccion de Clases Formales: franja
// superior con logos grandes a la izquierda y QR + codigo a la derecha,
// contenido usando todo el espacio restante.
// ============================================================================

// Lado de la imagen en las preguntas: se mantiene a la IZQUIERDA como
// siempre en Casos Clinicos. Para pasarla a la derecha: "derecha".
const LADO_IMAGEN_PREGUNTA = "izquierda";

function LogoBar() {
  return (
    <div style={s.logoBar}>
      <img src="/logo-utal.png" alt="UTAL" style={s.logoImg} />
      <img src="/logo-ica.png" alt="ICA" style={s.logoImg} />
      <img src="/logo-hipokratia.png" alt="Hipokratia" style={s.logoImg} />
    </div>
  );
}

// QR siempre visible, con el codigo al lado como respaldo: un atrasado se
// une en cualquier momento.
function Esquina({ codigo, qrUrl }) {
  if (!codigo) return null;
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

// Foto o video dentro de una caja de tamaño definido: se escala adentro
// preservando su proporcion, siempre completa (contain), nunca recortada.
function Media({ url, tipo, controles }) {
  if (!url) return null;
  return (
    <div style={s.cajaMedia}>
      {tipo === "video" ? (
        <video src={url} controls={controles} muted={!controles} style={s.media} />
      ) : (
        <img src={url} alt="" style={s.media} />
      )}
    </div>
  );
}

// Una pantalla de caso. Debe ir dentro de un contenedor con containerType:"size".
//   modo "presentando": caso = { vineta_clinica, media_url, media_tipo }
//   modo "pregunta":    pregunta = { texto, opciones, correcta, explicacion,
//                        media_url, media_tipo }, estado ("votando" |
//                        "discusion" | "cerrada" | ...), conteo {indice: votos}
export function PantallaCaso({ modo, caso, pregunta, estado, conteo, codigo, qrUrl, controlesVideo }) {
  return (
    <div style={s.pantalla}>
      <LogoBar />
      <Esquina codigo={codigo} qrUrl={qrUrl} />

      <div style={s.cuerpo}>
        {modo === "presentando" && <ContenidoPresentacion caso={caso} controlesVideo={controlesVideo} />}
        {modo === "pregunta" && (
          <ContenidoPregunta pregunta={pregunta} estado={estado} conteo={conteo} controlesVideo={controlesVideo} />
        )}
      </div>
    </div>
  );
}

// Presentacion del caso: imagen a la izquierda con todo el alto, viñeta a
// la derecha en letra grande. Sin imagen: viñeta centrada.
function ContenidoPresentacion({ caso, controlesVideo }) {
  const vineta = caso?.vineta_clinica || "";
  if (!caso?.media_url) {
    return <p style={s.vinetaSola}>{vineta}</p>;
  }
  return (
    <div style={s.filaLado}>
      <div style={s.columnaMediaCaso}>
        <Media url={caso.media_url} tipo={caso.media_tipo} controles={controlesVideo} />
      </div>
      {vineta && (
        <div style={s.columnaTexto}>
          <p style={s.vinetaLado}>{vineta}</p>
        </div>
      )}
    </div>
  );
}

// Pregunta: enunciado + alternativas con votos en vivo (barras del mismo
// ancho en todas las filas, relativas a la opcion mas votada) y, al lado,
// la imagen de la pregunta con todo el alto disponible. Al revelar
// ("cerrada") solo queda la opcion correcta, en verde, y el fundamento.
function ContenidoPregunta({ pregunta, estado, conteo, controlesVideo }) {
  const opciones = pregunta?.opciones || [];
  const votosDe = (i) => conteo?.[i] || 0;
  const maxVotos = Math.max(1, ...opciones.map((_, i) => votosDe(i)));
  const cerrada = estado === "cerrada";
  const tieneMedia = Boolean(pregunta?.media_url);

  const bloqueTexto = (
    <div style={tieneMedia ? s.columnaTexto : s.columnaTextoSola}>
      <p style={s.pregunta}>{pregunta?.texto || "Enunciado de la pregunta"}</p>

      <div style={s.opciones}>
        {opciones.map((op, i) => {
          if (cerrada && pregunta?.correcta !== i) return null;
          const votos = votosDe(i);
          const anchoPct = Math.round((votos / maxVotos) * 100);
          const esCorrecta = cerrada && pregunta?.correcta === i;
          return (
            <div key={i} style={{ ...s.opcionRow, ...(esCorrecta ? s.opcionRowCorrecta : {}) }}>
              <div style={s.opcionHeader}>
                <span style={{ ...s.opcionLetra, ...(esCorrecta ? s.opcionLetraCorrecta : {}) }}>{LETRAS[i]}</span>
                <span style={s.opcionTexto}>{op || `Alternativa ${LETRAS[i]}`}</span>
                <span style={s.opcionNumero}>{votos}</span>
              </div>
              {!cerrada && (
                <div style={s.barraFondo}>
                  <div style={{ ...s.barraLlena, width: `${anchoPct}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {cerrada && pregunta?.explicacion && (
        <div style={s.explicacionBox}>
          <p style={s.explicacionTitulo}>Fundamento</p>
          <p style={s.explicacionTexto}>{pregunta.explicacion}</p>
        </div>
      )}
    </div>
  );

  if (!tieneMedia) return bloqueTexto;

  return (
    <div style={{ ...s.filaLado, flexDirection: LADO_IMAGEN_PREGUNTA === "derecha" ? "row-reverse" : "row" }}>
      <div style={s.columnaMediaPregunta}>
        <Media url={pregunta.media_url} tipo={pregunta.media_tipo} controles={controlesVideo} />
      </div>
      {bloqueTexto}
    </div>
  );
}

// ============================================================================
// PROYECCION (pantalla grande del profesor)
// ============================================================================
export default function ProyeccionVivo() {
  const { sesionId } = useParams();

  const [panel, setPanel] = useState(null);
  const [error, setError] = useState("");
  const [resumen, setResumen] = useState(null);

  const refrescar = useCallback(async () => {
    try {
      const data = await casosVivoAdmin.panelSesion(sesionId);
      setPanel(data);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [sesionId]);

  useEffect(() => {
    refrescar();
    const intervalo = setInterval(refrescar, 2000);
    return () => clearInterval(intervalo);
  }, [refrescar]);

  // Al llegar a la conclusion, se pide el resumen una sola vez (no en
  // cada poll) y se guarda localmente -son datos ya cerrados, no cambian-.
  useEffect(() => {
    if (panel?.finalizada && !resumen) {
      casosVivoAdmin.resumenSesion(sesionId).then(setResumen).catch((err) => setError(err.message));
    }
  }, [panel?.finalizada, resumen, sesionId]);

  const estado = panel?.estado || "esperando";
  const tieneImagen = Boolean(panel?.media_url);

  const linkAlumno = panel?.codigo_acceso ? `${APP_URL}/alumno-vivo/${panel.codigo_acceso}` : "";
  const qrUrl = linkAlumno
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(linkAlumno)}`
    : "";
  const qrUrlChico = linkAlumno
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(linkAlumno)}`
    : "";

  const totalPresentes = panel?.asistencia?.total_presentes || 0;
  const totalVotos = panel?.resultados?.total || 0;
  const porcentajeVotado = totalPresentes > 0 ? totalVotos / totalPresentes : 0;
  const umbralAlcanzado = porcentajeVotado >= 0.5;

  const esInicioSesion = estado === "esperando" && panel?.caso_actual_orden === 1 && panel?.pregunta_actual_orden === 1;

  // Mientras se vota y aun no responde el 50% de los presentes, la imagen
  // va SOLA y completa. Al llegar al 50% (o al cerrar) pasa al layout con
  // alternativas y votos en vivo.
  const mostrarSoloImagen = tieneImagen && estado === "votando" && !umbralAlcanzado;

  let contenido;

  if (error && !panel) {
    contenido = (
      <div style={s.pantallaCentrada}>
        <LogoBar />
        <p style={s.error}>{error}</p>
      </div>
    );
  } else if (!panel) {
    contenido = (
      <div style={s.pantallaCentrada}>
        <LogoBar />
        <p style={s.muted}>Cargando...</p>
      </div>
    );
  } else if (panel.finalizada) {
    // ---------------- CONCLUSION: no queda ninguna pregunta mas ----------------
    if (!resumen) {
      contenido = (
        <div style={s.pantallaCentrada}>
          <LogoBar />
          <p style={s.muted}>Calculando resultados...</p>
        </div>
      );
    } else {
      const pagina = panel.pagina_resumen || 0;
      const totalPaginas = Math.max(1, Math.ceil(resumen.casos.length / CASOS_POR_PAGINA));
      const casosPagina = resumen.casos.slice(pagina * CASOS_POR_PAGINA, pagina * CASOS_POR_PAGINA + CASOS_POR_PAGINA);
      const esUltimaPagina = pagina >= totalPaginas - 1;

      contenido = (
        <div style={s.pantallaCentrada}>
          <LogoBar />
          <div style={s.resumenBox}>
            {pagina === 0 && (
              <>
                <p style={s.resumenTituloChico}>Resultado global</p>
                <p style={s.resumenGlobal}>{resumen.porcentaje_global}%</p>
                <p style={s.resumenSubtitulo}>de respuestas correctas en toda la sesión</p>
              </>
            )}

            {casosPagina.length > 0 && (
              <div style={s.resumenCasosLista}>
                {casosPagina.map((c) => (
                  <div key={c.caso_id} style={s.resumenCasoRow}>
                    <span style={s.resumenCasoTitulo}>{c.titulo}</span>
                    <span style={s.resumenCasoPct}>{c.porcentaje_aciertos}%</span>
                  </div>
                ))}
              </div>
            )}

            {totalPaginas > 1 && <p style={s.resumenPaginacion}>{pagina + 1} / {totalPaginas}</p>}

            {esUltimaPagina && <p style={s.resumenCierre}>Gracias por participar</p>}
          </div>
        </div>
      );
    }
  } else if (estado === "esperando") {
    contenido = (
      <div style={s.pantallaCentrada}>
        <LogoBar />
        {esInicioSesion && qrUrl ? (
          <div style={s.qrBox}>
            <img src={qrUrl} alt="QR de la sesión" style={s.qrImg} />
            <p style={s.codigoLabel}>Código de acceso</p>
            <p style={s.codigo}>{panel.codigo_acceso}</p>
          </div>
        ) : (
          <>
            <Esquina codigo={panel.codigo_acceso} qrUrl={qrUrlChico} />
            <p style={s.esperando}>Esperando...</p>
          </>
        )}
      </div>
    );
  } else if (estado === "presentando") {
    contenido = (
      <PantallaCaso
        modo="presentando"
        caso={panel.caso}
        codigo={panel.codigo_acceso}
        qrUrl={qrUrlChico}
        controlesVideo
      />
    );
  } else if (!panel.pregunta) {
    contenido = (
      <div style={s.pantallaCentrada}>
        <LogoBar />
        <p style={s.muted}>Sin pregunta activa...</p>
      </div>
    );
  } else if (mostrarSoloImagen) {
    contenido = (
      <div style={s.pantallaImagenSola}>
        <LogoBar />
        <Media url={panel.media_url} tipo={panel.media_tipo} controles />
      </div>
    );
  } else {
    contenido = (
      <PantallaCaso
        modo="pregunta"
        pregunta={{
          texto: panel.pregunta,
          opciones: panel.opciones,
          correcta: panel.correcta,
          explicacion: panel.explicacion,
          media_url: panel.media_url,
          media_tipo: panel.media_tipo,
        }}
        estado={estado}
        conteo={panel?.resultados?.conteo}
        codigo={panel.codigo_acceso}
        qrUrl={qrUrlChico}
        controlesVideo
      />
    );
  }

  // Contenedor fijo del tamaño exacto de la ventana (sin depender del
  // margen del body, sin scroll) y containerType:"size" para las cqh/cqw.
  return <div style={s.contenedorFijo}>{contenido}</div>;
}

// ============================================================================
// ESTILOS -todo en cqh/cqw (relativo a la pantalla dibujada)-
// ============================================================================
const ACENTO = "#4FC3D9";
const FONDO = "#0E1526";
const TARJETA = "#16213A";
const VERDE = "#7FD98F";
const FRANJA = 14;   // cqh: franja superior (logos + QR)
const ALTO_LOGO = 10; // cqh
const ALTO_QR = 12;  // cqh

const s = {
  contenedorFijo: { position: "fixed", inset: 0, containerType: "size", overflow: "hidden", background: FONDO },

  pantalla: { position: "absolute", inset: 0, boxSizing: "border-box", overflow: "hidden", background: FONDO, color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", flexDirection: "column", padding: `${FRANJA}cqh 4cqw 4cqh` },
  pantallaCentrada: { position: "absolute", inset: 0, boxSizing: "border-box", overflow: "hidden", background: FONDO, color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: `${FRANJA}cqh 4cqw 4cqh` },
  pantallaImagenSola: { position: "absolute", inset: 0, boxSizing: "border-box", overflow: "hidden", background: FONDO, display: "flex", padding: `${FRANJA}cqh 3cqw 3cqh` },

  logoBar: { position: "absolute", top: `${(FRANJA - ALTO_LOGO) / 2}cqh`, left: "3cqw", display: "flex", alignItems: "center", gap: "1.6cqw", zIndex: 50 },
  logoImg: { height: `${ALTO_LOGO}cqh`, width: "auto", objectFit: "contain" },

  esquina: { position: "absolute", top: `${(FRANJA - ALTO_QR) / 2}cqh`, right: "3cqw", display: "flex", alignItems: "center", gap: "1.2cqw", zIndex: 50 },
  esquinaTexto: { textAlign: "right" },
  esquinaLabel: { fontSize: "1.8cqh", color: "#94A3B8", margin: "0 0 0.3cqh" },
  esquinaCodigo: { fontSize: "3.6cqh", fontWeight: 800, letterSpacing: "0.4cqh", color: ACENTO, margin: 0 },
  esquinaQr: { height: `${ALTO_QR}cqh`, width: `${ALTO_QR}cqh`, boxSizing: "border-box", background: "#FFFFFF", padding: "0.8cqh", borderRadius: "0.8cqh", display: "block" },

  muted: { color: "#94A3B8", fontSize: "3cqh", textAlign: "center" },
  error: { color: "#D1495B", fontSize: "3cqh", textAlign: "center" },
  esperando: { color: "#94A3B8", fontSize: "4.5cqh", margin: 0 },

  qrBox: { textAlign: "center" },
  qrImg: { width: "min(40cqw, 45cqh)", height: "min(40cqw, 45cqh)", borderRadius: "1.5cqh", background: "#F4F1EA", padding: "1.5cqh", marginBottom: "2cqh", boxSizing: "border-box" },
  codigoLabel: { fontSize: "2.4cqh", color: "#94A3B8", margin: 0 },
  codigo: { fontSize: "5.4cqh", fontWeight: 800, letterSpacing: "0.6cqh", color: ACENTO, margin: "0.6cqh 0 0" },

  // Area de contenido con alto definido (base para que las imagenes sepan
  // cuanto pueden crecer). "safe center": si algo no cupiera, se recorta
  // abajo, nunca arriba.
  cuerpo: { flex: "1 1 auto", minHeight: 0, width: "100%", display: "flex", flexDirection: "column", justifyContent: "safe center" },

  // ---- media ----
  cajaMedia: { flex: "1 1 auto", minWidth: 0, minHeight: 0, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  media: { maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", borderRadius: "1.5cqh", display: "block", background: "#000" },

  // ---- layout lado a lado ----
  filaLado: { flex: "1 1 auto", minHeight: 0, display: "flex", gap: "3.5cqw", alignItems: "stretch" },
  columnaMediaCaso: { flex: "0 0 52%", minWidth: 0, minHeight: 0, display: "flex" },
  columnaMediaPregunta: { flex: "0 0 46%", minWidth: 0, minHeight: 0, display: "flex" },
  columnaTexto: { flex: "1 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "safe center" },
  columnaTextoSola: { width: "100%", maxWidth: "84cqw", margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "safe center" },

  // ---- presentacion del caso ----
  vinetaLado: { fontSize: "3.4cqh", lineHeight: 1.45, color: "#E2E6EE", margin: 0, whiteSpace: "pre-line" },
  vinetaSola: { fontSize: "4cqh", lineHeight: 1.5, color: "#E2E6EE", margin: "0 auto", maxWidth: "80cqw", textAlign: "center", whiteSpace: "pre-line" },

  // ---- pregunta ----
  pregunta: { fontSize: "3.8cqh", fontWeight: 700, lineHeight: 1.25, margin: "0 0 2.6cqh" },
  opciones: { display: "flex", flexDirection: "column", gap: "1.4cqh" },
  opcionRow: { background: TARJETA, border: "2px solid rgba(244,241,233,0.12)", borderRadius: "1.6cqh", padding: "1.3cqh 1.4cqw" },
  opcionRowCorrecta: { border: `2px solid ${VERDE}`, background: "rgba(127,217,143,0.08)" },
  opcionHeader: { display: "flex", alignItems: "center", gap: "1.2cqw" },
  opcionLetra: { width: "4.6cqh", height: "4.6cqh", borderRadius: "50%", background: "rgba(79,195,217,0.15)", color: ACENTO, fontWeight: 800, fontSize: "2.4cqh", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  opcionLetraCorrecta: { background: VERDE, color: FONDO },
  opcionTexto: { flex: 1, minWidth: 0, fontSize: "2.8cqh", lineHeight: 1.25 },
  opcionNumero: { fontSize: "3cqh", fontWeight: 800, color: ACENTO, minWidth: "3em", textAlign: "right", flexShrink: 0 },
  // Misma posicion y ancho en todas las filas (debajo del texto, a todo el
  // ancho de la tarjeta): las barras se comparan directo.
  barraFondo: { height: "1.4cqh", background: FONDO, borderRadius: "0.8cqh", overflow: "hidden", marginTop: "1cqh" },
  barraLlena: { height: "100%", background: ACENTO, borderRadius: "0.8cqh", transition: "width 0.4s ease" },

  explicacionBox: { marginTop: "2.4cqh", paddingTop: "2cqh", borderTop: "1px solid rgba(244,241,233,0.15)" },
  explicacionTitulo: { fontSize: "2cqh", color: ACENTO, fontWeight: 700, textTransform: "uppercase", margin: "0 0 1cqh" },
  explicacionTexto: { fontSize: "2.6cqh", lineHeight: 1.5, margin: 0 },

  // ---- resumen final ----
  resumenBox: { textAlign: "center", maxWidth: "85cqw", display: "flex", flexDirection: "column", alignItems: "center", gap: "2cqh" },
  resumenTituloChico: { fontSize: "2.6cqh", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.3cqh", margin: 0, fontWeight: 700 },
  resumenGlobal: { fontSize: "22cqh", fontWeight: 900, color: ACENTO, margin: 0, lineHeight: 1 },
  resumenSubtitulo: { fontSize: "2.6cqh", color: "#C7CDD9", margin: 0 },
  resumenCasosLista: { display: "flex", flexDirection: "column", gap: "1.6cqh", width: "min(70cqw, 1100px)", marginTop: "2cqh" },
  resumenCasoRow: { display: "flex", justifyContent: "space-between", alignItems: "center", background: TARJETA, border: "1px solid rgba(244,241,233,0.12)", borderRadius: "1.6cqh", padding: "2cqh 2.4cqw" },
  resumenCasoTitulo: { fontSize: "3.6cqh", fontWeight: 700, color: "#F4F1EA", textAlign: "left" },
  resumenCasoPct: { fontSize: "4.4cqh", fontWeight: 900, color: ACENTO, flexShrink: 0, marginLeft: "2.4cqw" },
  resumenPaginacion: { fontSize: "2.2cqh", color: "#94A3B8", marginTop: "1cqh" },
  resumenCierre: { fontSize: "3cqh", color: VERDE, fontWeight: 700, marginTop: "1cqh" },
};
