import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPreguntas from "./pages/admin/AdminPreguntas";
import AdminMateriales from "./pages/admin/AdminMateriales";
import AdminMaterialesAnalisis from "./pages/admin/AdminMaterialesAnalisis";
import AdminSesion from "./pages/admin/AdminSesion";
import AdminInterrogadores from "./pages/admin/AdminInterrogadores";
import AdminResultados from "./pages/admin/AdminResultados";
import AdminAnalisis from "./pages/admin/AdminAnalisis";
import AdminExamen from "./pages/admin/AdminExamen";
import GenerarDocumento from "./pages/documentos/GenerarDocumento";

import AdminCasosVivoHub from "./pages/admin/AdminCasosVivoHub";
import AdminCasosVivo from "./pages/admin/AdminCasosVivo";
import AdminCasoNuevo from "./pages/admin/AdminCasoNuevo";
import AdminPresentaciones from "./pages/admin/AdminPresentaciones";
import AdminPresentacionDetalle from "./pages/admin/AdminPresentacionDetalle";
import AdminIniciarPresentacion from "./pages/admin/AdminIniciarPresentacion";
import AdminVivo from "./pages/admin/AdminVivo";

import AlumnoIngreso from "./pages/alumno/AlumnoIngreso";
import AlumnoEspera from "./pages/alumno/AlumnoEspera";
import AlumnoExamen from "./pages/alumno/AlumnoExamen";
import AlumnoResultado from "./pages/alumno/AlumnoResultado";
import AlumnoMaterialesIngreso from "./pages/alumno/AlumnoMaterialesIngreso";
import AlumnoMateriales from "./pages/alumno/AlumnoMateriales";

import AlumnoVivoIngreso from "./pages/alumno/AlumnoVivoIngreso";
import AlumnoVivoVotar from "./pages/alumno/AlumnoVivoVotar";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* ---------- Interrogadores / admin ---------- */}
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/preguntas" element={<AdminPreguntas />} />
        <Route path="/admin/materiales" element={<AdminMateriales />} />
        <Route path="/admin/materiales/analisis" element={<AdminMaterialesAnalisis />} />
        <Route path="/admin/sesion/:sesionId" element={<AdminSesion />} />
        <Route path="/admin/interrogadores" element={<AdminInterrogadores />} />
        <Route path="/admin/sesion/:sesionId/resultados" element={<AdminResultados />} />
        <Route path="/admin/sesion/:sesionId/analisis" element={<AdminAnalisis />} />
        <Route path="/admin/examen" element={<AdminExamen />} />
        <Route path="/admin/documentos" element={<GenerarDocumento />} />

        {/* ---------- Presentación dinámica en vivo (casos clínicos) — profesor ---------- */}
        <Route path="/admin/casos-vivo" element={<AdminCasosVivoHub />} />
        <Route path="/admin/casos-vivo/lista" element={<AdminCasosVivo />} />
        <Route path="/admin/casos-vivo/nuevo" element={<AdminCasoNuevo />} />
        <Route path="/admin/casos-vivo/:casoId" element={<AdminCasoNuevo />} />
        <Route path="/admin/presentaciones" element={<AdminPresentaciones />} />
        <Route path="/admin/presentaciones/iniciar" element={<AdminIniciarPresentacion />} />
        <Route path="/admin/presentaciones/:presentacionId" element={<AdminPresentacionDetalle />} />
        <Route path="/admin/vivo/:sesionId" element={<AdminVivo />} />

        {/* ---------- Alumno (sin login, entra por el link de la sesión) ---------- */}
        <Route path="/alumno/:sesionId" element={<AlumnoIngreso />} />
        <Route path="/alumno/:sesionId/espera" element={<AlumnoEspera />} />
        <Route path="/alumno/:sesionId/examen" element={<AlumnoExamen />} />
        <Route path="/alumno/:sesionId/resultado" element={<AlumnoResultado />} />

        {/* ---------- Alumno — presentación dinámica en vivo (casos clínicos) ---------- */}
        <Route path="/alumno-vivo/:codigo" element={<AlumnoVivoIngreso />} />
        <Route path="/alumno-vivo/:codigo/votar" element={<AlumnoVivoVotar />} />

        {/* ---------- Materiales (QR fijo, sin sesión asociada) ---------- */}
        <Route path="/materiales" element={<AlumnoMaterialesIngreso />} />
        <Route path="/materiales/ver" element={<AlumnoMateriales />} />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
