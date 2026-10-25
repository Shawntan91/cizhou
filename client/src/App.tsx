import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { Shell } from './components/layout/Shell'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { LearnPage } from './pages/LearnPage'
import { PdfUploadPage } from './pages/PdfUploadPage'
import { PdfAnalysisPage } from './pages/PdfAnalysisPage'
import { BooksPage } from './pages/BooksPage'
import { StatisticsPage } from './pages/StatisticsPage'
import { ProfilePage } from './pages/ProfilePage'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) return null

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<Protected><Shell /></Protected>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/pdf" element={<PdfUploadPage />} />
        <Route path="/pdf-analysis" element={<PdfAnalysisPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
