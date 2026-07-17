import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sesiones, clearToken } from "../../api/client";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const nombre = localStorage.getItem("nombre");
  const rol = localStorage.getItem("rol");
  const esAdmin = rol === "admin";

  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombreSesion, setNombreSesion] = useState("");
  const [fecha, setFecha] = useState("");
  const [rutsTexto, setRutsTexto] = useState("");

  useEffect(() => {
    if (esAdmin) cargar();
    else setCargando(false);
  }, []);

  async function cargar() {
    setCargando(true);
    try {
      const data = await sesiones.listar();
      setLista(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  function handleLogout() {
    clearToken();
    localStorage.removeItem("nombre");
    localStorage.removeItem("rol");
    navigate("/admin");
  }

  async function handleCrearSesion(e) {
    e.preventDefault();
    setError("");
    try {
      const alumnos_ids = rutsTexto.split("\n").map((r) => r.trim()).filter(Boolean);
      const nueva = await sesiones.crear({ nombre: nombreSesion, fecha, alumnos_ids });
      setMostrarForm(false);
      setNombreSesion("");
      setFecha("");
      setRutsTexto("");
      cargar();
      navigate(`/admin/sesion/${nueva.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <div>
          <p style={s.hola}>Hola, {nombre}</p>
          <p style={s.rol}>{esAdmin ? "Administrador" : "Interrogador"}</p>
        </div>
        <button onClick={handleLogout} style={s.logout}>Salir</button>
      </header>

      <div style={s.actions}>
        <button onClick={() => navigate("/admin/preguntas")} style={s.actionBtn}>Banco de preguntas</button>
        <button onClick={() => navigate("/admin/materiales")} style={s.actionBtn}>Materiales</button>
        {esAdmin && (
          <button onClick={() => navigate("/admin/interrogadores")} style={s.actionBtn}>Interrogadores</button>
        )}
      </div>

      {esAdmin && (
        <>
          <div style={s.sectionHead}>
            <h2 style={s.h2}>Sesiones</h2>
            <button onClick={() => setMostrarForm((v) => !v)} style={s.newBtn}>
              {mostrarForm ? "Cancelar" : "+ Nueva sesión"}
            </button>
          </div>

          {mostrarForm && (
            <form onSubmit={handleCrearSesion} style={s.form}>
              <label style={s.label}>Nombre</label>
              <input value={nombreSesion} onChange={(e) => setNombreSesion(e.target.value)} required style={s.input} />

              <label style={s.label}>Fecha</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required style={s.input} />

              <label style={s.label}>RUTs habilitados (uno por línea)</label>
              <textarea value={rutsTexto} onChange={(e) => setRutsTexto(e.target.value)} rows={4} style={s.input} />

              <button type="submit" style={s.submitBtn}>Crear sesión</button>
            </form>
          )}

          {error && <p style={s.error}>{error}</p>}

          {cargando ? (
            <p style={s.muted}>Cargando...</p>
          ) : lista.length === 0 ? (
            <p style={s.muted}>No hay sesiones todavía.</p>
          ) : (
            <div style={s.list}>
              {lista.map((ses) => (
                <button key={ses.id} onClick={() => navigate(`/admin/sesion/${ses.id}`)} style={s.card}>
                  <div>
                    <p style={s.cardTitle}>{ses.nombre}</p>
                    <p style={s.cardMeta}>{ses.fecha} · {ses.estado}</p>
                  </div>
                  <span style={s.chevron}>›</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  hola: { fontSize: 16, fontWeight: 600, margin: 0 },
  rol: { fontSize: 12, color: "#94A3B8", margin: 0, textTransform: "capitalize" },
  logout: { background: "none", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "6px 12px", fontSize: 13, cursor: "pointer" },
  actions: { display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  actionBtn: { flex: 1, minWidth: 100, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, color: "#F4F1EA", padding: "12px 8px", fontSize: 13, cursor: "pointer" },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  h2: { fontSize: 16, margin: 0 },
  newBtn: { background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  form: { display: "flex", flexDirection: "column", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: 16, marginBottom: 16 },
  label: { fontSize: 11, color: "#94A3B8", marginTop: 8, marginBottom: 4 },
  input: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "9px 11px", color: "#F4F1EA", fontSize: 14 },
  submitBtn: { marginTop: 14, background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  error: { color: "#D1495B", fontSize: 13, marginBottom: 12 },
  muted: { color: "#94A3B8", fontSize: 13 },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "12px 14px", cursor: "pointer", textAlign: "left" },
  cardTitle: { color: "#F4F1EA", fontSize: 14, margin: 0 },
  cardMeta: { color: "#94A3B8", fontSize: 12, margin: "2px 0 0", textTransform: "capitalize" },
  chevron: { color: "#94A3B8", fontSize: 20 },
};
