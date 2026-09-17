import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import ApplicationForm from "./pages/ApplicationForm";
import ApplicationHistory from "./pages/ApplicationHistory";
import Documents from "./pages/Documents";
import AdmitCard from "./pages/AdmitCard";
import MockExam from "./pages/MockExam";
import Result from "./pages/Result";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminApplicationDetail from "./pages/admin/AdminApplicationDetail";
import AdminExamSchedule from "./pages/admin/AdminExamSchedule";
import AdminQuestions from "./pages/admin/AdminQuestions";

function HomeRedirect() {
  const auth = useAuth();
  if (!auth.token) return <Navigate to="/login" replace />;
  return <Navigate to={auth.role === "admin" ? "/admin" : "/dashboard"} replace />;
}

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
            <Route path="/application" element={<ProtectedRoute role="student"><ApplicationForm /></ProtectedRoute>} />
            <Route path="/my-applications" element={<ProtectedRoute role="student"><ApplicationHistory /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute role="student"><Documents /></ProtectedRoute>} />
            <Route path="/admit-card" element={<ProtectedRoute role="student"><AdmitCard /></ProtectedRoute>} />
            <Route path="/exam" element={<ProtectedRoute role="student"><MockExam /></ProtectedRoute>} />
            <Route path="/mock-exam" element={<Navigate to="/exam" replace />} />
            <Route path="/result" element={<ProtectedRoute role="student"><Result /></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute role="admin"><AdminStudents /></ProtectedRoute>} />
            <Route path="/admin/applications" element={<ProtectedRoute role="admin"><AdminApplications /></ProtectedRoute>} />
            <Route path="/admin/applications/:id" element={<ProtectedRoute role="admin"><AdminApplicationDetail /></ProtectedRoute>} />
            <Route path="/admin/exam-schedule" element={<ProtectedRoute role="admin"><AdminExamSchedule /></ProtectedRoute>} />
            <Route path="/admin/exam-centres" element={<Navigate to="/admin/exam-schedule" replace />} />
            <Route path="/admin/questions" element={<ProtectedRoute role="admin"><AdminQuestions /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}

