import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from './Icons';
import { haptic } from './Mobile';

interface AuthProps {
  onLogin: () => void;
  onDemoOnboarding?: () => void;
}

const WHITEVAULT_ISOTYPE = "https://storage.googleapis.com/msgsndr/QDrKqO1suwk5VOPoTKJE/media/693880a4fb91d00b324304d7.png";

export const Auth = ({ onLogin }: AuthProps) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      haptic('heavy');
      onLogin();
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('invalid login')) setError('Correo o contraseña incorrectos');
      else if (msg.includes('email not confirmed')) setError('Debes confirmar tu correo antes de iniciar sesión');
      else if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('request this after')) setError('Demasiados intentos. Espera unos segundos.');
      else if (msg.includes('network') || msg.includes('fetch')) setError('Error de conexión. Verifica tu internet.');
      else setError(err.message || 'Ha ocurrido un error. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Ingresa tu correo electrónico.'); return; }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://app.whitevault.cc' });
      if (error) throw error;
      setSuccessMessage('Te enviamos un correo con instrucciones para recuperar tu contraseña.');
    } catch (err: any) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('rate limit') || msg.includes('request this after')) setError('Demasiados intentos. Espera unos segundos.');
      else setError(err.message || 'Ha ocurrido un error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] marble-dark flex items-end sm:items-center justify-center pt-safe pb-safe px-0 sm:px-4">
      <div className="w-full sm:max-w-[440px] mx-auto bg-stone sm:rounded-3xl rounded-t-[32px] p-7 sm:shadow-[0_24px_48px_rgba(0,0,0,0.4)] wv-pop-in">
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center mb-3 sm:hidden">
          <div className="w-10 h-1 bg-graphite/20 rounded-full" />
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-7 mt-2">
          <img src={WHITEVAULT_ISOTYPE} alt="WhiteVault" className="w-14 h-14 object-contain mb-3" />
          <div className="metallic-line w-16 mb-3" />
          <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-gold">WhiteVault™</div>
        </div>

        <h1 className="text-2xl font-display font-bold text-onyx tracking-tight text-center mb-1">
          {isForgotPassword ? 'Recuperar Acceso' : 'Iniciar Sesión'}
        </h1>
        <p className="text-xs text-graphite text-center mb-6">
          {isForgotPassword ? 'Te enviaremos un enlace seguro' : 'Bienvenido de vuelta a tu bóveda'}
        </p>

        {isMissingKeys && (
          <div className="bg-gold/10 border border-gold/30 text-onyx p-3 rounded-xl mb-4 text-xs">
            <strong>Atención:</strong> Faltan las variables de entorno de Supabase.
          </div>
        )}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl mb-4 text-xs">{error}</div>
        )}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl mb-4 text-xs">{successMessage}</div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-graphite uppercase tracking-widest mb-2">Correo electrónico</label>
              <div className="relative">
                <Icons.Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full h-13 pl-11 pr-4 py-3 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-onyx transition-colors text-onyx"
                  required
                  autoFocus
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-13 py-3.5 bg-onyx text-white font-display font-bold uppercase tracking-widest text-xs rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(null); setSuccessMessage(null); }}
                className="text-xs text-graphite hover:text-onyx transition-colors"
              >
                ← Volver a iniciar sesión
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-graphite uppercase tracking-widest mb-2">Correo electrónico</label>
                <div className="relative">
                  <Icons.Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite" />
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-13 pl-11 pr-4 py-3 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-onyx transition-colors text-onyx"
                    placeholder="tu@correo.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-graphite uppercase tracking-widest mb-2">Contraseña</label>
                <div className="relative">
                  <Icons.Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-13 pl-11 pr-12 py-3 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-onyx transition-colors text-onyx"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-graphite hover:text-onyx"
                    aria-label="Mostrar/ocultar contraseña"
                  >
                    {showPassword ? <Icons.EyeOff className="w-4 h-4" /> : <Icons.Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full h-13 py-3.5 bg-onyx text-white font-display font-bold uppercase tracking-widest text-xs rounded-xl active:scale-[0.98] transition-transform disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Icons.Loader className="w-4 h-4 animate-spin" /> Procesando…</>
                ) : (
                  <>Entrar <Icons.ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
            <div className="mt-5 text-center">
              <button
                onClick={() => { setIsForgotPassword(true); setError(null); setSuccessMessage(null); }}
                className="text-xs text-graphite hover:text-onyx transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="metallic-line w-full mt-7 opacity-50" />
            <p className="text-[10px] text-graphite/60 text-center mt-4 uppercase tracking-widest">
              Disciplined Premium · Tu bóveda financiera
            </p>
          </>
        )}
      </div>
    </div>
  );
};
