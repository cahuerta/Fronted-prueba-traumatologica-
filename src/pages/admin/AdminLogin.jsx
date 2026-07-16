import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, setToken } from "../../api/client";

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

export default function AdminLogin() {
  const navigate = useNavigate();
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

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

    const rutLimpio = rut.replace(/\./g, "");

    setCargando(true);
    try {
      const res = await auth.login(rutLimpio, password);
      setToken(res.token);
      localStorage.setItem("nombre", res.nombre);
      localStorage.setItem("rol", res.rol);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.message || "RUT o contraseña incorrectos");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Examen Musculoesquelético</h1>
        <p style={styles.subtitle}>Ingreso interrogadores</p>

        <label style={styles.label}>RUT</label>
        <input
          type="text"
          value={rut}
          onChange={handleRutChange}
          placeholder="12.345.678-9"
          maxLength={12}
          required
          style={styles.input}
        />

        <label style={styles.label}>Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" disabled={cargando} style={styles.button}>
          {cargando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0E1526",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    background: "#16213A",
    border: "1px solid rgba(244,241,233,0.12)",
    borderRadius: 16,
    padding: 28,
    display: "flex",
    flexDirection: "column",
  },
  title: {
    color: "#F4F1EA",
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 24,
  },
  label: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    background: "#0E1526",
    border: "1px solid rgba(244,241,233,0.12)",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#F4F1EA",
    fontSize: 14,
    marginBottom: 16,
  },
  error: {
    color: "#D1495B",
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    background: "#4FC3D9",
    color: "#0E1526",
    border: "none",
    borderRadius: 8,
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
};
