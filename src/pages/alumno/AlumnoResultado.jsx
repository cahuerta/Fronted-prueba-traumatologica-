import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function AlumnoResultado() {
  const { sesionId } = useParams();
  const navigate = useNavigate();
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    const guardado = sessionStorage.getItem(`resultado_${sesionId}`);
    if (!guardado) {
      navigate(`/alumno/${sesionId}`);
      return;
    }
    setResultado(JSON.parse(guardado));
  }, [sesionId]);

  if (!resultado) return null;

  const aprobado = resultado.nota >= 4.0;

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <p style={s.label}>Examen finalizado</p>

        <p style={{ ...s.nota, color: aprobado ? "#7FB685" : "#D1495B" }}>{resultado.nota}</p>
        <p style={s.estado}>{aprobado ? "Aprobado" : "Reprobado"}</p>

        <div style={s.detalle}>
          <div style={s.fila}>
            <span style={s.filaLabel}>Puntaje</span>
            <span style={s.filaValor}>{resultado.puntaje_total} / 100</span>
          </div>
          <div style={s.fila}>
            <span style={s.filaLabel}>Porcentaje</span>
            <span style={s.filaValor}>{resultado.porcentaje}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0E1526", padding: 20 },
  card: { width: "100%", maxWidth: 360, background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 16, padding: 32, textAlign: "center" },
  label: { color: "#94A3B8", fontSize: 13, marginBottom: 20 },
  nota: { fontSize: 56, fontWeight: 700, margin: 0, lineHeight: 1 },
  estado: { color: "#94A3B8", fontSize: 14, marginTop: 6, marginBottom: 24, textTransform: "uppercase", letterSpacing: "0.05em" },
  detalle: { borderTop: "1px solid rgba(244,241,233,0.1)", paddingTop: 16 },
  fila: { display: "flex", justifyContent: "space-between", padding: "6px 0" },
  filaLabel: { color: "#94A3B8", fontSize: 13 },
  filaValor: { color: "#F4F1EA", fontSize: 13, fontWeight: 600 },
};
