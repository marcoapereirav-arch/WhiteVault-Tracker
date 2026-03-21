import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from './Icons';

interface AuthProps {
  onLogin: () => void;
  onDemoOnboarding?: () => void;
}

export const Auth = ({ onLogin }: AuthProps) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isMissingKeys = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMissingKeys) {
      setError('Faltan las variables de entorno de Supabase. Por favor, configúralas.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      onLogin();
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('invalid login')) {
        setError('Correo o contraseña incorrectos');
      } else if (msg.includes('email not confirmed')) {
        setError('Debes confirmar tu correo electrónico antes de iniciar sesión');
      } else if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('request this after')) {
        setError('Demasiados intentos. Espera unos segundos e inténtalo de nuevo.');
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setError('Error de conexión. Verifica tu conexión a internet.');
      } else {
        setError(err.message || 'Ha ocurrido un error. Por favor, inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://app.whitevault.cc',
      });
      if (error) throw error;
      setSuccessMessage('Se ha enviado un correo con las instrucciones para recuperar tu contraseña.');
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('request this after')) {
        setError('Demasiados intentos. Espera unos segundos e inténtalo de nuevo.');
      } else {
        setError(err.message || 'Ha ocurrido un error. Por favor, inténtalo de nuevo.');
      }
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
          {isForgotPassword ? 'Recuperar Contraseña' : 'Iniciar Sesión'}
        </h2>

        {isMissingKeys && (
          <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md mb-4 text-sm border border-yellow-200">
            <strong>Atención:</strong> Faltan las variables de entorno de Supabase.
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

        {isForgotPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full p-3 border border-black/10 rounded-md focus:outline-none focus:border-alloy transition-colors"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-onyx text-white p-3 rounded-md font-bold hover:bg-onyx/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(null); setSuccessMessage(null); }}
                className="text-sm text-graphite hover:text-onyx transition-colors"
              >
                Volver a Iniciar Sesión
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
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
                {loading ? 'Procesando...' : 'Entrar'}
              </button>
            </form>
            <div className="mt-6 text-center">
              <button
                onClick={() => { setIsForgotPassword(true); setError(null); setSuccessMessage(null); }}
                className="text-sm text-graphite hover:text-onyx transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
