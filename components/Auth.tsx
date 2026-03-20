import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from './Icons';

export const Auth = ({ onLogin, onDemoOnboarding }: { onLogin: () => void; onDemoOnboarding?: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isMissingKeys = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMissingKeys) {
      setError('Faltan las variables de entorno de Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY). Por favor, configúralas en Google AI Studio.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMessage('Registro exitoso. Por favor, revisa tu correo para verificar la cuenta o inicia sesión si la verificación automática está habilitada.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLogin();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico para recuperar la contraseña.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setSuccessMessage('Se ha enviado un correo con las instrucciones para recuperar tu contraseña.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error al intentar recuperar la contraseña';
      setError(message);
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
        
        {isMissingKeys && (
          <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md mb-4 text-sm border border-yellow-200">
            <strong>Atención:</strong> Faltan las variables de entorno de Supabase. 
            Por favor, añade <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en la configuración.
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4 text-sm">
            {successMessage}
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
            {!isRegister && (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="text-xs text-graphite hover:text-onyx transition-colors disabled:opacity-50"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
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
