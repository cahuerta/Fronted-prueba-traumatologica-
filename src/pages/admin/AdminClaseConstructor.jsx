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
const DISPOSICION_LABEL = {
  grande: "Grande (protagonista, texto abajo)",
  lado_izquierda: "Al lado del texto — imagen a la izquierda",
  lado_derecha: "Al lado del texto — imagen a la derecha",
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
    pagina.config?.imagen_path ? "con imagen" : null,
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
// Simula la misma pantalla que ve el proyector (ProyeccionClase.jsx) —
// mismo fondo oscuro y jerarquía tipográfica, para que el docente vea
// cómo va a quedar antes de guardar. Ahora ocupa todo el ancho
// disponible del panel derecho (antes competía 44%/56% con el
// formulario al lado; el editor completo va debajo, no al costado).
// Imagen manual y grafico IA pueden coexistir: se muestran lado a lado,
// para no taparse entre si ni tapar el texto de abajo.
function PreviewPagina({ titulo, tipoHerramienta, textoLineas, imagenUrl, imagenSvg, pregunta, alternativas, numAlternativas }) {
  const bullets = (textoLineas || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const hayVisuales = Boolean(imagenUrl || imagenSvg);

  // Lado a lado, no apilado: en una caja 16:9 hay mas espacio horizontal
  // que vertical, asi que competir gráfico vs bullets por ALTURA nunca
  // iba a caber bien -por eso los intentos anteriores fallaban-. Cuando
  // coexisten grafico/imagen y bullets, se reparten el ANCHO: visual a
  // un lado, bullets al otro (letra mas chica para que quepan). Si solo
  // hay uno de los dos, ese ocupa todo el espacio disponible.
  const hayBullets = bullets.length > 0;
  const numVisuales = (imagenSvg ? 1 : 0) + (imagenUrl ? 1 : 0);
  const layoutLado = hayVisuales && hayBullets;

  const bloqueVisual = hayVisuales && (
    <div style={{ ...(layoutLado ? p.columnaVisualLado : p.visualSolo), ...(numVisuales === 2 ? { gap: "4%" } : {}) }}>
      {imagenSvg && (
        <div
          className="grafico-ia-preview"
          style={numVisuales === 2 ? { ...p.visualBox, width: "48%" } : p.visualBox}
          dangerouslySetInnerHTML={{ __html: imagenSvg }}
        />
      )}
      {imagenUrl && (
        <div style={numVisuales === 2 ? { ...p.visualBox, width: "48%" } : p.visualBox}>
          <img
            src={imagenUrl}
            alt=""
            style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain", display: "block" }}
          />
        </div>
      )}
    </div>
  );

  const bloqueBullets = hayBullets && (
    <ul style={layoutLado ? p.bulletsLado : p.bullets}>
      {bullets.map((b, i) => (
        <li key={i} style={layoutLado ? p.bulletItemLado : p.bulletItem}>
          <span style={p.bulletMarcador}>•</span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <div style={p.wrap}>
      <p style={p.label}>Vista previa — proyección</p>
      <div style={p.pantalla}>
        <p style={p.titulo}>{titulo || "Título de la página"}</p>

        {tipoHerramienta === "titulo_texto" && (
          <>
            {layoutLado ? (
              <div style={p.filaLado}>
                {bloqueVisual}
                {bloqueBullets}
              </div>
            ) : (
              <>{bloqueVisual}{bloqueBullets}</>
            )}
            {!hayVisuales && !hayBullets && <p style={p.vacio}>Sin contenido todavía</p>}
          </>
        )}

        {tipoHerramienta === "trivia" && (
          <div style={p.trivia}>
            <p style={p.pregunta}>{pregunta || "Pregunta de la trivia"}</p>
            <div style={p.alternativas}>
              {LETRAS.slice(0, numAlternativas).map((letra, i) => (
                <div key={letra} style={p.alternativa}>
                  <span style={p.letra}>{letra}</span>
                  <span>{alternativas[i] || `Alternativa ${letra}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tipoHerramienta === "ninguna" && <p style={p.vacio}>Solo se proyecta el título</p>}
      </div>
      {/* Escala el SVG inyectado preservando su propia proporcion (viewBox
          propio) para caber dentro del contenedor -max-width/max-height,
          no width/height fijos, que lo estirarian distorsionando su forma-. */}
      <style>{`.grafico-ia-preview svg { max-width: 100%; max-height: 100%; width: auto; height: auto; display: block; }`}</style>
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
  const [disposicionImagen, setDisposicionImagen] = useState(configPrevia.disposicion_imagen || "grande");
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
    } else if (tipoHerramienta === "titulo_texto") {
      config = {
        bullets: textoLineas.split("\n").map((l) => l.trim()).filter(Boolean),
      };
      // Imagen manual e imagen IA coexisten -no se pisan-. El grafico IA
      // solo se preserva o se quita aca, nunca se genera ni se sube.
      // Se guarda imagen_path (permanente), NUNCA imagen_url (token que vence).
      if (imagenPath) {
        config.imagen_path = imagenPath;
        config.disposicion_imagen = disposicionImagen;
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
          pregunta={pregunta}
          alternativas={alternativas}
          numAlternativas={numAlternativas}
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

              {imagenPath && (
                <>
                  <label style={s.label}>Disposición de la imagen</label>
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
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", flexDirection: "column" },
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
  pantalla: {
    background: "#0E1526",
    border: "1px solid rgba(244,241,233,0.12)",
    borderRadius: 10,
    aspectRatio: "16 / 9",
    padding: "5% 6%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    // Una pantalla de proyeccion NUNCA tiene scroll -tamaño fijo 16:9,
    // overflow:hidden real-. El contenido (grafico + bullets) se escala
    // para caber adentro -ver visualesRow/visualBox con minHeight:0 y
    // el grafico con max-width/max-height:100% preservando su proporcion-
    // en vez de desbordarse (bug anterior) o forzar que la caja crezca
    // y obligue a hacer scroll (parche incorrecto anterior).
    overflow: "hidden",
    color: "#F4F1EA",
    fontFamily: "sans-serif",
  },
  titulo: { fontSize: "clamp(14px, 2.6cqw, 26px)", fontWeight: 800, margin: "0 0 8px", lineHeight: 1.2 },
  vacio: { fontSize: 13, color: "#64748B" },
  // Lado a lado -no apilado-: en una caja 16:9 hay mas espacio horizontal
  // que vertical, asi que grafico y bullets se reparten el ANCHO cuando
  // coexisten, cada uno con la altura completa disponible para escalar
  // adentro. flex:1 + minHeight:0 en ambos es el override real del bug
  // de flexbox donde los items no se encogen por debajo del tamaño de su
  // contenido por defecto -sin esto el maxHeight/height:100% no se
  // respeta-.
  filaLado: { display: "flex", flex: "1 1 auto", minHeight: 0, gap: "4%", alignItems: "center", justifyContent: "center", width: "100%" },
  columnaVisualLado: { flex: "0 0 46%", height: "100%", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  // Cuando solo hay grafico/imagen (sin bullets, caso autoexplicativo):
  // ocupa todo el espacio disponible, no solo la mitad.
  visualSolo: { flex: "1 1 auto", minHeight: 0, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  // height:100% + el grafico/imagen adentro con max-width/max-height:100%
  // y width/height auto -preserva su proporcion, se escala hacia adentro
  // para caber completo, nunca se corta ni se desborda-.
  visualBox: { height: "100%", width: "100%", borderRadius: 6, background: "#FFFFFF", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" },
  // Antes dependian de un marcador ::before en un objeto de estilos
  // inline -que React nunca aplica-, por eso quedaban sin separacion
  // visual real entre lineas. Ahora cada bullet es su propia fila con
  // fondo, borde y gap real, mismo lenguaje visual que p.alternativa.
  bullets: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10, textAlign: "left", fontSize: 15, lineHeight: 1.3, maxWidth: "92%", width: "92%" },
  bulletItem: { display: "flex", alignItems: "flex-start", gap: 10, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "9px 14px" },
  // Version compacta para cuando comparten espacio con un grafico/imagen
  // al lado -letra mas chica y padding reducido para que quepan mas
  // lineas en menos ancho-.
  bulletsLado: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, textAlign: "left", fontSize: 12.5, lineHeight: 1.25, flex: 1, minWidth: 0, maxHeight: "100%", overflow: "hidden" },
  bulletItemLado: { display: "flex", alignItems: "flex-start", gap: 6, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 6, padding: "6px 10px" },
  bulletMarcador: { color: ACENTO, fontWeight: 800, flexShrink: 0 },
  trivia: { width: "100%" },
  pregunta: { fontSize: 17, margin: "0 0 14px", lineHeight: 1.3 },
  alternativas: { display: "flex", flexDirection: "column", gap: 8, textAlign: "left", maxWidth: "85%", margin: "0 auto" },
  alternativa: { display: "flex", alignItems: "center", gap: 10, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "8px 14px", fontSize: 14 },
  letra: { width: 22, height: 22, borderRadius: "50%", background: ACENTO, color: "#0E1526", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11, flexShrink: 0 },
};
