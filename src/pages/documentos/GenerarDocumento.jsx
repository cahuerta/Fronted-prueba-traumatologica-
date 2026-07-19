import { useState } from "react";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
} from "docx";
import { documentos } from "../../api/client";

// ── Colores (mismos que EvidenciaMed) ──
const C = {
  navy: "#0f2942", blue: "#1a6bb5", blue2: "#2980b9",
  teal: "#16a085", orange: "#e67e22", red: "#e74c3c",
  gray: "#64748b", light: "#f0f4f8", white: "#ffffff",
};

function ScoreBadge({ score }) {
  const color = score >= 75 ? C.blue : score >= 50 ? C.teal : score >= 30 ? C.orange : C.red;
  return (
    <div style={{
      width: 40, height: 40, borderRadius: "50%", border: `3px solid ${color}`,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <span style={{ fontSize: ".8rem", fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
    </div>
  );
}

// ── Sección del documento generado (para vista en pantalla y para el .docx) ──
const SECCIONES = [
  ["introduccion", "Introducción"],
  ["epidemiologia", "Epidemiología internacional y nacional"],
  ["clinica", "Clínica"],
  ["diagnostico", "Diagnóstico"],
  ["diagnostico_diferencial", "Diagnóstico diferencial"],
  ["examenes_complementarios", "Exámenes complementarios"],
  ["tratamientos", "Tratamientos"],
  ["resultados", "Resultados"],
  ["conclusiones", "Conclusiones"],
];

function textoSeccion(doc, key) {
  if (key === "epidemiologia") {
    const epi = doc.epidemiologia || {};
    return `Internacional: ${epi.internacional || "—"}\n\nNacional: ${epi.nacional || "—"}`;
  }
  return doc[key] || "—";
}

// ── Construcción del .docx en cliente ──
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

  SECCIONES.forEach(([key, label]) => {
    children.push(new Paragraph({
      children: [new TextRun({ text: label, bold: true, size: 26, color: "1F4E78" })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 260, after: 120 },
    }));
    const texto = textoSeccion(doc, key);
    texto.split("\n").filter(Boolean).forEach(parrafo => {
      children.push(new Paragraph({
        children: [new TextRun({ text: parrafo, size: 21 })],
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 140 },
      }));
    });
  });

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

async function descargarDocx(doc) {
  const documento = construirDocx(doc);
  const blob = await Packer.toBlob(documento);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(doc.titulo || "documento").slice(0, 60)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Componente principal ──
export default function GenerarDocumento() {
  const [tema, setTema] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [papers, setPapers] = useState([]);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [generando, setGenerando] = useState(false);
  const [documento, setDocumento] = useState(null);

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

  const inputStyle = {
    width: "100%", padding: ".75rem 1rem", boxSizing: "border-box",
    border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: ".9rem",
    outline: "none", color: "#1e293b", background: C.white,
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "1rem" }}>
      <h2 style={{ color: C.navy, marginBottom: 4 }}>Generar documento clínico</h2>
      <p style={{ color: C.gray, fontSize: ".85rem", marginTop: 0 }}>
        Busca un tema, marca los papers que necesites, y genera el artículo de revisión.
      </p>

      {/* Búsqueda */}
      <div style={{ background: C.white, borderRadius: 16, padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "1rem" }}>
        <label style={{ display: "block", fontWeight: 700, color: C.navy, fontSize: ".85rem", marginBottom: 8 }}>
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
            marginTop: 10, padding: ".6rem 1.5rem", border: "none", borderRadius: 10,
            background: buscando || tema.trim().length < 3 ? "#94a3b8" : `linear-gradient(135deg,${C.navy},${C.blue})`,
            color: "#fff", fontWeight: 700, fontSize: ".85rem",
            cursor: buscando || tema.trim().length < 3 ? "not-allowed" : "pointer",
          }}
        >
          {buscando ? "⏳ Buscando..." : "🔎 Buscar (máx. 20)"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: ".75rem 1rem", marginBottom: "1rem", color: "#dc2626", fontSize: ".85rem" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Resultados */}
      {papers.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".75rem" }}>
            <p style={{ margin: 0, color: C.gray, fontSize: ".85rem" }}>
              <strong style={{ color: C.navy }}>{papers.length}</strong> resultados
              {seleccionados.size > 0 && <span style={{ color: C.blue, marginLeft: 12 }}>· {seleccionados.size} seleccionados</span>}
            </p>
            {seleccionados.size > 0 && (
              <button
                onClick={handleGenerar}
                disabled={generando}
                style={{
                  padding: ".5rem 1rem", border: "none", borderRadius: 8,
                  background: generando ? "#94a3b8" : `linear-gradient(135deg,${C.teal},#1abc9c)`,
                  color: "#fff", fontWeight: 700, fontSize: ".82rem",
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
                    background: isSel ? "#eff6ff" : C.white,
                    border: `2px solid ${isSel ? C.blue : "#e2e8f0"}`,
                    borderRadius: 14, padding: "1rem", cursor: "pointer",
                    boxShadow: isSel ? "0 0 0 3px rgba(26,107,181,0.1)" : "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ fontSize: ".72rem", color: C.gray, fontWeight: 700, flexShrink: 0, marginTop: 2, width: 20, textAlign: "center" }}>#{idx + 1}</div>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2,
                      border: `2px solid ${isSel ? C.blue : "#cbd5e1"}`,
                      background: isSel ? C.blue : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isSel && <span style={{ color: "#fff", fontSize: ".7rem", fontWeight: 800 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 4px", fontWeight: 700, color: C.navy, fontSize: ".9rem", lineHeight: 1.4 }}>{paper.title}</p>
                      <p style={{ margin: "0 0 8px", color: C.gray, fontSize: ".78rem" }}>{paper.authors} · <em>{paper.journal}</em> · {paper.year}</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {paper.open_access && <span style={{ background: "#dcfce7", color: "#16a34a", borderRadius: 6, padding: "2px 8px", fontSize: ".7rem", fontWeight: 700 }}>✓ Open Access</span>}
                        {paper.doi && <span style={{ background: "#e0f2fe", color: "#0369a1", borderRadius: 6, padding: "2px 8px", fontSize: ".7rem", fontWeight: 700 }}>✓ DOI</span>}
                        <span style={{ background: "#f1f5f9", color: C.gray, borderRadius: 6, padding: "2px 8px", fontSize: ".7rem" }}>PMID: {paper.pmid}</span>
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

      {/* Documento generado: vista en pantalla + descarga */}
      {documento && (
        <div style={{ background: C.white, borderRadius: 16, padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginTop: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ margin: "0 0 4px", color: C.navy }}>{documento.titulo}</h3>
              <p style={{ margin: 0, color: C.gray, fontSize: ".85rem", fontStyle: "italic" }}>Autor: {documento.autor}</p>
            </div>
            <button
              onClick={() => descargarDocx(documento)}
              style={{
                padding: ".6rem 1.2rem", border: "none", borderRadius: 10,
                background: `linear-gradient(135deg,${C.navy},${C.blue})`,
                color: "#fff", fontWeight: 700, fontSize: ".85rem", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              ⬇️ Descargar Word
            </button>
          </div>

          {SECCIONES.map(([key, label]) => (
            <div key={key} style={{ marginBottom: "1.1rem" }}>
              <h4 style={{ color: C.navy, fontSize: ".9rem", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".3px" }}>{label}</h4>
              <p style={{ color: "#334155", fontSize: ".88rem", lineHeight: 1.6, whiteSpace: "pre-line", margin: 0 }}>
                {textoSeccion(documento, key)}
              </p>
            </div>
          ))}

          {documento.referencias?.length > 0 && (
            <div>
              <h4 style={{ color: C.navy, fontSize: ".9rem", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".3px" }}>Referencias</h4>
              {documento.referencias.map((ref, i) => (
                <p key={i} style={{ color: C.gray, fontSize: ".8rem", margin: "0 0 4px" }}>{ref}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
                        }
                                 
