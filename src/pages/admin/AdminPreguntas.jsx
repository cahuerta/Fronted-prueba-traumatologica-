import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { preguntas, getToken } from "../../api/client";

const API_URL = import.meta.env.VITE_API_URL;
const REGIONES = ["hombro", "codo", "muneca", "columna", "cadera", "rodilla", "tobillo"];
const COMPLEJIDADES = ["basica", "intermedia", "compleja"];
const LETRAS = ["A", "B", "C", "D", "E"];

export default function AdminPreguntas() {
  const navigate = useNavigate();

  const [region, setRegion] = useState(REGIONES[0]);
  const [complejidad, setComplejidad] = useState(COMPLEJIDADES[0]);
  const [pregunta, setPregunta] = useState("");
  const [respuestaCorrecta, setRespuestaCorrecta] = useState("");
  const [explicacion, setExplicacion] = useState("");

  const [tipoMedia, setTipoMedia] = useState("");
  const [archivoMedia, setArchivoMedia] = useState(null);

  const [opciones, setOpciones] = useState(null); // null hasta generar con IA
  const [correctaIdx, setCorrectaIdx] = useState(null);

  const [generando, setGenerando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const [lista, setLista] = useState([]);
  const [filtroRegion, setFiltroRegion] = useState("");

  const [expandida, setExpandida] = useState(null);

  useEffect(() => {
    cargarLista();
  }, [filtroRegion]);

  async function cargarLista() {
    try {
      const data = await preguntas.listar(filtroRegion || undefined);
      setLista(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerar() {
    setError("");
    setExito("");
    if (!pregunta.trim() || !respuestaCorrecta.trim()) {
      setError("Escribe la pregunta y la respuesta correcta primero");
      return;
    }
    setGenerando(true);
    try {
      const res = await preguntas.generarAlternativas({
        region, complejidad, pregunta: pregunta.trim(), respuesta_correcta: respuestaCorrecta.trim(),
      });
      setOpciones(res.opciones);
      setCorrectaIdx(res.correcta);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerando(false);
    }
  }

  function handleEditarOpcion(i, valor) {
    const nuevas = [...opciones];
    nuevas[i] = valor;
    setOpciones(nuevas);
  }

  async function subirMedia() {
    const formData = new FormData();
    formData.append("tipo", tipoMedia);
    formData.append("archivo", archivoMedia);

    const res = await fetch(`${API_URL}/preguntas/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(detail.detail || "No se pudo subir la imagen/video");
    }
    return res.json(); // { media_url, media_tipo }
  }

  async function handleGuardar() {
    setError("");
    setExito("");
    setGuardando(true);
    try {
      let media_url = null;
      let media_tipo = null;

      if (archivoMedia) {
        const media = await subirMedia();
        media_url = media.media_url;
        media_tipo = media.media_tipo;
      }

      await preguntas.crear({
        region, complejidad, pregunta: pregunta.trim(),
        opciones, correcta: correctaIdx,
        explicacion: explicacion.trim() || null,
        media_url, media_tipo,
      });

      setExito("Pregunta guardada");
      setPregunta("");
      setRespuestaCorrecta("");
      setExplicacion("");
      setOpciones(null);
      setCorrectaIdx(null);
      setTipoMedia("");
      setArchivoMedia(null);
      cargarLista();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleBorrar(id) {
    try {
      await preguntas.borrar(id);
      cargarLista();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.headerRow}>
        <button onClick={() => navigate("/admin/dashboard")} style={s.back}>‹ Volver</button>
        <h1 style={s.title}>Banco de preguntas</h1>
      </div>

      <div style={s.form}>
        <label style={s.label}>Región</label>
        <select value={region} onChange={(e) => setRegion(e.target.value)} style={s.input}>
          {REGIONES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        <label style={s.label}>Complejidad</label>
        <select value={complejidad} onChange={(e) => setComplejidad(e.target.value)} style={s.input}>
          {COMPLEJIDADES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <label style={s.label}>Pregunta</label>
        <textarea value={pregunta} onChange={(e) => setPregunta(e.target.value)} rows={3} style={s.input} />

        <label style={s.label}>Respuesta correcta</label>
        <input value={respuestaCorrecta} onChange={(e) => setRespuestaCorrecta(e.target.value)} style={s.input} />

        <label style={s.label}>Foto o video (opcional, ej. radiografía)</label>
        <select value={tipoMedia} onChange={(e) => setTipoMedia(e.target.value)} style={s.input}>
          <option value="">Sin foto/video</option>
          <option value="foto">Foto</option>
          <option value="video">Video</option>
        </select>
        {tipoMedia && (
          <input
            type="file"
            accept={tipoMedia === "foto" ? "image/*" : "video/*"}
            onChange={(e) => setArchivoMedia(e.target.files[0])}
            style={s.fileInput}
          />
        )}

        {opciones === null ? (
          <button onClick={handleGenerar} disabled={generando} style={s.iaBtn}>
            {generando ? "Generando con IA..." : "Generar alternativas con IA"}
          </button>
        ) : (
          <>
            <label style={s.label}>Alternativas (edítalas si quieres)</label>
            {opciones.map((op, i) => (
              <div key={i} style={s.opcionRow}>
                <button
                  onClick={() => setCorrectaIdx(i)}
                  style={{ ...s.letraBtn, ...(correctaIdx === i ? s.letraBtnActiva : {}) }}
                >
                  {LETRAS[i]}
                </button>
                <input value={op} onChange={(e) => handleEditarOpcion(i, e.target.value)} style={{ ...s.input, flex: 1, marginBottom: 0 }} />
              </div>
            ))}

            <label style={s.label}>Explicación (opcional)</label>
            <textarea value={explicacion} onChange={(e) => setExplicacion(e.target.value)} rows={2} style={s.input} />

            <div style={s.btnRow}>
              <button onClick={() => { setOpciones(null); setCorrectaIdx(null); }} style={s.secondaryBtn}>Regenerar</button>
              <button onClick={handleGuardar} disabled={guardando} style={s.saveBtn}>
                {guardando ? "Guardando..." : "Guardar pregunta"}
              </button>
            </div>
          </>
        )}

        {error && <p style={s.error}>{error}</p>}
        {exito && <p style={s.exito}>{exito}</p>}
      </div>

      <div style={s.sectionHead}>
        <h2 style={s.h2}>Preguntas cargadas ({lista.length})</h2>
        <select value={filtroRegion} onChange={(e) => setFiltroRegion(e.target.value)} style={s.filterSelect}>
          <option value="">Todas</option>
          {REGIONES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div style={s.list}>
        {lista.map((p) => {
          const abierta = expandida === p.id;
          return (
            <div key={p.id} style={s.cardExpandible}>
              <button onClick={() => setExpandida(abierta ? null : p.id)} style={s.cardHeaderBtn}>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={s.cardMeta}>{p.region} · {p.complejidad}{p.media_tipo ? ` · ${p.media_tipo}` : ""}</p>
                  <p style={s.cardTitle}>{p.pregunta}</p>
                </div>
                <span style={s.chevron}>{abierta ? "▲" : "▼"}</span>
              </button>

              {abierta && (
                <div style={s.cardDetalle}>
                  {p.media_tipo && <p style={s.mediaNota}>📎 Tiene {p.media_tipo} adjunto</p>}
                  {p.opciones.map((op, i) => (
                    <p key={i} style={{ ...s.opcionDetalle, ...(i === p.correcta ? s.opcionCorrecta : {}) }}>
                      {LETRAS[i]}. {op}{i === p.correcta ? " ✓" : ""}
                    </p>
                  ))}
                  {p.explicacion && <p style={s.explicacionDetalle}>{p.explicacion}</p>}
                  <button onClick={() => handleBorrar(p.id)} style={s.deleteBtnFull}>Eliminar pregunta</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  headerRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 18 },
  back: { background: "none", border: "none", color: "#94A3B8", fontSize: 14, cursor: "pointer" },
  title: { fontSize: 17, margin: 0 },
  form: { display: "flex", flexDirection: "column", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: 16, marginBottom: 24 },
  label: { fontSize: 11, color: "#94A3B8", marginTop: 10, marginBottom: 4 },
  input: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "9px 11px", color: "#F4F1EA", fontSize: 14, marginBottom: 4 },
  fileInput: { color: "#F4F1EA", fontSize: 12.5, marginBottom: 4 },
  iaBtn: { marginTop: 16, background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  opcionRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  letraBtn: { width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(244,241,233,0.2)", background: "transparent", color: "#94A3B8", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  letraBtnActiva: { background: "rgba(127,182,133,0.15)", borderColor: "#7FB685", color: "#7FB685" },
  btnRow: { display: "flex", gap: 8, marginTop: 16 },
  secondaryBtn: { flex: 1, background: "transparent", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "11px 0", fontSize: 14, cursor: "pointer" },
  saveBtn: { flex: 2, background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  error: { color: "#D1495B", fontSize: 13, marginTop: 12 },
  exito: { color: "#7FB685", fontSize: 13, marginTop: 12 },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  h2: { fontSize: 15, margin: 0 },
  filterSelect: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, color: "#F4F1EA", fontSize: 13, padding: "6px 8px" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: { display: "flex", alignItems: "center", gap: 10, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "10px 12px" },
  cardExpandible: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, overflow: "hidden" },
  cardHeaderBtn: { width: "100%", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: "10px 12px", cursor: "pointer" },
  chevron: { color: "#94A3B8", fontSize: 10, flexShrink: 0 },
  cardDetalle: { borderTop: "1px solid rgba(244,241,233,0.1)", padding: "10px 12px 12px" },
  mediaNota: { color: "#4FC3D9", fontSize: 12, marginBottom: 8 },
  opcionDetalle: { color: "#94A3B8", fontSize: 13, margin: "4px 0" },
  opcionCorrecta: { color: "#7FB685", fontWeight: 600 },
  explicacionDetalle: { color: "#94A3B8", fontSize: 12.5, fontStyle: "italic", marginTop: 8 },
  deleteBtnFull: { marginTop: 12, background: "none", border: "1px solid rgba(209,73,91,0.4)", borderRadius: 8, color: "#D1495B", padding: "8px 0", width: "100%", fontSize: 13, cursor: "pointer" },
  cardMeta: { color: "#4FC3D9", fontSize: 10.5, margin: 0, textTransform: "uppercase", letterSpacing: "0.03em" },
  cardTitle: { color: "#F4F1EA", fontSize: 13.5, margin: "2px 0 0" },
  deleteBtn: { background: "none", border: "none", color: "#D1495B", fontSize: 16, cursor: "pointer", flexShrink: 0 },
};
