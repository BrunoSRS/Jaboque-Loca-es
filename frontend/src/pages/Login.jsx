import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginVal, setLoginVal] = useState('admin');
  const [senha, setSenha] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginVal, senha);
      toast.success('Bem-vindo!');
      navigate('/');
    } catch {
      toast.error('Login ou senha inválidos');
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
        <p className="text-gray-500 text-sm text-center mb-6">Oficina, estoque e ordens de serviço</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Login" value={loginVal} onChange={(e) => setLoginVal(e.target.value)} required />
          <Input
            label="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <Button type="submit" variant="orange" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-6">Demo: admin / admin123</p>
      </div>
    </div>
  );
}
