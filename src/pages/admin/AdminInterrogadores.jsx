import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../api/client";

function formatearRut(valor) {
  const limpio = valor.replace(/[^0-9kK]/g, "").toUpperCase();
  if (limpio.length === 0) return "";
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return cuerpo.length > 0 ? `${cuerpoFormateado}-${dv}` : dv;
}

function validarRut(rutFormateado) {
  const limpio = rutFormateado.replace(/\./g, "").replace("-", "");
  if (limpio.length < 2) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1).toUpperCase();
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return dv === dvEsperado;
}

function generarPasswordTemporal() {
  const palabras = ["Rodilla", "Hombro", "Cadera", "Codo", "Tobillo", "Columna"];
  const palabra = palabras[Math.floor(Math.random() * palabras.length)];
  const numero = Math.floor(1000 + Math.random() * 9000);
  return `${palabra}${numero}`;
}

export default function AdminInterrogadores() {
  const navigate = useNavigate();

  const [rut, setRut] = useState("");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState(generarPasswordTemporal());
  const [rol, setRol] = useState("interrogador");

  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);
  const [creados, setCreados] = useState([]);

  function handleRutChange(e) {
    setRut(formatearRut(e.target.value));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!validarRut(rut)) {
      setError("RUT inválido");
      return;
    }

    setCreando(true);
    try {
      const rutLimpio = rut.replace(/\./g, "");
      await auth.crearInterrogador({ rut: rutLimpio, nombre, password, rol });
      setCreados((c) => [{ rut, nombre, password, rol }, ...c]);
      setRut("");
      setNombre("");
      setPassword(generarPasswordTemporal());
      setRol("interrogador");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreando(false);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.headerRow}>
        <button onClick={() => navigate("/admin/dashboard")} style={s.back}>‹ Volver</button>
        <h1 style={s.title}>Interrogadores</h1>
      </div>

      <form onSubmit={handleSubmit} style={s.form}>
        <label style={s.label}>RUT</label>
        <input value={rut} onChange={handleRutChange} placeholder="12.345.678-9" required style={s.input} />

        <label style={s.label}>Nombre completo</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required style={s.input} />

        <label style={s.label}>Contraseña temporal</label>
        <div style={s.passwordRow}>
          <input value={password} onChange={(e) => setPassword(e.target.value)} required style={{ ...s.input, flex: 1, marginBottom: 0 }} />
          <button type="button" onClick={() => setPassword(generarPasswordTemporal())} style={s.regenBtn}>↻</button>
        </div>

        <label style={s.label}>Rol</label>
        <select value={rol} onChange={(e) => setRol(e.target.value)} style={s.input}>
          <option value="interrogador">Interrogador</option>
          <option value="admin">Administrador</option>
        </select>

        {error && <p style={s.error}>{error}</p>}

        <button type="submit" disabled={creando} style={s.submitBtn}>
          {creando ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      {creados.length > 0 && (
        <>
          <h2 style={s.h2}>Cuentas creadas en esta sesión</h2>
          <p style={s.aviso}>Copia y envía estos datos por tu canal habitual (WhatsApp, etc.) — el sistema no manda nada automáticamente, y esta lista se pierde al salir de la página.</p>
          <div style={s.list}>
            {creados.map((c, i) => (
              <div key={i} style={s.card}>
                <p style={s.cardNombre}>{c.nombre} <span style={s.cardRol}>({c.rol})</span></p>
                <p style={s.cardDato}>RUT: {c.rut}</p>
                <p style={s.cardDato}>Contraseña: {c.password}</p>
              </div>
            ))}
          </div>
        </>
      )}
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
  input: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "9px 11px", color: "#F4F1EA", fontSize: 14 },
  passwordRow: { display: "flex", gap: 8, alignItems: "center" },
  regenBtn: { background: "#16213A", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#4FC3D9", fontSize: 16, width: 38, height: 38, cursor: "pointer" },
  error: { color: "#D1495B", fontSize: 13, marginTop: 12 },
  submitBtn: { marginTop: 16, background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  h2: { fontSize: 15, margin: "0 0 6px" },
  aviso: { color: "#94A3B8", fontSize: 12, marginBottom: 12, lineHeight: 1.4 },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "10px 14px" },
  cardNombre: { color: "#F4F1EA", fontSize: 14, margin: 0, fontWeight: 600 },
  cardRol: { color: "#4FC3D9", fontWeight: 400, fontSize: 12, textTransform: "capitalize" },
  cardDato: { color: "#94A3B8", fontSize: 12.5, margin: "3px 0 0", fontFamily: "monospace" },
};
