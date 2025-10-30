import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from '@/shared/lib/constants/routes'
import { useAuthStore } from '@/app/stores/authStore'

const Dashboard = React.lazy(() => import('@/pages/Dashboard'))
const Auth = React.lazy(() => import('@/pages/Auth'))
const Chat = React.lazy(() => import('@/pages/Chat'))

// Admin Components
const AdminLayout = React.lazy(() => import('@/features/admin/components/AdminLayout'))
const AdminDashboard = React.lazy(() => import('@/pages/AdminDashboard'))
const UserManagement = React.lazy(() => import('@/features/admin/components/UserManagement'))
const SystemSettings = React.lazy(() => import('@/features/admin/components/SystemSettings'))
const AnnouncementsManagement = React.lazy(() => import('@/features/admin/components/AnnouncementsManagement'))
const ReportsManagement = React.lazy(() => import('@/features/admin/components/ReportsManagement'))
const AuditLogs = React.lazy(() => import('@/features/admin/components/AuditLogs'))

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.AUTH} />
}

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.AUTH} />
  }

  if (!isAdmin) {
    return <Navigate to={ROUTES.DASHBOARD} />
  }

  return <>{children}</>
}

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  return !isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.DASHBOARD} />
}

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route
        path={ROUTES.AUTH}
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path={ROUTES.CHAT}
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="settings" element={<SystemSettings />} />
        <Route path="announcements" element={<AnnouncementsManagement />} />
        <Route path="reports" element={<ReportsManagement />} />
        <Route path="audit-logs" element={<AuditLogs />} />
      </Route>
      <Route path={ROUTES.ADMIN_DASHBOARD} element={<Navigate to="/admin/dashboard" replace />} />
      <Route path={ROUTES.ADMIN} element={<Navigate to="/admin/dashboard" replace />} />
      <Route path={ROUTES.HOME} element={<Navigate to={ROUTES.DASHBOARD} />} />
    </Routes>
  )
}