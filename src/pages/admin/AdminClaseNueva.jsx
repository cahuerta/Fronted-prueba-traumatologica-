import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clasesFormalesContenido, clasesFormalesSesiones } from "../../api/clasesFormalesCliente";

const ACENTO = "#4FC3D9";

export default function AdminClaseNueva() {
  const navigate = useNavigate();

  const [contenidos, setContenidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [iniciando, setIniciando] = useState(null); // clase_formal_id en proceso

  const [nombreNuevo, setNombreNuevo] = useState("");
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      const data = await clasesFormalesContenido.listar();
      setContenidos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  async function handleCrearContenido(e) {
    e.preventDefault();
    if (!nombreNuevo.trim()) return;
    setError("");
    setCreando(true);
    try {
      const contenido = await clasesFormalesContenido.crear(nombreNuevo.trim());
      navigate(`/admin/clases-formales/${contenido.id}`); // directo al constructor
    } catch (err) {
      setError(err.message);
      setCreando(false);
    }
  }

  async function handleIniciar(claseFormalId) {
    setIniciando(claseFormalId);
    setError("");
    try {
      const sesion = await clasesFormalesSesiones.iniciar(claseFormalId);
      navigate(`/admin/clases-formales/sesion/${sesion.id}/vivo`);
    } catch (err) {
      setError(err.message);
      setIniciando(null);
    }
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <button onClick={() => navigate("/admin/clases-formales")} style={s.back}>‹ Volver</button>
        <h1 style={s.h1}>Iniciar clase</h1>
      </header>

      {error && <p style={s.error}>{error}</p>}

      {/* ---------------- CONTENIDO YA ARMADO ---------------- */}
      <p style={s.label}>Elige una clase ya armada</p>
      {cargando && <p style={s.info}>Cargando...</p>}
      {!cargando && contenidos.length === 0 && (
        <p style={s.info}>Aún no tienes clases armadas. Crea una abajo.</p>
      )}
      <div style={s.list}>
        {contenidos.map((c) => (
          <div key={c.id} style={s.item}>
            <p style={s.itemTitulo}>{c.nombre}</p>
            <div style={s.itemBtns}>
              <button onClick={() => navigate(`/admin/clases-formales/${c.id}`)} style={s.btnSecundario}>
                Editar
              </button>
              <button
                onClick={() => handleIniciar(c.id)}
                disabled={iniciando === c.id}
                style={s.btnIniciar}
              >
                {iniciando === c.id ? "Iniciando..." : "Iniciar clase"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ---------------- CREAR CONTENIDO NUEVO ---------------- */}
      <p style={{ ...s.label, marginTop: 28 }}>O arma una clase nueva</p>
      <form onSubmit={handleCrearContenido} style={s.form}>
        <input
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
          placeholder="Ej. Fracturas de pelvis"
          style={s.input}
        />
        <button type="submit" disabled={creando || !nombreNuevo.trim()} style={s.btn}>
          {creando ? "Creando..." : "Crear y armar clase"}
        </button>
      </form>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  back: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 18, margin: 0 },
  label: { fontSize: 12.5, color: "#94A3B8", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 0.4 },
  info: { color: "#94A3B8", fontSize: 14, margin: "0 0 16px" },
  error: { color: "#D1495B", fontSize: 14, textAlign: "center", margin: "0 0 16px" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  item: { background: "#16213A", border: "1px solid rgba(244,241,233,0.1)", borderRadius: 14, padding: "14px 16px" },
  itemTitulo: { fontSize: 15, fontWeight: 700, margin: "0 0 10px" },
  itemBtns: { display: "flex", gap: 8 },
  btnSecundario: { flex: 1, background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#F4F1EA", padding: "10px 0", fontSize: 13, cursor: "pointer" },
  btnIniciar: { flex: 1, background: ACENTO, border: "none", borderRadius: 8, color: "#0E1526", padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  input: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "14px 16px", color: "#F4F1EA", fontSize: 16 },
  btn: { background: "none", border: `1px solid ${ACENTO}`, borderRadius: 10, color: ACENTO, padding: "14px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" },
};
