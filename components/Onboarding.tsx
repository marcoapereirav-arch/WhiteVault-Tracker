import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { AppState, FinancialContext } from '../types';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { CURRENCIES } from '../constants';

interface OnboardingProps {
    onComplete: (name: string, avatarUrl: string | undefined, currency: string, personalContext: FinancialContext, addBusiness: boolean, businessContext?: FinancialContext) => void;
    onExit?: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onExit }) => {
    const [step, setStep] = useState(1);
    const { width, height } = useWindowSize();
    
    // Step 1 State
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [currency, setCurrency] = useState('USD');
    const [currencySearch, setCurrencySearch] = useState('');

    // Step 3 State (Personal Pockets)
    const [personalName, setPersonalName] = useState('Finanzas Personales');
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

    // Step 5 State (Business Pockets)
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
    const [personalDistributed, setPersonalDistributed] = useState(false);

    const [businessInitialBalance, setBusinessInitialBalance] = useState<number | ''>('');
    const [businessDistributed, setBusinessDistributed] = useState(false);

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
        const cur = currency;
        let remainingPersonal = Number(personalInitialBalance) || 0;
        const personalAccounts = [...pockets, cashPocket].map(p => {
            let amount = 0;
            if (Number(personalInitialBalance) > 0 && personalDistributed && p.type !== 'INCOME' && p.percentageTarget > 0) {
                amount = Number(personalInitialBalance) * (p.percentageTarget / 100);
                remainingPersonal -= amount;
            }
            return {
                id: p.id,
                name: p.name,
                type: p.type,
                balances: amount > 0 ? { [cur]: amount } : {},
                percentageTarget: p.percentageTarget > 0 ? p.percentageTarget : undefined,
                subAccounts: []
            };
        });

        if (Number(personalInitialBalance) > 0) {
            const incomeAcc = personalAccounts.find(a => a.type === 'INCOME');
            if (incomeAcc) {
                const incAmount = personalDistributed ? remainingPersonal : Number(personalInitialBalance);
                incomeAcc.balances = incAmount > 0 ? { [cur]: incAmount } : {};
            }
        }

        const personalContext: FinancialContext = {
            id: 'ctx_personal_' + Date.now(),
            name: personalName || 'Finanzas Personales',
            type: 'PERSONAL',
            accounts: personalAccounts
        };

        let businessContext: FinancialContext | undefined;
        if (addBusiness) {
            let remainingBusiness = Number(businessInitialBalance) || 0;
            const businessAccounts = businessPockets.map(p => {
                let amount = 0;
                if (Number(businessInitialBalance) > 0 && businessDistributed && p.type !== 'INCOME' && p.percentageTarget > 0) {
                    amount = Number(businessInitialBalance) * (p.percentageTarget / 100);
                    remainingBusiness -= amount;
                }
                return {
                    id: p.id,
                    name: p.name,
                    type: p.type,
                    balances: amount > 0 ? { [cur]: amount } : {},
                    percentageTarget: p.percentageTarget > 0 ? p.percentageTarget : undefined,
                    subAccounts: []
                };
            });

            if (Number(businessInitialBalance) > 0) {
                const incomeAcc = businessAccounts.find(a => a.type === 'INCOME');
                if (incomeAcc) {
                    const incAmount = businessDistributed ? remainingBusiness : Number(businessInitialBalance);
                    incomeAcc.balances = incAmount > 0 ? { [cur]: incAmount } : {};
                }
            }

            businessContext = {
                id: 'ctx_biz_' + Date.now(),
                name: businessName,
                type: 'BUSINESS',
                accounts: businessAccounts
            };
        }

        onComplete(name || 'Usuario', avatarUrl, currency, personalContext, addBusiness, businessContext);
    };

    useEffect(() => {
        if (step === 6) {
            const timer = setTimeout(() => {
                handleFinish();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [step]);

    const totalSteps = 6;
    const progressPercentage = (step / totalSteps) * 100;

    return (
        <div className="fixed inset-0 z-50 marble flex flex-col">
            {step === 6 && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}

            {/* Top bar with progress + exit */}
            <div className="pt-safe sticky top-0 z-20 bg-stone/80 backdrop-blur-xl border-b border-black/5">
                <div className="h-1 bg-concrete/40">
                    <div
                        className="h-full bg-metallic transition-all duration-700 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-graphite">
                        Paso {Math.min(step, totalSteps)}/{totalSteps}
                    </span>
                    {onExit && (
                        <button
                            onClick={onExit}
                            className="w-9 h-9 rounded-full bg-white border border-black/5 flex items-center justify-center active:scale-95 transition-transform"
                            aria-label="Salir"
                        >
                            <Icons.Close className="w-4 h-4 text-onyx" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-safe">
                <div className="w-full max-w-[480px] mx-auto px-5 sm:px-6 py-6 sm:py-10">
                    <div className="flex items-center justify-center mb-6">
                        <h1 className="text-2xl font-display font-bold text-onyx tracking-tight">WhiteVault<span className="text-xs text-alloy align-top">™</span></h1>
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
                        <h2 className="text-2xl font-display font-bold text-onyx mb-2 text-center">Selecciona tu Moneda</h2>
                        <p className="text-graphite text-center mb-6">Elige la divisa principal para tus finanzas.</p>
                        
                        <div className="mb-6">
                            <div className="relative mb-4">
                                <Icons.Menu className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-graphite" />
                                <input 
                                    type="text" 
                                    value={currencySearch}
                                    onChange={(e) => setCurrencySearch(e.target.value)}
                                    placeholder="Buscar moneda (ej. USD, Euro, Peso...)"
                                    className="w-full p-4 pl-10 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
                                    autoFocus
                                />
                            </div>
                            <div className="max-h-64 overflow-y-auto border border-black/5 bg-white">
                                {CURRENCIES.filter(c => 
                                    c.code.toLowerCase().includes(currencySearch.toLowerCase()) || 
                                    c.name.toLowerCase().includes(currencySearch.toLowerCase())
                                ).map(c => (
                                    <button
                                        key={c.code}
                                        onClick={() => setCurrency(c.code)}
                                        className={`w-full flex items-center justify-between p-4 border-b border-black/5 last:border-0 hover:bg-stone transition-colors ${currency === c.code ? 'bg-stone border-l-4 border-l-alloy' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-onyx">{c.code}</span>
                                            <span className="text-graphite text-sm">{c.name}</span>
                                        </div>
                                        <span className="font-bold text-alloy">{c.symbol}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setStep(1)}
                                className="px-6 py-4 bg-stone text-onyx font-display font-bold tracking-wide hover:bg-black/5 transition-colors border border-black/5"
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
                        <h2 className="text-2xl font-display font-bold text-onyx mb-2 text-center">Configura tu Tracker Personal</h2>
                        <p className="text-graphite text-center mb-6">Define tus cuentas principales y sus porcentajes objetivo.</p>
                        
                        <div className="mb-6">
                            <label className="block text-xs font-bold uppercase tracking-widest text-graphite mb-2">Nombre de tu Dashboard Personal</label>
                            <input 
                                type="text" 
                                value={personalName}
                                onChange={(e) => setPersonalName(e.target.value)}
                                placeholder="Finanzas Personales"
                                className="w-full p-4 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy mb-6"
                            />

                            <label className="block text-xs font-bold uppercase tracking-widest text-graphite mb-2">Dinero Disponible (Opcional)</label>
                            <div className="flex gap-4">
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-graphite font-bold">$</span>
                                    <input 
                                        type="number" 
                                        value={personalInitialBalance}
                                        onChange={(e) => {
                                            setPersonalInitialBalance(e.target.value ? Number(e.target.value) : '');
                                            setPersonalDistributed(false);
                                        }}
                                        placeholder="0.00"
                                        className="w-full p-4 pl-8 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
                                    />
                                </div>
                                {Number(personalInitialBalance) > 0 && !personalDistributed && (
                                    <button 
                                        onClick={() => setPersonalDistributed(true)}
                                        className="px-6 py-4 bg-alloy text-white font-display font-bold tracking-wide hover:bg-onyx transition-colors"
                                    >
                                        Distribuir
                                    </button>
                                )}
                                {Number(personalInitialBalance) > 0 && personalDistributed && (
                                    <button 
                                        onClick={() => setPersonalDistributed(false)}
                                        className="px-6 py-4 bg-stone text-onyx font-display font-bold tracking-wide hover:bg-black/5 transition-colors border border-black/5"
                                    >
                                        Deshacer
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            {pockets.map((pocket, index) => (
                                <div key={pocket.id} className="flex items-center gap-4 bg-stone p-3 border border-black/5">
                                    <div className="flex-1">
                                        <input 
                                            type="text" 
                                            value={pocket.name}
                                            onChange={(e) => updatePocket(index, 'name', e.target.value)}
                                            className="w-full bg-transparent text-sm font-bold text-onyx outline-none"
                                        />
                                        {personalDistributed && pocket.type !== 'INCOME' && pocket.percentageTarget > 0 && (
                                            <div className="text-xs font-mono font-bold text-alloy mt-1">
                                                + ${(Number(personalInitialBalance) * (pocket.percentageTarget / 100)).toFixed(2)}
                                            </div>
                                        )}
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
                                        {personalDistributed && cashPocket.percentageTarget > 0 && (
                                            <div className="text-xs font-mono font-bold text-alloy mt-1">
                                                + ${(Number(personalInitialBalance) * (cashPocket.percentageTarget / 100)).toFixed(2)}
                                            </div>
                                        )}
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
                                    setStep(6);
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

                        <div className="mb-6">
                            <label className="block text-xs font-bold uppercase tracking-widest text-graphite mb-2">Dinero Disponible (Opcional)</label>
                            <div className="flex gap-4">
                                <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-graphite font-bold">$</span>
                                    <input 
                                        type="number" 
                                        value={businessInitialBalance}
                                        onChange={(e) => {
                                            setBusinessInitialBalance(e.target.value ? Number(e.target.value) : '');
                                            setBusinessDistributed(false);
                                        }}
                                        placeholder="0.00"
                                        className="w-full p-4 pl-8 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
                                    />
                                </div>
                                {Number(businessInitialBalance) > 0 && !businessDistributed && (
                                    <button 
                                        onClick={() => setBusinessDistributed(true)}
                                        className="px-6 py-4 bg-alloy text-white font-display font-bold tracking-wide hover:bg-onyx transition-colors"
                                    >
                                        Distribuir
                                    </button>
                                )}
                                {Number(businessInitialBalance) > 0 && businessDistributed && (
                                    <button 
                                        onClick={() => setBusinessDistributed(false)}
                                        className="px-6 py-4 bg-stone text-onyx font-display font-bold tracking-wide hover:bg-black/5 transition-colors border border-black/5"
                                    >
                                        Deshacer
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            {businessPockets.map((pocket, index) => (
                                <div key={pocket.id} className="flex items-center gap-4 bg-stone p-3 border border-black/5">
                                    <div className="flex-1">
                                        <input 
                                            type="text" 
                                            value={pocket.name}
                                            onChange={(e) => updateBusinessPocket(index, 'name', e.target.value)}
                                            className="w-full bg-transparent text-sm font-bold text-onyx outline-none"
                                        />
                                        {businessDistributed && pocket.type !== 'INCOME' && pocket.percentageTarget > 0 && (
                                            <div className="text-xs font-mono font-bold text-alloy mt-1">
                                                + ${(Number(businessInitialBalance) * (pocket.percentageTarget / 100)).toFixed(2)}
                                            </div>
                                        )}
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
                    <div className="animate-in zoom-in duration-500 flex flex-col items-center justify-center py-12">
                        <h2 className="text-3xl font-display font-bold text-onyx mb-3 text-center tracking-tight">¡Bienvenido a WhiteVault™!</h2>
                        <p className="text-graphite text-center text-sm">Tu bóveda financiera está lista.</p>
                    </div>
                )}
                </div>
            </div>
        </div>
    );
};

