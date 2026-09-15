import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { casosVivoAdmin } from "../../api/client";

const REGIONES = [
  { valor: "hombro", etiqueta: "Hombro" },
  { valor: "codo", etiqueta: "Codo" },
  { valor: "mano_muneca", etiqueta: "Mano y muñeca" },
  { valor: "columna", etiqueta: "Columna" },
  { valor: "cadera_pelvis", etiqueta: "Cadera y pelvis" },
  { valor: "rodilla", etiqueta: "Rodilla" },
  { valor: "tobillo_pie", etiqueta: "Tobillo y pie" },
  { valor: "ortogeriatria", etiqueta: "Ortogeriatría" },
  { valor: "imagenologia", etiqueta: "Imagenología" },
  { valor: "ciencias_basicas", etiqueta: "Ciencias básicas" },
  { valor: "administrativo", etiqueta: "Administrativo (no clínico)" },
];
const LETRAS = ["A", "B", "C", "D", "E"];

// ---------------- LAYOUT: sidebar = SECUENCIA REAL proyectada, editor a la derecha ----------------
// Antes el sidebar mostraba categorias del sistema (Datos/Preguntas/
// Fundamento) separadas -dificil de entender la secuencia real-. Ahora
// cada item del sidebar es una pantalla real que se proyecta en vivo
// (ver ProyeccionVivo.jsx): "Presentacion del caso" (estado
// 'presentando'), y cada "Pregunta N" (estado 'cerrada', fusionando
// enunciado+alternativas+media+fundamento en un solo editor, ya que son
// parte de la misma pantalla proyectada). El preview de cada uno imita
// fielmente el estilo real de esa pantalla, a escala reducida.
export default function AdminCasoNuevo() {
  const navigate = useNavigate();
  const { casoId: casoIdParam } = useParams();

  const [casoId, setCasoId] = useState(casoIdParam || null);
  const [caso, setCaso] = useState(null);
  const [error, setError] = useState("");
  const [seleccion, setSeleccion] = useState("presentacion"); // "presentacion" | pregunta.id | "nueva"

  useEffect(() => {
    if (casoIdParam) {
      setCasoId(casoIdParam);
      cargarCaso(casoIdParam);
    }
  }, [casoIdParam]);

  async function cargarCaso(id) {
    try {
      const data = await casosVivoAdmin.obtenerCaso(id);
      setCaso(data);
    } catch (err) {
      setError(err.message);
    }
  }

  const preguntasDelCaso = caso?.preguntas || [];
  const ordenesUsados = preguntasDelCaso.map((p) => p.orden);
  const siguienteOrden = [1, 2, 3, 4, 5].find((n) => !ordenesUsados.includes(n));

  async function handleEliminarPregunta(casoPreguntaId) {
    try {
      await casosVivoAdmin.quitarPreguntaCaso(casoId, casoPreguntaId);
      if (seleccion === casoPreguntaId) setSeleccion("presentacion");
      await cargarCaso(casoId);
    } catch (err) {
      setError(err.message);
    }
  }

  const preguntaSeleccionada = typeof seleccion === "string" && seleccion !== "presentacion" && seleccion !== "nueva"
    ? preguntasDelCaso.find((p) => p.id === seleccion)
    : null;

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate(-1)} style={s.back}>‹ Casos clínicos</button>
        <h1 style={s.h1}>{caso?.titulo || "Nuevo caso clínico"}</h1>
      </header>

      <div style={s.body}>
        {/* ---------------- IZQUIERDA: secuencia real, sidebar fijo ---------------- */}
        <aside style={s.sidebar}>
          <button
            onClick={() => setSeleccion("presentacion")}
            style={{ ...s.itemSidebar, ...(seleccion === "presentacion" ? s.itemSidebarActivo : {}) }}
          >
            <span style={s.itemNum}>▶</span>
            <span>Presentación del caso</span>
          </button>

          {preguntasDelCaso
            .slice()
            .sort((a, b) => a.orden - b.orden)
            .map((p) => (
              <button
                key={p.id}
                onClick={() => setSeleccion(p.id)}
                style={{ ...s.itemSidebar, ...(seleccion === p.id ? s.itemSidebarActivo : {}) }}
              >
                <span style={s.itemNum}>{p.orden}</span>
                <span style={s.itemTextoSidebar}>
                  Pregunta {p.orden}
                  {p.explicacion_generada ? " ✓" : ""}
                </span>
              </button>
            ))}

          {casoId && siguienteOrden && (
            <button
              onClick={() => setSeleccion("nueva")}
              style={{ ...s.itemSidebar, ...s.itemSidebarNueva, ...(seleccion === "nueva" ? s.itemSidebarActivo : {}) }}
            >
              <span style={s.itemNum}>+</span>
              <span>Agregar pregunta {siguienteOrden}</span>
            </button>
          )}

          {preguntasDelCaso.length > 0 && (
            <button onClick={() => navigate("/admin/casos-vivo")} style={s.finBtn}>
              Terminar — volver a casos clínicos
            </button>
          )}
        </aside>

        {/* ---------------- DERECHA: editor de lo seleccionado ---------------- */}
        <main style={s.editorPanel}>
          {error && <p style={s.error}>{error}</p>}

          {seleccion === "presentacion" && (
            <PresentacionEditor
              casoId={casoId}
              caso={caso}
              onGuardado={async (guardado, esNuevo) => {
                setCasoId(guardado.id);
                await cargarCaso(guardado.id);
                if (esNuevo) setSeleccion("nueva"); // recien creado: sigue a escribir la primera pregunta
              }}
            />
          )}

          {(seleccion === "nueva" || preguntaSeleccionada) && (
            <PreguntaEditor
              key={seleccion}
              casoId={casoId}
              pregunta={preguntaSeleccionada}
              siguienteOrden={siguienteOrden}
              onGuardada={async (resultado) => {
                await cargarCaso(casoId);
                setSeleccion(resultado.id);
              }}
              onEliminar={preguntaSeleccionada ? () => handleEliminarPregunta(preguntaSeleccionada.id) : null}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ---------------- PRESENTACION DEL CASO (region, titulo, vineta, media) ----------------
// Preview fiel al estado 'presentando' real de ProyeccionVivo.jsx:
// media grande arriba, vineta clinica en texto abajo (s.casoBox).
function PresentacionEditor({ casoId, caso, onGuardado }) {
  const [region, setRegion] = useState(caso?.region || "");
  const [titulo, setTitulo] = useState(caso?.titulo || "");
  const [vineta, setVineta] = useState(caso?.vineta_clinica || "");
  const [archivo, setArchivo] = useState(null);
  const [tipoMedia, setTipoMedia] = useState("foto");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Vista previa de la media: si se selecciono un archivo nuevo, se
  // previsualiza local (object URL); si no, se usa la media ya guardada
  // del caso (si existe).
  const [previewLocal, setPreviewLocal] = useState(null);
  useEffect(() => {
    if (!archivo) { setPreviewLocal(null); return; }
    const url = URL.createObjectURL(archivo);
    setPreviewLocal(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const mediaUrlPreview = previewLocal || caso?.media_url || null;
  const mediaTipoPreview = archivo ? tipoMedia : caso?.media_tipo;

  async function handleGuardar(e) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      const payload = { region, titulo, vineta_clinica: vineta };
      if (casoId) payload.caso_id = casoId;

      const guardado = await casosVivoAdmin.crearCaso(payload);

      if (archivo) {
        const subida = await casosVivoAdmin.subirMediaCaso(tipoMedia, archivo);
        await casosVivoAdmin.asociarMediaCaso(guardado.id, subida.media_url, subida.media_tipo);
      }

      onGuardado(guardado, !casoId);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={s.editorStack}>
      <div>
        <p style={s.editorTitulo}>Presentación del caso</p>
        <div style={p.wrap}>
          <p style={p.label}>Vista previa — proyección (así se ve al mostrar el caso)</p>
          <div style={p.pantalla}>
            {mediaUrlPreview ? (
              mediaTipoPreview === "video" ? (
                <video src={mediaUrlPreview} style={p.media} muted />
              ) : (
                <img src={mediaUrlPreview} alt="" style={p.media} />
              )
            ) : (
              <p style={p.vacio}>Sin foto/video todavía</p>
            )}
            <p style={p.vinetaTexto}>{vineta || "La viñeta clínica aparecerá aquí"}</p>
          </div>
        </div>
      </div>

      <div>
        <form onSubmit={handleGuardar} style={s.form}>
          {casoId && <p style={s.avisoEdicion}>Editando un caso ya creado — los cambios se guardan sobre el mismo caso.</p>}

          <label style={s.label}>Región</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)} required style={s.input}>
            <option value="" disabled>Selecciona una región</option>
            {REGIONES.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
          </select>

          <label style={s.label}>Título del caso</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required style={s.input} />

          <label style={s.label}>Viñeta clínica</label>
          <textarea value={vineta} onChange={(e) => setVineta(e.target.value)} rows={6} required style={s.input} />

          <label style={s.label}>Foto o video del caso (opcional)</label>
          <div style={s.mediaRow}>
            <select value={tipoMedia} onChange={(e) => setTipoMedia(e.target.value)} style={s.select}>
              <option value="foto">Foto</option>
              <option value="video">Video</option>
            </select>
            <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] || null)} style={s.fileInput} />
          </div>

          {error && <p style={s.error}>{error}</p>}

          <button type="submit" disabled={guardando} style={s.submitBtn}>
            {guardando ? "Guardando..." : casoId ? "Guardar cambios" : "Guardar y continuar →"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------- PREGUNTA (enunciado + alternativas + media + fundamento, todo junto) ----------------
// Preview fiel al estado 'cerrada' real de ProyeccionVivo.jsx: pregunta,
// alternativas con la correcta resaltada en verde, y el fundamento debajo
// -misma composicion que ve el alumno cuando se revela la respuesta-.
function PreguntaEditor({ casoId, pregunta, siguienteOrden, onGuardada, onEliminar }) {
  const editando = Boolean(pregunta);

  const [preguntaTexto, setPreguntaTexto] = useState(pregunta?.pregunta || "");
  const [respuestaCorrecta, setRespuestaCorrecta] = useState("");
  const [opciones, setOpciones] = useState(pregunta?.opciones || null);
  const [correctaIdx, setCorrectaIdx] = useState(pregunta?.correcta ?? null);
  const [tipoMediaPregunta, setTipoMediaPregunta] = useState("");
  const [archivoPregunta, setArchivoPregunta] = useState(null);
  const [mediaActual, setMediaActual] = useState(pregunta?.media_url ? { url: pregunta.media_url, tipo: pregunta.media_tipo } : null);
  const [quitarMediaActual, setQuitarMediaActual] = useState(false);
  const [generandoAlternativas, setGenerandoAlternativas] = useState(false);
  const [guardandoPregunta, setGuardandoPregunta] = useState(false);
  const [error, setError] = useState("");

  // Fundamento -fusionado aca, ya no es un paso aparte-. Solo aplica a
  // preguntas YA guardadas (necesitan casoPreguntaId para pedirselo a la IA).
  const [borrador, setBorrador] = useState(null);
  const [generandoFundamento, setGenerandoFundamento] = useState(false);
  const [guardandoFundamento, setGuardandoFundamento] = useState(false);

  function handleEditarOpcion(i, valor) {
    const nuevas = [...opciones];
    nuevas[i] = valor;
    setOpciones(nuevas);
  }

  async function handleGenerarAlternativas() {
    setError("");
    if (!preguntaTexto.trim() || !respuestaCorrecta.trim()) {
      setError("Escribe la pregunta y la respuesta correcta primero");
      return;
    }
    setGenerandoAlternativas(true);
    try {
      const res = await casosVivoAdmin.generarAlternativasPreguntaCaso(casoId, {
        pregunta: preguntaTexto.trim(),
        respuesta_correcta: respuestaCorrecta.trim(),
      });
      setOpciones(res.opciones);
      setCorrectaIdx(res.correcta);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerandoAlternativas(false);
    }
  }

  async function handleGuardarPregunta() {
    setError("");
    setGuardandoPregunta(true);
    try {
      let media_url = mediaActual?.url || null;
      let media_tipo = mediaActual?.tipo || null;

      if (quitarMediaActual) {
        media_url = null;
        media_tipo = null;
      }
      if (archivoPregunta) {
        const subida = await casosVivoAdmin.subirMediaPreguntaCaso(casoId, tipoMediaPregunta, archivoPregunta);
        media_url = subida.media_url;
        media_tipo = subida.media_tipo;
      }

      const payload = {
        pregunta: preguntaTexto.trim(),
        opciones,
        correcta: correctaIdx,
        media_url,
        media_tipo,
      };

      let resultado;
      if (editando) {
        resultado = await casosVivoAdmin.actualizarPreguntaCaso(casoId, pregunta.id, payload);
      } else {
        resultado = await casosVivoAdmin.crearPreguntaCaso(casoId, { ...payload, orden: siguienteOrden });
      }

      onGuardada(resultado);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoPregunta(false);
    }
  }

  async function handleGenerarBorrador() {
    setError("");
    setGenerandoFundamento(true);
    try {
      const b = await casosVivoAdmin.generarFundamentoBorrador(casoId, pregunta.id);
      setBorrador(b);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerandoFundamento(false);
    }
  }

  async function handleGuardarFundamento() {
    if (!borrador) return;
    setError("");
    setGuardandoFundamento(true);
    try {
      await casosVivoAdmin.guardarFundamento(casoId, pregunta.id, borrador.explicacion, borrador.fuentes);
      setBorrador(null);
      onGuardada({ id: pregunta.id }); // recarga el caso para reflejar explicacion_generada
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoFundamento(false);
    }
  }

  const explicacionAMostrar = borrador?.explicacion ?? pregunta?.explicacion_generada ?? "";

  return (
    <div style={s.editorStack}>
      <div>
        <p style={s.editorTitulo}>{editando ? `Pregunta ${pregunta.orden}` : `Nueva pregunta ${siguienteOrden}`}</p>
        <div style={p.wrap}>
          <p style={p.label}>Vista previa — proyección (así se ve al revelar la respuesta)</p>
          <div style={p.pantallaPregunta}>
            <p style={p.preguntaTexto}>{preguntaTexto || "Enunciado de la pregunta"}</p>
            <div style={p.opciones}>
              {(opciones || ["", "", "", "", ""]).map((op, i) => {
                const esCorrecta = correctaIdx === i;
                return (
                  <div key={i} style={{ ...p.opcionRow, ...(esCorrecta ? p.opcionRowCorrecta : {}) }}>
                    <span style={p.opcionLetra}>{LETRAS[i]}</span>
                    <span style={p.opcionTexto}>{op || `Alternativa ${LETRAS[i]}`}</span>
                  </div>
                );
              })}
            </div>
            {explicacionAMostrar && (
              <div style={p.explicacionBox}>
                <p style={p.explicacionTitulo}>Fundamento</p>
                <p style={p.explicacionTexto}>{explicacionAMostrar}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div style={s.form}>
          <label style={s.label}>Enunciado de la pregunta</label>
          <textarea
            value={preguntaTexto}
            onChange={(e) => setPreguntaTexto(e.target.value)}
            rows={3}
            style={s.input}
          />

          {!editando && (
            <>
              <label style={s.label}>Respuesta correcta</label>
              <input
                value={respuestaCorrecta}
                onChange={(e) => setRespuestaCorrecta(e.target.value)}
                style={s.input}
                disabled={opciones !== null}
              />
            </>
          )}

          <label style={s.label}>Foto o video de esta pregunta (opcional)</label>

          {mediaActual && !quitarMediaActual && !archivoPregunta && (
            <div style={s.mediaActualBox}>
              <span style={s.mediaActualTexto}>Ya tiene {mediaActual.tipo === "video" ? "un video" : "una foto"} guardado</span>
              <button type="button" onClick={() => setQuitarMediaActual(true)} style={s.quitarBtn}>Quitar</button>
            </div>
          )}
          {quitarMediaActual && (
            <p style={s.mediaActualTexto}>Se quitará la foto/video al guardar.</p>
          )}

          <div style={s.mediaRow}>
            <select value={tipoMediaPregunta} onChange={(e) => setTipoMediaPregunta(e.target.value)} style={s.select}>
              <option value="">{mediaActual && !quitarMediaActual ? "Reemplazar por..." : "Sin foto/video"}</option>
              <option value="foto">Foto</option>
              <option value="video">Video</option>
            </select>
            {tipoMediaPregunta && (
              <input
                type="file"
                accept={tipoMediaPregunta === "foto" ? "image/*" : "video/*"}
                onChange={(e) => { setArchivoPregunta(e.target.files?.[0] || null); setQuitarMediaActual(false); }}
                style={s.fileInput}
              />
            )}
          </div>

          {opciones === null ? (
            <button onClick={handleGenerarAlternativas} disabled={generandoAlternativas} style={s.iaBtn}>
              {generandoAlternativas ? "Generando alternativas..." : "Generar alternativas falsas con IA"}
            </button>
          ) : (
            <>
              <label style={s.label}>Alternativas</label>
              {opciones.map((op, i) => (
                <div key={i} style={s.opcionRow}>
                  <button
                    onClick={() => setCorrectaIdx(i)}
                    style={{ ...s.letraBtn, ...(correctaIdx === i ? s.letraBtnActiva : {}) }}
                  >
                    {LETRAS[i]}
                  </button>
                  <input
                    value={op}
                    onChange={(e) => handleEditarOpcion(i, e.target.value)}
                    style={{ ...s.input, flex: 1, marginBottom: 0 }}
                  />
                </div>
              ))}

              <div style={s.btnRow}>
                {!editando && (
                  <button onClick={() => { setOpciones(null); setCorrectaIdx(null); }} style={s.secondaryBtn}>
                    Regenerar
                  </button>
                )}
                {editando && onEliminar && (
                  <button onClick={onEliminar} style={s.quitarBtnGrande}>
                    Quitar pregunta
                  </button>
                )}
                <button onClick={handleGuardarPregunta} disabled={guardandoPregunta} style={s.submitBtn}>
                  {guardandoPregunta ? "Guardando..." : editando ? "Guardar cambios" : `Guardar pregunta ${siguienteOrden}`}
                </button>
              </div>
            </>
          )}

          {error && <p style={s.error}>{error}</p>}

          {/* ---------------- FUNDAMENTO: fusionado aca, solo si la pregunta ya esta guardada ---------------- */}
          {editando && (
            <div style={s.fundamentoSeccion}>
              <label style={s.label}>Fundamento</label>

              {pregunta.explicacion_generada && !borrador && (
                <p style={s.guardadoTexto}>✓ Fundamento guardado</p>
              )}

              {!borrador && (
                <button onClick={handleGenerarBorrador} disabled={generandoFundamento} style={s.actionBtn}>
                  {generandoFundamento ? "Buscando en materiales..." : pregunta.explicacion_generada ? "Regenerar borrador" : "Generar borrador con IA"}
                </button>
              )}

              {borrador && (
                <>
                  <textarea
                    value={borrador.explicacion}
                    onChange={(e) => setBorrador((prev) => ({ ...prev, explicacion: e.target.value }))}
                    rows={5}
                    style={s.input}
                  />
                  {borrador.fuentes?.length > 0 && (
                    <p style={s.fuentes}>Fuentes: {borrador.fuentes.join(", ")}</p>
                  )}
                  <button onClick={handleGuardarFundamento} disabled={guardandoFundamento} style={s.submitBtn}>
                    {guardandoFundamento ? "Guardando..." : "Confirmar y guardar"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", fontFamily: "sans-serif", display: "flex", flexDirection: "column" },
  header: { display: "flex", alignItems: "center", gap: 16, padding: "20px 24px", flexShrink: 0, flexWrap: "wrap" },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 20, margin: 0 },

  body: { display: "flex", flex: 1, minHeight: 0, borderTop: "1px solid rgba(244,241,233,0.08)" },

  sidebar: { width: 280, flexShrink: 0, borderRight: "1px solid rgba(244,241,233,0.1)", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" },
  itemSidebar: { display: "flex", alignItems: "center", gap: 10, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, color: "#94A3B8", fontSize: 14, cursor: "pointer", padding: "12px 14px", textAlign: "left" },
  itemSidebarActivo: { border: "1px solid #4FC3D9", background: "rgba(79,195,217,0.08)", color: "#4FC3D9", fontWeight: 600 },
  itemSidebarNueva: { borderStyle: "dashed" },
  itemNum: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: "rgba(244,241,233,0.15)", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  itemTextoSidebar: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  avisoEdicion: { color: "#4FC3D9", fontSize: 12.5, background: "#0E1526", border: "1px solid rgba(79,195,217,0.3)", borderRadius: 8, padding: "8px 12px", marginBottom: 12 },
  finBtn: { marginTop: "auto", background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#F4F1EA", padding: "12px 14px", fontSize: 13, cursor: "pointer" },

  editorPanel: { flex: 1, minWidth: 0, overflowY: "auto", padding: "24px 32px 60px" },
  editorStack: { display: "flex", flexDirection: "column", gap: 28, width: "100%" },
  editorTitulo: { fontSize: 16, fontWeight: 700, margin: "0 0 16px" },

  form: { display: "flex", flexDirection: "column", gap: 4, maxWidth: 640 },
  label: { fontSize: 11.5, color: "#94A3B8", marginTop: 10, marginBottom: 4 },
  input: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "9px 11px", color: "#F4F1EA", fontSize: 14, width: "100%", boxSizing: "border-box" },
  select: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "9px 11px", color: "#F4F1EA", fontSize: 14 },
  mediaRow: { display: "flex", gap: 8, alignItems: "center", marginBottom: 4 },
  fileInput: { color: "#94A3B8", fontSize: 12.5, flex: 1 },
  submitBtn: { marginTop: 18, background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" },
  secondaryBtn: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#F4F1EA", padding: "12px 18px", fontSize: 13, cursor: "pointer" },
  iaBtn: { marginTop: 10, background: "rgba(79,195,217,0.12)", border: "1px solid #4FC3D9", borderRadius: 8, color: "#4FC3D9", padding: "11px 16px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" },
  actionBtn: { background: "rgba(79,195,217,0.12)", border: "1px solid #4FC3D9", borderRadius: 8, color: "#4FC3D9", padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  error: { color: "#D1495B", fontSize: 13, marginBottom: 12 },
  muted: { color: "#94A3B8", fontSize: 13 },

  opcionRow: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8 },
  letraBtn: { width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(244,241,233,0.2)", background: "#16213A", color: "#94A3B8", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 },
  letraBtnActiva: { border: "1px solid #7FD98F", background: "rgba(127,217,143,0.15)", color: "#7FD98F" },
  btnRow: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" },
  quitarBtn: { background: "none", border: "1px solid rgba(209,73,91,0.4)", color: "#D1495B", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" },
  quitarBtnGrande: { background: "none", border: "1px solid rgba(209,73,91,0.4)", color: "#D1495B", borderRadius: 8, padding: "12px 18px", fontSize: 13, cursor: "pointer" },

  mediaActualBox: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0E1526", border: "1px solid rgba(244,241,233,0.1)", borderRadius: 8, padding: "8px 12px", marginBottom: 6 },
  mediaActualTexto: { fontSize: 12, color: "#94A3B8", margin: 0 },

  fundamentoSeccion: { marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(244,241,233,0.1)" },
  guardadoTexto: { color: "#7FB685", fontSize: 12.5, margin: "4px 0 8px" },
  fuentes: { fontSize: 12, color: "#94A3B8", margin: "8px 0 0" },
};

// Estilos de la vista previa — imitan fielmente ProyeccionVivo.jsx a
// escala reducida (caja 16:9), no son una invencion nueva.
const p = {
  wrap: { marginBottom: 18, maxWidth: 900 },
  label: { fontSize: 11, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" },

  // "Presentacion del caso" -> replica del estado 'presentando': media
  // grande arriba, vineta clinica en texto abajo (s.casoBox real).
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
    overflow: "hidden",
    color: "#F4F1EA",
    fontFamily: "sans-serif",
    gap: 12,
  },
  media: { maxWidth: "70%", maxHeight: "60%", borderRadius: 8, objectFit: "contain" },
  vinetaTexto: { fontSize: "clamp(11px, 2cqw, 15px)", lineHeight: 1.4, margin: 0, color: "#C7CDD9" },
  vacio: { fontSize: 12, color: "#64748B" },

  // "Pregunta N" -> replica del estado 'cerrada': pregunta + alternativas
  // con la correcta en verde + fundamento debajo (opcionRowCorrecta,
  // explicacionBox reales).
  pantallaPregunta: {
    background: "#0E1526",
    border: "1px solid rgba(244,241,233,0.12)",
    borderRadius: 10,
    padding: "24px 28px",
    color: "#F4F1EA",
    fontFamily: "sans-serif",
  },
  preguntaTexto: { fontSize: 16, fontWeight: 700, lineHeight: 1.3, margin: "0 0 16px" },
  opciones: { display: "flex", flexDirection: "column", gap: 8 },
  opcionRow: { display: "flex", alignItems: "center", gap: 10, background: "#16213A", border: "2px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "9px 14px" },
  opcionRowCorrecta: { border: "2px solid #7FD98F", background: "rgba(127,217,143,0.08)" },
  opcionLetra: { width: 24, height: 24, borderRadius: "50%", background: "rgba(79,195,217,0.15)", color: "#4FC3D9", fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  opcionTexto: { fontSize: 13, flex: 1 },
  explicacionBox: { marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(244,241,233,0.15)" },
  explicacionTitulo: { fontSize: 11, color: "#4FC3D9", fontWeight: 700, textTransform: "uppercase", margin: "0 0 6px" },
  explicacionTexto: { fontSize: 13, lineHeight: 1.5, margin: 0 },
};
