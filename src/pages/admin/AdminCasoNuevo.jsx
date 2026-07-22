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
];
const LETRAS = ["A", "B", "C", "D", "E"];

export default function AdminCasoNuevo() {
  const navigate = useNavigate();
  const { casoId: casoIdParam } = useParams();

  const [paso, setPaso] = useState(1);
  const [casoId, setCasoId] = useState(casoIdParam || null);
  const [caso, setCaso] = useState(null);
  const [error, setError] = useState("");

  // ---------------- Paso 1: datos + media ----------------
  const [region, setRegion] = useState("");
  const [titulo, setTitulo] = useState("");
  const [vineta, setVineta] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [tipoMedia, setTipoMedia] = useState("foto");
  const [guardandoPaso1, setGuardandoPaso1] = useState(false);

  // ---------------- Paso 2: escribir cada pregunta, secuencial ----------------
  const [preguntaTexto, setPreguntaTexto] = useState("");
  const [respuestaCorrecta, setRespuestaCorrecta] = useState("");
  const [tipoMediaPregunta, setTipoMediaPregunta] = useState("");
  const [archivoPregunta, setArchivoPregunta] = useState(null);
  const [opciones, setOpciones] = useState(null); // null hasta generar con IA
  const [correctaIdx, setCorrectaIdx] = useState(null);
  const [generandoAlternativas, setGenerandoAlternativas] = useState(false);
  const [guardandoPregunta, setGuardandoPregunta] = useState(false);

  // ---------------- Paso 3: fundamento por pregunta ----------------
  const [borradores, setBorradores] = useState({}); // { caso_pregunta_id: { explicacion, fuentes } }
  const [generandoFundamento, setGenerandoFundamento] = useState(null);

  useEffect(() => {
    if (casoIdParam) {
      setCasoId(casoIdParam);
      cargarCaso(casoIdParam);
      setPaso(2);
    }
  }, [casoIdParam]);

  async function cargarCaso(id) {
    try {
      const data = await casosVivoAdmin.obtenerCaso(id);
      setCaso(data);
      setRegion(data.region);
    } catch (err) {
      setError(err.message);
    }
  }

  // ---------------- PASO 1 ----------------
  async function handleCrearCaso(e) {
    e.preventDefault();
    setError("");
    setGuardandoPaso1(true);
    try {
      const nuevo = await casosVivoAdmin.crearCaso({ region, titulo, vineta_clinica: vineta });

      if (archivo) {
        const subida = await casosVivoAdmin.subirMediaCaso(tipoMedia, archivo);
        await casosVivoAdmin.asociarMediaCaso(nuevo.id, subida.media_url, subida.media_tipo);
      }

      setCasoId(nuevo.id);
      await cargarCaso(nuevo.id);
      setPaso(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoPaso1(false);
    }
  }

  // ---------------- PASO 2 ----------------
  const preguntasDelCaso = caso?.preguntas || [];
  const ordenesUsados = preguntasDelCaso.map((p) => p.orden);
  const siguienteOrden = [1, 2, 3, 4, 5].find((n) => !ordenesUsados.includes(n));

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

  function handleEditarOpcion(i, valor) {
    const nuevas = [...opciones];
    nuevas[i] = valor;
    setOpciones(nuevas);
  }

  async function handleGuardarPregunta() {
    if (!siguienteOrden) return;
    setError("");
    setGuardandoPregunta(true);
    try {
      let media_url = null;
      let media_tipo = null;
      if (archivoPregunta) {
        const subida = await casosVivoAdmin.subirMediaPreguntaCaso(tipoMediaPregunta, archivoPregunta);
        media_url = subida.media_url;
        media_tipo = subida.media_tipo;
      }

      await casosVivoAdmin.crearPreguntaCaso(casoId, {
        orden: siguienteOrden,
        pregunta: preguntaTexto.trim(),
        opciones,
        correcta: correctaIdx,
        media_url,
        media_tipo,
      });

      // reset del formulario para la siguiente pregunta
      setPreguntaTexto("");
      setRespuestaCorrecta("");
      setOpciones(null);
      setCorrectaIdx(null);
      setTipoMediaPregunta("");
      setArchivoPregunta(null);
      await cargarCaso(casoId);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoPregunta(false);
    }
  }

  async function handleQuitarPregunta(casoPreguntaId) {
    try {
      await casosVivoAdmin.quitarPreguntaCaso(casoId, casoPreguntaId);
      await cargarCaso(casoId);
    } catch (err) {
      setError(err.message);
    }
  }

  // ---------------- PASO 3 ----------------
  async function handleGenerarBorrador(casoPreguntaId) {
    setError("");
    setGenerandoFundamento(casoPreguntaId);
    try {
      const borrador = await casosVivoAdmin.generarFundamentoBorrador(casoId, casoPreguntaId);
      setBorradores((prev) => ({ ...prev, [casoPreguntaId]: borrador }));
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerandoFundamento(null);
    }
  }

  async function handleGuardarFundamento(casoPreguntaId) {
    const b = borradores[casoPreguntaId];
    if (!b) return;
    setError("");
    try {
      await casosVivoAdmin.guardarFundamento(casoId, casoPreguntaId, b.explicacion, b.fuentes);
      await cargarCaso(casoId);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleCambiarBorrador(casoPreguntaId, texto) {
    setBorradores((prev) => ({
      ...prev,
      [casoPreguntaId]: { ...prev[casoPreguntaId], explicacion: texto },
    }));
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate("/admin/casos-vivo")} style={s.back}>‹ Casos clínicos</button>
        <h1 style={s.h1}>{titulo || caso?.titulo || "Nuevo caso clínico"}</h1>
      </header>

      <div style={s.pasos}>
        <span style={paso === 1 ? s.pasoActivo : s.paso}>1. Datos del caso</span>
        <span style={paso === 2 ? s.pasoActivo : s.paso}>2. Preguntas</span>
        <span style={paso === 3 ? s.pasoActivo : s.paso}>3. Fundamento</span>
      </div>

      {error && <p style={s.error}>{error}</p>}

      {/* ---------------- PASO 1 ---------------- */}
      {paso === 1 && (
        <form onSubmit={handleCrearCaso} style={s.form}>
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

          <button type="submit" disabled={guardandoPaso1} style={s.submitBtn}>
            {guardandoPaso1 ? "Guardando..." : "Guardar y continuar →"}
          </button>
        </form>
      )}

      {/* ---------------- PASO 2: escribir cada pregunta, en orden, con contexto de las anteriores ---------------- */}
      {paso === 2 && (
        <div style={s.grid2}>
          <div>
            <h3 style={s.h3}>Secuencia del caso ({preguntasDelCaso.length}/5)</h3>
            {preguntasDelCaso.length === 0 && <p style={s.muted}>Ninguna pregunta creada todavía.</p>}
            <div style={s.list}>
              {preguntasDelCaso
                .slice()
                .sort((a, b) => a.orden - b.orden)
                .map((p) => (
                  <div key={p.id} style={s.itemOrdenado}>
                    <span style={s.orden}>{p.orden}</span>
                    <p style={s.itemTexto}>{p.pregunta}{p.media_url ? " 📷" : ""}</p>
                    <button onClick={() => handleQuitarPregunta(p.id)} style={s.quitarBtn}>Quitar</button>
                  </div>
                ))}
            </div>
            <button
              onClick={() => setPaso(3)}
              disabled={preguntasDelCaso.length === 0}
              style={s.submitBtn}
            >
              Continuar a fundamento →
            </button>
          </div>

          <div>
            <h3 style={s.h3}>
              {siguienteOrden ? `Escribir pregunta ${siguienteOrden}` : "Caso completo (5/5)"}
            </h3>

            {siguienteOrden && (
              <div style={s.form}>
                <label style={s.label}>Enunciado de la pregunta</label>
                <textarea
                  value={preguntaTexto}
                  onChange={(e) => setPreguntaTexto(e.target.value)}
                  rows={3}
                  style={s.input}
                  disabled={opciones !== null}
                />

                <label style={s.label}>Respuesta correcta</label>
                <input
                  value={respuestaCorrecta}
                  onChange={(e) => setRespuestaCorrecta(e.target.value)}
                  style={s.input}
                  disabled={opciones !== null}
                />

                <label style={s.label}>Foto o video de esta pregunta (opcional)</label>
                <div style={s.mediaRow}>
                  <select value={tipoMediaPregunta} onChange={(e) => setTipoMediaPregunta(e.target.value)} style={s.select}>
                    <option value="">Sin foto/video</option>
                    <option value="foto">Foto</option>
                    <option value="video">Video</option>
                  </select>
                  {tipoMediaPregunta && (
                    <input
                      type="file"
                      accept={tipoMediaPregunta === "foto" ? "image/*" : "video/*"}
                      onChange={(e) => setArchivoPregunta(e.target.files?.[0] || null)}
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
                    <label style={s.label}>Alternativas (edítalas si quieres)</label>
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
                      <button onClick={() => { setOpciones(null); setCorrectaIdx(null); }} style={s.secondaryBtn}>
                        Regenerar
                      </button>
                      <button onClick={handleGuardarPregunta} disabled={guardandoPregunta} style={s.submitBtn}>
                        {guardandoPregunta ? "Guardando..." : `Guardar pregunta ${siguienteOrden}`}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- PASO 3 ---------------- */}
      {paso === 3 && (
        <div>
          {preguntasDelCaso
            .slice()
            .sort((a, b) => a.orden - b.orden)
            .map((p) => {
              const borrador = borradores[p.id];
              const yaGuardado = p.explicacion_generada;
              return (
                <div key={p.id} style={s.fundamentoCard}>
                  <p style={s.ordenGrande}>Pregunta {p.orden}</p>
                  <p style={s.itemTexto}>{p.pregunta}</p>

                  {yaGuardado && !borrador && (
                    <p style={s.guardadoTexto}>✓ Fundamento guardado: {yaGuardado.slice(0, 140)}…</p>
                  )}

                  {!borrador && (
                    <button
                      onClick={() => handleGenerarBorrador(p.id)}
                      disabled={generandoFundamento === p.id}
                      style={s.actionBtn}
                    >
                      {generandoFundamento === p.id ? "Buscando en materiales..." : yaGuardado ? "Regenerar borrador" : "Generar borrador con IA"}
                    </button>
                  )}

                  {borrador && (
                    <>
                      <textarea
                        value={borrador.explicacion}
                        onChange={(e) => handleCambiarBorrador(p.id, e.target.value)}
                        rows={5}
                        style={s.input}
                      />
                      {borrador.fuentes?.length > 0 && (
                        <p style={s.fuentes}>Fuentes: {borrador.fuentes.join(", ")}</p>
                      )}
                      <button onClick={() => handleGuardarFundamento(p.id)} style={s.submitBtn}>
                        Confirmar y guardar
                      </button>
                    </>
                  )}
                </div>
              );
            })}

          <button onClick={() => navigate("/admin/casos-vivo")} style={s.finBtn}>
            Terminar — volver a casos clínicos
          </button>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "24px 32px 60px", fontFamily: "sans-serif" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 16 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 20, margin: 0 },
  pasos: { display: "flex", gap: 20, marginBottom: 24, borderBottom: "1px solid rgba(244,241,233,0.12)", paddingBottom: 12 },
  paso: { color: "#94A3B8", fontSize: 13 },
  pasoActivo: { color: "#4FC3D9", fontSize: 13, fontWeight: 600 },
  error: { color: "#D1495B", fontSize: 13, marginBottom: 12 },
  muted: { color: "#94A3B8", fontSize: 13 },
  form: { display: "flex", flexDirection: "column", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: 20, maxWidth: 560 },
  label: { fontSize: 11, color: "#94A3B8", marginTop: 12, marginBottom: 4 },
  input: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "9px 11px", color: "#F4F1EA", fontSize: 14, fontFamily: "sans-serif" },
  mediaRow: { display: "flex", gap: 10 },
  select: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "9px 11px", color: "#F4F1EA", fontSize: 14 },
  fileInput: { flex: 1, color: "#94A3B8", fontSize: 13 },
  submitBtn: { marginTop: 16, background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" },
  iaBtn: { marginTop: 16, background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  h3: { fontSize: 14, marginBottom: 10 },
  list: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  itemOrdenado: { display: "flex", alignItems: "center", gap: 10, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "10px 12px" },
  orden: { background: "#4FC3D9", color: "#0E1526", fontWeight: 700, fontSize: 12, borderRadius: 6, padding: "2px 8px" },
  itemTexto: { flex: 1, fontSize: 13, margin: 0, color: "#F4F1EA" },
  quitarBtn: { background: "none", border: "1px solid rgba(209,73,91,0.4)", color: "#D1495B", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" },
  opcionRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  letraBtn: { width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(244,241,233,0.2)", background: "transparent", color: "#94A3B8", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  letraBtnActiva: { background: "rgba(127,182,133,0.15)", borderColor: "#7FB685", color: "#7FB685" },
  btnRow: { display: "flex", gap: 8, marginTop: 8 },
  secondaryBtn: { flex: 1, background: "transparent", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "11px 0", fontSize: 14, cursor: "pointer" },
  fundamentoCard: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: 18, marginBottom: 14, maxWidth: 700 },
  ordenGrande: { color: "#4FC3D9", fontSize: 12, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase" },
  guardadoTexto: { color: "#7FD98F", fontSize: 13, margin: "8px 0" },
  actionBtn: { marginTop: 10, background: "#16213A", border: "1px solid #4FC3D9", borderRadius: 8, color: "#4FC3D9", padding: "9px 14px", fontSize: 13, cursor: "pointer" },
  fuentes: { color: "#94A3B8", fontSize: 12, marginTop: 6 },
  finBtn: { marginTop: 10, background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#F4F1EA", padding: "11px 18px", fontSize: 14, cursor: "pointer" },
};
                    
