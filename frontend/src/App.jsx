import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Equipamentos from './pages/Equipamentos';
import Servicos from './pages/Servicos';
import Pecas from './pages/Pecas';
import Estoque from './pages/Estoque';
import Financeiro from './pages/Financeiro';
import Usuarios from './pages/Usuarios';
import OrdensList from './pages/OrdensList';
import OrdemWizard from './pages/OrdemWizard';
import Placeholder from './pages/Placeholder';
import Produtividade from './pages/Produtividade';
import Configuracoes from './pages/Configuracoes';
import { Loading } from './components/ui';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading full />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="oficina/equipamentos" element={<Equipamentos />} />
        <Route path="oficina/minhas-maquinas" element={<Navigate to="/oficina/equipamentos" replace />} />
        <Route path="oficina/ordens" element={<OrdensList />} />
        <Route path="oficina/ordens/nova" element={<OrdemWizard />} />
        <Route path="oficina/ordens/:id/editar" element={<OrdemWizard />} />
        <Route path="oficina/servicos" element={<Servicos />} />
        <Route path="oficina/pecas" element={<Pecas />} />
        <Route path="estoque" element={<Estoque />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="locadora" element={<Placeholder title="Locadora" subtitle="Gestão de aluguéis" />} />
        <Route path="produtividade" element={<Produtividade />} />
        <Route path="relatorios" element={<Placeholder title="Relatórios" subtitle="Exportações e análises" />} />
        <Route path="configuracoes" element={<Configuracoes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}
