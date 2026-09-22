import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { casosVivoAlumno } from "../../api/client";
import { sesionResolver, clasesFormalesIngreso } from "../../api/clasesFormalesCliente";

export default function AlumnoVivoIngreso() {
  const navigate = useNavigate();
  const { codigo } = useParams();

  const [tipo, setTipo] = useState(null); // "caso_clinico" | "clases_formales" | null mientras resuelve
  const [sesionId, setSesionId] = useState(null);
  const [resolviendo, setResolviendo] = useState(true);
  const [errorResolver, setErrorResolver] = useState("");

  const [nombre, setNombre] = useState("");
  const [rut, setRut] = useState("");
  const [error, setError] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    (async () => {
      setResolviendo(true);
      setErrorResolver("");
      try {
        const res = await sesionResolver.resolver(codigo);
        setTipo(res.tipo);
        setSesionId(res.sesion_id);
      } catch (err) {
        setErrorResolver(err.message || "Código de sesión inválido");
      } finally {
        setResolviendo(false);
      }
    })();
  }, [codigo]);

  function handleRutChange(e) {
    // Texto libre -sin formatear ni validar como RUT-: el campo acepta
    // tanto RUT como numero de matricula, y formatearRut/validarRut
    // (que exigian formato con puntos, guion y digito verificador
    // calculado modulo 11) rechazaban cualquier matricula numerica.
    setRut(e.target.value);
  }

  async function handleIngresoCaso(e) {
    e.preventDefault();
    setError("");

    const rutLimpio = rut.trim();
    if (!rutLimpio) {
      setError("Ingresa tu RUT o número de matrícula");
      return;
    }

    setEntrando(true);
    try {
      const { sesion_id, alumno_id } = await casosVivoAlumno.ingreso(codigo, nombre, rutLimpio);
      localStorage.setItem("vivo_alumno_id", alumno_id);
      localStorage.setItem("vivo_sesion_id", sesion_id);
      navigate(`/alumno-vivo/${codigo}/votar`);
    } catch (err) {
      setError(err.message);
    } finally {
      setEntrando(false);
    }
  }

  async function handleIngresoClase(e) {
    e.preventDefault();
    setError("");

    const rutLimpio = rut.trim();
    if (!rutLimpio) {
      setError("Ingresa tu RUT o número de matrícula");
      return;
    }

    setEntrando(true);
    try {
      await clasesFormalesIngreso.ingresar(sesionId, rutLimpio);
      localStorage.setItem("clase_rut", rutLimpio);
      localStorage.setItem("clase_sesion_id", sesionId);
      navigate(`/alumno-vivo/${codigo}/clase`);
    } catch (err) {
      setError(err.message);
    } finally {
      setEntrando(false);
    }
  }

  if (resolviendo) {
    return (
      <div style={s.wrap}>
        <p style={s.subtitulo}>Cargando...</p>
      </div>
    );
  }

  if (errorResolver) {
    return (
      <div style={s.wrap}>
        <div style={s.card}>
          <p style={s.titulo}>Código inválido</p>
          <p style={s.error}>{errorResolver}</p>
        </div>
      </div>
    );
  }

  if (tipo === "caso_clinico") {
    return (
      <div style={s.wrap}>
        <div style={s.card}>
          <p style={s.titulo}>Clase en vivo</p>
          <p style={s.subtitulo}>Ingresa tu nombre y tu RUT o número de matrícula para participar</p>
          <form onSubmit={handleIngresoCaso} style={s.form}>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo"
              required
              style={s.input}
            />
            <input
              value={rut}
              onChange={handleRutChange}
              placeholder="RUT o número de matrícula"
              required
              style={s.input}
            />
            {error && <p style={s.error}>{error}</p>}
            <button type="submit" disabled={entrando} style={s.btn}>
              {entrando ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // tipo === "clases_formales"
  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <p style={s.titulo}>Clase en vivo</p>
        <p style={s.subtitulo}>Ingresa tu RUT o número de matrícula para participar</p>
        <form onSubmit={handleIngresoClase} style={s.form}>
          <input
            value={rut}
            onChange={handleRutChange}
            placeholder="RUT o número de matrícula"
            required
            style={s.input}
          />
          {error && <p style={s.error}>{error}</p>}
          <button type="submit" disabled={entrando} style={s.btn}>
            {entrando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "sans-serif" },
  card: { width: "100%", maxWidth: 360, textAlign: "center" },
  titulo: { fontSize: 22, fontWeight: 700, margin: "0 0 4px" },
  subtitulo: { fontSize: 14, color: "#94A3B8", margin: "0 0 24px" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, padding: "14px 16px", color: "#F4F1EA", fontSize: 16 },
  error: { color: "#D1495B", fontSize: 13, margin: 0 },
  btn: { background: "#4FC3D9", border: "none", borderRadius: 10, color: "#0E1526", padding: "15px 0", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8 },
};
  
