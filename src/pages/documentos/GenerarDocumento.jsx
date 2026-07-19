import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
} from "docx";
import { documentos } from "../../api/client";

// ── Paleta (misma que AdminLogin / AdminDashboard) ──
const C = {
  bg: "#0E1526",
  card: "#16213A",
  border: "rgba(244,241,233,0.12)",
  text: "#F4F1EA",
  muted: "#94A3B8",
  accent: "#4FC3D9",
  error: "#D1495B",
  ok: "#4ADE80",
};

function ScoreBadge({ score }) {
  const color = score >= 75 ? C.accent : score >= 50 ? C.ok : score >= 30 ? "#F5A623" : C.error;
  return (
    <div style={{
      width: 40, height: 40, borderRadius: "50%", border: `3px solid ${color}`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <span style={{ fontSize: ".8rem", fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
    </div>
  );
}

// ── Secciones del documento generado (editables en pantalla) ──
const SECCIONES = [
  ["introduccion", "Introducción"],
  ["clinica", "Clínica"],
  ["diagnostico", "Diagnóstico"],
  ["diagnostico_diferencial", "Diagnóstico diferencial"],
  ["examenes_complementarios", "Exámenes complementarios"],
  ["tratamientos", "Tratamientos"],
  ["resultados", "Resultados"],
  ["conclusiones", "Conclusiones"],
];

// ── Construcción del .docx en cliente (usa el estado editado) ──
function construirDocx(doc) {
  const children = [
    new Paragraph({
      children: [new TextRun({ text: doc.titulo || "Documento sin título", bold: true, size: 32 })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Autor: ${doc.autor || "No especificado"}`, italics: true, size: 22, color: "595959" })],
      spacing: { after: 300 },
    }),
  ];

  function agregarSeccion(titulo, texto) {
    children.push(new Paragraph({
      children: [new TextRun({ text: titulo, bold: true, size: 26, color: "1F4E78" })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 260, after: 120 },
    }));
    (texto || "—").split("\n").filter(Boolean).forEach(parrafo => {
      children.push(new Paragraph({
        children: [new TextRun({ text: parrafo, size: 21 })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 140 },
      }));
    });
  }

  agregarSeccion("Introducción", doc.introduccion);
  agregarSeccion("Epidemiología internacional y nacional",
    `Internacional: ${doc.epidemiologia?.internacional || "—"}\n\nNacional: ${doc.epidemiologia?.nacional || "—"}`);
  SECCIONES.slice(1).forEach(([key, label]) => agregarSeccion(label, doc[key]));

  if (doc.referencias?.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: "Referencias", bold: true, size: 26, color: "1F4E78" })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 260, after: 120 },
    }));
    doc.referencias.forEach(ref => {
      children.push(new Paragraph({
        children: [new TextRun({ text: ref, size: 19, color: "595959" })],
        spacing: { after: 80 },
      }));
    });
  }

  return new Document({ sections: [{ children }] });
}

function nombreArchivoSeguro(titulo, ext) {
  const base = (titulo || "documento")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
  return `${base || "documento"}.${ext}`;
}

async function descargarDocx(doc) {
  const documento = construirDocx(doc);
  const blob = await Packer.toBlob(documento);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivoSeguro(doc.titulo, "docx");
  a.click();
  URL.revokeObjectURL(url);
}

// ── Componente principal ──
export default function GenerarDocumento() {
  const navigate = useNavigate();
  const [tema, setTema] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [papers, setPapers] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [generando, setGenerando] = useState(false);
  const [documento, setDocumento] = useState(null);
  const [descargando, setDescargando] = useState("");

  useEffect(() => {
    documentos.ping().catch(() => {});
  }, []);

  async function handleBuscar() {
    if (tema.trim().length < 3) return;
    setBuscando(true); setError(""); setPapers([]); setSeleccionados(new Set()); setDocumento(null);
    try {
      const data = await documentos.buscar(tema.trim(), 20);
      setPapers(data.papers || []);
      if (!(data.papers || []).length) setError("No se encontraron resultados.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBuscando(false);
    }
  }

  function toggleSeleccion(pmid) {
    setSeleccionados(prev => {
      const next = new Set(prev);
      next.has(pmid) ? next.delete(pmid) : next.add(pmid);
      return next;
    });
  }

  async function handleGenerar() {
    const elegidos = papers.filter(p => seleccionados.has(p.pmid));
    if (!elegidos.length) return;
    setGenerando(true); setError(""); setDocumento(null);
    try {
      const doc = await documentos.generar(elegidos, tema.trim());
      setDocumento(doc);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerando(false);
    }
  }

  // Edición: actualiza una sección de texto simple
  function editarSeccion(key, valor) {
    setDocumento(prev => ({ ...prev, [key]: valor }));
  }

  // Edición: actualiza título o autor
  function editarCampo(key, valor) {
    setDocumento(prev => ({ ...prev, [key]: valor }));
  }

  // Edición: actualiza epidemiología (internacional/nacional)
  function editarEpidemiologia(sub, valor) {
    setDocumento(prev => ({
      ...prev,
      epidemiologia: { ...(prev.epidemiologia || {}), [sub]: valor },
    }));
  }

  // Edición: actualiza una referencia puntual
  function editarReferencia(idx, valor) {
    setDocumento(prev => {
      const refs = [...(prev.referencias || [])];
      refs[idx] = valor;
      return { ...prev, referencias: refs };
    });
  }

  async function handleDescargarPdf() {
    setDescargando("pdf"); setError("");
    try {
      await documentos.descargarPdf(documento);
    } catch (e) {
      setError(e.message);
    } finally {
      setDescargando("");
    }
  }

  async function handleDescargarPpt() {
    setDescargando("ppt"); setError("");
    try {
      await documentos.descargarPpt(documento);
    } catch (e) {
      setError(e.message);
    } finally {
      setDescargando("");
    }
  }

  const inputStyle = {
    width: "100%", padding: ".75rem 1rem", boxSizing: "border-box",
    border: `1px solid ${C.border}`, borderRadius: 8, fontSize: ".9rem",
    outline: "none", color: C.text, background: C.bg,
  };

  const textareaStyle = {
    width: "100%", boxSizing: "border-box", padding: ".7rem .8rem",
    border: `1px solid ${C.border}`, borderRadius: 8, fontSize: ".88rem",
    outline: "none", color: C.text, background: C.bg, lineHeight: 1.6,
    fontFamily: "inherit", resize: "vertical", minHeight: 90,
  };

  const btnDescarga = (activo) => ({
    padding: ".6rem 1rem", border: "none", borderRadius: 8,
    background: activo ? "#334155" : C.accent,
    color: activo ? C.muted : C.bg,
    fontWeight: 700, fontSize: ".82rem", cursor: activo ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, padding: "20px 16px 40px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <button
          onClick={() => navigate("/admin/dashboard")}
          style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.muted, padding: "6px 12px", fontSize: 13, cursor: "pointer", marginBottom: 20,
          }}
        >
          ← Volver
        </button>

        <h2 style={{ color: C.text, marginBottom: 4 }}>Generar documento clínico</h2>
        <p style={{ color: C.muted, fontSize: ".85rem", marginTop: 0, marginBottom: 20 }}>
          Busca un tema, marca los papers que necesites, y genera el artículo de revisión.
        </p>

        {/* Búsqueda */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "1.25rem", marginBottom: "1rem" }}>
          <label style={{ display: "block", fontWeight: 600, color: C.text, fontSize: ".85rem", marginBottom: 8 }}>
            Tema a buscar (PubMed)
          </label>
          <input
            value={tema}
            onChange={e => { setTema(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && tema.trim().length >= 3 && handleBuscar()}
            placeholder="ej: fractura de cadera adulto mayor tratamiento"
            style={inputStyle}
          />
          <button
            onClick={handleBuscar}
            disabled={buscando || tema.trim().length < 3}
            style={{
              marginTop: 10, padding: ".6rem 1.5rem", border: "none", borderRadius: 8,
              background: buscando || tema.trim().length < 3 ? "#334155" : C.accent,
              color: buscando || tema.trim().length < 3 ? C.muted : C.bg, fontWeight: 700, fontSize: ".85rem",
              cursor: buscando || tema.trim().length < 3 ? "not-allowed" : "pointer",
            }}
          >
            {buscando ? "⏳ Buscando..." : "🔎 Buscar (máx. 20)"}
          </button>
        </div>

        {error && (
          <div style={{ background: "rgba(209,73,91,0.12)", border: `1px solid ${C.error}`, borderRadius: 8, padding: ".75rem 1rem", marginBottom: "1rem", color: C.error, fontSize: ".85rem" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Resultados */}
        {papers.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".75rem", flexWrap: "wrap", gap: 8 }}>
              <p style={{ margin: 0, color: C.muted, fontSize: ".85rem" }}>
                <strong style={{ color: C.text }}>{papers.length}</strong> resultados
                {seleccionados.size > 0 && <span style={{ color: C.accent, marginLeft: 12 }}>· {seleccionados.size} seleccionados</span>}
              </p>
              {seleccionados.size > 0 && (
                <button
                  onClick={handleGenerar}
                  disabled={generando}
                  style={{
                    padding: ".5rem 1rem", border: "none", borderRadius: 8,
                    background: generando ? "#334155" : C.accent,
                    color: generando ? C.muted : C.bg, fontWeight: 700, fontSize: ".82rem",
                    cursor: generando ? "not-allowed" : "pointer",
                  }}
                >
                  {generando ? "⚙️ Generando documento..." : `📄 Generar documento (${seleccionados.size})`}
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {papers.map((paper, idx) => {
                const isSel = seleccionados.has(paper.pmid);
                return (
                  <div
                    key={paper.pmid}
                    onClick={() => toggleSeleccion(paper.pmid)}
                    style={{
                      background: isSel ? "rgba(79,195,217,0.08)" : C.card,
                      border: `1px solid ${isSel ? C.accent : C.border}`,
                      borderRadius: 10, padding: "1rem", cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ fontSize: ".72rem", color: C.muted, fontWeight: 700, flexShrink: 0, marginTop: 2, width: 20, textAlign: "center" }}>#{idx + 1}</div>
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
                        border: `2px solid ${isSel ? C.accent : "#334155"}`,
                        background: isSel ? C.accent : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isSel && <span style={{ color: C.bg, fontSize: ".7rem", fontWeight: 800 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: "0 0 4px", fontWeight: 600, color: C.text, fontSize: ".9rem", lineHeight: 1.4 }}>{paper.title}</p>
                        <p style={{ margin: "0 0 8px", color: C.muted, fontSize: ".78rem" }}>{paper.authors} · <em>{paper.journal}</em> · {paper.year}</p>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {paper.open_access && <span style={{ background: "rgba(74,222,128,0.12)", color: C.ok, borderRadius: 6, padding: "2px 8px", fontSize: ".7rem", fontWeight: 700 }}>✓ Open Access</span>}
                          {paper.doi && <span style={{ background: "rgba(79,195,217,0.12)", color: C.accent, borderRadius: 6, padding: "2px 8px", fontSize: ".7rem", fontWeight: 700 }}>✓ DOI</span>}
                          <span style={{ background: "#0E1526", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: "2px 8px", fontSize: ".7rem" }}>PMID: {paper.pmid}</span>
                        </div>
                      </div>
                      <ScoreBadge score={paper.score} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Documento generado: EDITABLE + descarga en 3 formatos */}
        {documento && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "1.5rem", marginTop: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: 600, color: C.muted, fontSize: ".75rem", marginBottom: 4, textTransform: "uppercase" }}>Título</label>
            <input
              value={documento.titulo || ""}
              onChange={e => editarCampo("titulo", e.target.value)}
              style={{ ...inputStyle, fontSize: "1.1rem", fontWeight: 700, marginBottom: 10 }}
            />

            <label style={{ display: "block", fontWeight: 600, color: C.muted, fontSize: ".75rem", marginBottom: 4, textTransform: "uppercase" }}>Autor</label>
            <input
              value={documento.autor || ""}
              onChange={e => editarCampo("autor", e.target.value)}
              style={{ ...inputStyle, fontStyle: "italic", marginBottom: 20 }}
            />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: "1.5rem" }}>
              <button onClick={descargarDocx.bind(null, documento)} style={btnDescarga(false)}>⬇️ Word</button>
              <button onClick={handleDescargarPdf} disabled={descargando === "pdf"} style={btnDescarga(descargando === "pdf")}>
                {descargando === "pdf" ? "⏳ Generando..." : "⬇️ PDF"}
              </button>
              <button onClick={handleDescargarPpt} disabled={descargando === "ppt"} style={btnDescarga(descargando === "ppt")}>
                {descargando === "ppt" ? "⏳ Generando..." : "⬇️ PowerPoint"}
              </button>
            </div>

            {/* Introducción */}
            <div style={{ marginBottom: "1.1rem" }}>
              <h4 style={{ color: C.accent, fontSize: ".85rem", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".3px" }}>Introducción</h4>
              <textarea value={documento.introduccion || ""} onChange={e => editarSeccion("introduccion", e.target.value)} style={textareaStyle} />
            </div>

            {/* Epidemiología (dos campos) */}
            <div style={{ marginBottom: "1.1rem" }}>
              <h4 style={{ color: C.accent, fontSize: ".85rem", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".3px" }}>Epidemiología internacional y nacional</h4>
              <label style={{ display: "block", color: C.muted, fontSize: ".75rem", margin: "0 0 4px" }}>Internacional</label>
              <textarea value={documento.epidemiologia?.internacional || ""} onChange={e => editarEpidemiologia("internacional", e.target.value)} style={{ ...textareaStyle, marginBottom: 10 }} />
              <label style={{ display: "block", color: C.muted, fontSize: ".75rem", margin: "0 0 4px" }}>Nacional</label>
              <textarea value={documento.epidemiologia?.nacional || ""} onChange={e => editarEpidemiologia("nacional", e.target.value)} style={textareaStyle} />
            </div>

            {/* Resto de secciones */}
            {SECCIONES.slice(1).map(([key, label]) => (
              <div key={key} style={{ marginBottom: "1.1rem" }}>
                <h4 style={{ color: C.accent, fontSize: ".85rem", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".3px" }}>{label}</h4>
                <textarea value={documento[key] || ""} onChange={e => editarSeccion(key, e.target.value)} style={textareaStyle} />
              </div>
            ))}

            {/* Referencias */}
            {documento.referencias?.length > 0 && (
              <div>
                <h4 style={{ color: C.accent, fontSize: ".85rem", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".3px" }}>Referencias</h4>
                {documento.referencias.map((ref, i) => (
                  <input
                    key={i}
                    value={ref}
                    onChange={e => editarReferencia(i, e.target.value)}
                    style={{ ...inputStyle, marginBottom: 6, fontSize: ".8rem", color: C.muted }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
                    }
                            
