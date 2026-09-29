/**
 * BotonMateriales.jsx
 * Boton "Materiales y documentos" en la pantalla del alumno durante la
 * clase (Casos Clinicos y Clases Formales).
 *
 * Abre la pagina de materiales en OTRA pestaña, para que el alumno no
 * salga de la clase ni se pierda una votacion o trivia. Entra directo a
 * la lista, sin volver a escribir nombre y RUT/matricula: usa los datos
 * con que ingreso a la clase (guardados en AlumnoVivoIngreso y leidos en
 * AlumnoMaterialesIngreso con ?desde=clase).
 */
export default function BotonMateriales() {
  return (
    <a href="/materiales?desde=clase" target="_blank" rel="noopener" style={s.boton}>
      <span style={s.icono}>📂</span>
      <span>Materiales y documentos</span>
    </a>
  );
}

const s = {
  boton: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    width: "100%", maxWidth: 360, margin: "20px auto 0", boxSizing: "border-box",
    background: "#16213A", border: "1px solid rgba(79,195,217,0.45)", borderRadius: 12,
    color: "#4FC3D9", padding: "14px 16px", fontSize: 15, fontWeight: 700,
    textDecoration: "none", fontFamily: "sans-serif",
  },
  icono: { fontSize: 18 },
};
