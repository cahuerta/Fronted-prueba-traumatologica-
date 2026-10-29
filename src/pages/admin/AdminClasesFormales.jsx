import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clasesFormalesContenido } from "../../api/clasesFormalesCliente";

const ACENTO = "#4FC3D9";

// Listado del contenido reutilizable de Clases Formales. Crear una
// clase nueva se hace inline aca mismo (mismo patron que
// AdminPresentaciones.jsx) -no existe pantalla aparte "nueva"-.
// Iniciar una sesion en vivo a partir de este contenido se hace desde
// "Presentar" (boton C del hub mixto), no desde aca.
export default function AdminClasesFormales() {
  const navigate = useNavigate();

  const [clases, setClases] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [borrandoId, setBorrandoId] = useState(null);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const data = await clasesFormalesContenido.listar();
      setClases(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleCrear(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setError("");
    setCreando(true);
    try {
      const clase = await clasesFormalesContenido.crear(nombre.trim());
      setMostrarForm(false);
      setNombre("");
      navigate(`/admin/clases-formales/${clase.id}`); // directo al constructor
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }

  async function handleBorrar(clase) {
    const ok = window.confirm(
      `¿Borrar la clase "${clase.nombre}"?\n\nSe borran la clase y todas sus páginas. No se puede deshacer.`
    );
    if (!ok) return;
    setError("");
    setBorrandoId(clase.id);
    try {
      await clasesFormalesContenido.eliminar(clase.id);
      setClases((prev) => prev.filter((c) => c.id !== clase.id));
    } catch (err) {
      // La base impide borrar una clase que ya tiene sesiones dictadas
      // (llave foranea de sesiones_clase): asi la asistencia nunca se pierde.
      const msg = String(err.message || "");
      if (/foreign key|violates|23503/i.test(msg)) {
        setError("No se puede borrar: esta clase ya tiene sesiones dictadas (se conserva su asistencia).");
      } else {
        setError(msg);
      }
    } finally {
      setBorrandoId(null);
    }
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        {/* Vuelve al hub mixto (donde tambien esta "Presentar"/"Iniciar
            presentacion", confirmado en App.jsx: /admin/casos-vivo ->
            AdminCasosVivoHub.jsx) -desde ahi se entra a este listado,
            no desde el dashboard principal-. */}
        <button onClick={() => navigate("/admin/casos-vivo")} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>Clases Formales</h1>
      </header>

      <div style={s.actions}>
        <button onClick={() => setMostrarForm((v) => !v)} style={s.newBtn}>
          {mostrarForm ? "Cancelar" : "+ Nueva clase"}
        </button>
      </div>

      {mostrarForm && (
        <form onSubmit={handleCrear} style={s.form}>
          <label style={s.label}>Nombre de la clase</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Fracturas de pelvis"
            autoFocus
            style={s.input}
          />
          <button type="submit" disabled={creando || !nombre.trim()} style={s.submitBtn}>
            {creando ? "Creando..." : "Crear y armar →"}
          </button>
        </form>
      )}

      {error && <p style={s.error}>{error}</p>}

      {cargando ? (
        <p style={s.info}>Cargando...</p>
      ) : clases.length === 0 ? (
        <p style={s.info}>Aún no hay clases armadas.</p>
      ) : (
        <div style={s.list}>
          {clases.map((clase) => (
            <div key={clase.id} style={s.fila}>
              <button
                onClick={() => navigate(`/admin/clases-formales/${clase.id}`)}
                style={s.btn}
              >
                <p style={s.btnTitulo}>{clase.nombre}</p>
              </button>
              <button
                onClick={() => handleBorrar(clase)}
                disabled={borrandoId === clase.id}
                style={s.borrarBtn}
              >
                {borrandoId === clase.id ? "..." : "Borrar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 18, margin: 0 },
  actions: { display: "flex", marginBottom: 16 },
  newBtn: { display: "block", width: "100%", background: ACENTO, border: "none", borderRadius: 12, color: "#0E1526", cursor: "pointer", padding: "14px 0", fontSize: 15, fontWeight: 700 },
  form: { display: "flex", flexDirection: "column", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 14, padding: 18, marginBottom: 20, gap: 10 },
  label: { fontSize: 12.5, color: "#94A3B8" },
  input: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "13px 14px", color: "#F4F1EA", fontSize: 15 },
  submitBtn: { background: ACENTO, border: "none", borderRadius: 10, color: "#0E1526", padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  info: { color: "#94A3B8", fontSize: 14, textAlign: "center", margin: "20px 0" },
  error: { color: "#D1495B", fontSize: 14, textAlign: "center", margin: "0 0 16px" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  fila: { display: "flex", gap: 8, alignItems: "stretch" },
  borrarBtn: { background: "none", border: "1px solid rgba(209,73,91,0.4)", color: "#D1495B", borderRadius: 14, padding: "0 16px", fontSize: 13, cursor: "pointer" },
  btn: { display: "block", flex: 1, width: "100%", background: "#16213A", border: "1px solid rgba(244,241,233,0.1)", borderRadius: 14, color: "#F4F1EA", cursor: "pointer", padding: "16px 18px", textAlign: "left" },
  btnTitulo: { fontSize: 15, fontWeight: 700, margin: 0 },
};
