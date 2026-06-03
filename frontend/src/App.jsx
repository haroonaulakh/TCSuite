import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/students/Students'
import StudentDetail from './pages/students/StudentDetail'
import StudentForm from './pages/students/StudentForm'
import FeeStructures from './pages/fees/FeeStructures'
import FeeRecords from './pages/fees/FeeRecords'
import FeeDashboard from './pages/fees/FeeDashboard'
import Classes from './pages/fees/Classes'
import AcademicYears from './pages/fees/AcademicYears'
import BalanceSheet from './pages/fees/BalanceSheet'
import InvoiceStudent from './pages/fees/InvoiceStudent'
import InvoiceClass from './pages/fees/InvoiceClass'

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Printable invoice pages — standalone (no sidebar) */}
        <Route
          path="/fees/invoice/:id"
          element={<ProtectedRoute><InvoiceStudent /></ProtectedRoute>}
        />
        <Route
          path="/fees/invoice/class"
          element={<ProtectedRoute><InvoiceClass /></ProtectedRoute>}
        />

        {/* Main app shell */}
        <Route
          path="/"
          element={<ProtectedRoute><Layout /></ProtectedRoute>}
        >
          <Route index element={<Dashboard />} />

          {/* Students */}
          <Route path="students" element={<Students />} />
          <Route path="students/new" element={<StudentForm />} />
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="students/:id/edit" element={<StudentForm />} />

          {/* Fees */}
          <Route path="fees" element={<FeeDashboard />} />
          <Route path="fees/structures" element={<FeeStructures />} />
          <Route path="fees/records" element={<FeeRecords />} />
          <Route path="balance-sheet" element={<BalanceSheet />} />
          <Route path="classes" element={<Classes />} />
          <Route path="academic-years" element={<AcademicYears />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
    </ThemeProvider>
  )
}
