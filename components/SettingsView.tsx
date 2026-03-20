import React, { useState, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { Icons } from './Icons';
import { AppState } from '../types';
import { CURRENCIES } from '../constants';
import { supabase } from '../lib/supabase';
import { validatePasswordMatch, validateMinLength } from '../utils/helpers';

const DICTIONARY = {
  profile: 'Identidad de Perfil',
  email: 'Correo Electrónico',
  businessExp: 'Expansión de Negocio',
  initializeBiz: 'Iniciar Nueva Entidad',
};

interface SettingsViewProps {
  state: AppState;
  session: Session | null;
  timezones: { value: string; label: string }[];
  onStateChange: (newState: AppState) => void;
  onUpdateAccountPercentage: (contextId: string, accountId: string, percentage: number) => void;
  onUpdateContextName: (contextId: string, newName: string) => void;
  onDeleteContext: (contextId: string) => void;
  onOpenNewBiz: () => void;
  onSignOut: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  session,
  timezones,
  onStateChange,
  onUpdateAccountPercentage,
  onUpdateContextName,
  onDeleteContext,
  onOpenNewBiz,
  onSignOut,
}) => {
  const t = DICTIONARY;
  const [currencySearch, setCurrencySearch] = useState('');
  const [tzSearch, setTzSearch] = useState('');
  const [contextToDelete, setContextToDelete] = useState<string | null>(null);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const filteredTimezones = useMemo(() =>
    timezones.filter(tz => tz.label.toLowerCase().includes(tzSearch.toLowerCase())),
    [timezones, tzSearch]
  );

  const handlePasswordChange = async () => {
    const matchErr = validatePasswordMatch(newPassword, confirmPassword);
    if (matchErr) {
      setPasswordError(matchErr.message);
      return;
    }
    const lenErr = validateMinLength(newPassword, 6, 'Contraseña');
    if (lenErr) {
      setPasswordError(lenErr.message);
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess('Contraseña actualizada correctamente');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al actualizar contraseña';
      setPasswordError(message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (contextToDelete) {
      onDeleteContext(contextToDelete);
      setContextToDelete(null);
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
        {/* Profile */}
        <div className="bg-white border border-black/5 p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-alloy" />
          <h2 className="text-2xl font-display font-bold text-onyx mb-6">{t.profile}</h2>

          <div className="space-y-6">
            <div className="flex flex-col items-start gap-4 mb-6">
              <div className="flex items-center gap-6">
                <div
                  className="w-20 h-20 bg-stone border-2 border-dashed border-black/20 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:border-alloy transition-colors"
                  onClick={() => document.getElementById('settings-avatar-upload')?.click()}
                >
                  {state.user.avatarUrl ? (
                    <img src={state.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Icons.Upload className="w-6 h-6 text-graphite" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-onyx mb-1">Foto de Perfil</p>
                  <p className="text-xs text-graphite mb-2">Haz clic para cambiar tu imagen</p>
                  <input
                    id="settings-avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          onStateChange({ ...state, user: { ...state.user, avatarUrl: reader.result as string } });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">Nombre</label>
              <input
                type="text"
                value={state.user.name}
                onChange={(e) => onStateChange({ ...state, user: { ...state.user, name: e.target.value } })}
                className="w-full p-3 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">{t.email}</label>
              <input type="email" value={session?.user?.email || state.user.email} readOnly className="w-full p-3 bg-stone border border-black/5 text-onyx font-sans opacity-70" />
            </div>
            <div className="pt-4 border-t border-black/5">
              <button
                onClick={onSignOut}
                className="bg-red-50 text-red-600 px-6 py-3 rounded-md font-bold uppercase tracking-widest text-xs hover:bg-red-100 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        {/* Profit First Configuration */}
        <div className="bg-white border border-black/5 p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-onyx" />
          <h2 className="text-2xl font-display font-bold text-onyx mb-2">Configuración de Distribución (Profit First)</h2>
          <p className="text-sm text-graphite mb-6">Ajusta los porcentajes de distribución automática para cada cuenta.</p>

          <div className="space-y-8">
            {state.contexts.map(context => (
              <div key={context.id} className="border-t border-black/5 pt-6 first:border-0 first:pt-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1 mr-4">
                    <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-1">
                      Nombre del Dashboard ({context.type === 'BUSINESS' ? 'Negocio' : 'Personal'})
                    </label>
                    <input
                      type="text"
                      value={context.name}
                      onChange={(e) => onUpdateContextName(context.id, e.target.value)}
                      className="w-full p-2 bg-stone border border-black/5 text-onyx font-display font-bold text-lg outline-none focus:border-alloy"
                    />
                  </div>
                  {context.type === 'BUSINESS' && (
                    <button
                      onClick={() => setContextToDelete(context.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors self-end mb-1"
                      title="Eliminar Negocio"
                    >
                      <Icons.Trash className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {context.accounts.filter(a => a.type !== 'INCOME').map(account => (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-stone border border-black/5">
                      <span className="font-bold text-sm text-onyx">{account.name}</span>
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={account.percentageTarget || 0}
                          onChange={(e) => onUpdateAccountPercentage(context.id, account.id, Number(e.target.value))}
                          className="w-16 p-2 text-right bg-white border border-black/10 font-mono font-bold text-onyx outline-none focus:border-alloy"
                        />
                        <span className="ml-2 text-graphite font-bold">%</span>
                      </div>
                    </div>
                  ))}
                  <div className="col-span-full flex justify-end mt-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-graphite mr-2">Total Asignado:</span>
                    <span className={`text-sm font-mono font-bold ${context.accounts.reduce((sum, a) => sum + (a.percentageTarget || 0), 0) === 100 ? 'text-green-600' : 'text-onyx'}`}>
                      {context.accounts.reduce((sum, a) => sum + (a.percentageTarget || 0), 0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* New Business */}
        <div className="bg-white border border-black/5 p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gold" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-display font-bold text-onyx">{t.businessExp}</h3>
              <p className="text-sm text-graphite mt-2 max-w-md">Inicializar una nueva estructura de negocio Profit First.</p>
            </div>
            <Icons.Building className="w-8 h-8 text-gold opacity-50" />
          </div>
          <button onClick={onOpenNewBiz} className="mt-4 px-6 py-3 border border-gold text-gold hover:bg-gold hover:text-white font-display font-bold text-xs uppercase tracking-widest transition-all">
            {t.initializeBiz}
          </button>
        </div>

        {/* Localization */}
        <div className="bg-white border border-black/5 p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-graphite" />
          <h2 className="text-2xl font-display font-bold text-onyx mb-6">Localización</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">Divisa Principal</label>
              <div className="relative">
                <div className="relative mb-2">
                  <Icons.Menu className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite" />
                  <input
                    type="text"
                    value={currencySearch}
                    onChange={(e) => setCurrencySearch(e.target.value)}
                    placeholder="Buscar moneda..."
                    className="w-full p-3 pl-9 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy text-sm"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-black/5 bg-white">
                  {CURRENCIES.filter(c =>
                    c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
                    c.name.toLowerCase().includes(currencySearch.toLowerCase())
                  ).map(c => (
                    <button
                      key={c.code}
                      onClick={() => onStateChange({ ...state, user: { ...state.user, currency: c.code } })}
                      className={`w-full flex items-center justify-between p-3 border-b border-black/5 last:border-0 hover:bg-stone transition-colors ${state.user.currency === c.code ? 'bg-stone border-l-4 border-l-alloy' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-onyx text-sm">{c.code}</span>
                        <span className="text-graphite text-xs text-left truncate max-w-[120px]">{c.name}</span>
                      </div>
                      <span className="font-bold text-alloy text-sm">{c.symbol}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-graphite mt-2 italic">Seleccionada: {state.user.currency}</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">Zona Horaria</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar ciudad o país..."
                  value={tzSearch}
                  onChange={(e) => setTzSearch(e.target.value)}
                  className="w-full p-3 bg-stone border border-black/5 border-b-0 text-onyx font-sans outline-none focus:border-alloy placeholder:text-gray-400 text-sm"
                />
                <select
                  value={state.user.timezone}
                  onChange={(e) => onStateChange({ ...state, user: { ...state.user, timezone: e.target.value } })}
                  className="w-full p-3 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
                  size={5}
                >
                  <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>Automático (Sistema)</option>
                  {filteredTimezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-graphite mt-1 italic">Seleccionada: {state.user.timezone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white border border-black/5 p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
          <h2 className="text-2xl font-display font-bold text-onyx mb-6">Seguridad</h2>
          <div className="max-w-md">
            <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">Cambiar Contraseña</label>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
              />
              <input
                type="password"
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
              />
              {passwordError && <p className="text-red-500 text-xs font-bold">{passwordError}</p>}
              {passwordSuccess && <p className="text-green-600 text-xs font-bold">{passwordSuccess}</p>}
              <button
                onClick={handlePasswordChange}
                disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                className="px-6 py-3 bg-onyx text-white font-display font-bold text-xs uppercase tracking-widest hover:bg-alloy transition-colors disabled:opacity-50"
              >
                {isUpdatingPassword ? 'Actualizando...' : 'Guardar Contraseña'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Context Confirmation Modal */}
      {contextToDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 shadow-xl border border-black/10">
            <h3 className="text-xl font-display font-bold text-onyx mb-2">¿Eliminar Negocio?</h3>
            <p className="text-graphite mb-6 text-sm">
              ¿Estás seguro de que quieres eliminar este tracker de negocio? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setContextToDelete(null)}
                className="flex-1 py-3 bg-stone text-onyx font-bold uppercase tracking-widest text-xs hover:bg-black/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 bg-red-500 text-white font-bold uppercase tracking-widest text-xs hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
