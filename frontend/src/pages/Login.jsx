import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Button, Select } from '../components/ui';

const PERFIS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'atendente', label: 'Atendente' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState('admin');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(perfil);
      toast.success('Bem-vindo!');
      navigate('/');
    } catch {
      toast.error('Perfil indisponível no momento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-jaboque-gradient p-6">
      <div className="w-full max-w-md flex flex-col items-center mb-8">
        <img
          src="/logo-jaboque.png"
          alt="Jaboque Locações — Soluções pra você e sua empresa"
          className="w-full max-w-sm object-contain"
        />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-brand border-t-4 border-jaboque-orange p-8">
        <h1 className="text-lg font-semibold text-jaboque-navy text-center mb-1">Acesso ao sistema</h1>
        <p className="text-gray-500 text-sm text-center mb-6">Selecione o tipo de usuário para entrar</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Tipo de usuário" value={perfil} onChange={(e) => setPerfil(e.target.value)} required>
            {PERFIS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="orange" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
