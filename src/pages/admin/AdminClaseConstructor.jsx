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

const ACENTO = "#4FC3D9";

const HERRAMIENTA_LABEL = {
  ninguna: "Solo contenido",
  semaforo: "Semáforo (¿sigo?)",
};

export default function AdminClaseConstructor() {
  const { sesionId } = useParams();
  const navigate = useNavigate();

  const [paginas, setPaginas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [editando, setEditando] = useState(null); // pagina_id en edicion, o "nueva"

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    cargar();
  }, [sesionId]);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const data = await clasesFormalesPaginas.listar(sesionId);
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
          sesionId={sesionId}
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
        <p style={s.itemDesc}>{HERRAMIENTA_LABEL[pagina.tipo_herramienta] || pagina.tipo_herramienta}</p>
      </div>
      <button onClick={onEliminar} style={s.btnEliminar} aria-label="Eliminar página">✕</button>
    </div>
  );
}

// ---------------- MODAL CREAR/EDITAR ----------------
function PaginaModal({ sesionId, pagina, onClose, onGuardada }) {
  const [titulo, setTitulo] = useState(pagina?.titulo || "");
  const [tipoHerramienta, setTipoHerramienta] = useState(pagina?.tipo_herramienta || "ninguna");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function handleGuardar(e) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setError("");
    setGuardando(true);
    try {
      let resultado;
      if (pagina) {
        resultado = await clasesFormalesPaginas.editar(pagina.id, {
          titulo: titulo.trim(),
          tipo_herramienta: tipoHerramienta,
        });
      } else {
        resultado = await clasesFormalesPaginas.crear(sesionId, titulo.trim(), tipoHerramienta);
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

          <label style={s.label}>Herramienta</label>
          <select value={tipoHerramienta} onChange={(e) => setTipoHerramienta(e.target.value)} style={s.input}>
            {Object.entries(HERRAMIENTA_LABEL).map(([valor, label]) => (
              <option key={valor} value={valor}>{label}</option>
            ))}
          </select>

          {error && <p style={s.error}>{error}</p>}

          <div style={s.modalBtns}>
            <button type="button" onClick={onClose} style={s.btnCancelar}>Cancelar</button>
            <button type="submit" disabled={guardando || !titulo.trim()} style={s.btn}>
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

  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 },
  modal: { width: "100%", maxWidth: 420, background: "#16213A", borderRadius: "18px 18px 0 0", padding: "24px 20px 32px" },
  modalTitulo: { fontSize: 16, fontWeight: 700, margin: "0 0 16px" },
  form: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 12.5, color: "#94A3B8", marginTop: 6 },
  input: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "13px 14px", color: "#F4F1EA", fontSize: 15 },
  modalBtns: { display: "flex", gap: 10, marginTop: 16 },
  btnCancelar: { flex: 1, background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 10, color: "#F4F1EA", padding: "13px 0", fontSize: 14, cursor: "pointer" },
  btn: { flex: 1, background: ACENTO, border: "none", borderRadius: 10, color: "#0E1526", padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
            
