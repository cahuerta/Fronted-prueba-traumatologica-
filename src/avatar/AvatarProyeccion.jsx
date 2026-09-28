/**
 * AvatarProyeccion.jsx
 * Capa del avatar sobre la proyeccion de Clases Formales.
 *
 * - En reposo: la medica pequeña en la esquina inferior derecha, como logo.
 * - Cuando el interrogador toca "Proyectar avatar": pasa a pantalla completa,
 *   muestra la pregunta y la respuesta y la LEE en voz alta. Vuelve sola a la
 *   esquina solo cuando termina de hablar.
 *
 * Consulta GET /clases-formales/avatar/actual/{sesionId} cada 2 s (solo disco en
 * el backend). Cada proyeccion trae un 'id' unico: se dice UNA vez por id. Al
 * abrir o recargar la pagina, lo que ya estaba proyectado no se repite.
 *
 * Voz: el navegador solo permite hablar despues de alguna interaccion con la
 * pagina. No hay boton: la voz se habilita sola con el primer clic, toque o
 * tecla en cualquier parte de la proyeccion. Si igual no pudo hablar, deja el
 * texto en pantalla el tiempo suficiente para leerlo.
 *
 * IMPORTANTE: ProyeccionClase debe montar esta capa SIEMPRE en la misma
 * posicion (primer hijo), para que los cambios de pantalla del poll no la
 * reinicien a mitad de una respuesta.
 */
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar.jsx";
import useVoz, { vozSoportada } from "./useVoz.js";
import { clasesFormalesAvatar } from "../api/clasesFormalesCliente";

const POLL_MS = 2000;
const PAUSA_FINAL_MS = 1500;     // la respuesta queda en pantalla un momento al terminar
const PALABRAS_POR_SEG = 2.2;    // tiempo de lectura si no hubo voz
const MINIMO_SIN_VOZ_MS = 10000;

const ETIQUETA_FUENTE = {
  curso: "Material del curso",
  literatura: "Literatura científica · no está en el material del curso",
};

const EVENTOS_INTERACCION = ["pointerdown", "keydown", "touchstart"];

export default function AvatarProyeccion({ sesionId }) {
  const [enPantalla, setEnPantalla] = useState(null); // {id, pregunta, respuesta, fuente}
  const { hablar, callar, desbloquear, hablando, boca } = useVoz();

  const ultimoIdRef = useRef(undefined); // undefined = aun no se hace la primera lectura

  // Habilita la voz con la primera interaccion en cualquier parte de la pagina
  useEffect(() => {
    if (!vozSoportada) return undefined;
    const habilitar = () => {
      desbloquear();
      EVENTOS_INTERACCION.forEach((ev) => window.removeEventListener(ev, habilitar, true));
    };
    EVENTOS_INTERACCION.forEach((ev) => window.addEventListener(ev, habilitar, true));
    return () => EVENTOS_INTERACCION.forEach((ev) => window.removeEventListener(ev, habilitar, true));
  }, [desbloquear]);

  useEffect(() => () => callar(), [callar]);

  useEffect(() => {
    if (!sesionId) return undefined;
    let cancelado = false;

    async function presentar(activo) {
      setEnPantalla(activo);
      const hablo = await hablar(activo.respuesta);
      if (!hablo) {
        // Sin voz: el texto queda el tiempo necesario para leerlo
        const palabras = (activo.respuesta || "").split(/\s+/).length;
        const ms = Math.max(MINIMO_SIN_VOZ_MS, (palabras / PALABRAS_POR_SEG) * 1000);
        await new Promise((r) => setTimeout(r, ms));
      }
      await new Promise((r) => setTimeout(r, PAUSA_FINAL_MS));
      // Solo vuelve a la esquina si no llego otra respuesta mientras tanto
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
        // fallo transitorio: el proximo poll reintenta, sin tocar lo que se muestra
      }
    }

    poll();
    const intervalo = setInterval(poll, POLL_MS);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [sesionId, hablar, callar]);

  if (enPantalla) {
    return (
      <div style={s.completa}>
        <div style={s.completaAvatar}>
          <Avatar estado={hablando ? "hablando" : "reposo"} boca={boca} />
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
  esquina: { position: "absolute", right: "1.5cqw", bottom: "2cqh", zIndex: 60, pointerEvents: "none" },
  esquinaAvatar: { width: "13cqh", height: "15cqh", opacity: 0.95 },

  completa: { position: "absolute", inset: 0, zIndex: 100, background: FONDO, color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", alignItems: "center", gap: "4cqw", padding: "6cqh 6cqw", boxSizing: "border-box" },
  completaAvatar: { flex: "0 0 34cqw", height: "78cqh" },
  completaTexto: { flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" },
  rotulo: { fontSize: "2.2cqh", color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.3cqh", fontWeight: 700, margin: "0 0 1cqh" },
  pregunta: { fontSize: "4cqh", fontWeight: 800, lineHeight: 1.2, margin: "0 0 4cqh", color: ACENTO },
  respuesta: { fontSize: "3.6cqh", lineHeight: 1.4, margin: 0 },
  fuente: { fontSize: "2cqh", color: "#94A3B8", margin: "4cqh 0 0", fontStyle: "italic" },
};
