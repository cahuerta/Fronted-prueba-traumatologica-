import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { casosVivoAdmin, preguntas as preguntasApi } from "../../api/client";

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

  // ---------------- Paso 2: preguntas del banco ----------------
  const [bancoPreguntas, setBancoPreguntas] = useState([]);
  const [cargandoBanco, setCargandoBanco] = useState(false);

  // ---------------- Paso 3: fundamento por pregunta ----------------
  const [borradores, setBorradores] = useState({}); // { caso_pregunta_id: { explicacion, fuentes } }
  const [generando, setGenerando] = useState(null); // caso_pregunta_id en curso

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
  useEffect(() => {
    if (paso === 2 && region) cargarBanco();
  }, [paso, region]);

  async function cargarBanco() {
    setCargandoBanco(true);
    try {
      const data = await preguntasApi.listar(region);
      setBancoPreguntas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoBanco(false);
    }
  }

  const preguntasDelCaso = caso?.preguntas || [];
  const ordenesUsados = preguntasDelCaso.map((p) => p.orden);
  const siguienteOrden = [1, 2, 3, 4, 5].find((n) => !ordenesUsados.includes(n));

  async function handleAgregarPregunta(preguntaId) {
    if (!siguienteOrden) return;
    setError("");
    try {
      await casosVivoAdmin.agregarPreguntaCaso(casoId, preguntaId, siguienteOrden);
      await cargarCaso(casoId);
    } catch (err) {
      setError(err.message);
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

  const idsYaAgregados = new Set(preguntasDelCaso.map((p) => p.pregunta_id));

  // ---------------- PASO 3 ----------------
  async function handleGenerarBorrador(casoPreguntaId) {
    setError("");
    setGenerando(casoPreguntaId);
    try {
      const borrador = await casosVivoAdmin.generarFundamentoBorrador(casoId, casoPreguntaId);
      setBorradores((prev) => ({ ...prev, [casoPreguntaId]: borrador }));
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerando(null);
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
          <label style={s.label}>Región (ej. pelvis, cadera, rodilla)</label>
          <input value={region} onChange={(e) => setRegion(e.target.value)} required style={s.input} />

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

      {/* ---------------- PASO 2 ---------------- */}
      {paso === 2 && (
        <div style={s.grid2}>
          <div>
            <h3 style={s.h3}>Preguntas del caso ({preguntasDelCaso.length}/5)</h3>
            {preguntasDelCaso.length === 0 && <p style={s.muted}>Ninguna agregada todavía.</p>}
            <div style={s.list}>
              {preguntasDelCaso.map((p) => (
                <div key={p.id} style={s.itemOrdenado}>
                  <span style={s.orden}>{p.orden}</span>
                  <p style={s.itemTexto}>{p.banco_preguntas?.pregunta}</p>
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
            <h3 style={s.h3}>Banco de preguntas — región "{region}"</h3>
            {cargandoBanco ? (
              <p style={s.muted}>Cargando...</p>
            ) : bancoPreguntas.length === 0 ? (
              <p style={s.muted}>No hay preguntas en esta región todavía.</p>
            ) : (
              <div style={s.list}>
                {bancoPreguntas.map((bp) => (
                  <div key={bp.id} style={s.itemBanco}>
                    <p style={s.itemTexto}>{bp.pregunta}</p>
                    <button
                      onClick={() => handleAgregarPregunta(bp.id)}
                      disabled={idsYaAgregados.has(bp.id) || !siguienteOrden}
                      style={s.agregarBtn}
                    >
                      {idsYaAgregados.has(bp.id) ? "Agregada" : "+ Agregar"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- PASO 3 ---------------- */}
      {paso === 3 && (
        <div>
          {preguntasDelCaso.map((p) => {
            const borrador = borradores[p.id];
            const yaGuardado = p.explicacion_generada;
            return (
              <div key={p.id} style={s.fundamentoCard}>
                <p style={s.ordenGrande}>Pregunta {p.orden}</p>
                <p style={s.itemTexto}>{p.banco_preguntas?.pregunta}</p>

                {yaGuardado && !borrador && (
                  <p style={s.guardadoTexto}>✓ Fundamento guardado: {yaGuardado.slice(0, 140)}…</p>
                )}

                {!borrador && (
                  <button
                    onClick={() => handleGenerarBorrador(p.id)}
                    disabled={generando === p.id}
                    style={s.actionBtn}
                  >
                    {generando === p.id ? "Buscando en materiales..." : yaGuardado ? "Regenerar borrador" : "Generar borrador con IA"}
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
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 },
  h3: { fontSize: 14, marginBottom: 10 },
  list: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  itemOrdenado: { display: "flex", alignItems: "center", gap: 10, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "10px 12px" },
  orden: { background: "#4FC3D9", color: "#0E1526", fontWeight: 700, fontSize: 12, borderRadius: 6, padding: "2px 8px" },
  itemTexto: { flex: 1, fontSize: 13, margin: 0, color: "#F4F1EA" },
  quitarBtn: { background: "none", border: "1px solid rgba(209,73,91,0.4)", color: "#D1495B", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" },
  itemBanco: { display: "flex", alignItems: "center", gap: 10, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "10px 12px" },
  agregarBtn: { background: "#4FC3D9", border: "none", borderRadius: 6, color: "#0E1526", padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  fundamentoCard: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: 18, marginBottom: 14, maxWidth: 700 },
  ordenGrande: { color: "#4FC3D9", fontSize: 12, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase" },
  guardadoTexto: { color: "#7FD98F", fontSize: 13, margin: "8px 0" },
  actionBtn: { marginTop: 10, background: "#16213A", border: "1px solid #4FC3D9", borderRadius: 8, color: "#4FC3D9", padding: "9px 14px", fontSize: 13, cursor: "pointer" },
  fuentes: { color: "#94A3B8", fontSize: 12, marginTop: 6 },
  finBtn: { marginTop: 10, background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#F4F1EA", padding: "11px 18px", fontSize: 14, cursor: "pointer" },
};
