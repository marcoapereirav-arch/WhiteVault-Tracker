import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from './Icons';

export const Auth = ({ onLogin }: { onLogin: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Registro exitoso. Por favor, revisa tu correo para verificar la cuenta o inicia sesión si la verificación automática está habilitada.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLogin();
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md border border-black/5">
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 bg-onyx text-white rounded-lg flex items-center justify-center">
            <Icons.Wallet className="w-6 h-6" />
          </div>
        </div>
        <h2 className="text-2xl font-display font-bold text-center mb-6 text-onyx">
          {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
        </h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-black/10 rounded-md focus:outline-none focus:border-alloy transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-black/10 rounded-md focus:outline-none focus:border-alloy transition-colors"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-onyx text-white p-3 rounded-md font-bold hover:bg-onyx/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Procesando...' : isRegister ? 'Registrarse' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm text-graphite hover:text-onyx transition-colors"
          >
            {isRegister
              ? '¿Ya tienes cuenta? Inicia sesión'
              : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>
      </div>
    </div>
  );
};
