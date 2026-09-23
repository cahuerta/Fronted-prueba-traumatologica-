import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clasesFormalesPaginas, clasesFormalesMedia } from "../../api/clasesFormalesCliente";
import { casosVivoAdmin } from "../../api/client";
// El preview usa EXACTAMENTE el mismo componente que la proyeccion real
// (PantallaClase) y la misma regla de disposicion -si se ve bien aca, se
// ve bien proyectado-.
import { PantallaClase, resolverDisposicion } from "./ProyeccionClase";

const ACENTO = "#4FC3D9";
const LETRAS = ["A", "B", "C", "D", "E"];

// "semaforo" no es una opcion de pagina -es global, activo durante toda
// la sesion (ver AlumnoClaseInteraccion.jsx)-, por eso no aparece aca.
const HERRAMIENTA_LABEL = {
  ninguna: "Solo título",
  titulo_texto: "Título + texto",
  trivia: "Trivia (pregunta con alternativas)",
};

// Reusamos el mismo endpoint/bucket de imagenes de casos clinicos
// (subirMediaCaso) -decision confirmada con Cristobal, mismo bucket,
// sin separar storage, privado a proposito-. El "tipo" que le mandamos
// es "foto", igual que casos clinicos.
// Si la pagina tiene texto + imagen/grafico, la imagen va SIEMPRE al lado
// del texto: solo se elige el lado. Imagen/grafico sin texto -> grande y
// centrada automaticamente (no hay nada que elegir). Regla unica en
// resolverDisposicion (ProyeccionClase.jsx).
const DISPOSICION_LABEL = {
  lado_izquierda: "Imagen a la izquierda del texto",
  lado_derecha: "Imagen a la derecha del texto",
};

// El grafico generado por IA (config.imagen_svg) y la imagen manual
// (config.imagen_path) pueden coexistir en la misma pagina -no se pisan-.
// El grafico IA se genera solo desde el pipeline de /documentos/clase-formal;
// desde este constructor solo se puede VER y QUITAR, nunca generar ni subir.
// Si el docente no lo quita explicitamente, se preserva tal cual al guardar
// cualquier otro cambio de la pagina (texto, titulo, imagen manual, etc).

// Paginas guardadas ANTES de este cambio tienen config.imagen_url (el link
// firmado que vencia, ya vencido) pero nunca guardaron config.imagen_path
// -el backend lo devolvia, pero el frontend viejo no lo tomaba-. El path
// real sigue adentro de ese link vencido, como texto: se extrae con esta
// regex para no obligar a resubir nada. Al guardar la pagina de nuevo
// (aunque sea solo el titulo), queda migrada a imagen_path para siempre.
function extraerPathDeUrlVencida(urlVieja) {
  if (!urlVieja) return null;
  const match = urlVieja.match(/\/object\/sign\/casos\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ---------------- LAYOUT: lista fija a la izquierda, editor a la derecha ----------------
// Mismo patron que Ficha.jsx (MiSalud): sin modal/overlay, lista siempre
// visible, panel de detalle/edicion ocupando el resto del ancho, se
// actualiza al hacer clic sin mover ni ocultar la lista.
export default function AdminClaseConstructor() {
  const { claseFormalId } = useParams();
  const navigate = useNavigate();

  const [paginas, setPaginas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [seleccionada, setSeleccionada] = useState(null); // pagina_id en edicion, "nueva", o null (nada elegido)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    cargar();
  }, [claseFormalId]);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const data = await clasesFormalesPaginas.listar(claseFormalId);
      setPaginas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = paginas.findIndex((p) => p.id === active.id);
    const newIndex = paginas.findIndex((p) => p.id === over.id);
    const reordenadas = arrayMove(paginas, oldIndex, newIndex);
    setPaginas(reordenadas); // optimista

    const ordenAnterior = reordenadas[newIndex - 1]?.orden ?? null;
    const ordenSiguiente = reordenadas[newIndex + 1]?.orden ?? null;

    try {
      const actualizada = await clasesFormalesPaginas.mover(active.id, ordenAnterior, ordenSiguiente);
      setPaginas((prev) =>
        prev.map((p) => (p.id === active.id ? { ...p, orden: actualizada.orden } : p))
      );
    } catch (err) {
      setError(err.message);
      cargar(); // se descuadró, recargamos desde el servidor
    }
  }

  async function handleEliminar(paginaId) {
    if (!confirm("¿Eliminar esta página?")) return;
    try {
      await clasesFormalesPaginas.eliminar(paginaId);
      setPaginas((prev) => prev.filter((p) => p.id !== paginaId));
      if (seleccionada === paginaId) setSeleccionada(null);
    } catch (err) {
      setError(err.message);
    }
  }

  const paginaSeleccionada = seleccionada && seleccionada !== "nueva"
    ? paginas.find((p) => p.id === seleccionada)
    : null;

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate("/admin/clases-formales")} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>Armar clase</h1>
      </header>

      <div style={s.body}>
        {/* ---------------- IZQUIERDA: lista fija, siempre visible ---------------- */}
        <aside style={s.sidebar}>
          <button onClick={() => setSeleccionada("nueva")} style={s.btnNueva}>+ Nueva página</button>

          {cargando && <p style={s.info}>Cargando...</p>}
          {error && <p style={s.error}>{error}</p>}
          {!cargando && paginas.length === 0 && <p style={s.info}>Aún no hay páginas. Crea la primera.</p>}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={paginas.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div style={s.list}>
                {paginas.map((pagina, i) => (
                  <PaginaItem
                    key={pagina.id}
                    pagina={pagina}
                    numero={i + 1}
                    seleccionada={seleccionada === pagina.id}
                    onSeleccionar={() => setSeleccionada(pagina.id)}
                    onEliminar={() => handleEliminar(pagina.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </aside>

        {/* ---------------- DERECHA: editor, ocupa todo el resto del ancho ---------------- */}
        <main style={s.editorPanel}>
          {seleccionada ? (
            <PaginaEditor
              key={seleccionada}
              claseFormalId={claseFormalId}
              pagina={paginaSeleccionada}
              onCerrar={() => setSeleccionada(null)}
              onGuardada={(pagina) => {
                if (seleccionada === "nueva") {
                  setPaginas((prev) => [...prev, pagina]);
                } else {
                  setPaginas((prev) => prev.map((p) => (p.id === pagina.id ? pagina : p)));
                }
                setSeleccionada(pagina.id);
              }}
            />
          ) : (
            <div style={s.vacioWrap}>
              <p style={s.vacioTexto}>Selecciona una página de la izquierda para editarla, o crea una nueva.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ---------------- ITEM ARRASTRABLE (lista izquierda) ----------------
function PaginaItem({ pagina, numero, seleccionada, onSeleccionar, onEliminar }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pagina.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const etiquetas = [
    pagina.config?.imagen_svg ? "con gráfico (IA)" : null,
    (pagina.config?.imagen_path || pagina.config?.imagen_url) ? "con imagen" : null,
  ].filter(Boolean);

  return (
    <div ref={setNodeRef} style={{ ...s.item, ...style, ...(seleccionada ? s.itemSeleccionado : {}) }}>
      <button {...attributes} {...listeners} style={s.handle} aria-label="Arrastrar para reordenar">⠿</button>
      <span style={s.numero}>{numero}</span>
      <div style={s.itemInfo} onClick={onSeleccionar}>
        <p style={s.itemTitulo}>{pagina.titulo}</p>
        <p style={s.itemDesc}>
          {HERRAMIENTA_LABEL[pagina.tipo_herramienta] || pagina.tipo_herramienta}
          {etiquetas.length > 0 ? ` · ${etiquetas.join(" · ")}` : ""}
        </p>
      </div>
      <button onClick={onEliminar} style={s.btnEliminar} aria-label="Eliminar página">✕</button>
    </div>
  );
}

// ---------------- PREVIEW EN MINIATURA ----------------
// Copia a escala EXACTA de la proyeccion: dibuja <PantallaClase>, el mismo
// componente que usa ProyeccionClase.jsx, dentro de una caja 16:9 que
// declara containerType:"size" -todas las medidas de PantallaClase son
// relativas a esa caja (cqh/cqw), asi que escalan igual que en el
// proyector-. Incluye la franja de logos + QR, para ver cuanto espacio
// queda realmente para el contenido. La trivia se muestra como se ve en
// la votacion en vivo (barras en cero).
const QR_MUESTRA = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent("vista-previa")}`;

function PreviewPagina({ titulo, tipoHerramienta, textoLineas, imagenUrl, imagenSvg, disposicionImagen, pregunta, alternativas, numAlternativas, correcta }) {
  const bullets = (textoLineas || "").split("\n").map((l) => l.trim()).filter(Boolean);

  let config = {};
  if (tipoHerramienta === "titulo_texto") {
    config = { bullets, imagen_svg: imagenSvg || undefined, disposicion_imagen: disposicionImagen };
  } else if (tipoHerramienta === "trivia") {
    config = {
      pregunta: pregunta || "Pregunta de la trivia",
      alternativas: LETRAS.slice(0, numAlternativas).map((letra, i) => alternativas[i] || `Alternativa ${letra}`),
      correcta,
    };
  }

  const pagina = { titulo, tipo_herramienta: tipoHerramienta, config };

  return (
    <div style={p.wrap}>
      <p style={p.label}>Vista previa — proyección</p>
      <div style={p.caja}>
        <PantallaClase pagina={pagina} imagenUrl={imagenUrl || null} trivia={null} codigo="CÓDIGO" qrUrl={QR_MUESTRA} />
      </div>
    </div>
  );
}

// ---------------- EDITOR (panel derecho, antes era el modal) ----------------
// Layout: vista previa grande arriba (todo el ancho disponible), formulario
// debajo (tambien todo el ancho) -antes eran 2 columnas lado a lado, ahora
// apilado siempre, sin media query-.
function PaginaEditor({ claseFormalId, pagina, onCerrar, onGuardada }) {
  const [titulo, setTitulo] = useState(pagina?.titulo || "");
  const [tipoHerramienta, setTipoHerramienta] = useState(pagina?.tipo_herramienta || "ninguna");

  // ---- config titulo_texto ----
  const configPrevia = pagina?.config || {};
  const [textoLineas, setTextoLineas] = useState(() => (configPrevia.bullets || []).join("\n"));
  const hayTexto = textoLineas.split("\n").some((l) => l.trim());

  // ---- imagen manual opcional (solo aplica a titulo_texto) ----
  // Se guarda el PATH permanente (config.imagen_path), nunca el link firmado
  // -ese vence (30 min) y antes se guardaba directo, quedando roto para
  // siempre-. imagenUrl es solo el token de visualizacion, se resuelve
  // fresco cada vez (al subir una foto nueva, o al abrir una pagina que ya
  // tenia una guardada), nunca se persiste tal cual.
  // Path existente: el nuevo campo si ya esta migrado, o extraido del link
  // vencido antiguo si la pagina es de antes de este cambio (autorreparacion,
  // sin pedir resubir la foto).
  const pathExistente = configPrevia.imagen_path || extraerPathDeUrlVencida(configPrevia.imagen_url);

  const [imagenPath, setImagenPath] = useState(pathExistente || "");
  const [imagenUrl, setImagenUrl] = useState("");
  // Solo izquierda/derecha. Paginas antiguas guardadas como "grande"
  // quedan a la izquierda (misma regla que la proyeccion).
  const [disposicionImagen, setDisposicionImagen] = useState(
    configPrevia.disposicion_imagen === "lado_derecha" ? "lado_derecha" : "lado_izquierda"
  );
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [cargandoImagen, setCargandoImagen] = useState(Boolean(pathExistente));

  // Al abrir una pagina que ya tenia una imagen (path nuevo, o extraido del
  // link vencido antiguo), pide un token de acceso fresco -el bucket sigue
  // privado, esto nunca expone el archivo publicamente, solo genera un link
  // temporal nuevo cada vez que se necesita mostrar la imagen.
  useEffect(() => {
    if (!pathExistente) return;
    let cancelado = false;
    setCargandoImagen(true);
    clasesFormalesMedia.obtenerUrl(pathExistente)
      .then((r) => { if (!cancelado) setImagenUrl(r.url); })
      .catch((err) => { if (!cancelado) setError(err.message); })
      .finally(() => { if (!cancelado) setCargandoImagen(false); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- grafico generado por IA (solo aplica a titulo_texto) ----
  // Solo se puede ver y quitar aca -la generacion ocurre exclusivamente
  // en el pipeline de /documentos/clase-formal-. Si no se quita
  // explicitamente, se preserva tal cual al guardar cualquier otro cambio.
  const [imagenSvg, setImagenSvg] = useState(configPrevia.imagen_svg || "");

  // ---- config trivia ----
  const [pregunta, setPregunta] = useState(configPrevia.pregunta || "");
  const [numAlternativas, setNumAlternativas] = useState(configPrevia.alternativas?.length || 4);
  const [alternativas, setAlternativas] = useState(() => {
    const base = configPrevia.alternativas || [];
    return LETRAS.map((_, i) => base[i] || "");
  });
  const [correcta, setCorrecta] = useState(configPrevia.correcta ?? 0);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function handleAlternativaChange(i, valor) {
    setAlternativas((prev) => prev.map((a, idx) => (idx === i ? valor : a)));
  }

  async function handleSubirImagen(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setError("");
    setSubiendoImagen(true);
    try {
      const resultado = await casosVivoAdmin.subirMediaCaso("foto", archivo);
      const path = resultado?.media_url;
      if (!path) throw new Error("El servidor no devolvió el path de la imagen");
      setImagenPath(path);
      // El endpoint de subida ya devuelve un token fresco listo para usar
      // (resultado.url); si por algun motivo no viniera, se pide uno nuevo
      // al endpoint publico de todos modos.
      const url = resultado?.url || (await clasesFormalesMedia.obtenerUrl(path)).url;
      setImagenUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendoImagen(false);
      e.target.value = "";
    }
  }

  function handleQuitarImagen() {
    setImagenPath("");
    setImagenUrl("");
  }

  function handleQuitarGrafico() {
    setImagenSvg("");
  }

  async function handleGuardar(e) {
    e.preventDefault();
    if (!titulo.trim()) return;
    if (tipoHerramienta === "trivia" && !pregunta.trim()) return;

    setError("");
    setGuardando(true);

    let config = {};
    if (tipoHerramienta === "trivia") {
      config = {
        pregunta: pregunta.trim(),
        alternativas: alternativas.slice(0, numAlternativas).map((a) => a.trim()),
        correcta,
      };
      // Imagen opcional en trivia -mismo path permanente que titulo_texto,
      // sin disposicion: sola mientras votan, y al 50% a la derecha de las
      // alternativas (ver ProyeccionClase.jsx).
      if (imagenPath) {
        config.imagen_path = imagenPath;
      }
    } else if (tipoHerramienta === "titulo_texto") {
      config = {
        bullets: textoLineas.split("\n").map((l) => l.trim()).filter(Boolean),
      };
      // Disposicion guardada segun la regla unica: con texto, el lado
      // elegido; sin texto, "grande". Aplica a imagen manual Y grafico IA.
      if (imagenPath || imagenSvg) {
        config.disposicion_imagen = resolverDisposicion({ disposicion_imagen: disposicionImagen }, config.bullets.length > 0);
      }
      // Imagen manual e imagen IA coexisten -no se pisan-. El grafico IA
      // solo se preserva o se quita aca, nunca se genera ni se sube.
      // Se guarda imagen_path (permanente), NUNCA imagen_url (token que vence).
      if (imagenPath) {
        config.imagen_path = imagenPath;
      }
      if (imagenSvg) {
        config.imagen_svg = imagenSvg;
        config.imagen_origen = "ia";
      }
    }

    try {
      let resultado;
      if (pagina) {
        resultado = await clasesFormalesPaginas.editar(pagina.id, {
          titulo: titulo.trim(),
          tipo_herramienta: tipoHerramienta,
          config,
        });
      } else {
        resultado = await clasesFormalesPaginas.crear(claseFormalId, titulo.trim(), tipoHerramienta, config);
      }
      onGuardada(resultado);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={s.editorStack}>
      <div>
        <p style={s.editorTitulo}>{pagina ? "Editar página" : "Nueva página"}</p>
        <PreviewPagina
          titulo={titulo}
          tipoHerramienta={tipoHerramienta}
          textoLineas={textoLineas}
          imagenUrl={imagenUrl}
          imagenSvg={imagenSvg}
          disposicionImagen={disposicionImagen}
          pregunta={pregunta}
          alternativas={alternativas}
          numAlternativas={numAlternativas}
          correcta={correcta}
        />
      </div>

      <div>
        <form onSubmit={handleGuardar} style={s.form}>
          <label style={s.label}>Título</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. Clasificación de Garden"
            autoFocus
            style={s.input}
          />

          <label style={s.label}>Plantilla</label>
          <select value={tipoHerramienta} onChange={(e) => setTipoHerramienta(e.target.value)} style={s.input}>
            {Object.entries(HERRAMIENTA_LABEL).map(([valor, label]) => (
              <option key={valor} value={valor}>{label}</option>
            ))}
          </select>

          {tipoHerramienta === "titulo_texto" && (
            <>
              <label style={s.label}>Texto (una línea = un punto en pantalla)</label>
              <textarea
                value={textoLineas}
                onChange={(e) => setTextoLineas(e.target.value)}
                placeholder={"Ej.\nIncidencia 30% en mayores de 65 años\nMás frecuente en mujeres"}
                rows={6}
                style={s.textarea}
              />

              {imagenSvg && (
                <>
                  <label style={s.label}>Gráfico generado por IA</label>
                  <div style={s.imagenPreviewWrap}>
                    <div
                      className="grafico-ia-modal"
                      style={s.graficoPreview}
                      dangerouslySetInnerHTML={{ __html: imagenSvg }}
                    />
                    <button type="button" onClick={handleQuitarGrafico} style={s.btnQuitarImagen}>
                      Quitar gráfico
                    </button>
                  </div>
                  <style>{`.grafico-ia-modal svg { width: 100%; height: 100%; display: block; }`}</style>
                </>
              )}

              <label style={s.label}>Imagen (opcional — ej. radiografía)</label>

              {cargandoImagen ? (
                <p style={s.info}>Cargando imagen...</p>
              ) : imagenPath ? (
                <div style={s.imagenPreviewWrap}>
                  {imagenUrl && <img src={imagenUrl} alt="Vista previa" style={s.imagenPreview} />}
                  <button type="button" onClick={handleQuitarImagen} style={s.btnQuitarImagen}>
                    Quitar foto
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSubirImagen}
                  disabled={subiendoImagen}
                  style={s.inputFile}
                />
              )}
              {subiendoImagen && <p style={s.info}>Subiendo imagen...</p>}

              {/* Con texto + imagen/grafico: solo se elige el lado. Sin
                  texto: grande y centrada, no hay nada que elegir. */}
              {(imagenPath || imagenSvg) && (
                hayTexto ? (
                  <>
                    <label style={s.label}>Lado de la imagen</label>
                    <select
                      value={disposicionImagen}
                      onChange={(e) => setDisposicionImagen(e.target.value)}
                      style={s.input}
                    >
                      {Object.entries(DISPOSICION_LABEL).map(([valor, label]) => (
                        <option key={valor} value={valor}>{label}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <p style={s.info}>Sin texto: la imagen se proyecta grande y centrada.</p>
                )
              )}
            </>
          )}

          {tipoHerramienta === "trivia" && (
            <>
              <label style={s.label}>Pregunta</label>
              <input
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
                placeholder="Ej. ¿Cuál es el tipo Garden más inestable?"
                style={s.input}
              />

              <label style={s.label}>Imagen (opcional — sola mientras votan, luego al lado de las alternativas)</label>

              {cargandoImagen ? (
                <p style={s.info}>Cargando imagen...</p>
              ) : imagenPath ? (
                <div style={s.imagenPreviewWrap}>
                  {imagenUrl && <img src={imagenUrl} alt="Vista previa" style={s.imagenPreview} />}
                  <button type="button" onClick={handleQuitarImagen} style={s.btnQuitarImagen}>
                    Quitar foto
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSubirImagen}
                  disabled={subiendoImagen}
                  style={s.inputFile}
                />
              )}
              {subiendoImagen && <p style={s.info}>Subiendo imagen...</p>}

              <label style={s.label}>Número de alternativas</label>
              <select
                value={numAlternativas}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setNumAlternativas(n);
                  if (correcta >= n) setCorrecta(0);
                }}
                style={s.input}
              >
                {[2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>

              {LETRAS.slice(0, numAlternativas).map((letra, i) => (
                <div key={letra} style={s.altFila}>
                  <span style={s.altLetra}>{letra}</span>
                  <input
                    value={alternativas[i]}
                    onChange={(e) => handleAlternativaChange(i, e.target.value)}
                    placeholder={`Alternativa ${letra}`}
                    style={{ ...s.input, flex: 1, marginBottom: 0 }}
                  />
                </div>
              ))}

              <label style={s.label}>Alternativa correcta</label>
              <select value={correcta} onChange={(e) => setCorrecta(Number(e.target.value))} style={s.input}>
                {LETRAS.slice(0, numAlternativas).map((letra, i) => (
                  <option key={letra} value={i}>{letra}</option>
                ))}
              </select>
            </>
          )}

          {error && <p style={s.error}>{error}</p>}

          <div style={s.editorBtns}>
            <button type="button" onClick={onCerrar} style={s.btnCancelar}>Cerrar</button>
            <button type="submit" disabled={guardando || subiendoImagen || !titulo.trim()} style={s.btn}>
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  wrap: { height: "100vh", overflow: "hidden", background: "#0E1526", color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", flexDirection: "column" },
  header: { display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", flexShrink: 0 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 18, margin: 0 },

  // Fila principal: sidebar fijo + editor ocupando TODO el resto del
  // ancho -antes era una sola columna centrada con modal encima-.
  body: { display: "flex", flex: 1, minHeight: 0, borderTop: "1px solid rgba(244,241,233,0.08)" },

  sidebar: { width: 360, flexShrink: 0, borderRight: "1px solid rgba(244,241,233,0.1)", padding: "20px 16px", overflowY: "auto" },
  btnNueva: { display: "block", width: "100%", background: ACENTO, border: "none", borderRadius: 12, color: "#0E1526", cursor: "pointer", padding: "14px 0", fontSize: 15, fontWeight: 700, marginBottom: 16 },
  info: { color: "#94A3B8", fontSize: 14, textAlign: "center", margin: "20px 0" },
  error: { color: "#D1495B", fontSize: 13, margin: "6px 0" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  item: { display: "flex", alignItems: "center", gap: 10, background: "#16213A", border: "1px solid rgba(244,241,233,0.1)", borderRadius: 12, padding: "10px 12px" },
  itemSeleccionado: { border: `1px solid ${ACENTO}`, background: "rgba(79,195,217,0.08)" },
  handle: { background: "none", border: "none", color: "#94A3B8", fontSize: 18, cursor: "grab", padding: "4px 6px", touchAction: "none" },
  numero: { color: ACENTO, fontWeight: 800, fontSize: 13, width: 20, textAlign: "center", flexShrink: 0 },
  itemInfo: { flex: 1, cursor: "pointer", minWidth: 0 },
  itemTitulo: { fontSize: 14.5, fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  itemDesc: { fontSize: 12, color: "#94A3B8", margin: "2px 0 0" },
  btnEliminar: { background: "none", border: "none", color: "#D1495B", fontSize: 16, cursor: "pointer", padding: "4px 8px", flexShrink: 0 },

  // Editor: ocupa TODO el resto del ancho de pantalla. Apilado siempre:
  // preview grande arriba (todo el ancho), formulario debajo (todo el
  // ancho) -antes eran 2 columnas lado a lado (44%/56%)-.
  editorPanel: { flex: 1, minWidth: 0, overflowY: "auto", padding: "24px 32px 60px" },
  editorStack: { display: "flex", flexDirection: "column", gap: 28, width: "100%" },
  editorTitulo: { fontSize: 16, fontWeight: 700, margin: "0 0 16px" },

  vacioWrap: { height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" },
  vacioTexto: { color: "#64748B", fontSize: 15, textAlign: "center", maxWidth: 360 },

  form: { display: "flex", flexDirection: "column", gap: 8, maxWidth: 640 },
  label: { fontSize: 12.5, color: "#94A3B8", marginTop: 6 },
  input: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "13px 14px", color: "#F4F1EA", fontSize: 15, marginBottom: 4 },
  inputFile: { background: "#16213A", border: "1px dashed rgba(244,241,233,0.25)", borderRadius: 10, padding: "12px 14px", color: "#94A3B8", fontSize: 13, marginBottom: 4 },
  textarea: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "13px 14px", color: "#F4F1EA", fontSize: 15, marginBottom: 4, fontFamily: "sans-serif", resize: "vertical" },
  altFila: { display: "flex", alignItems: "center", gap: 8 },
  altLetra: { color: ACENTO, fontWeight: 800, fontSize: 14, width: 18, flexShrink: 0 },
  editorBtns: { display: "flex", gap: 10, marginTop: 16, maxWidth: 420 },
  btnCancelar: { flex: 1, background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 10, color: "#F4F1EA", padding: "13px 0", fontSize: 14, cursor: "pointer" },
  btn: { flex: 1, background: ACENTO, border: "none", borderRadius: 10, color: "#0E1526", padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" },

  imagenPreviewWrap: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 },
  imagenPreview: { width: "100%", maxWidth: 420, maxHeight: 220, objectFit: "contain", borderRadius: 10, border: "1px solid rgba(244,241,233,0.12)", background: "#16213A" },
  graficoPreview: { width: "100%", maxWidth: 420, height: 220, borderRadius: 10, border: "1px solid rgba(244,241,233,0.12)", background: "#FFFFFF", padding: 8, boxSizing: "border-box" },
  btnQuitarImagen: { alignSelf: "flex-start", background: "none", border: "1px solid rgba(209,73,91,0.4)", borderRadius: 8, color: "#D1495B", padding: "6px 12px", fontSize: 12.5, cursor: "pointer" },
};

// Estilos de la vista previa — proporción 16:9, ahora ocupando todo el
// ancho disponible del panel derecho (antes limitado a maxWidth:480
// porque competía con el formulario al lado; el formulario ahora va
// debajo, no al costado).
const p = {
  wrap: { marginBottom: 18, maxWidth: 900 },
  label: { fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" },
  // Pantalla a escala: 16:9 y containerType:"size" -las medidas de
  // PantallaClase (cqh/cqw) se calculan contra esta caja, igual que en la
  // proyeccion se calculan contra la ventana completa-.
  caja: { position: "relative", width: "100%", aspectRatio: "16 / 9", containerType: "size", overflow: "hidden", borderRadius: 10, border: "1px solid rgba(244,241,233,0.12)", background: "#0E1526" },
};
