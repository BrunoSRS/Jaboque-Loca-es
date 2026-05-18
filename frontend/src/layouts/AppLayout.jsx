import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Wrench,
  Truck,
  Package,
  DollarSign,
  BarChart3,
  FileText,
  Settings,
  Bell,
  ChevronDown,
  Menu,
  X,
  Phone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  {
    label: 'Oficina',
    icon: Wrench,
    children: [
      { to: '/oficina/ordens', label: 'Ordens de Serviço' },
      { to: '/oficina/equipamentos', label: 'Equipamentos' },
      { to: '/oficina/servicos', label: 'Serviços' },
      { to: '/oficina/pecas', label: 'Peças' },
    ],
  },
  { to: '/locadora', icon: Truck, label: 'Locadora' },
  { to: '/estoque', icon: Package, label: 'Estoque' },
  { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/produtividade', icon: BarChart3, label: 'Produtividade' },
  { to: '/relatorios', icon: FileText, label: 'Relatórios' },
  { to: '/usuarios', icon: Users, label: 'Usuários', adminOnly: true },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
];

function NavItem({ item, onNavigate }) {
  const [open, setOpen] = useState(item.label === 'Oficina');

  if (item.children) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition"
        >
          <item.icon size={20} />
          <span className="flex-1 text-left text-sm">{item.label}</span>
          <ChevronDown size={16} className={cn('transition', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-1 border-l border-white/20 pl-3">
            {item.children.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-2 text-sm rounded-lg transition',
                    isActive ? 'bg-jaboque-orange text-white' : 'text-gray-400 hover:text-white'
                  )
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (item.disabled) return null;

  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition',
          isActive ? 'bg-jaboque-orange text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'
        )
      }
    >
      <item.icon size={20} />
      {item.label}
    </NavLink>
  );
}

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-jaboque-gradient flex flex-col transition-transform lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="shrink-0 px-2 pt-2 pb-0 flex items-start justify-end gap-1">
          <Link to="/" className="flex-1 block min-w-0" onClick={() => setSidebarOpen(false)}>
            <img
              src="/logo-jaboque.png"
              alt="Jaboque Locações"
              className="w-full h-auto object-contain object-top"
            />
          </Link>
          <button
            type="button"
            className="lg:hidden text-white/90 hover:text-white shrink-0 p-1 -mt-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 px-3 pb-3 pt-1 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <NavItem key={item.label} item={item} onNavigate={() => setSidebarOpen(false)} />
          ))}
        </nav>

        <div className="p-4 mx-3 mb-3 rounded-lg bg-black/15 border border-white/10 backdrop-blur-[2px]">
          <p className="text-jaboque-orange text-xs font-semibold">Suporte Técnico</p>
          <p className="text-white text-sm mt-1 flex items-center gap-1">
            <Phone size={14} /> (61) 99339-9171
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-b-jaboque-orange/30 border-b-2 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <button type="button" className="lg:hidden p-2" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <button type="button" className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-jaboque-orange rounded-full" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-jaboque-navy text-white flex items-center justify-center text-sm font-bold">
                {user?.nome?.charAt(0) || 'A'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm text-gray-500">Olá,</p>
                <p className="text-sm font-semibold text-jaboque-navy">{user?.nome || 'Usuário'}</p>
              </div>
              <button type="button" onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-600 ml-2">
                Sair
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
