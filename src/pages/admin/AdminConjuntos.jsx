import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { conjuntos as conjuntosApi, alumnos as alumnosApi } from "../../api/client";

function parsearPegado(texto) {
  // Misma convencion que el Excel: primera fila es encabezado
  // (RUT, Nombre, Apellido), separado por tabulaciones (lo que
  // queda al copiar celdas de Excel/Sheets y pegar directo).
  const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const filas = lineas.slice(1); // se salta el encabezado

  const resultado = [];
  for (const fila of filas) {
    const columnas = fila.split("\t").map((c) => c.trim());
    const rut = columnas[0] || "";
    const nombreRaw = columnas[1] || "";
    const apellidoRaw = columnas[2] || "";
    const nombre = `${nombreRaw} ${apellidoRaw}`.trim();
    if (rut && nombre) {
      resultado.push({ rut, nombre });
    }
  }
  return resultado;
}

export default function AdminConjuntos() {
  const navigate = useNavigate();

  const [lista, setLista] = useState([]);
  const [cargandoConjuntos, setCargandoConjuntos] = useState(true);
  const [activandoId, setActivandoId] = useState(null);
  const [error, setError] = useState("");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [tipoNuevo, setTipoNuevo] = useState("oficial");
  const [creando, setCreando] = useState(false);

  const [alumnos, setAlumnos] = useState([]);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [errorAlumnos, setErrorAlumnos] = useState("");
  const [textoPegado, setTextoPegado] = useState("");
  const [subiendoPegado, setSubiendoPegado] = useState(false);
  const [subiendoExcel, setSubiendoExcel] = useState(false);
  const [borrandoId, setBorrandoId] = useState(null);
  const [resumenCarga, setResumenCarga] = useState(null);

  const conjuntoActivo = lista.find((c) => c.activo);

  useEffect(() => {
    cargarConjuntos();
  }, []);

  useEffect(() => {
    if (conjuntoActivo) {
      cargarAlumnos();
    } else {
      setAlumnos([]);
    }
  }, [conjuntoActivo?.id]);

  async function cargarConjuntos() {
    setCargandoConjuntos(true);
    setError("");
    try {
      const data = await conjuntosApi.listar();
      setLista(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoConjuntos(false);
    }
  }

  async function cargarAlumnos() {
    setCargandoAlumnos(true);
    setErrorAlumnos("");
    try {
      const data = await alumnosApi.listar();
      setAlumnos(data);
    } catch (err) {
      setErrorAlumnos(err.message);
    } finally {
      setCargandoAlumnos(false);
    }
  }

  async function handleCrear(e) {
    e.preventDefault();
    setError("");
    setCreando(true);
    try {
      await conjuntosApi.crear(nombreNuevo.trim(), tipoNuevo);
      setNombreNuevo("");
      setTipoNuevo("oficial");
      setMostrarForm(false);
      await cargarConjuntos();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }

  async function handleActivar(conjuntoId) {
    setError("");
    setActivandoId(conjuntoId);
    try {
      await conjuntosApi.activar(conjuntoId);
      await cargarConjuntos();
    } catch (err) {
      setError(err.message);
    } finally {
      setActivandoId(null);
    }
  }

  async function handleSubirPegado() {
    setErrorAlumnos("");
    setResumenCarga(null);
    const filas = parsearPegado(textoPegado);
    if (filas.length === 0) {
      setErrorAlumnos("No se detectaron filas válidas (RUT + Nombre). Revisa que hayas pegado la fila de encabezado también.");
      return;
    }
    setSubiendoPegado(true);
    try {
      const res = await alumnosApi.cargarJson(filas);
      setResumenCarga(res);
      setTextoPegado("");
      await cargarAlumnos();
    } catch (err) {
      setErrorAlumnos(err.message);
    } finally {
      setSubiendoPegado(false);
    }
  }

  async function handleSubirExcel(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setErrorAlumnos("");
    setResumenCarga(null);
    setSubiendoExcel(true);
    try {
      const res = await alumnosApi.cargarExcel(archivo);
      setResumenCarga(res);
      await cargarAlumnos();
    } catch (err) {
      setErrorAlumnos(err.message);
    } finally {
      setSubiendoExcel(false);
      e.target.value = "";
    }
  }

  async function handleBorrarAlumno(alumnoId) {
    setErrorAlumnos("");
    setBorrandoId(alumnoId);
    try {
      await alumnosApi.borrar(alumnoId);
      await cargarAlumnos();
    } catch (err) {
      setErrorAlumnos(err.message);
    } finally {
      setBorrandoId(null);
    }
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate(-1)} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>Conjuntos y alumnos</h1>
      </header>

      {error && <p style={s.error}>{error}</p>}

      <div style={s.seccion}>
        <div style={s.seccionHeader}>
          <h2 style={s.h2}>Conjuntos</h2>
          <button onClick={() => setMostrarForm((v) => !v)} style={s.newBtn}>
            {mostrarForm ? "Cancelar" : "+ Nuevo conjunto"}
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={handleCrear} style={s.form}>
            <label style={s.label}>Nombre</label>
            <input
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              placeholder="ej. Generación 2026"
              required
              style={s.input}
            />

            <label style={s.label}>Tipo</label>
            <select value={tipoNuevo} onChange={(e) => setTipoNuevo(e.target.value)} style={s.input}>
              <option value="oficial">Oficial</option>
              <option value="test">Test</option>
            </select>

            <button type="submit" disabled={creando} style={s.submitBtn}>
              {creando ? "Creando..." : "Crear conjunto"}
            </button>
          </form>
        )}

        {cargandoConjuntos ? (
          <p style={s.muted}>Cargando...</p>
        ) : lista.length === 0 ? (
          <p style={s.muted}>No hay conjuntos creados todavía.</p>
        ) : (
          <div style={s.list}>
            {lista.map((c) => (
              <div key={c.id} style={{ ...s.card, ...(c.activo ? s.cardActiva : {}) }}>
                <div style={s.cardInfo}>
                  <p style={s.cardNombre}>
                    {c.nombre}
                    {c.activo && <span style={s.badgeActivo}>Activo</span>}
                  </p>
                  <p style={s.cardTipo}>{c.tipo === "test" ? "Conjunto de prueba" : "Oficial"}</p>
                </div>
                {!c.activo && (
                  <button
                    onClick={() => handleActivar(c.id)}
                    disabled={activandoId === c.id}
                    style={s.activarBtn}
                  >
                    {activandoId === c.id ? "Activando..." : "Activar"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={s.seccion}>
        <h2 style={s.h2}>
          Alumnos {conjuntoActivo ? `del conjunto activo (${conjuntoActivo.nombre})` : ""}
        </h2>

        {!conjuntoActivo ? (
          <p style={s.muted}>Activa un conjunto arriba para gestionar su listado de alumnos.</p>
        ) : (
          <>
            {errorAlumnos && <p style={s.error}>{errorAlumnos}</p>}

            {resumenCarga && (
              <p style={s.resumen}>
                {resumenCarga.creados} alumno(s) nuevo(s), {resumenCarga.actualizados} actualizado(s).
              </p>
            )}

            <div style={s.cargaBox}>
              <p style={s.cargaTitulo}>Pegar desde Excel</p>
              <p style={s.cargaAyuda}>Copia las columnas RUT, Nombre y Apellido (incluida la fila de encabezado) y pégalas aquí.</p>
              <textarea
                value={textoPegado}
                onChange={(e) => setTextoPegado(e.target.value)}
                rows={6}
                placeholder={"RUT\tNombre\tApellido\n12345678-9\tJuan\tPérez"}
                style={s.textarea}
              />
              <button onClick={handleSubirPegado} disabled={subiendoPegado || !textoPegado.trim()} style={s.submitBtn}>
                {subiendoPegado ? "Cargando..." : "Cargar alumnos pegados"}
              </button>
            </div>

            <div style={s.cargaBox}>
              <p style={s.cargaTitulo}>O subir archivo Excel (.xlsx)</p>
              <p style={s.cargaAyuda}>Primera fila: RUT, Nombre, Apellido.</p>
              <input type="file" accept=".xlsx" onChange={handleSubirExcel} disabled={subiendoExcel} style={s.fileInput} />
              {subiendoExcel && <p style={s.muted}>Cargando archivo...</p>}
            </div>

            <h3 style={s.h3}>Listado actual ({alumnos.length})</h3>
            {cargandoAlumnos ? (
              <p style={s.muted}>Cargando...</p>
            ) : alumnos.length === 0 ? (
              <p style={s.muted}>Todavía no hay alumnos cargados en este conjunto.</p>
            ) : (
              <div style={s.list}>
                {alumnos.map((a) => (
                  <div key={a.id} style={s.itemAlumno}>
                    <div style={s.cardInfo}>
                      <p style={s.cardNombre}>{a.nombre}</p>
                      <p style={s.cardTipo}>{a.rut}</p>
                    </div>
                    <button
                      onClick={() => handleBorrarAlumno(a.id)}
                      disabled={borrandoId === a.id}
                      style={s.borrarBtn}
                    >
                      {borrandoId === a.id ? "Borrando..." : "Borrar"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "24px 32px 60px", fontFamily: "sans-serif" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 20, margin: 0 },
  error: { color: "#D1495B", fontSize: 13, marginBottom: 12 },
  muted: { color: "#94A3B8", fontSize: 13 },
  resumen: { color: "#7FD98F", fontSize: 13, marginBottom: 12 },

  seccion: { marginBottom: 32 },
  seccionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 },
  h2: { fontSize: 15, margin: "0 0 14px" },
  h3: { fontSize: 13, color: "#94A3B8", margin: "18px 0 10px" },

  newBtn: { background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },

  form: { display: "flex", flexDirection: "column", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: 20, maxWidth: 420, marginBottom: 20 },
  label: { fontSize: 11, color: "#94A3B8", marginTop: 10, marginBottom: 4 },
  input: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "9px 11px", color: "#F4F1EA", fontSize: 14 },
  submitBtn: { marginTop: 16, background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "11px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" },

  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "12px 16px", flexWrap: "wrap" },
  cardActiva: { border: "1px solid #4FC3D9" },
  cardInfo: { minWidth: 0 },
  cardNombre: { color: "#F4F1EA", fontSize: 14, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 },
  cardTipo: { color: "#94A3B8", fontSize: 12.5, margin: "3px 0 0" },
  badgeActivo: { background: "rgba(79,195,217,0.15)", color: "#4FC3D9", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", borderRadius: 20, padding: "2px 9px" },
  activarBtn: { background: "none", border: "1px solid #4FC3D9", color: "#4FC3D9", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" },

  cargaBox: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: 18, marginBottom: 14, maxWidth: 560 },
  cargaTitulo: { fontSize: 13.5, fontWeight: 600, margin: "0 0 4px" },
  cargaAyuda: { fontSize: 12, color: "#94A3B8", margin: "0 0 10px", lineHeight: 1.4 },
  textarea: { width: "100%", boxSizing: "border-box", background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "9px 11px", color: "#F4F1EA", fontSize: 13, fontFamily: "monospace", marginBottom: 10, resize: "vertical" },
  fileInput: { color: "#94A3B8", fontSize: 13 },

  itemAlumno: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "10px 16px", flexWrap: "wrap" },
  borrarBtn: { background: "none", border: "1px solid rgba(209,73,91,0.4)", color: "#D1495B", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" },
};
  
