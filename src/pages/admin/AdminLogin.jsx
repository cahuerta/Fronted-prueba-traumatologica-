import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, setToken } from "../../api/client";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const res = await auth.login(email, password);
      setToken(res.token);
      localStorage.setItem("nombre", res.nombre);
      localStorage.setItem("rol", res.rol);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.message || "Email o contraseña incorrectos");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h1 style={styles.title}>Examen Musculoesquelético</h1>
        <p style={styles.subtitle}>Ingreso interrogadores</p>

        <label style={styles.label}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
