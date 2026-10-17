import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { preguntas, examenImpreso, getToken } from "../../api/client";

const API_URL = import.meta.env.VITE_API_URL;
const REGIONES = [
  { valor: "hombro", etiqueta: "Hombro" },
  { valor: "codo", etiqueta: "Codo" },
  { valor: "mano_muneca", etiqueta: "Mano y muñeca" },
  { valor: "columna", etiqueta: "Columna" },
  { valor: "cadera_pelvis", etiqueta: "Cadera y pelvis" },
  { valor: "rodilla", etiqueta: "Rodilla" },
  { valor: "tobillo_pie", etiqueta: "Tobillo y pie" },
  { valor: "ortogeriatria", etiqueta: "Ortogeriatría" },
  { valor: "imagenologia", etiqueta: "Imagenología" },
  { valor: "ciencias_basicas", etiqueta: "Ciencias básicas" },
];
const COMPLEJIDADES = ["basica", "intermedia", "compleja"];
const LETRAS = ["A", "B", "C", "D", "E"];
const TITULO_PRUEBA = "Prueba de Especialidades - Traumatología";

// Sube una foto/video al bucket de preguntas y devuelve { media_url, media_tipo }
async function subirMediaArchivo(tipo, archivo) {
  const formData = new FormData();
  formData.append("tipo", tipo);
  formData.append("archivo", archivo);

  const res = await fetch(`${API_URL}/preguntas/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || "No se pudo subir la imagen/video");
  }
  return res.json();
}

function formatoFecha(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function AdminPreguntas() {
  const navigate = useNavigate();

  // ---------- Crear pregunta (flujo original) ----------
  const [region, setRegion] = useState(REGIONES[0].valor);
  const [complejidad, setComplejidad] = useState(COMPLEJIDADES[0]);
  const [pregunta, setPregunta] = useState("");
  const [respuestaCorrecta, setRespuestaCorrecta] = useState("");
  const [explicacion, setExplicacion] = useState("");

  const [tipoMedia, setTipoMedia] = useState("");
  const [archivoMedia, setArchivoMedia] = useState(null);

  const [opciones, setOpciones] = useState(null); // null hasta generar con IA
  const [correctaIdx, setCorrectaIdx] = useState(null);

  const [generando, setGenerando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  // ---------- Listado ----------
  const [lista, setLista] = useState([]);
  const [filtroRegion, setFiltroRegion] = useState("");
  const [soloRevisar, setSoloRevisar] = useState(false);
  const [totalRevisar, setTotalRevisar] = useState(0);

  const [expandida, setExpandida] = useState(null);
  const [mediaUrls, setMediaUrls] = useState({}); // { preguntaId: url }
  const [cargandoMedia, setCargandoMedia] = useState(null);

  // ---------- Editar pregunta ----------
  const [editando, setEditando] = useState(null); // id de la pregunta en edición
  const [edit, setEdit] = useState(null);
  const [editMedia, setEditMedia] = useState({ quitar: false, tipo: "", archivo: null });
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const [errorEdit, setErrorEdit] = useState("");

  // ---------- Pruebas en papel (PDF) ----------
  const [verPdf, setVerPdf] = useState(true);
  const [pdfTitulo, setPdfTitulo] = useState(TITULO_PRUEBA);
  const [pdfRegion, setPdfRegion] = useState("");
  const [pdfExcluir, setPdfExcluir] = useState(false);
  const [copias, setCopias] = useState([]);
  const [generandoCopia, setGenerandoCopia] = useState(false);
  const [errorPdf, setErrorPdf] = useState("");
  const [exitoPdf, setExitoPdf] = useState("");

  // ---------- Registro de cargas ----------
  const [verCargas, setVerCargas] = useState(false);
  const [cargas, setCargas] = useState([]);
  const [errorCargas, setErrorCargas] = useState("");

  // ---------- Cargar preguntas desde un Word ----------
  const [verImportar, setVerImportar] = useState(true);
  const [archivoDocx, setArchivoDocx] = useState(null);
  const [inputDocxKey, setInputDocxKey] = useState(0);
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [leyendoDocx, setLeyendoDocx] = useState(false);
  const [guardandoDocx, setGuardandoDocx] = useState(false);
  const [forzarCarga, setForzarCarga] = useState(false);
  const [errorImportar, setErrorImportar] = useState("");
  const [exitoImportar, setExitoImportar] = useState("");

  useEffect(() => {
    cargarLista();
  }, [filtroRegion, soloRevisar]);

  useEffect(() => {
    cargarCopias();
    cargarCargas();
  }, []);

  async function cargarLista() {
    try {
      const data = await preguntas.listar(filtroRegion || undefined, soloRevisar ? { revisar: true } : {});
      setLista(data);
      if (soloRevisar) {
        setTotalRevisar(data.length);
      } else {
        setTotalRevisar(data.filter((p) => p.revisar).length);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function cargarCopias() {
    try {
      setCopias(await examenImpreso.listar());
    } catch (err) {
      setErrorPdf(err.message);
    }
  }

  async function cargarCargas() {
    try {
      setCargas(await preguntas.cargas());
    } catch (err) {
      setErrorCargas(err.message);
    }
  }

  // ---------- Crear ----------
  async function handleGenerar() {
    setError("");
    setExito("");
    if (!pregunta.trim() || !respuestaCorrecta.trim()) {
      setError("Escribe la pregunta y la respuesta correcta primero");
      return;
    }
    setGenerando(true);
    try {
      const res = await preguntas.generarAlternativas({
        region, complejidad, pregunta: pregunta.trim(), respuesta_correcta: respuestaCorrecta.trim(),
      });
      setOpciones(res.opciones);
      setCorrectaIdx(res.correcta);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerando(false);
    }
  }

  function handleEditarOpcion(i, valor) {
    const nuevas = [...opciones];
    nuevas[i] = valor;
    setOpciones(nuevas);
  }

  async function handleGuardar() {
    setError("");
    setExito("");
    setGuardando(true);
    try {
      let media_url = null;
      let media_tipo = null;

      if (archivoMedia) {
        const media = await subirMediaArchivo(tipoMedia, archivoMedia);
        media_url = media.media_url;
        media_tipo = media.media_tipo;
      }

      await preguntas.crear({
        region, complejidad, pregunta: pregunta.trim(),
        opciones, correcta: correctaIdx,
        explicacion: explicacion.trim() || null,
        media_url, media_tipo,
      });

      setExito("Pregunta guardada");
      setPregunta("");
      setRespuestaCorrecta("");
      setExplicacion("");
      setOpciones(null);
      setCorrectaIdx(null);
      setTipoMedia("");
      setArchivoMedia(null);
      cargarLista();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleBorrar(id) {
    try {
      await preguntas.borrar(id);
      if (editando === id) setEditando(null);
      cargarLista();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleExpandir(p) {
    const abriendo = expandida !== p.id;
    setExpandida(abriendo ? p.id : null);

    if (abriendo && p.media_tipo && !mediaUrls[p.id]) {
      setCargandoMedia(p.id);
      try {
        const res = await fetch(`${API_URL}/preguntas/${p.id}/media`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMediaUrls((m) => ({ ...m, [p.id]: data.url }));
        }
      } catch (err) {
        // si falla la preview, igual se puede ver el resto del detalle
      } finally {
        setCargandoMedia(null);
      }
    }
  }

  // ---------- Editar ----------
  function iniciarEdicion(p) {
    setEditando(p.id);
    setEdit({
      region: p.region,
      complejidad: p.complejidad,
      pregunta: p.pregunta,
      opciones: [...p.opciones],
      correcta: p.correcta,
      explicacion: p.explicacion || "",
      revisar: !!p.revisar,
      nota_revision: p.nota_revision || "",
    });
    setEditMedia({ quitar: false, tipo: "", archivo: null });
    setErrorEdit("");
  }

  function cancelarEdicion() {
    setEditando(null);
    setEdit(null);
    setErrorEdit("");
  }

  function cambiarCampoEdit(campo, valor) {
    setEdit((e) => ({ ...e, [campo]: valor }));
  }

  function cambiarOpcionEdit(i, valor) {
    setEdit((e) => {
      const nuevas = [...e.opciones];
      nuevas[i] = valor;
      return { ...e, opciones: nuevas };
    });
  }

  async function guardarEdicion(p) {
    setErrorEdit("");
    if (!edit.pregunta.trim()) {
      setErrorEdit("El enunciado no puede quedar vacío");
      return;
    }
    if (edit.opciones.some((o) => !o.trim())) {
      setErrorEdit("Las 5 alternativas deben tener texto");
      return;
    }
    setGuardandoEdit(true);
    try {
      const cambios = {
        region: edit.region,
        complejidad: edit.complejidad,
        pregunta: edit.pregunta.trim(),
        opciones: edit.opciones.map((o) => o.trim()),
        correcta: edit.correcta,
        explicacion: edit.explicacion.trim() || null,
        revisar: edit.revisar,
        nota_revision: edit.revisar ? (edit.nota_revision.trim() || null) : null,
      };

      if (editMedia.archivo && editMedia.tipo) {
        const media = await subirMediaArchivo(editMedia.tipo, editMedia.archivo);
        cambios.media_url = media.media_url;
        cambios.media_tipo = media.media_tipo;
      } else if (editMedia.quitar) {
        cambios.media_url = null;
        cambios.media_tipo = null;
      }

      await preguntas.actualizar(p.id, cambios);

      // la URL firmada anterior ya no sirve si cambió la foto/video
      setMediaUrls((m) => {
        const resto = { ...m };
        delete resto[p.id];
        return resto;
      });
      setEditando(null);
      setEdit(null);
      setExito("Pregunta actualizada");
      cargarLista();
    } catch (err) {
      setErrorEdit(err.message);
    } finally {
      setGuardandoEdit(false);
    }
  }

  // ---------- Pruebas en papel ----------
  async function handleGenerarCopia() {
    setErrorPdf("");
    setExitoPdf("");
    setGenerandoCopia(true);
    try {
      const res = await examenImpreso.generar({
        titulo: pdfTitulo.trim() || TITULO_PRUEBA,
        region: pdfRegion || null,
        excluir_por_revisar: pdfExcluir,
      });
      setExitoPdf(`Folio ${res.folio_texto} creado con ${res.total_preguntas} preguntas`);
      cargarCopias();
    } catch (err) {
      setErrorPdf(err.message);
    } finally {
      setGenerandoCopia(false);
    }
  }

  async function handlePdf(folio, tipo, descargar) {
    setErrorPdf("");
    try {
      await examenImpreso.abrirPdf(folio, tipo, descargar);
    } catch (err) {
      setErrorPdf(err.message);
    }
  }

  // ---------- Cargas ----------
  async function handleDesactivarCarga(c) {
    if (!window.confirm(`¿Desactivar las ${c.preguntas_activas} preguntas activas de "${c.archivo}"? No se borra nada, pero dejan de usarse.`)) {
      return;
    }
    setErrorCargas("");
    try {
      await preguntas.desactivarCarga(c.id);
      cargarCargas();
      cargarLista();
    } catch (err) {
      setErrorCargas(err.message);
    }
  }

  // ---------- Cargar desde Word ----------
  async function handleVistaPrevia() {
    if (!archivoDocx) return;
    setErrorImportar("");
    setExitoImportar("");
    setVistaPrevia(null);
    setForzarCarga(false);
    setLeyendoDocx(true);
    try {
      setVistaPrevia(await preguntas.importarDocxVistaPrevia(archivoDocx));
    } catch (err) {
      setErrorImportar(err.message);
    } finally {
      setLeyendoDocx(false);
    }
  }

  async function handleGuardarDocx() {
    setErrorImportar("");
    setExitoImportar("");
    setGuardandoDocx(true);
    try {
      const res = await preguntas.importarDocx(archivoDocx, forzarCarga);
      setExitoImportar(
        `Listo: ${res.insertadas} preguntas guardadas (${res.por_revisar} por revisar, ${res.rechazadas} rechazadas).`
      );
      setVistaPrevia(null);
      setArchivoDocx(null);
      setInputDocxKey((k) => k + 1);
      cargarLista();
      cargarCargas();
    } catch (err) {
      setErrorImportar(err.message);
    } finally {
      setGuardandoDocx(false);
    }
  }

  function cancelarImportar() {
    setVistaPrevia(null);
    setArchivoDocx(null);
    setInputDocxKey((k) => k + 1);
    setErrorImportar("");
  }

  function etiquetaDeRegion(valor) {
    return REGIONES.find((r) => r.valor === valor)?.etiqueta || valor;
  }

  return (
    <div style={s.wrap}>
      <div style={s.headerRow}>
        <button onClick={() => navigate("/admin/dashboard")} style={s.back}>‹ Volver</button>
        <h1 style={s.title}>Banco de preguntas</h1>
      </div>

      {/* ---------- PRUEBAS EN PAPEL (PDF) ---------- */}
      <div style={s.panel}>
        <button onClick={() => setVerPdf(!verPdf)} style={s.panelHead}>
          <span>Prueba en papel (PDF con folio)</span>
          <span style={s.chevron}>{verPdf ? "▲" : "▼"}</span>
        </button>

        {verPdf && (
          <div style={s.panelBody}>
            <p style={s.ayuda}>
              Cada copia nueva tiene un folio único, con las preguntas y las alternativas en orden revuelto
              (igual que el examen online). Con el folio puedes volver a bajar esa misma prueba y su pauta de corrección.
            </p>

            <label style={s.label}>Título de la prueba</label>
            <input value={pdfTitulo} onChange={(e) => setPdfTitulo(e.target.value)} style={s.input} />

            <label style={s.label}>Región (opcional; vacío = todas las preguntas activas)</label>
            <select value={pdfRegion} onChange={(e) => setPdfRegion(e.target.value)} style={s.input}>
              <option value="">Todas</option>
              {REGIONES.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
            </select>

            <label style={s.checkRow}>
              <input type="checkbox" checked={pdfExcluir} onChange={(e) => setPdfExcluir(e.target.checked)} />
              <span>Dejar fuera las preguntas "por revisar" ({totalRevisar})</span>
            </label>

            <button onClick={handleGenerarCopia} disabled={generandoCopia} style={s.iaBtn}>
              {generandoCopia ? "Generando..." : "Generar copia nueva (folio nuevo)"}
            </button>

            {errorPdf && <p style={s.error}>{errorPdf}</p>}
            {exitoPdf && <p style={s.exito}>{exitoPdf}</p>}

            <p style={{ ...s.label, marginTop: 16 }}>Copias generadas ({copias.length})</p>
            {copias.length === 0 && <p style={s.ayuda}>Todavía no hay copias.</p>}
            {copias.map((c) => (
              <div key={c.id} style={s.copiaRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={s.copiaFolio}>{c.folio_texto}</p>
                  <p style={s.autor}>
                    {c.total_preguntas} preguntas · {formatoFecha(c.created_at)}
                    {c.creado_por_nombre ? ` · ${c.creado_por_nombre}` : ""}
                  </p>
                </div>
                <div style={s.copiaBtns}>
                  <button onClick={() => handlePdf(c.folio, "prueba", false)} style={s.smallBtn}>Ver / imprimir</button>
                  <button onClick={() => handlePdf(c.folio, "prueba", true)} style={s.smallBtn}>Descargar prueba</button>
                  <button onClick={() => handlePdf(c.folio, "pauta", false)} style={s.smallBtn}>Pauta</button>
                  <button onClick={() => handlePdf(c.folio, "pauta", true)} style={s.smallBtn}>Descargar pauta</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- CARGAR PREGUNTAS DESDE WORD ---------- */}
      <div style={s.panel}>
        <button onClick={() => setVerImportar(!verImportar)} style={s.panelHead}>
          <span>Cargar preguntas desde un Word</span>
          <span style={s.chevron}>{verImportar ? "▲" : "▼"}</span>
        </button>

        {verImportar && (
          <div style={s.panelBody}>
            <p style={s.ayuda}>
              Sube el examen en Word (.docx). La respuesta correcta se toma de la alternativa en negrita y las
              radiografías quedan en su pregunta. Todas entran como complejidad "basica"; la región se propone
              sola y la corriges después. Primero ves lo detectado y recién ahí guardas.
            </p>

            <input
              key={inputDocxKey}
              type="file"
              accept=".docx"
              onChange={(e) => { setArchivoDocx(e.target.files[0] || null); setVistaPrevia(null); setErrorImportar(""); setExitoImportar(""); }}
              style={s.fileInput}
            />

            {archivoDocx && !vistaPrevia && (
              <button onClick={handleVistaPrevia} disabled={leyendoDocx} style={s.iaBtn}>
                {leyendoDocx ? "Leyendo el Word..." : "Ver lo que se detectó"}
              </button>
            )}

            {vistaPrevia && (
              <>
                <p style={s.ayuda}>
                  <b>{vistaPrevia.archivo}</b>: {vistaPrevia.preguntas.length} preguntas detectadas ·{" "}
                  {vistaPrevia.preguntas.filter((q) => q.revisar).length} por revisar ·{" "}
                  {vistaPrevia.preguntas.filter((q) => q.n_imagenes > 0).length} con imagen
                  {vistaPrevia.anomalias.length > 0 && ` · ${vistaPrevia.anomalias.length} con problemas`}
                </p>

                {vistaPrevia.ya_cargado && (
                  <div style={s.advertencia}>
                    <p style={{ margin: 0 }}>
                      Este mismo archivo ya fue cargado el {formatoFecha(vistaPrevia.ya_cargado.created_at)}.
                    </p>
                    <label style={s.checkRow}>
                      <input type="checkbox" checked={forzarCarga} onChange={(e) => setForzarCarga(e.target.checked)} />
                      <span>Cargarlo de nuevo igual (quedarían preguntas repetidas)</span>
                    </label>
                  </div>
                )}

                {vistaPrevia.anomalias.map((a, i) => (
                  <p key={i} style={s.rechazada}>Problema en la pregunta #{a.numero}: {a.motivo}</p>
                ))}

                <div style={s.previaLista}>
                  {vistaPrevia.preguntas.map((q) => (
                    <div key={q.numero} style={s.previaItem}>
                      <p style={s.cardMeta}>
                        #{q.numero} · {etiquetaDeRegion(q.region)} · basica{q.n_imagenes > 0 ? " · imagen" : ""}
                        {q.revisar && <span style={s.badgeRevisar}> · POR REVISAR</span>}
                        {q.correcta === null && <span style={s.badgeRevisar}> · SIN CORRECTA</span>}
                      </p>
                      <p style={s.previaEnunciado}>{q.pregunta}</p>
                      <p style={s.previaCorrecta}>
                        {q.correcta !== null
                          ? `Correcta ${LETRAS[q.correcta]}: ${q.opciones[q.correcta]}`
                          : "No se detectó la correcta: esta pregunta no se guardará"}
                      </p>
                      {q.nota_revision && <p style={s.rechazada}>{q.nota_revision}</p>}
                    </div>
                  ))}
                </div>

                <div style={s.btnRow}>
                  <button onClick={cancelarImportar} style={s.secondaryBtn}>Cancelar</button>
                  <button
                    onClick={handleGuardarDocx}
                    disabled={guardandoDocx || vistaPrevia.preguntas.length === 0 || (vistaPrevia.ya_cargado && !forzarCarga)}
                    style={s.saveBtn}
                  >
                    {guardandoDocx ? "Guardando (puede tardar unos segundos)..." : "Guardar en el banco"}
                  </button>
                </div>
              </>
            )}

            {errorImportar && <p style={s.error}>{errorImportar}</p>}
            {exitoImportar && <p style={s.exito}>{exitoImportar}</p>}
          </div>
        )}
      </div>

      {/* ---------- REGISTRO DE CARGAS ---------- */}
      <div style={s.panel}>
        <button onClick={() => setVerCargas(!verCargas)} style={s.panelHead}>
          <span>Registro de cargas desde archivo ({cargas.length})</span>
          <span style={s.chevron}>{verCargas ? "▲" : "▼"}</span>
        </button>

        {verCargas && (
          <div style={s.panelBody}>
            {errorCargas && <p style={s.error}>{errorCargas}</p>}
            {cargas.length === 0 && <p style={s.ayuda}>No hay cargas registradas.</p>}
            {cargas.map((c) => (
              <div key={c.id} style={s.copiaRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={s.copiaFolio}>{c.archivo}</p>
                  <p style={s.autor}>
                    {formatoFecha(c.created_at)}{c.subido_por_nombre ? ` · ${c.subido_por_nombre}` : ""}
                  </p>
                  <p style={s.autor}>
                    {c.insertadas} insertadas · {c.rechazadas} rechazadas · {c.preguntas_activas} activas
                  </p>
                  {c.rechazadas > 0 && Array.isArray(c.detalle_rechazadas) && c.detalle_rechazadas.map((r, i) => (
                    <p key={i} style={s.rechazada}>#{r.numero}: {r.motivo}</p>
                  ))}
                </div>
                <div style={s.copiaBtns}>
                  <button onClick={() => { setFiltroRegion(""); setSoloRevisar(false); }} style={s.smallBtn} title="Ver el listado completo">Ver preguntas</button>
                  {c.preguntas_activas > 0 && (
                    <button onClick={() => handleDesactivarCarga(c)} style={s.smallBtnPeligro}>Desactivar lote</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- CREAR PREGUNTA ---------- */}
      <div style={s.form}>
        <label style={s.label}>Región</label>
        <select value={region} onChange={(e) => setRegion(e.target.value)} style={s.input}>
          {REGIONES.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
        </select>

        <label style={s.label}>Complejidad</label>
        <select value={complejidad} onChange={(e) => setComplejidad(e.target.value)} style={s.input}>
          {COMPLEJIDADES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <label style={s.label}>Pregunta</label>
        <textarea value={pregunta} onChange={(e) => setPregunta(e.target.value)} rows={3} style={s.input} />

        <label style={s.label}>Respuesta correcta</label>
        <input value={respuestaCorrecta} onChange={(e) => setRespuestaCorrecta(e.target.value)} style={s.input} />

        <label style={s.label}>Foto o video (opcional, ej. radiografía)</label>
        <select value={tipoMedia} onChange={(e) => setTipoMedia(e.target.value)} style={s.input}>
          <option value="">Sin foto/video</option>
          <option value="foto">Foto</option>
          <option value="video">Video</option>
        </select>
        {tipoMedia && (
          <input
            type="file"
            accept={tipoMedia === "foto" ? "image/*" : "video/*"}
            onChange={(e) => setArchivoMedia(e.target.files[0])}
            style={s.fileInput}
          />
        )}

        {opciones === null ? (
          <button onClick={handleGenerar} disabled={generando} style={s.iaBtn}>
            {generando ? "Generando con IA..." : "Generar alternativas con IA"}
          </button>
        ) : (
          <>
            <label style={s.label}>Alternativas (edítalas si quieres)</label>
            {opciones.map((op, i) => (
              <div key={i} style={s.opcionRow}>
                <button
                  onClick={() => setCorrectaIdx(i)}
                  style={{ ...s.letraBtn, ...(correctaIdx === i ? s.letraBtnActiva : {}) }}
                >
                  {LETRAS[i]}
                </button>
                <input value={op} onChange={(e) => handleEditarOpcion(i, e.target.value)} style={{ ...s.input, flex: 1, marginBottom: 0 }} />
              </div>
            ))}

            <label style={s.label}>Explicación (opcional)</label>
            <textarea value={explicacion} onChange={(e) => setExplicacion(e.target.value)} rows={2} style={s.input} />

            <div style={s.btnRow}>
              <button onClick={() => { setOpciones(null); setCorrectaIdx(null); }} style={s.secondaryBtn}>Regenerar</button>
              <button onClick={handleGuardar} disabled={guardando} style={s.saveBtn}>
                {guardando ? "Guardando..." : "Guardar pregunta"}
              </button>
            </div>
          </>
        )}

        {error && <p style={s.error}>{error}</p>}
        {exito && <p style={s.exito}>{exito}</p>}
      </div>

      {/* ---------- LISTADO ---------- */}
      <div style={s.sectionHead}>
        <h2 style={s.h2}>Preguntas cargadas ({lista.length})</h2>
        <select value={filtroRegion} onChange={(e) => setFiltroRegion(e.target.value)} style={s.filterSelect}>
          <option value="">Todas</option>
          {REGIONES.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
        </select>
      </div>

      <label style={{ ...s.checkRow, marginBottom: 10 }}>
        <input type="checkbox" checked={soloRevisar} onChange={(e) => setSoloRevisar(e.target.checked)} />
        <span>Mostrar solo las "por revisar" ({totalRevisar})</span>
      </label>

      <div style={s.list}>
        {lista.map((p) => {
          const abierta = expandida === p.id;
          const enEdicion = editando === p.id && edit;
          return (
            <div key={p.id} style={s.cardExpandible}>
              <button onClick={() => toggleExpandir(p)} style={s.cardHeaderBtn}>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={s.cardMeta}>
                    {etiquetaDeRegion(p.region)} · {p.complejidad}{p.media_tipo ? ` · ${p.media_tipo}` : ""}
                    {p.numero_origen ? ` · n.º ${p.numero_origen}` : ""}
                    {p.revisar && <span style={s.badgeRevisar}> · POR REVISAR</span>}
                  </p>
                  <p style={s.cardTitle}>{p.pregunta}</p>
                  {p.creado_por_nombre && <p style={s.autor}>Creada por {p.creado_por_nombre}</p>}
                </div>
                <span style={s.chevron}>{abierta ? "▲" : "▼"}</span>
              </button>

              {abierta && !enEdicion && (
                <div style={s.cardDetalle}>
                  {p.revisar && p.nota_revision && <p style={s.notaRevision}>{p.nota_revision}</p>}
                  {p.media_tipo && (
                    <div style={s.mediaWrap}>
                      {cargandoMedia === p.id && <p style={s.mediaNota}>Cargando {p.media_tipo}...</p>}
                      {mediaUrls[p.id] && p.media_tipo === "foto" && (
                        <img src={mediaUrls[p.id]} alt="" style={s.mediaPreview} />
                      )}
                      {mediaUrls[p.id] && p.media_tipo === "video" && (
                        <video src={mediaUrls[p.id]} controls style={s.mediaPreview} />
                      )}
                    </div>
                  )}
                  {p.opciones.map((op, i) => (
                    <p key={i} style={{ ...s.opcionDetalle, ...(i === p.correcta ? s.opcionCorrecta : {}) }}>
                      {LETRAS[i]}. {op}{i === p.correcta ? " ✓" : ""}
                    </p>
                  ))}
                  {p.explicacion && <p style={s.explicacionDetalle}>{p.explicacion}</p>}
                  <div style={s.btnRow}>
                    <button onClick={() => iniciarEdicion(p)} style={s.editBtn}>Editar pregunta</button>
                    <button onClick={() => handleBorrar(p.id)} style={s.deleteBtn}>Eliminar</button>
                  </div>
                </div>
              )}

              {abierta && enEdicion && (
                <div style={s.cardDetalle}>
                  <div style={s.formEdit}>
                    <label style={s.label}>Región</label>
                    <select value={edit.region} onChange={(e) => cambiarCampoEdit("region", e.target.value)} style={s.input}>
                      {REGIONES.map((r) => <option key={r.valor} value={r.valor}>{r.etiqueta}</option>)}
                      {!REGIONES.some((r) => r.valor === edit.region) && <option value={edit.region}>{edit.region}</option>}
                    </select>

                    <label style={s.label}>Complejidad</label>
                    <select value={edit.complejidad} onChange={(e) => cambiarCampoEdit("complejidad", e.target.value)} style={s.input}>
                      {COMPLEJIDADES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <label style={s.label}>Enunciado</label>
                    <textarea value={edit.pregunta} onChange={(e) => cambiarCampoEdit("pregunta", e.target.value)} rows={4} style={s.input} />

                    <label style={s.label}>Alternativas (toca la letra para marcar la correcta)</label>
                    {edit.opciones.map((op, i) => (
                      <div key={i} style={s.opcionRow}>
                        <button
                          onClick={() => cambiarCampoEdit("correcta", i)}
                          style={{ ...s.letraBtn, ...(edit.correcta === i ? s.letraBtnActiva : {}) }}
                        >
                          {LETRAS[i]}
                        </button>
                        <input value={op} onChange={(e) => cambiarOpcionEdit(i, e.target.value)} style={{ ...s.input, flex: 1, marginBottom: 0 }} />
                      </div>
                    ))}

                    <label style={s.label}>Explicación (opcional)</label>
                    <textarea value={edit.explicacion} onChange={(e) => cambiarCampoEdit("explicacion", e.target.value)} rows={2} style={s.input} />

                    <label style={s.label}>Foto o video</label>
                    {p.media_tipo && !editMedia.quitar && (
                      <>
                        {mediaUrls[p.id] && p.media_tipo === "foto" && <img src={mediaUrls[p.id]} alt="" style={s.mediaPreview} />}
                        {mediaUrls[p.id] && p.media_tipo === "video" && <video src={mediaUrls[p.id]} controls style={s.mediaPreview} />}
                        <label style={s.checkRow}>
                          <input
                            type="checkbox"
                            checked={editMedia.quitar}
                            onChange={(e) => setEditMedia({ quitar: e.target.checked, tipo: "", archivo: null })}
                          />
                          <span>Quitar la {p.media_tipo} actual</span>
                        </label>
                      </>
                    )}
                    {p.media_tipo && editMedia.quitar && (
                      <label style={s.checkRow}>
                        <input type="checkbox" checked onChange={() => setEditMedia({ quitar: false, tipo: "", archivo: null })} />
                        <span>Se quitará la {p.media_tipo} actual (desmarca para conservarla)</span>
                      </label>
                    )}
                    <select
                      value={editMedia.tipo}
                      onChange={(e) => setEditMedia((m) => ({ ...m, tipo: e.target.value, archivo: null, quitar: false }))}
                      style={s.input}
                    >
                      <option value="">{p.media_tipo ? "Mantener / no reemplazar" : "Sin foto/video"}</option>
                      <option value="foto">{p.media_tipo ? "Reemplazar por una foto" : "Agregar foto"}</option>
                      <option value="video">{p.media_tipo ? "Reemplazar por un video" : "Agregar video"}</option>
                    </select>
                    {editMedia.tipo && (
                      <input
                        type="file"
                        accept={editMedia.tipo === "foto" ? "image/*" : "video/*"}
                        onChange={(e) => setEditMedia((m) => ({ ...m, archivo: e.target.files[0] || null }))}
                        style={s.fileInput}
                      />
                    )}

                    <label style={s.checkRow}>
                      <input type="checkbox" checked={edit.revisar} onChange={(e) => cambiarCampoEdit("revisar", e.target.checked)} />
                      <span>Marcada "por revisar" (desmárcala cuando ya la revisaste)</span>
                    </label>
                    {edit.revisar && (
                      <textarea
                        value={edit.nota_revision}
                        onChange={(e) => cambiarCampoEdit("nota_revision", e.target.value)}
                        rows={2}
                        placeholder="Nota de revisión (opcional)"
                        style={s.input}
                      />
                    )}

                    {errorEdit && <p style={s.error}>{errorEdit}</p>}

                    <div style={s.btnRow}>
                      <button onClick={cancelarEdicion} style={s.secondaryBtn}>Cancelar</button>
                      <button onClick={() => guardarEdicion(p)} disabled={guardandoEdit} style={s.saveBtn}>
                        {guardandoEdit ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight: "100vh", background: "#0E1526", color: "#F4F1EA", padding: "20px 16px 40px", fontFamily: "sans-serif" },
  headerRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 18 },
  back: { background: "none", border: "none", color: "#94A3B8", fontSize: 14, cursor: "pointer" },
  title: { fontSize: 17, margin: 0 },
  panel: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, marginBottom: 16, overflow: "hidden" },
  panelHead: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", color: "#F4F1EA", fontSize: 14, fontWeight: 600, padding: "13px 16px", cursor: "pointer", textAlign: "left" },
  panelBody: { display: "flex", flexDirection: "column", padding: "0 16px 16px", borderTop: "1px solid rgba(244,241,233,0.1)" },
  ayuda: { color: "#94A3B8", fontSize: 12.5, lineHeight: 1.45, margin: "12px 0 4px" },
  checkRow: { display: "flex", alignItems: "center", gap: 8, color: "#F4F1EA", fontSize: 13, marginTop: 10, marginBottom: 4, cursor: "pointer" },
  copiaRow: { display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap", padding: "10px 0", borderTop: "1px solid rgba(244,241,233,0.08)" },
  copiaFolio: { margin: 0, fontSize: 14, fontWeight: 600, color: "#F4F1EA", wordBreak: "break-word" },
  copiaBtns: { display: "flex", gap: 6, flexWrap: "wrap" },
  smallBtn: { background: "transparent", border: "1px solid rgba(79,195,217,0.5)", borderRadius: 8, color: "#4FC3D9", padding: "6px 10px", fontSize: 12, cursor: "pointer" },
  smallBtnPeligro: { background: "transparent", border: "1px solid rgba(209,73,91,0.5)", borderRadius: 8, color: "#D1495B", padding: "6px 10px", fontSize: 12, cursor: "pointer" },
  rechazada: { color: "#E0A94A", fontSize: 11.5, margin: "2px 0 0" },
  advertencia: { color: "#E0A94A", fontSize: 12.5, background: "rgba(224,169,74,0.1)", border: "1px solid rgba(224,169,74,0.3)", borderRadius: 8, padding: "8px 10px", margin: "6px 0" },
  previaLista: { maxHeight: 420, overflowY: "auto", border: "1px solid rgba(244,241,233,0.1)", borderRadius: 8, marginTop: 8 },
  previaItem: { padding: "8px 10px", borderBottom: "1px solid rgba(244,241,233,0.08)" },
  previaEnunciado: { color: "#F4F1EA", fontSize: 13, margin: "2px 0 0" },
  previaCorrecta: { color: "#7FB685", fontSize: 12.5, margin: "3px 0 0" },
  form: { display: "flex", flexDirection: "column", background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 12, padding: 16, marginBottom: 24 },
  formEdit: { display: "flex", flexDirection: "column" },
  label: { fontSize: 11, color: "#94A3B8", marginTop: 10, marginBottom: 4 },
  input: { background: "#0E1526", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, padding: "9px 11px", color: "#F4F1EA", fontSize: 14, marginBottom: 4 },
  fileInput: { color: "#F4F1EA", fontSize: 12.5, marginBottom: 4 },
  iaBtn: { marginTop: 16, background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  opcionRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  letraBtn: { width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(244,241,233,0.2)", background: "transparent", color: "#94A3B8", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  letraBtnActiva: { background: "rgba(127,182,133,0.15)", borderColor: "#7FB685", color: "#7FB685" },
  btnRow: { display: "flex", gap: 8, marginTop: 16 },
  secondaryBtn: { flex: 1, background: "transparent", border: "1px solid rgba(244,241,233,0.2)", borderRadius: 8, color: "#94A3B8", padding: "11px 0", fontSize: 14, cursor: "pointer" },
  saveBtn: { flex: 2, background: "#4FC3D9", border: "none", borderRadius: 8, color: "#0E1526", padding: "11px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  editBtn: { flex: 2, background: "transparent", border: "1px solid rgba(79,195,217,0.6)", borderRadius: 8, color: "#4FC3D9", padding: "9px 0", fontSize: 13, cursor: "pointer" },
  deleteBtn: { flex: 1, background: "none", border: "1px solid rgba(209,73,91,0.4)", borderRadius: 8, color: "#D1495B", padding: "9px 0", fontSize: 13, cursor: "pointer" },
  error: { color: "#D1495B", fontSize: 13, marginTop: 12 },
  exito: { color: "#7FB685", fontSize: 13, marginTop: 12 },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  h2: { fontSize: 15, margin: 0 },
  filterSelect: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 8, color: "#F4F1EA", fontSize: 13, padding: "6px 8px" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  cardExpandible: { background: "#16213A", border: "1px solid rgba(244,241,233,0.12)", borderRadius: 10, overflow: "hidden" },
  cardHeaderBtn: { width: "100%", display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: "10px 12px", cursor: "pointer" },
  chevron: { color: "#94A3B8", fontSize: 10, flexShrink: 0 },
  cardDetalle: { borderTop: "1px solid rgba(244,241,233,0.1)", padding: "10px 12px 12px" },
  mediaWrap: { marginBottom: 10 },
  mediaNota: { color: "#4FC3D9", fontSize: 12, marginBottom: 8 },
  mediaPreview: { width: "100%", borderRadius: 8, background: "#000", marginBottom: 6 },
  opcionDetalle: { color: "#94A3B8", fontSize: 13, margin: "4px 0" },
  opcionCorrecta: { color: "#7FB685", fontWeight: 600 },
  explicacionDetalle: { color: "#94A3B8", fontSize: 12.5, fontStyle: "italic", marginTop: 8 },
  notaRevision: { color: "#E0A94A", fontSize: 12.5, background: "rgba(224,169,74,0.1)", border: "1px solid rgba(224,169,74,0.3)", borderRadius: 8, padding: "8px 10px", margin: "0 0 10px" },
  badgeRevisar: { color: "#E0A94A", fontWeight: 700 },
  cardMeta: { color: "#4FC3D9", fontSize: 10.5, margin: 0, textTransform: "uppercase", letterSpacing: "0.03em" },
  cardTitle: { color: "#F4F1EA", fontSize: 13.5, margin: "2px 0 0" },
  autor: { color: "#94A3B8", fontSize: 11, margin: "3px 0 0" },
};
