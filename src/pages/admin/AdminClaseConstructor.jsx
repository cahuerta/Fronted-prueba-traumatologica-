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
import { clasesFormalesPaginas } from "../../api/clasesFormalesCliente";
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
// sin separar storage-. El "tipo" que le mandamos es "imagen", igual
// que casos clinicos.
const DISPOSICION_LABEL = {
  grande: "Grande (protagonista, texto abajo)",
  lado_izquierda: "Al lado del texto — imagen a la izquierda",
  lado_derecha: "Al lado del texto — imagen a la derecha",
};

export default function AdminClaseConstructor() {
  const { claseFormalId } = useParams();
  const navigate = useNavigate();

  const [paginas, setPaginas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(null); // pagina_id en edicion, o "nueva"

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
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate("/admin/clases-formales")} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>Armar clase</h1>
      </header>

      <button onClick={() => setEditando("nueva")} style={s.btnNueva}>+ Nueva página</button>

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
                onEditar={() => setEditando(pagina.id)}
                onEliminar={() => handleEliminar(pagina.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {editando && (
        <PaginaModal
          claseFormalId={claseFormalId}
          pagina={editando === "nueva" ? null : paginas.find((p) => p.id === editando)}
          onClose={() => setEditando(null)}
          onGuardada={(pagina) => {
            if (editando === "nueva") {
              setPaginas((prev) => [...prev, pagina]);
            } else {
              setPaginas((prev) => prev.map((p) => (p.id === pagina.id ? pagina : p)));
            }
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------- ITEM ARRASTRABLE ----------------
function PaginaItem({ pagina, numero, onEditar, onEliminar }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pagina.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={{ ...s.item, ...style }}>
      <button {...attributes} {...listeners} style={s.handle} aria-label="Arrastrar para reordenar">⠿</button>
      <span style={s.numero}>{numero}</span>
      <div style={s.itemInfo} onClick={onEditar}>
        <p style={s.itemTitulo}>{pagina.titulo}</p>
        <p style={s.itemDesc}>
          {HERRAMIENTA_LABEL[pagina.tipo_herramienta] || pagina.tipo_herramienta}
          {pagina.config?.imagen_url ? " · con imagen" : ""}
        </p>
      </div>
      <button onClick={onEliminar} style={s.btnEliminar} aria-label="Eliminar página">✕</button>
    </div>
  );
}

// ---------------- MODAL CREAR/EDITAR ----------------
function PaginaModal({ claseFormalId, pagina, onClose, onGuardada }) {
  const [titulo, setTitulo] = useState(pagina?.titulo || "");
  const [tipoHerramienta, setTipoHerramienta] = useState(pagina?.tipo_herramienta || "ninguna");

  // ---- config titulo_texto ----
  const configPrevia = pagina?.config || {};
  const [textoLineas, setTextoLineas] = useState(() => (configPrevia.bullets || []).join("\n"));

  // ---- imagen opcional (solo aplica a titulo_texto) ----
  const [imagenUrl, setImagenUrl] = useState(configPrevia.imagen_url || "");
  const [disposicionImagen, setDisposicionImagen] = useState(configPrevia.disposicion_imagen || "grande");
  const [subiendoImagen, setSubiendoImagen] = useState(false);

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
      const resultado = await casosVivoAdmin.subirMediaCaso("imagen", archivo);
      // El endpoint de casos clinicos devuelve la url subida; se soportan
      // ambos nombres de campo por si el backend usa uno u otro.
      const url = resultado?.url || resultado?.media_url;
      if (!url) throw new Error("El servidor no devolvió la URL de la imagen");
      setImagenUrl(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendoImagen(false);
      e.target.value = "";
    }
  }

  function handleQuitarImagen() {
    setImagenUrl("");
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
      if (imagenUrl) {
        config.imagen_url = imagenUrl;
        config.disposicion_imagen = disposicionImagen;
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
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <p style={s.modalTitulo}>{pagina ? "Editar página" : "Nueva página"}</p>
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

              <label style={s.label}>Imagen (opcional — ej. radiografía)</label>

              {imagenUrl ? (
                <div style={s.imagenPreviewWrap}>
                  <img src={imagenUrl} alt="Vista previa" style={s.imagenPreview} />
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

              {imagenUrl && (
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

          <div style={s.modalBtns}>
            <button type="button" onClick={onClose} style={s.btnCancelar}>Cancelar</button>
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
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 18, margin: 0 },
  btnNueva: { display: "block", width: "100%", background: ACENTO, border: "none", borderRadius: 12, color: "#0E1526", cursor: "pointer", padding: "14px 0", fontSize: 15, fontWeight: 700, marginBottom: 20 },
  info: { color: "#94A3B8", fontSize: 14, textAlign: "center", margin: "20px 0" },
  error: { color: "#D1495B", fontSize: 13, margin: "6px 0" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  item: { display: "flex", alignItems: "center", gap: 10, background: "#16213A", border: "1px solid rgba(244,241,233,0.1)", borderRadius: 12, padding: "10px 12px" },
  handle: { background: "none", border: "none", color: "#94A3B8", fontSize: 18, cursor: "grab", padding: "4px 6px", touchAction: "none" },
  numero: { color: ACENTO, fontWeight: 800, fontSize: 13, width: 20, textAlign: "center", flexShrink: 0 },
  itemInfo: { flex: 1, cursor: "pointer" },
  itemTitulo: { fontSize: 14.5, fontWeight: 700, margin: 0 },
  itemDesc: { fontSize: 12, color: "#94A3B8", margin: "2px 0 0" },
  btnEliminar: { background: "none", border: "none", color: "#D1495B", fontSize: 16, cursor: "pointer", padding: "4px 8px" },

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, overflowY: "auto" },
  modal: { width: "100%", maxWidth: 420, background: "#16213A", borderRadius: "18px 18px 0 0", padding: "24px 20px 32px" },
  modalTitulo: { fontSize: 16, fontWeight: 700, margin: "0 0 16px" },
  form: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 12.5, color: "#94A3B8", marginTop: 6 },
  input: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "13px 14px", color: "#F4F1EA", fontSize: 15, marginBottom: 4 },
  inputFile: { background: "#0E1526", border: "1px dashed rgba(244,241,233,0.25)", borderRadius: 10, padding: "12px 14px", color: "#94A3B8", fontSize: 13, marginBottom: 4 },
  textarea: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "13px 14px", color: "#F4F1EA", fontSize: 15, marginBottom: 4, fontFamily: "sans-serif", resize: "vertical" },
  altFila: { display: "flex", alignItems: "center", gap: 8 },
  altLetra: { color: ACENTO, fontWeight: 800, fontSize: 14, width: 18, flexShrink: 0 },
  modalBtns: { display: "flex", gap: 10, marginTop: 16 },
  btnCancelar: { flex: 1, background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 10, color: "#F4F1EA", padding: "13px 0", fontSize: 14, cursor: "pointer" },
  btn: { flex: 1, background: ACENTO, border: "none", borderRadius: 10, color: "#0E1526", padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" },

  imagenPreviewWrap: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 },
  imagenPreview: { width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 10, border: "1px solid rgba(244,241,233,0.12)", background: "#0E1526" },
  btnQuitarImagen: { alignSelf: "flex-start", background: "none", border: "1px solid rgba(209,73,91,0.4)", borderRadius: 8, color: "#D1495B", padding: "6px 12px", fontSize: 12.5, cursor: "pointer" },
};
