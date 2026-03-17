import React, { useState, useRef } from 'react';
import { Icons } from './Icons';
import { AppState, FinancialContext } from '../types';

interface OnboardingProps {
    onComplete: (name: string, avatarUrl: string | undefined, personalContext: FinancialContext, addBusiness: boolean) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    
    // Step 1 State
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Step 2 State
    const [pockets, setPockets] = useState([
        { id: 'p_income', name: 'Ingresos', type: 'INCOME' as const, percentageTarget: 0 },
        { id: 'p_needs', name: 'Necesidades Básicas', type: 'EXPENSE' as const, percentageTarget: 50 },
        { id: 'p_freedom', name: 'Libertad Financiera', type: 'HOLDING' as const, percentageTarget: 10 },
        { id: 'p_lt_save', name: 'Ahorro Largo Plazo', type: 'HOLDING' as const, percentageTarget: 10 },
        { id: 'p_play', name: 'Ocio y Lujos', type: 'EXPENSE' as const, percentageTarget: 10 },
        { id: 'p_give', name: 'Donaciones', type: 'EXPENSE' as const, percentageTarget: 5 },
        { id: 'p_edu', name: 'Educación', type: 'EXPENSE' as const, percentageTarget: 5 },
        { id: 'p_cash', name: 'Efectivo / Cash', type: 'HOLDING' as const, percentageTarget: 10 },
    ]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const updatePocket = (index: number, field: string, value: string | number) => {
        const newPockets = [...pockets];
        newPockets[index] = { ...newPockets[index], [field]: value };
        setPockets(newPockets);
    };

    const totalPercentage = pockets.reduce((sum, p) => sum + (p.percentageTarget || 0), 0);

    const handleComplete = (addBusiness: boolean) => {
        const personalContext: FinancialContext = {
            id: 'ctx_personal_' + Date.now(),
            name: 'Finanzas Personales',
            type: 'PERSONAL',
            accounts: pockets.map(p => ({
                id: p.id,
                name: p.name,
                type: p.type,
                balance: 0,
                percentageTarget: p.percentageTarget > 0 ? p.percentageTarget : undefined,
                subAccounts: []
            }))
        };
        onComplete(name || 'Usuario', avatarUrl, personalContext, addBusiness);
    };

    return (
        <div className="fixed inset-0 z-50 bg-stone flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white border border-black/5 shadow-2xl p-8 md:p-12">
                <div className="flex items-center justify-center mb-8">
                    <h1 className="text-3xl font-display font-bold text-onyx">WhiteVault<span className="text-sm text-alloy">™</span></h1>
                </div>

                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-display font-bold text-onyx mb-2 text-center">Bienvenido a tu Bóveda</h2>
                        <p className="text-graphite text-center mb-8">Comencemos configurando tu perfil básico.</p>
                        
                        <div className="space-y-6">
                            <div className="flex flex-col items-center gap-4">
                                <div 
                                    className="w-24 h-24 bg-stone border-2 border-dashed border-black/20 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:border-alloy transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <Icons.Upload className="w-8 h-8 text-graphite" />
                                    )}
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleImageUpload} 
                                    accept="image/*" 
                                    className="hidden" 
                                />
                                <span className="text-xs text-graphite uppercase tracking-widest">Sube tu logo o foto</span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-graphite mb-2">¿Cómo te llamas?</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Tu nombre"
                                    className="w-full p-4 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
                                    autoFocus
                                />
                            </div>

                            <button 
                                onClick={() => setStep(2)}
                                disabled={!name.trim()}
                                className="w-full py-4 bg-onyx text-white font-display font-bold tracking-wide hover:bg-alloy transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-display font-bold text-onyx mb-2 text-center">Configura tu Tracker Personal</h2>
                        <p className="text-graphite text-center mb-6">Define tus cuentas (pockets) y sus porcentajes objetivo.</p>
                        
                        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 mb-6">
                            {pockets.map((pocket, index) => (
                                <div key={pocket.id} className="flex items-center gap-4 bg-stone p-3 border border-black/5">
                                    <div className="flex-1">
                                        <input 
                                            type="text" 
                                            value={pocket.name}
                                            onChange={(e) => updatePocket(index, 'name', e.target.value)}
                                            className="w-full bg-transparent text-sm font-bold text-onyx outline-none"
                                        />
                                    </div>
                                    {pocket.type !== 'INCOME' && (
                                        <div className="w-24 flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                value={pocket.percentageTarget}
                                                onChange={(e) => updatePocket(index, 'percentageTarget', Number(e.target.value))}
                                                className="w-full bg-white border border-black/5 p-2 text-sm text-right outline-none focus:border-alloy"
                                            />
                                            <span className="text-graphite font-bold">%</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center mb-6 p-4 bg-stone border border-black/5">
                            <span className="text-sm font-bold text-onyx">Total Asignado:</span>
                            <span className={`text-lg font-mono font-bold ${totalPercentage === 100 ? 'text-green-600' : 'text-red-500'}`}>
                                {totalPercentage}%
                            </span>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setStep(1)}
                                className="px-6 py-4 bg-stone text-onyx font-display font-bold tracking-wide hover:bg-black/5 transition-colors"
                            >
                                Atrás
                            </button>
                            <button 
                                onClick={() => setStep(3)}
                                className="flex-1 py-4 bg-onyx text-white font-display font-bold tracking-wide hover:bg-alloy transition-colors"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-display font-bold text-onyx mb-2 text-center">¿Tienes un Negocio?</h2>
                        <p className="text-graphite text-center mb-8">Puedes añadir un tracker profesional ahora o hacerlo más tarde desde Configuración.</p>
                        
                        <div className="space-y-4">
                            <button 
                                onClick={() => handleComplete(true)}
                                className="w-full py-4 bg-onyx text-white font-display font-bold tracking-wide hover:bg-alloy transition-colors"
                            >
                                Añadir Tracker Profesional Ahora
                            </button>
                            <button 
                                onClick={() => handleComplete(false)}
                                className="w-full py-4 bg-stone text-onyx font-display font-bold tracking-wide hover:bg-black/5 transition-colors"
                            >
                                Saltar por ahora
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
