/**
 * AvatarProyeccion.jsx
 * Capa del avatar sobre la proyeccion de Clases Formales.
 *
 * - En reposo: la medica pequeña en la esquina inferior derecha, como logo.
 * - Cuando el interrogador toca "Proyectar avatar": pasa a pantalla completa,
 *   muestra la pregunta y la respuesta, y la dice en voz alta. Al terminar
 *   vuelve sola a la esquina.
 *
 * Consulta GET /clases-formales/avatar/actual/{sesionId} cada 2 s (solo disco en
 * el backend). Cada proyeccion trae un 'id' unico: se dice UNA vez por id. Al
 * abrir o recargar la pagina, lo que ya estaba proyectado no se repite.
 *
 * El navegador exige un toque antes de permitir la voz: mientras no se toque,
 * se muestra el boton "Activar voz" (y si llega una respuesta igual se muestra
 * en pantalla, sin voz).
 */
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar.jsx";
import useVoz, { vozSoportada } from "./useVoz.js";
import { clasesFormalesAvatar } from "../api/clasesFormalesCliente";

const POLL_MS = 2000;
const PAUSA_FINAL_MS = 1500;   // la respuesta queda en pantalla un momento al terminar
const PALABRAS_POR_SEG = 2.5;  // duracion estimada cuando no hay voz

const ETIQUETA_FUENTE = {
  curso: "Material del curso",
  literatura: "Literatura científica · no está en el material del curso",
};

export default function AvatarProyeccion({ sesionId }) {
  const [vozActiva, setVozActiva] = useState(false);
  const [enPantalla, setEnPantalla] = useState(null); // {pregunta, respuesta, fuente}
  const { hablar, callar, desbloquear, hablando, boca } = useVoz();

  const ultimoIdRef = useRef(undefined); // undefined = aun no se hace la primera lectura
  const vozActivaRef = useRef(false);

  useEffect(() => {
    vozActivaRef.current = vozActiva;
  }, [vozActiva]);

  useEffect(() => () => callar(), [callar]);

  useEffect(() => {
    if (!sesionId) return undefined;
    let cancelado = false;

    async function presentar(activo) {
      setEnPantalla(activo);
      if (vozActivaRef.current && vozSoportada) {
        await hablar(activo.respuesta);
      } else {
        const palabras = (activo.respuesta || "").split(/\s+/).length;
        await new Promise((r) => setTimeout(r, (palabras / PALABRAS_POR_SEG) * 1000));
      }
      await new Promise((r) => setTimeout(r, PAUSA_FINAL_MS));
      if (!cancelado) setEnPantalla((actual) => (actual?.id === activo.id ? null : actual));
    }

    async function poll() {
      try {
        const { activo } = await clasesFormalesAvatar.actual(sesionId);
        if (cancelado) return;
        const id = activo?.id || null;
        if (ultimoIdRef.current === undefined) {
          // Primera lectura: lo que ya estaba proyectado no se repite
          ultimoIdRef.current = id;
          return;
        }
        if (id && id !== ultimoIdRef.current) {
          ultimoIdRef.current = id;
          callar();
          presentar(activo);
        }
      } catch {
        // fallo transitorio: el proximo poll reintenta
      }
    }

    poll();
    const intervalo = setInterval(poll, POLL_MS);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [sesionId, hablar, callar]);

  const activarVoz = () => {
    desbloquear();
    setVozActiva(true);
  };

  const estado = hablando ? "hablando" : "reposo";

  if (enPantalla) {
    return (
      <div style={s.completa}>
        <div style={s.completaAvatar}>
          <Avatar estado={estado} boca={boca} />
        </div>
        <div style={s.completaTexto}>
          <p style={s.rotulo}>Pregunta</p>
          <p style={s.pregunta}>{enPantalla.pregunta}</p>
          <p style={s.respuesta}>{enPantalla.respuesta}</p>
          {ETIQUETA_FUENTE[enPantalla.fuente] && (
            <p style={s.fuente}>{ETIQUETA_FUENTE[enPantalla.fuente]}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={s.esquina}>
      {!vozActiva && vozSoportada && (
        <button type="button" onClick={activarVoz} style={s.btnActivar}>
          Activar voz
        </button>
      )}
      <div style={s.esquinaAvatar}>
        <Avatar estado="reposo" boca={0} />
      </div>
    </div>
  );
}

// Todo en cqh/cqw: se mide contra la pantalla de proyeccion (containerType: size)
const ACENTO = "#4FC3D9";
const FONDO = "#0E1526";

const s = {
  esquina: { position: "absolute", right: "1.5cqw", bottom: "2cqh", zIndex: 60, display: "flex", alignItems: "flex-end", gap: "1cqw", pointerEvents: "none" },
  esquinaAvatar: { width: "13cqh", height: "15cqh", opacity: 0.95 },
  btnActivar: { pointerEvents: "auto", background: ACENTO, color: FONDO, border: "none", borderRadius: "1cqh", padding: "1cqh 1.4cqw", fontSize: "2cqh", fontWeight: 800, cursor: "pointer", marginBottom: "2cqh" },

  completa: { position: "absolute", inset: 0, zIndex: 100, background: FONDO, color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", alignItems: "center", gap: "4cqw", padding: "6cqh 6cqw", boxSizing: "border-box" },
  completaAvatar: { flex: "0 0 34cqw", height: "78cqh" },
  completaTexto: { flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" },
  rotulo: { fontSize: "2.2cqh", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.3cqh", fontWeight: 700, margin: "0 0 1cqh" },
  pregunta: { fontSize: "4cqh", fontWeight: 800, lineHeight: 1.2, margin: "0 0 4cqh", color: ACENTO },
  respuesta: { fontSize: "3.6cqh", lineHeight: 1.4, margin: 0 },
  fuente: { fontSize: "2cqh", color: "#94A3B8", margin: "4cqh 0 0", fontStyle: "italic" },
};
