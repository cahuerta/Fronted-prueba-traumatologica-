import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPreguntas from "./pages/admin/AdminPreguntas";
import AdminMateriales from "./pages/admin/AdminMateriales";
import AdminSesion from "./pages/admin/AdminSesion";
import AdminInterrogadores from "./pages/admin/AdminInterrogadores";
import AdminResultados from "./pages/admin/AdminResultados";
import AdminAnalisis from "./pages/admin/AdminAnalisis";

import AlumnoIngreso from "./pages/alumno/AlumnoIngreso";
import AlumnoEspera from "./pages/alumno/AlumnoEspera";
import AlumnoExamen from "./pages/alumno/AlumnoExamen";
import AlumnoResultado from "./pages/alumno/AlumnoResultado";

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
        <Route path="/admin/sesion/:sesionId" element={<AdminSesion />} />
        <Route path="/admin/interrogadores" element={<AdminInterrogadores />} />
        <Route path="/admin/sesion/:sesionId/resultados" element={<AdminResultados />} />
        <Route path="/admin/sesion/:sesionId/analisis" element={<AdminAnalisis />} />

        {/* ---------- Alumno (sin login, entra por el link de la sesión) ---------- */}
        <Route path="/alumno/:sesionId" element={<AlumnoIngreso />} />
        <Route path="/alumno/:sesionId/espera" element={<AlumnoEspera />} />
        <Route path="/alumno/:sesionId/examen" element={<AlumnoExamen />} />
        <Route path="/alumno/:sesionId/resultado" element={<AlumnoResultado />} />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
