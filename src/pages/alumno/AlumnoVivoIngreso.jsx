import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { casosVivoAlumno } from "../../api/client";
import { sesionResolver } from "../../api/clasesFormalesCliente";

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
    setRut(formatearRut(e.target.value));
  }

  async function handleIngresoCaso(e) {
    e.preventDefault();
    setError("");

    if (!validarRut(rut)) {
      setError("RUT inválido");
      return;
    }
    const rutLimpio = rut.replace(/\./g, "");

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

    if (!validarRut(rut)) {
      setError("RUT inválido");
      return;
    }
    const rutLimpio = rut.replace(/\./g, "");

    localStorage.setItem("clase_rut", rutLimpio);
    localStorage.setItem("clase_sesion_id", sesionId);
    navigate(`/alumno-vivo/${codigo}/clase`);
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
          <p style={s.subtitulo}>Ingresa tu nombre y RUT para participar</p>
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
              placeholder="RUT (ej. 12.345.678-9)"
              maxLength={12}
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
        <p style={s.subtitulo}>Ingresa tu RUT para participar</p>
        <form onSubmit={handleIngresoClase} style={s.form}>
          <input
            value={rut}
            onChange={handleRutChange}
            placeholder="RUT (ej. 12.345.678-9)"
            maxLength={12}
            required
            style={s.input}
          />
          {error && <p style={s.error}>{error}</p>}
          <button type="submit" style={s.btn}>Entrar</button>
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
