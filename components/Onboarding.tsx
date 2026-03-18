import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { AppState, FinancialContext } from '../types';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

interface OnboardingProps {
    onComplete: (name: string, avatarUrl: string | undefined, personalContext: FinancialContext, addBusiness: boolean, businessContext?: FinancialContext) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const { width, height } = useWindowSize();
    
    // Step 1 State
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Step 2 State (Personal Pockets)
    const [pockets, setPockets] = useState([
        { id: 'p_income', name: 'Ingresos', type: 'INCOME' as const, percentageTarget: 0 },
        { id: 'p_needs', name: 'Necesidades Básicas', type: 'EXPENSE' as const, percentageTarget: 50 },
        { id: 'p_freedom', name: 'Libertad Financiera', type: 'HOLDING' as const, percentageTarget: 10 },
        { id: 'p_lt_save', name: 'Ahorro Largo Plazo', type: 'HOLDING' as const, percentageTarget: 10 },
        { id: 'p_play', name: 'Ocio y Lujos', type: 'EXPENSE' as const, percentageTarget: 10 },
        { id: 'p_give', name: 'Donaciones', type: 'EXPENSE' as const, percentageTarget: 10 },
        { id: 'p_edu', name: 'Educación', type: 'EXPENSE' as const, percentageTarget: 10 },
    ]);

    const [cashPocket, setCashPocket] = useState({ id: 'p_cash', name: 'Efectivo / Cash', type: 'HOLDING' as const, percentageTarget: 0 });

    // Step 4 State (Business Pockets)
    const [businessName, setBusinessName] = useState('Mi Negocio');
    const [businessPockets, setBusinessPockets] = useState([
        { id: 'b_income', name: 'Income (Entrada)', type: 'INCOME' as const, percentageTarget: 0 },
        { id: 'b_profit', name: 'Profit', type: 'HOLDING' as const, percentageTarget: 5 },
        { id: 'b_owner', name: 'Owner Pay', type: 'HOLDING' as const, percentageTarget: 50 },
        { id: 'b_tax', name: 'Tax', type: 'HOLDING' as const, percentageTarget: 15 },
        { id: 'b_opex', name: 'Opex', type: 'EXPENSE' as const, percentageTarget: 30 },
    ]);

    const [addBusiness, setAddBusiness] = useState(false);

    // New States for Initial Balances
    const [personalInitialBalance, setPersonalInitialBalance] = useState<number | ''>('');
    const [distributePersonalBalance, setDistributePersonalBalance] = useState(true);

    const [businessInitialBalance, setBusinessInitialBalance] = useState<number | ''>('');
    const [distributeBusinessBalance, setDistributeBusinessBalance] = useState(true);

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

    const updateBusinessPocket = (index: number, field: string, value: string | number) => {
        const newPockets = [...businessPockets];
        newPockets[index] = { ...newPockets[index], [field]: value };
        setBusinessPockets(newPockets);
    };

    const totalPercentage = pockets.reduce((sum, p) => sum + (p.percentageTarget || 0), 0);
    const totalBusinessPercentage = businessPockets.reduce((sum, p) => sum + (p.percentageTarget || 0), 0);

    const handleFinish = () => {
        let remainingPersonal = Number(personalInitialBalance) || 0;
        const personalAccounts = [...pockets, cashPocket].map(p => {
            let balance = 0;
            if (Number(personalInitialBalance) > 0 && distributePersonalBalance && p.type !== 'INCOME' && p.percentageTarget > 0) {
                balance = Number(personalInitialBalance) * (p.percentageTarget / 100);
                remainingPersonal -= balance;
            }
            return {
                id: p.id,
                name: p.name,
                type: p.type,
                balance: balance,
                percentageTarget: p.percentageTarget > 0 ? p.percentageTarget : undefined,
                subAccounts: []
            };
        });
        
        if (Number(personalInitialBalance) > 0) {
            const incomeAcc = personalAccounts.find(a => a.type === 'INCOME');
            if (incomeAcc) {
                incomeAcc.balance = distributePersonalBalance ? remainingPersonal : Number(personalInitialBalance);
            }
        }

        const personalContext: FinancialContext = {
            id: 'ctx_personal_' + Date.now(),
            name: 'Finanzas Personales',
            type: 'PERSONAL',
            accounts: personalAccounts
        };

        let businessContext: FinancialContext | undefined;
        if (addBusiness) {
            let remainingBusiness = Number(businessInitialBalance) || 0;
            const businessAccounts = businessPockets.map(p => {
                let balance = 0;
                if (Number(businessInitialBalance) > 0 && distributeBusinessBalance && p.type !== 'INCOME' && p.percentageTarget > 0) {
                    balance = Number(businessInitialBalance) * (p.percentageTarget / 100);
                    remainingBusiness -= balance;
                }
                return {
                    id: p.id,
                    name: p.name,
                    type: p.type,
                    balance: balance,
                    percentageTarget: p.percentageTarget > 0 ? p.percentageTarget : undefined,
                    subAccounts: []
                };
            });
            
            if (Number(businessInitialBalance) > 0) {
                const incomeAcc = businessAccounts.find(a => a.type === 'INCOME');
                if (incomeAcc) {
                    incomeAcc.balance = distributeBusinessBalance ? remainingBusiness : Number(businessInitialBalance);
                }
            }

            businessContext = {
                id: 'ctx_biz_' + Date.now(),
                name: businessName,
                type: 'BUSINESS',
                accounts: businessAccounts
            };
        }

        onComplete(name || 'Usuario', avatarUrl, personalContext, addBusiness, businessContext);
    };

    useEffect(() => {
        if (step === 7) {
            const timer = setTimeout(() => {
                handleFinish();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [step]);

    const totalSteps = 7;
    const progressPercentage = (step / totalSteps) * 100;

    return (
        <div className="fixed inset-0 z-50 bg-stone flex flex-col items-center justify-center p-4">
            {step === 7 && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}
            
            <div className="w-full max-w-2xl bg-white border border-black/5 shadow-2xl p-8 md:p-12 relative z-10 overflow-hidden">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-stone">
                    <div 
                        className="h-full bg-alloy transition-all duration-700 ease-out shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>

                <div className="flex items-center justify-center mb-8 mt-2">
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
                        <p className="text-graphite text-center mb-6">Define tus cuentas principales y sus porcentajes objetivo.</p>
                        
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

                            <div className="mt-6 pt-4 border-t border-black/10">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-graphite mb-3">Pocket Extra</h3>
                                <div className="flex items-center gap-4 bg-white p-3 border border-black/5">
                                    <div className="flex-1">
                                        <input 
                                            type="text" 
                                            value={cashPocket.name}
                                            onChange={(e) => setCashPocket({...cashPocket, name: e.target.value})}
                                            className="w-full bg-transparent text-sm font-bold text-onyx outline-none"
                                        />
                                    </div>
                                    <div className="w-24 flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            value={cashPocket.percentageTarget}
                                            onChange={(e) => setCashPocket({...cashPocket, percentageTarget: Number(e.target.value)})}
                                            className="w-full bg-stone border border-black/5 p-2 text-sm text-right outline-none focus:border-alloy"
                                        />
                                        <span className="text-graphite font-bold">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-6 p-4 bg-stone border border-black/5">
                            <span className="text-sm font-bold text-onyx">Total Asignado (Principales):</span>
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
                        <h2 className="text-2xl font-display font-bold text-onyx mb-2 text-center">Balance Inicial Personal</h2>
                        <p className="text-graphite text-center mb-6">¿Cuánto dinero tienes actualmente en tus cuentas personales? (Opcional)</p>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold uppercase tracking-widest text-graphite mb-2">Dinero Actual</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-graphite font-bold">$</span>
                                <input 
                                    type="number" 
                                    value={personalInitialBalance}
                                    onChange={(e) => setPersonalInitialBalance(e.target.value ? Number(e.target.value) : '')}
                                    placeholder="0.00"
                                    className="w-full p-4 pl-8 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
                                />
                            </div>
                        </div>

                        {Number(personalInitialBalance) > 0 && (
                            <div className="mb-8 p-4 bg-stone border border-black/5">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={distributePersonalBalance}
                                        onChange={(e) => setDistributePersonalBalance(e.target.checked)}
                                        className="mt-1 w-4 h-4 text-alloy border-black/20 rounded focus:ring-alloy"
                                    />
                                    <div>
                                        <span className="block text-sm font-bold text-onyx mb-1">Distribuir automáticamente</span>
                                        <span className="block text-xs text-graphite">
                                            Repartir este dinero entre tus pockets según los porcentajes definidos. Si no lo marcas, el dinero irá al pocket de Ingresos para que lo distribuyas luego.
                                        </span>
                                    </div>
                                </label>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setStep(2)}
                                className="px-6 py-4 bg-stone text-onyx font-display font-bold tracking-wide hover:bg-black/5 transition-colors"
                            >
                                Atrás
                            </button>
                            <button 
                                onClick={() => setStep(4)}
                                className="flex-1 py-4 bg-onyx text-white font-display font-bold tracking-wide hover:bg-alloy transition-colors"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-display font-bold text-onyx mb-2 text-center">¿Tienes un Negocio?</h2>
                        <p className="text-graphite text-center mb-8">Puedes añadir un tracker profesional ahora o hacerlo más tarde desde Configuración.</p>
                        
                        <div className="space-y-4">
                            <button 
                                onClick={() => {
                                    setAddBusiness(true);
                                    setStep(5);
                                }}
                                className="w-full py-4 bg-onyx text-white font-display font-bold tracking-wide hover:bg-alloy transition-colors"
                            >
                                Añadir Tracker Profesional Ahora
                            </button>
                            <button 
                                onClick={() => {
                                    setAddBusiness(false);
                                    setStep(7);
                                }}
                                className="w-full py-4 bg-stone text-onyx font-display font-bold tracking-wide hover:bg-black/5 transition-colors"
                            >
                                Saltar por ahora
                            </button>
                        </div>
                        
                        <div className="mt-6">
                            <button 
                                onClick={() => setStep(3)}
                                className="w-full py-4 bg-transparent text-graphite font-display font-bold tracking-wide hover:text-onyx transition-colors"
                            >
                                Atrás
                            </button>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-display font-bold text-onyx mb-2 text-center">Configura tu Negocio</h2>
                        <p className="text-graphite text-center mb-6">Define el nombre y las cuentas de tu negocio.</p>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold uppercase tracking-widest text-graphite mb-2">Nombre del Negocio</label>
                            <input 
                                type="text" 
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="Mi Negocio"
                                className="w-full p-4 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
                            />
                        </div>

                        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 mb-6">
                            {businessPockets.map((pocket, index) => (
                                <div key={pocket.id} className="flex items-center gap-4 bg-stone p-3 border border-black/5">
                                    <div className="flex-1">
                                        <input 
                                            type="text" 
                                            value={pocket.name}
                                            onChange={(e) => updateBusinessPocket(index, 'name', e.target.value)}
                                            className="w-full bg-transparent text-sm font-bold text-onyx outline-none"
                                        />
                                    </div>
                                    {pocket.type !== 'INCOME' && (
                                        <div className="w-24 flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                value={pocket.percentageTarget}
                                                onChange={(e) => updateBusinessPocket(index, 'percentageTarget', Number(e.target.value))}
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
                            <span className={`text-lg font-mono font-bold ${totalBusinessPercentage === 100 ? 'text-green-600' : 'text-red-500'}`}>
                                {totalBusinessPercentage}%
                            </span>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setStep(4)}
                                className="px-6 py-4 bg-stone text-onyx font-display font-bold tracking-wide hover:bg-black/5 transition-colors"
                            >
                                Atrás
                            </button>
                            <button 
                                onClick={() => setStep(6)}
                                className="flex-1 py-4 bg-onyx text-white font-display font-bold tracking-wide hover:bg-alloy transition-colors"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                )}

                {step === 6 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-display font-bold text-onyx mb-2 text-center">Balance Inicial del Negocio</h2>
                        <p className="text-graphite text-center mb-6">¿Cuánto dinero tiene actualmente tu negocio? (Opcional)</p>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold uppercase tracking-widest text-graphite mb-2">Dinero Actual</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-graphite font-bold">$</span>
                                <input 
                                    type="number" 
                                    value={businessInitialBalance}
                                    onChange={(e) => setBusinessInitialBalance(e.target.value ? Number(e.target.value) : '')}
                                    placeholder="0.00"
                                    className="w-full p-4 pl-8 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
                                />
                            </div>
                        </div>

                        {Number(businessInitialBalance) > 0 && (
                            <div className="mb-8 p-4 bg-stone border border-black/5">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={distributeBusinessBalance}
                                        onChange={(e) => setDistributeBusinessBalance(e.target.checked)}
                                        className="mt-1 w-4 h-4 text-alloy border-black/20 rounded focus:ring-alloy"
                                    />
                                    <div>
                                        <span className="block text-sm font-bold text-onyx mb-1">Distribuir automáticamente</span>
                                        <span className="block text-xs text-graphite">
                                            Repartir este dinero entre los pockets del negocio según los porcentajes definidos. Si no lo marcas, el dinero irá al pocket de Ingresos.
                                        </span>
                                    </div>
                                </label>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setStep(5)}
                                className="px-6 py-4 bg-stone text-onyx font-display font-bold tracking-wide hover:bg-black/5 transition-colors"
                            >
                                Atrás
                            </button>
                            <button 
                                onClick={() => setStep(7)}
                                className="flex-1 py-4 bg-onyx text-white font-display font-bold tracking-wide hover:bg-alloy transition-colors"
                            >
                                Finalizar
                            </button>
                        </div>
                    </div>
                )}

                {step === 7 && (
                    <div className="animate-in zoom-in duration-500 flex flex-col items-center justify-center py-12">
                        <h2 className="text-4xl font-display font-bold text-onyx mb-4 text-center">¡Bienvenido a WhiteVault™!</h2>
                        <p className="text-graphite text-center text-lg">Tu bóveda financiera está lista.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

