import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { materiales } from "../../api/client";

function LogoBar() {
  return (
    <div style={s.logoBar}>
      <img src="/logo-utal.png" alt="UTAL" style={s.logoImg} />
      <img src="/logo-ica.png" alt="ICA" style={s.logoImg} />
      <img src="/logo-hipokratia.png" alt="Hipokratia" style={s.logoImg} />
    </div>
  );
}

// Datos con que el alumno ingreso a una clase en vivo (AlumnoVivoIngreso)
function identidadGuardada() {
  try {
    return {
      nombre: localStorage.getItem("alumno_nombre") || "",
      rut: localStorage.getItem("alumno_rut") || "",
    };
  } catch {
    return { nombre: "", rut: "" };
  }
}

export default function AlumnoMaterialesIngreso() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const guardada = identidadGuardada();
  // Desde el boton "Materiales y documentos" de la clase se entra directo,
  // sin volver a escribir los datos. Si ya ingreso a alguna clase, igual
  // quedan los campos prellenados.
  const directo = params.get("desde") === "clase" && Boolean(guardada.nombre && guardada.rut);

  const [nombre, setNombre] = useState(guardada.nombre);
  const [rut, setRut] = useState(guardada.rut);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(directo);

  async function ingresar(nombreIngreso, rutIngreso) {
    setError("");
    setCargando(true);
    try {
      const res = await materiales.ingreso(nombreIngreso.trim(), rutIngreso.trim());
      sessionStorage.setItem("materiales_alumno_id", res.alumno_id);
      navigate("/materiales/ver", { replace: true });
    } catch (err) {
      // Si falla la entrada directa, queda el formulario con los datos
      setError(err.message);
      setCargando(false);
    }
  }

  useEffect(() => {
    if (directo) ingresar(guardada.nombre, guardada.rut);
    // solo al abrir la pagina
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    ingresar(nombre, rut);
  }

  if (directo && cargando && !error) {
    return (
      <div style={s.wrap}>
        <div style={s.contenedor}>
          <LogoBar />
          <p style={s.subtitle}>Abriendo materiales...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <div style={s.contenedor}>
        <LogoBar />
        <form onSubmit={handleSubmit} style={s.card}>
          <h1 style={s.title}>Material de estudio</h1>
          <p style={s.subtitle}>Ingresa tus datos para ver los materiales</p>
          <label style={s.label}>Nombre completo</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required style={s.input} />
          <label style={s.label}>RUT o número de matrícula</label>
          <input value={rut} onChange={(e) => setRut(e.target.value)} required style={s.input} placeholder="RUT o matrícula" />
          {error && <p style={s.error}>{error}</p>}
          <button type="submit" disabled={cargando} style={s.button}>
            {cargando ? "Verificando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
const s = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0E1526", padding: 20 },
  contenedor: { width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", alignItems: "center" },
  logoBar: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 28 },
  logoImg: { height: 64, width: "auto", objectFit: "contain", opacity: 0.95 },
  card: { width: "100%", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column" },
  title: { color: "#F4F1EA", fontSize: 19, fontWeight: 700, marginBottom: 4, textAlign: "center" },
  subtitle: { color: "#94A3B8", fontSize: 13, textAlign: "center", marginBottom: 24 },
  label: { color: "#94A3B8", fontSize: 12, marginBottom: 4 },
  input: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "10px 12px", color: "#F4F1EA", fontSize: 14, marginBottom: 16 },
  error: { color: "#D1495B", fontSize: 13, marginBottom: 12 },
  button: { background: "#4FC3D9", color: "#0E1526", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 15, fontWeight: 600, cursor: "pointer" },
};
