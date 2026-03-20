import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { validatePasswordMatch, validateMinLength } from '../utils/helpers';

interface PasswordModalProps {
  onClose: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleSubmit = async () => {
    const matchErr = validatePasswordMatch(newPassword, confirmPassword);
    if (matchErr) { setPasswordError(matchErr.message); return; }
    const lenErr = validateMinLength(newPassword, 6, 'Contraseña');
    if (lenErr) { setPasswordError(lenErr.message); return; }

    setIsUpdatingPassword(true);
    setPasswordError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { setPasswordError(error.message); }
      else { onClose(); }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setPasswordError(message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-8 shadow-2xl border border-black/10 animate-in zoom-in-95 duration-200">
        <h3 className="text-2xl font-display font-bold text-onyx mb-2 text-center">Crea tu contraseña de acceso</h3>
        <p className="text-graphite mb-6 text-sm text-center">
          Para asegurar tu cuenta, por favor establece una contraseña.
        </p>
        <div className="space-y-4">
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-4 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-4 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
          />
          {passwordError && <p className="text-red-500 text-xs font-bold text-center">{passwordError}</p>}
          <button
            onClick={handleSubmit}
            disabled={isUpdatingPassword || !newPassword || !confirmPassword}
            className="w-full py-4 bg-onyx text-white font-display font-bold text-sm uppercase tracking-widest hover:bg-alloy transition-colors disabled:opacity-50"
          >
            {isUpdatingPassword ? 'Guardando...' : 'Guardar Contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
};
