import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { AppState, Category, FinancialContext, Subscription } from '../types';
import { CURRENCIES } from '../constants';
import { BottomSheet, SelectField, SelectFieldOption, PressButton, IconCircle, haptic } from './Mobile';
import { isoToLocalPickerString, nowAsPickerString, localPickerStringToIso, formatDateHuman } from '../utils/datetime';
import { formatIntervalLabel } from '../utils/subscriptions';

// Compact money formatter for select options (no decimals if integer to save space).
const formatMoney = (n: number, currency: string): string => {
    try {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(n);
    } catch {
        return `${n.toFixed(2)} ${currency}`;
    }
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// All form modals render as native-feel bottom sheets.
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => (
  <BottomSheet open={isOpen} onClose={onClose} title={title} size="full">
    {children}
  </BottomSheet>
);

// --- Custom DateTimePicker Component ---

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface DateTimePickerProps {
    value: string;
    onChange: (isoDate: string) => void;
    onCancel: () => void;
    includeTime?: boolean;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, onCancel, includeTime = true }) => {
    // Initial state setup
    const initialDate = value ? new Date(value) : new Date();
    // Handle invalid dates
    const safeDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

    const [viewDate, setViewDate] = useState(new Date(safeDate));
    const [selectedDate, setSelectedDate] = useState(new Date(safeDate));
    const [time, setTime] = useState(includeTime && value.includes('T') ? value.split('T')[1].slice(0,5) : '12:00');

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
        // Returns 0 for Sunday, 1 for Monday... we want 0 for Monday, 6 for Sunday
        const day = new Date(year, month, 1).getDay();
        return (day + 6) % 7;
    };

    const handlePrevMonth = () => {
        setViewDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const handleDayClick = (day: number) => {
        const newDate = new Date(currentYear, currentMonth, day);
        setSelectedDate(newDate);
    };

    const handleConfirm = () => {
        // Construct ISO string
        const y = selectedDate.getFullYear();
        const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(selectedDate.getDate()).padStart(2, '0');
        
        let result = `${y}-${m}-${d}`;
        if (includeTime) {
            result += `T${time}`;
        }
        onChange(result);
    };

    // Grid Generation
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const startPadding = getFirstDayOfMonth(currentYear, currentMonth);
    const totalSlots = Math.ceil((daysInMonth + startPadding) / 7) * 7;
    const days = [];

    for (let i = 0; i < totalSlots; i++) {
        const dayNumber = i - startPadding + 1;
        if (dayNumber > 0 && dayNumber <= daysInMonth) {
            const isSelected = 
                selectedDate.getDate() === dayNumber && 
                selectedDate.getMonth() === currentMonth && 
                selectedDate.getFullYear() === currentYear;
            
            const isToday = 
                new Date().getDate() === dayNumber &&
                new Date().getMonth() === currentMonth &&
                new Date().getFullYear() === currentYear;

            days.push(
                <button 
                    key={i} 
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleDayClick(dayNumber); }}
                    className={`
                        h-9 w-9 text-xs font-bold rounded-full flex items-center justify-center transition-all
                        ${isSelected ? 'bg-alloy text-white shadow-md scale-110' : 'text-onyx hover:bg-stone'}
                        ${!isSelected && isToday ? 'ring-1 ring-alloy text-alloy' : ''}
                    `}
                >
                    {dayNumber}
                </button>
            );
        } else {
            days.push(<div key={i} className="h-9 w-9"></div>);
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-onyx/60 backdrop-blur-[2px] animate-in fade-in duration-200 p-0 md:p-4">
            <div className="bg-white w-full md:w-[340px] rounded-t-2xl md:rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-onyx p-4 text-white flex justify-between items-center">
                    <span className="font-display font-bold text-lg tracking-wide uppercase">
                        {MONTHS[currentMonth]} <span className="text-alloy">{currentYear}</span>
                    </span>
                    <div className="flex gap-1">
                        <button type="button" onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button type="button" onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>

                <div className="p-4 overflow-y-auto">
                    {/* Weekdays */}
                    <div className="grid grid-cols-7 mb-2 text-center">
                        {WEEKDAYS.map(d => (
                            <span key={d} className="text-[10px] uppercase font-bold text-graphite tracking-widest">{d}</span>
                        ))}
                    </div>
                    
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-y-1 justify-items-center mb-6">
                        {days}
                    </div>

                    {/* Time Selector */}
                    {includeTime && (
                        <div className="border-t border-black/5 pt-4 mb-4">
                            <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">Hora</label>
                            <div className="relative">
                                <input 
                                    type="time" 
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full p-3 bg-stone border border-onyx/[0.22] rounded font-mono text-lg text-center font-bold text-onyx outline-none focus:border-alloy focus:ring-[3px] focus:ring-alloy/20 focus:bg-white transition-colors"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Icons.Calendar className="w-4 h-4 text-graphite" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-stone border-t border-black/5 flex gap-3">
                    <button 
                        type="button" 
                        onClick={onCancel}
                        className="flex-1 py-3 bg-white border border-black/10 text-graphite font-bold uppercase tracking-widest text-xs rounded hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="button" 
                        onClick={handleConfirm}
                        className="flex-1 py-3 bg-onyx text-white font-bold uppercase tracking-widest text-xs rounded hover:bg-graphite transition-colors shadow-lg shadow-onyx/20"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Generic Form Field Helpers ---

export const Input = (props: any) => {
    const isDate = props.type === 'date' || props.type === 'datetime-local';
    const [pickerOpen, setPickerOpen] = useState(false);

    // Format value for display (in user's timezone, fallback to UTC if no tz prop)
    const displayValue = React.useMemo(() => {
        if (!isDate || !props.value) return props.value;
        try {
            // props.value is either "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM" (picker string,
            // already in the user's timezone). Render it directly as a human label
            // without re-parsing through Date() — that would re-apply browser tz.
            const v = String(props.value);
            const [datePart, timePart] = v.split('T');
            if (!datePart) return props.value;
            const [y, m, d] = datePart.split('-');
            const formattedDate = `${d}/${m}/${y}`;
            if (props.type === 'datetime-local' && timePart) {
                return `${formattedDate} ${timePart.slice(0, 5)}`;
            }
            return formattedDate;
        } catch (e) {
            return props.value;
        }
    }, [props.value, props.type, isDate]);

    // Handler for the custom picker
    const handleDateChange = (isoValue: string) => {
        // Create a synthetic event to satisfy the form handlers
        const syntheticEvent = {
            target: { value: isoValue }
        };
        if (props.onChange) {
            props.onChange(syntheticEvent);
        }
        setPickerOpen(false);
    };

    if (isDate) {
        return (
            <div className="mb-5 group">
                {props.label && <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">{props.label}</label>}
                <div className="relative">
                     {/* Read-only input for display */}
                    <input
                        type="text"
                        value={displayValue}
                        readOnly
                        onClick={() => setPickerOpen(true)}
                        className={`wv-field font-sans cursor-pointer pr-11 ${props.className || ''}`}
                    />

                    <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-graphite hover:text-alloy transition-colors z-10 cursor-pointer p-1"
                    >
                        <Icons.Calendar className="w-5 h-5" />
                    </button>

                    {pickerOpen && (
                        <DateTimePicker 
                            value={props.value} 
                            onChange={handleDateChange} 
                            onCancel={() => setPickerOpen(false)} 
                            includeTime={props.type === 'datetime-local'}
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="mb-5 group">
            {props.label && <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">{props.label}</label>}
            <div className="relative">
                <input
                    {...props}
                    className={`wv-field font-sans ${props.className || ''}`}
                />
            </div>
        </div>
    );
};

export const Select = (props: any) => (
    <div className={`mb-5 group ${props.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        {props.label && <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">{props.label}</label>}
        <div className="relative">
            <select
                {...props}
                className={`wv-field font-sans ${props.className || ''}`}
            >
                {props.children}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Icons.Expense className="w-4 h-4 text-graphite" />
            </div>
        </div>
    </div>
);

// --- Specific Forms ---

interface TransactionFormProps {
    type: 'EXPENSE' | 'INCOME';
    state: AppState;
    onSubmit: (data: any) => void;
    onClose: () => void;
    initialData?: any;
}

interface TransactionFormPropsExt extends TransactionFormProps {
    subscriptionPaymentChoice?: (sub: Subscription) => void;
    onCreateCategory?: (data: any) => Category; // creates a new category in global state and returns it
}

export const TransactionForm: React.FC<TransactionFormPropsExt> = ({ type, state, onSubmit, onClose, initialData, onCreateCategory }) => {
    const [contextId, setContextId] = useState(initialData?.contextId || state.contexts[0]?.id || '');
    const [accountId, setAccountId] = useState(initialData?.accountId || '');
    const [subAccountId, setSubAccountId] = useState(initialData?.subAccountId || '');
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [currency, setCurrency] = useState(initialData?.currency || state.user.currency);
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
    const [dateTime, setDateTime] = useState(
        initialData?.date
            ? isoToLocalPickerString(initialData.date, state.user.timezone)
            : nowAsPickerString(state.user.timezone)
    );
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [comments, setComments] = useState(initialData?.comments || '');
    const [distribute, setDistribute] = useState(false);
    const [linkedSubscriptionId, setLinkedSubscriptionId] = useState<string>('');
    const [subPickerOpen, setSubPickerOpen] = useState(false);
    const [newCategoryOpen, setNewCategoryOpen] = useState(false);

    const activeContext = state.contexts.find(c => c.id === contextId);
    const activeAccount = activeContext?.accounts.find(a => a.id === accountId);

    useEffect(() => {
        if (initialData) return; // Don't auto-select when editing
        if (type === 'INCOME' && activeContext) {
            const incAcc = activeContext.accounts.find(a => a.type === 'INCOME');
            if (incAcc) setAccountId(incAcc.id);
        }
        if (type === 'EXPENSE' && activeContext && !accountId) {
            const expAcc = activeContext.accounts.find(a => a.type === 'EXPENSE');
            if (expAcc) setAccountId(expAcc.id);
        }
    }, [type, activeContext]);

    const availableCategories = state.categories.filter(c => c.contextId === contextId);

    // When user picks an active subscription, autofill all fields from it.
    // Ordered by nextRenewal ascending (the soonest to be paid first).
    const activeSubscriptions = type === 'EXPENSE'
        ? state.subscriptions
            .filter(s => s.active && s.contextId === contextId)
            .sort((a, b) => {
                if (!a.nextRenewal) return 1;
                if (!b.nextRenewal) return -1;
                return new Date(a.nextRenewal).getTime() - new Date(b.nextRenewal).getTime();
            })
        : [];

    const applySubscription = (sub: Subscription) => {
        setLinkedSubscriptionId(sub.id);
        setAmount(String(sub.amount));
        setCurrency(sub.currency);
        setAccountId(sub.accountId);
        setSubAccountId(sub.subAccountId || '');
        setCategoryId(sub.categoryId || '');
        if (!notes) setNotes(sub.name);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isoDate = localPickerStringToIso(dateTime, state.user.timezone);

        onSubmit({
            ...(initialData ? { id: initialData.id } : {}),
            type, contextId, accountId, subAccountId,
            amount: Number(amount), currency, categoryId, date: isoDate, notes,
            comments: comments || undefined,
            distribute,
            linkedSubscriptionId: linkedSubscriptionId || undefined,
        });
        onClose();
    };

    // Subscription picker sheet state
    const linkedSub = activeSubscriptions.find(s => s.id === linkedSubscriptionId);

    // Helpers to build SelectField options
    const accountOptions: SelectFieldOption[] = (activeContext?.accounts || []).map((a) => {
        const bal = a.balances?.[currency] ?? 0;
        const delta = type === 'INCOME' ? Number(amount || 0) : -Number(amount || 0);
        const projected = bal + delta;
        return {
            value: a.id,
            label: a.name,
            hint: amount ? `${formatMoney(bal, currency)} → ${formatMoney(projected, currency)}` : formatMoney(bal, currency),
        };
    });
    const subAccountOptions: SelectFieldOption[] = activeAccount ? [
        { value: '', label: 'Ninguna', hint: '' },
        ...activeAccount.subAccounts.map((s) => {
            const bal = s.balances?.[currency] ?? 0;
            const delta = type === 'INCOME' ? Number(amount || 0) : -Number(amount || 0);
            const projected = bal + delta;
            return {
                value: s.id,
                label: s.name,
                hint: amount ? `${formatMoney(bal, currency)} → ${formatMoney(projected, currency)}` : formatMoney(bal, currency),
            };
        }),
    ] : [];
    const categoryOptions: SelectFieldOption[] = [
        { value: '', label: type === 'INCOME' ? 'Sin categoría' : 'Seleccionar categoría' },
        ...availableCategories.map((c) => ({ value: c.id, label: c.name, swatch: c.color })),
        { value: '__new__', label: '+ Nueva categoría', hint: 'Crear ahora' },
    ];

    return (
        <Modal isOpen={true} onClose={onClose} title={initialData ? `Editar ${type === 'EXPENSE' ? 'Gasto' : 'Ingreso'}` : `Registrar ${type === 'EXPENSE' ? 'Gasto' : 'Ingreso'}`}>
            <form onSubmit={handleSubmit}>
                {/* Subscription quick-pay (only for new EXPENSE, not edit) */}
                {type === 'EXPENSE' && !initialData && activeSubscriptions.length > 0 && (
                    <div className="mb-5">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gold mb-2">Pagar Suscripción <span className="text-graphite">(opcional)</span></label>
                        <div className={`w-full rounded-2xl flex items-stretch gap-2 transition-all ${linkedSub ? 'bg-onyx text-white border border-onyx' : 'bg-gold/10 border border-gold/30'}`}>
                            <button
                                type="button"
                                onClick={() => setSubPickerOpen(true)}
                                className="flex-1 min-w-0 h-14 px-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                            >
                                <IconCircle tone="gold" size="sm"><Icons.Subscription className="w-3.5 h-3.5" /></IconCircle>
                                <div className="min-w-0 flex-1">
                                    {linkedSub ? (
                                        <>
                                            <div className="text-sm font-display font-bold truncate">{linkedSub.name}</div>
                                            <div className="text-[11px] text-gold font-mono tabular truncate">{formatMoney(linkedSub.amount, linkedSub.currency)} · avanzará al guardar</div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-sm font-display font-bold text-onyx">Pagar una suscripción</div>
                                            <div className="text-[11px] text-graphite">{activeSubscriptions.length} {activeSubscriptions.length === 1 ? 'activa' : 'activas'} en este espacio</div>
                                        </>
                                    )}
                                </div>
                                {!linkedSub && <Icons.ChevronRight className="w-4 h-4 text-graphite flex-shrink-0" />}
                            </button>
                            {linkedSub && (
                                <button
                                    type="button"
                                    onClick={() => setLinkedSubscriptionId('')}
                                    className="h-14 px-4 text-[10px] font-bold uppercase tracking-widest text-rose-300 hover:text-rose-200 active:scale-95 transition-transform"
                                    aria-label="Quitar suscripción"
                                >
                                    Quitar
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-0">
                    <SelectField
                        label="Espacio"
                        value={contextId}
                        options={state.contexts.map((c) => ({ value: c.id, label: c.name }))}
                        onChange={(v) => { setContextId(v); setCategoryId(''); setLinkedSubscriptionId(''); }}
                    />
                </div>

                <Input type="datetime-local" label="Fecha y Hora" value={dateTime} onChange={(e: any) => setDateTime(e.target.value)} />

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <Input type="number" label="Monto" required min="0.01" max="999999999" step="0.01" value={amount} placeholder="0.00" onChange={(e: any) => setAmount(e.target.value)} />
                    </div>
                    <SelectField
                        label="Moneda"
                        value={currency}
                        options={CURRENCIES.map((c) => ({ value: c.code, label: c.code, hint: c.symbol }))}
                        onChange={setCurrency}
                        searchable
                    />
                </div>
                <Input type="text" label="Descripción" required maxLength={200} value={notes} placeholder="Ej. Pago Cliente, Renta" onChange={(e: any) => setNotes(e.target.value)} />

                <SelectField
                    label="Cuenta"
                    placeholder="Seleccionar cuenta"
                    value={accountId}
                    options={accountOptions}
                    onChange={(v) => { setAccountId(v); setSubAccountId(''); }}
                    subtitle="Saldo actual → saldo tras la operación"
                />

                {activeAccount && activeAccount.subAccounts.length > 0 && (
                    <SelectField
                        label="Sub-Cuenta (opcional)"
                        value={subAccountId}
                        options={subAccountOptions}
                        onChange={setSubAccountId}
                        subtitle="Saldo actual → saldo tras la operación"
                    />
                )}

                {type === 'INCOME' && activeAccount?.type === 'INCOME' && (
                    <div className="mb-5 p-4 bg-gold/10 border border-gold/30 rounded-2xl flex items-start gap-3">
                        <input
                            type="checkbox"
                            id="distribute"
                            checked={distribute}
                            onChange={(e) => setDistribute(e.target.checked)}
                            className="mt-1 accent-onyx w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="distribute" className="text-sm cursor-pointer">
                            <span className="block font-display font-bold text-onyx">Distribuir automáticamente</span>
                            <span className="text-xs text-graphite">Repartir este ingreso según los % definidos (Profit First).</span>
                        </label>
                    </div>
                )}

                <SelectField
                    label={`Categoría${type === 'INCOME' ? ' (opcional)' : ''}`}
                    value={categoryId}
                    options={categoryOptions}
                    onChange={(v) => {
                        if (v === '__new__') { setNewCategoryOpen(true); return; }
                        setCategoryId(v);
                    }}
                    placeholder="Sin categoría"
                    searchable
                />

                <div className="mb-5">
                    <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">Notas (Opcional)</label>
                    <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        maxLength={500}
                        rows={2}
                        placeholder="Añade notas adicionales..."
                        className="w-full p-3 bg-stone border border-onyx/[0.22] text-sm focus:outline-none focus:border-alloy focus:ring-[3px] focus:ring-alloy/20 transition-colors resize-none"
                    />
                </div>

                <button type="submit" className={`w-full h-14 mt-4 font-display font-bold uppercase tracking-widest text-sm text-white transition-all hover:opacity-90 active:scale-[0.98] rounded-xl ${type === 'EXPENSE' ? 'bg-rose-800' : 'bg-emerald-800'}`}>
                    {initialData ? 'Guardar Cambios' : `Confirmar ${type === 'EXPENSE' ? 'Gasto' : 'Ingreso'}`}
                </button>
            </form>

            {/* Inline "new category" form — opens on top of TransactionForm */}
            {newCategoryOpen && onCreateCategory && (
                <CategoryForm
                    state={state}
                    onSubmit={(data: any) => {
                        // pre-fill the contextId we're using if user didn't change it
                        const dataWithCtx = { contextId, ...data };
                        const created = onCreateCategory(dataWithCtx);
                        setCategoryId(created.id);
                    }}
                    onClose={() => setNewCategoryOpen(false)}
                />
            )}

            {/* Subscription picker sheet */}
            <BottomSheet open={subPickerOpen} onClose={() => setSubPickerOpen(false)} title="Pagar Suscripción" subtitle="Selecciona y rellena automáticamente" size={activeSubscriptions.length > 6 ? 'full' : 'auto'}>
                <p className="text-[11px] text-graphite mb-3">
                    Al guardar el gasto, la suscripción avanzará a su <strong className="text-onyx">siguiente fecha de cobro</strong> y se sumará al contador de pagos.
                </p>
                <div className="space-y-2">
                    {activeSubscriptions.map((s) => {
                        const isSelected = linkedSubscriptionId === s.id;
                        const days = s.nextRenewal ? Math.ceil((new Date(s.nextRenewal).getTime() - Date.now()) / 86_400_000) : null;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => { applySubscription(s); setSubPickerOpen(false); }}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all active:scale-[0.99] text-left ${isSelected ? 'bg-onyx text-white' : 'bg-white border border-black/5 hover:border-onyx'}`}
                            >
                                <IconCircle tone="gold" size="md"><Icons.Subscription className="w-4 h-4" /></IconCircle>
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-display font-bold truncate ${isSelected ? 'text-white' : 'text-onyx'}`}>{s.name}</div>
                                    <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-graphite' : 'text-graphite'}`}>
                                        {formatIntervalLabel(s)}
                                        {days !== null && ` · Próx. ${days <= 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`}`}
                                    </div>
                                </div>
                                <div className={`text-sm font-display font-bold tabular ${isSelected ? 'text-gold' : 'text-onyx'}`}>{formatMoney(s.amount, s.currency)}</div>
                            </button>
                        );
                    })}
                </div>
            </BottomSheet>
        </Modal>
    );
};

// ─── ADJUST BALANCE (reconciliation) ────────────────────────────────────
interface AdjustBalanceFormProps {
    state: AppState;
    onSubmit: (data: { contextId: string; accountId: string; subAccountId?: string; currency: string; realBalance: number; notes?: string }) => void;
    onClose: () => void;
}
export const AdjustBalanceForm: React.FC<AdjustBalanceFormProps> = ({ state, onSubmit, onClose }) => {
    const [contextId, setContextId] = useState(state.contexts[0]?.id || '');
    const [accountId, setAccountId] = useState('');
    const [subAccountId, setSubAccountId] = useState('');
    const [currency, setCurrency] = useState(state.user.currency);
    const [realBalance, setRealBalance] = useState('');
    const [notes, setNotes] = useState('');

    const ctx = state.contexts.find(c => c.id === contextId);
    const acc = ctx?.accounts.find(a => a.id === accountId);
    const sub = subAccountId ? acc?.subAccounts.find(s => s.id === subAccountId) : null;

    const balances = sub ? sub.balances : acc?.balances;
    const currentBalance = balances?.[currency] ?? 0;
    const delta = realBalance !== '' ? Number((Number(realBalance) - currentBalance).toFixed(2)) : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (realBalance === '') return;
        onSubmit({ contextId, accountId, subAccountId: subAccountId || undefined, currency, realBalance: Number(realBalance), notes: notes || undefined });
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Ajustar Saldo">
            <form onSubmit={handleSubmit}>
                <div className="mb-4 p-4 bg-gold/10 border border-gold/30 rounded-2xl">
                    <p className="text-[11px] text-graphite">
                        Introduce el <strong className="text-onyx">saldo real</strong> que tienes en esta cuenta. El sistema creará un <strong className="text-onyx">ajuste</strong> con la diferencia. <span className="text-graphite">No cuenta como ingreso ni gasto en tus métricas.</span>
                    </p>
                </div>

                <SelectField
                    label="Espacio"
                    value={contextId}
                    options={state.contexts.map((c) => ({ value: c.id, label: c.name }))}
                    onChange={(v) => { setContextId(v); setAccountId(''); setSubAccountId(''); }}
                />
                <SelectField
                    label="Cuenta"
                    placeholder="Seleccionar cuenta"
                    value={accountId}
                    options={(ctx?.accounts || []).map((a) => ({ value: a.id, label: a.name, hint: formatMoney(a.balances?.[currency] ?? 0, currency) }))}
                    onChange={(v) => { setAccountId(v); setSubAccountId(''); }}
                />
                {acc && acc.subAccounts.length > 0 && (
                    <SelectField
                        label="Sub-cuenta (opcional)"
                        value={subAccountId}
                        options={[
                            { value: '', label: 'Ninguna — cuenta principal' },
                            ...acc.subAccounts.map((s) => ({ value: s.id, label: s.name, hint: formatMoney(s.balances?.[currency] ?? 0, currency) })),
                        ]}
                        onChange={setSubAccountId}
                    />
                )}
                <SelectField
                    label="Moneda"
                    value={currency}
                    options={CURRENCIES.map((c) => ({ value: c.code, label: c.code, hint: c.symbol }))}
                    onChange={setCurrency}
                    searchable
                />

                {accountId && (
                    <div className="mb-4 grid grid-cols-2 gap-3">
                        <div className="p-3 bg-stone rounded-xl">
                            <div className="text-[10px] uppercase tracking-widest text-graphite font-bold mb-1">En WhiteVault</div>
                            <div className="text-base font-display font-bold text-onyx tabular">{formatMoney(currentBalance, currency)}</div>
                        </div>
                        <div className={`p-3 rounded-xl ${delta === null ? 'bg-stone' : delta === 0 ? 'bg-stone' : delta > 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                            <div className="text-[10px] uppercase tracking-widest text-graphite font-bold mb-1">Ajuste</div>
                            <div className={`text-base font-display font-bold tabular ${delta === null || delta === 0 ? 'text-graphite' : delta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {delta === null ? '—' : `${delta > 0 ? '+' : ''}${formatMoney(delta, currency)}`}
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-4">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-graphite mb-2">Saldo real que tienes</label>
                    <input
                        type="number"
                        step="0.01"
                        required
                        value={realBalance}
                        onChange={(e) => setRealBalance(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-12 px-4 bg-white border border-onyx/[0.22] rounded-xl text-onyx focus:border-alloy focus:ring-[3px] focus:ring-alloy/20 outline-none font-display font-bold text-lg"
                    />
                </div>

                <Input type="text" label="Nota (opcional)" maxLength={200} value={notes} placeholder="Ej: dinero que entró sin registrar" onChange={(e: any) => setNotes(e.target.value)} />

                <button
                    type="submit"
                    disabled={!accountId || realBalance === '' || delta === 0}
                    className="w-full h-14 bg-onyx text-white font-display font-bold uppercase tracking-widest text-sm rounded-xl active:scale-[0.98] mt-2 disabled:opacity-40 transition-all"
                >
                    {delta === 0 ? 'Ya está cuadrado' : 'Aplicar Ajuste'}
                </button>
            </form>
        </Modal>
    );
};

interface TransferFormProps {
    state: AppState;
    onSubmit: (data: any) => void;
    onClose: () => void;
}

export const TransferForm: React.FC<TransferFormProps> = ({ state, onSubmit, onClose }) => {
    const [fromContext, setFromContext] = useState(state.contexts[0]?.id || '');
    const [fromAccount, setFromAccount] = useState('');
    const [fromSub, setFromSub] = useState('');

    const [toContext, setToContext] = useState(state.contexts[0]?.id || '');
    const [toAccount, setToAccount] = useState('');
    const [toSub, setToSub] = useState('');

    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState(state.user.currency);
    const [notes, setNotes] = useState('');
    const [dateTime, setDateTime] = useState(nowAsPickerString(state.user.timezone));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isoDate = localPickerStringToIso(dateTime, state.user.timezone);
        onSubmit({
            type: 'TRANSFER',
            amount: Number(amount), currency, date: isoDate, notes,
            contextId: fromContext, accountId: fromAccount, subAccountId: fromSub,
            toContextId: toContext, toAccountId: toAccount, toSubAccountId: toSub
        });
        onClose();
    };

    const getContext = (id: string) => state.contexts.find(c => c.id === id);
    const getAccount = (ctxId: string, accId: string) => getContext(ctxId)?.accounts.find(a => a.id === accId);

    const accountOpts = (ctxId: string, amt: number, sign: 1 | -1): SelectFieldOption[] => {
        const ctx = getContext(ctxId);
        return (ctx?.accounts || []).map((a) => {
            const bal = a.balances?.[currency] ?? 0;
            const projected = bal + sign * amt;
            return {
                value: a.id,
                label: a.name,
                hint: amt ? `${formatMoney(bal, currency)} → ${formatMoney(projected, currency)}` : formatMoney(bal, currency),
            };
        });
    };
    const subOpts = (ctxId: string, accId: string, amt: number, sign: 1 | -1): SelectFieldOption[] => {
        const acc = getAccount(ctxId, accId);
        if (!acc) return [{ value: '', label: 'Ninguna' }];
        return [
            { value: '', label: 'Ninguna' },
            ...acc.subAccounts.map((s) => {
                const bal = s.balances?.[currency] ?? 0;
                const projected = bal + sign * amt;
                return {
                    value: s.id,
                    label: s.name,
                    hint: amt ? `${formatMoney(bal, currency)} → ${formatMoney(projected, currency)}` : formatMoney(bal, currency),
                };
            }),
        ];
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Ejecutar Transferencia">
            <form onSubmit={handleSubmit} className="space-y-1">
                <Input type="datetime-local" label="Fecha y Hora" value={dateTime} onChange={(e: any) => setDateTime(e.target.value)} />
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <Input type="number" label="Monto a Transferir" required min="0.01" max="999999999" step="0.01" value={amount} onChange={(e: any) => setAmount(e.target.value)} />
                    </div>
                    <SelectField
                        label="Moneda"
                        value={currency}
                        options={CURRENCIES.map((c) => ({ value: c.code, label: c.code, hint: c.symbol }))}
                        onChange={setCurrency}
                        searchable
                    />
                </div>

                <div className="bg-stone/40 p-4 rounded-2xl border border-black/5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-rose-700 mb-3 flex items-center gap-2">
                        <Icons.ArrowUp className="w-3 h-3" /> Origen (sale)
                    </div>
                    <SelectField
                        label="Espacio"
                        value={fromContext}
                        options={state.contexts.map((c) => ({ value: c.id, label: c.name }))}
                        onChange={(v) => { setFromContext(v); setFromAccount(''); setFromSub(''); }}
                    />
                    <SelectField
                        label="Cuenta"
                        placeholder="Seleccionar cuenta"
                        value={fromAccount}
                        options={accountOpts(fromContext, Number(amount || 0), -1)}
                        onChange={(v) => { setFromAccount(v); setFromSub(''); }}
                    />
                    {getAccount(fromContext, fromAccount)?.subAccounts.length! > 0 && (
                        <SelectField
                            label="Sub-cuenta (opcional)"
                            value={fromSub}
                            options={subOpts(fromContext, fromAccount, Number(amount || 0), -1)}
                            onChange={setFromSub}
                        />
                    )}
                </div>

                <div className="bg-stone/40 p-4 rounded-2xl border border-black/5 mt-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-700 mb-3 flex items-center gap-2">
                        <Icons.ArrowDown className="w-3 h-3" /> Destino (entra)
                    </div>
                    <SelectField
                        label="Espacio"
                        value={toContext}
                        options={state.contexts.map((c) => ({ value: c.id, label: c.name }))}
                        onChange={(v) => { setToContext(v); setToAccount(''); setToSub(''); }}
                    />
                    <SelectField
                        label="Cuenta"
                        placeholder="Seleccionar cuenta"
                        value={toAccount}
                        options={accountOpts(toContext, Number(amount || 0), 1)}
                        onChange={(v) => { setToAccount(v); setToSub(''); }}
                    />
                    {getAccount(toContext, toAccount)?.subAccounts.length! > 0 && (
                        <SelectField
                            label="Sub-cuenta (opcional)"
                            value={toSub}
                            options={subOpts(toContext, toAccount, Number(amount || 0), 1)}
                            onChange={setToSub}
                        />
                    )}
                </div>

                <Input type="text" label="Nota de Referencia" maxLength={200} value={notes} onChange={(e: any) => setNotes(e.target.value)} />
                <button type="submit" className="w-full h-14 bg-sky-700 hover:bg-sky-800 text-white font-display font-bold uppercase tracking-widest text-sm transition-all active:scale-[0.98] rounded-xl mt-3 flex items-center justify-center gap-2">
                    <Icons.Transfer className="w-4 h-4" />
                    Ejecutar Transferencia
                </button>
            </form>
        </Modal>
    );
};

type SubKind = 'NONE' | 'SAVING' | 'PAYMENT';

const KIND_INFO: Record<SubKind, { label: string; hint: string }> = {
    NONE:    { label: 'Normal',   hint: 'Sub-cuenta sin barra de progreso.' },
    SAVING:  { label: 'Meta',     hint: 'Sube cuando GUARDAS. Transfieres dinero y se queda dentro hasta llegar a la cifra.' },
    PAYMENT: { label: 'Objetivo', hint: 'Sube cuando PAGAS. Cada gasto que asignes aquí descuenta de lo que falta.' },
};

export const SubAccountForm: React.FC<any> = ({ state, onSubmit, onClose, initialContextId, initialAccountId }) => {
    const [contextId, setContextId] = useState(initialContextId || state.contexts[0]?.id || '');
    const [accountId, setAccountId] = useState(initialAccountId || '');
    const [name, setName] = useState('');
    const [kind, setKind] = useState<SubKind>('NONE');
    const [target, setTarget] = useState('');
    const [priority, setPriority] = useState('');
    const [startDate, setStartDate] = useState(nowAsPickerString(state.user.timezone).split('T')[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            contextId, accountId, name,
            target: kind !== 'NONE' && target ? Number(target) : undefined,
            goalKind: kind === 'NONE' ? undefined : kind,
            priority: kind === 'PAYMENT' && priority ? Number(priority) : null,
            startDate
        });
        onClose();
    }

    const parentCtx = state.contexts.find((c: any) => c.id === contextId);

    return (
        <Modal isOpen={true} onClose={onClose} title="Nueva Sub-Cuenta">
            <form onSubmit={handleSubmit}>
                <SelectField
                    label="Espacio"
                    value={contextId}
                    options={state.contexts.map((c: any) => ({ value: c.id, label: c.name }))}
                    onChange={(v) => { setContextId(v); setAccountId(''); }}
                />
                <SelectField
                    label="Cuenta padre"
                    placeholder="Seleccionar cuenta"
                    value={accountId}
                    options={(parentCtx?.accounts || []).map((a: any) => ({ value: a.id, label: a.name }))}
                    onChange={setAccountId}
                />
                <Input type="text" label="Nombre Sub-Cuenta" required maxLength={100} value={name} onChange={(e: any) => setName(e.target.value)} />

                <div className="mb-4">
                    <label className="block text-[10px] font-display font-bold uppercase tracking-widest text-graphite mb-2">Tipo</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['NONE', 'SAVING', 'PAYMENT'] as SubKind[]).map((k) => (
                            <button
                                key={k}
                                type="button"
                                onClick={() => setKind(k)}
                                className={`h-11 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all active:scale-95 ${
                                    kind === k ? 'bg-onyx text-white' : 'bg-stone text-graphite'
                                }`}
                            >
                                {KIND_INFO[k].label}
                            </button>
                        ))}
                    </div>
                    <p className="text-[11px] text-graphite mt-2 leading-snug">{KIND_INFO[kind].hint}</p>
                </div>

                {kind !== 'NONE' && (
                    <Input
                        type="number" label={kind === 'SAVING' ? 'Cuánto quieres reunir' : 'Cuánto tienes que pagar en total'}
                        required min="0.01" max="999999999" step="0.01" placeholder="0.00"
                        value={target} onChange={(e: any) => setTarget(e.target.value)}
                    />
                )}
                {kind === 'PAYMENT' && (
                    <SelectField
                        label="Prioridad (opcional)"
                        placeholder="Sin prioridad"
                        value={priority}
                        options={[
                            { value: '1', label: '1 — Primero' },
                            { value: '2', label: '2' },
                            { value: '3', label: '3' },
                            { value: '4', label: '4 — Último' },
                        ]}
                        onChange={setPriority}
                    />
                )}
                <Input type="date" label="Fecha Inicio" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} />
                <button type="submit" className="w-full h-14 bg-onyx text-white font-display font-bold uppercase tracking-widest text-sm rounded-xl active:scale-[0.98] mt-3">Crear Sub-Cuenta</button>
            </form>
        </Modal>
    );
}

interface CategoryFormProps {
    state: AppState;
    onSubmit: (data: any) => void;
    onClose: () => void;
    initialData?: Category;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({ state, onSubmit, onClose, initialData }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [color, setColor] = useState(initialData?.color || '#0E0E0F');
    const [budget, setBudget] = useState(initialData?.budget?.toString() || '');
    const [contextId, setContextId] = useState(initialData?.contextId || state.contexts[0]?.id || '');
    const [accountId, setAccountId] = useState(initialData?.accountId || '');
    const [subAccountId, setSubAccountId] = useState(initialData?.subAccountId || '');

    const colors = ['#0E0E0F', '#4B4B4D', '#C9A86A', '#D4A853', '#8C2F2F', '#2F5C8C', '#2F8C55', '#6B2F8C'];
    const activeContext = state.contexts.find(c => c.id === contextId);
    const activeAccount = activeContext?.accounts.find(a => a.id === accountId);

    return (
        <Modal isOpen={true} onClose={onClose} title={initialData ? "Editar Categoría" : "Nueva Categoría"}>
            <form onSubmit={(e) => { 
                e.preventDefault(); 
                onSubmit({ 
                    ...(initialData ? {id: initialData.id} : {}), 
                    name, color, 
                    budget: budget ? Number(budget) : undefined, 
                    contextId, accountId, subAccountId 
                }); 
                onClose(); 
            }}>
                <SelectField
                    label="Espacio"
                    value={contextId}
                    options={state.contexts.map((c: any) => ({ value: c.id, label: c.name }))}
                    onChange={(v) => { setContextId(v); setAccountId(''); }}
                />

                <SelectField
                    label="Cuenta asociada (predeterminada)"
                    placeholder="Seleccionar cuenta"
                    value={accountId}
                    options={(activeContext?.accounts || []).map((a) => ({ value: a.id, label: a.name }))}
                    onChange={(v) => { setAccountId(v); setSubAccountId(''); }}
                />

                {activeAccount && activeAccount.subAccounts.length > 0 && (
                    <SelectField
                        label="Sub-cuenta (opcional)"
                        value={subAccountId}
                        options={[
                            { value: '', label: 'Ninguna' },
                            ...activeAccount.subAccounts.map((s: any) => ({ value: s.id, label: s.name })),
                        ]}
                        onChange={setSubAccountId}
                    />
                )}

                <Input type="text" label="Nombre Categoría" required maxLength={100} value={name} onChange={(e: any) => setName(e.target.value)} />
                
                <div className="mb-6">
                    <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">Etiqueta de Color</label>
                    <div className="flex gap-3 flex-wrap">
                        {colors.map(c => (
                            <button key={c} type="button" onClick={() => setColor(c)} 
                                className={`w-8 h-8 rounded-full border border-black/10 transition-transform ${color === c ? 'scale-110 ring-2 ring-alloy ring-offset-2' : ''}`} 
                                style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>
                <Input type="number" label="Presupuesto Mensual (Opcional)" min="0.01" max="999999999" step="0.01" value={budget} onChange={(e: any) => setBudget(e.target.value)} />
                <button type="submit" className="w-full py-4 bg-onyx text-white font-display font-bold uppercase tracking-widest text-sm">
                    {initialData ? 'Actualizar Categoría' : 'Crear Categoría'}
                </button>
            </form>
        </Modal>
    )
}

interface SubscriptionFormProps {
    state: AppState;
    onSubmit: (data: any) => void;
    onClose: () => void;
    initialData?: Subscription;
}

export const SubscriptionForm: React.FC<SubscriptionFormProps> = ({ state, onSubmit, onClose, initialData }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [currency, setCurrency] = useState(initialData?.currency || state.user.currency);
    // Frequency now lives in intervalValue + intervalUnit. We seed from the
    // sub's existing values, falling back to legacy frequency for old subs.
    const legacyToInterval = (f: any): { value: number; unit: 'days' | 'weeks' | 'months' | 'years' } => {
        switch (f) {
            case 'WEEKLY':    return { value: 1, unit: 'weeks' };
            case 'MONTHLY':   return { value: 1, unit: 'months' };
            case 'QUARTERLY': return { value: 3, unit: 'months' };
            case 'ANNUAL':    return { value: 1, unit: 'years' };
            default:          return { value: 1, unit: 'months' };
        }
    };
    const seed = initialData?.intervalValue && initialData?.intervalUnit
        ? { value: initialData.intervalValue, unit: initialData.intervalUnit as 'days' | 'weeks' | 'months' | 'years' }
        : legacyToInterval(initialData?.frequency);
    const [intervalValue, setIntervalValue] = useState<string>(String(seed.value));
    const [intervalUnit, setIntervalUnit] = useState<'days' | 'weeks' | 'months' | 'years'>(seed.unit);
    // Ensure the date is in YYYY-MM-DD format for <input type="date">
    const [nextRenewal, setNextRenewal] = useState(initialData?.nextRenewal?.split('T')[0] || '');
    const [contextId, setContextId] = useState(initialData?.contextId || state.contexts[0]?.id);
    const [accountId, setAccountId] = useState(initialData?.accountId || '');
    const [subAccountId, setSubAccountId] = useState(initialData?.subAccountId || '');
    const [cardLastFour, setCardLastFour] = useState(initialData?.cardLastFour || '');
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
    const [active, setActive] = useState(initialData ? initialData.active : true);
    const [reminderValue, setReminderValue] = useState<string>(initialData?.reminderValue?.toString() || '');
    const [reminderUnit, setReminderUnit] = useState<'minutes' | 'hours' | 'days'>(initialData?.reminderUnit || 'days');
    const [notifyIfOverdue, setNotifyIfOverdue] = useState<boolean>(initialData?.notifyIfOverdue !== false);

    const activeContext = state.contexts.find(c => c.id === contextId);
    const activeAccount = activeContext?.accounts.find(a => a.id === accountId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const ivNum = Math.max(1, Number(intervalValue) || 1);
        // Keep `frequency` set to the closest legacy value for back-compat
        // (charts/calendar code still reads it for old subs).
        const legacyFreq =
            ivNum === 1 && intervalUnit === 'weeks'  ? 'WEEKLY'
          : ivNum === 1 && intervalUnit === 'months' ? 'MONTHLY'
          : ivNum === 3 && intervalUnit === 'months' ? 'QUARTERLY'
          : ivNum === 1 && intervalUnit === 'years'  ? 'ANNUAL'
          : 'MONTHLY';
        onSubmit({
            ...(initialData ? { id: initialData.id } : {}),
            name,
            amount: Number(amount),
            currency,
            frequency: legacyFreq,
            intervalValue: ivNum,
            intervalUnit,
            nextRenewal,
            contextId,
            accountId,
            subAccountId,
            cardLastFour: cardLastFour || undefined,
            categoryId: categoryId || undefined,
            active,
            paymentMethod: 'Card',
            reminderValue: reminderValue ? Number(reminderValue) : undefined,
            reminderUnit: reminderValue ? reminderUnit : undefined,
            notifyIfOverdue,
        });
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={initialData ? "Editar Suscripción" : "Nueva Suscripción"}>
             <form onSubmit={handleSubmit}>
                <Input type="text" label="Nombre del Servicio" required maxLength={100} value={name} onChange={(e: any) => setName(e.target.value)} />
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <Input type="number" label="Monto" required min="0.01" max="999999999" step="0.01" value={amount} onChange={(e: any) => setAmount(e.target.value)} />
                    </div>
                    <SelectField
                        label="Moneda"
                        value={currency}
                        options={CURRENCIES.map((c) => ({ value: c.code, label: c.code, hint: c.symbol }))}
                        onChange={setCurrency}
                        searchable
                    />
                </div>
                {/* Frecuencia flexible: cada N (días/semanas/meses/años) */}
                <div className="mb-4">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-graphite mb-2">Frecuencia</label>
                    <div className="grid grid-cols-5 gap-3 items-center">
                        <span className="col-span-1 text-xs text-graphite text-center">Cada</span>
                        <input
                            type="number"
                            min="1"
                            max="999"
                            value={intervalValue}
                            onChange={(e) => setIntervalValue(e.target.value)}
                            className="col-span-1 h-12 px-3 bg-white border border-onyx/[0.22] rounded-xl text-onyx focus:border-alloy focus:ring-[3px] focus:ring-alloy/20 outline-none text-center font-display font-bold"
                        />
                        <div className="col-span-3">
                            <SelectField
                                value={intervalUnit}
                                options={[
                                    { value: 'days',   label: Number(intervalValue) === 1 ? 'Día' : 'Días' },
                                    { value: 'weeks',  label: Number(intervalValue) === 1 ? 'Semana' : 'Semanas' },
                                    { value: 'months', label: Number(intervalValue) === 1 ? 'Mes' : 'Meses' },
                                    { value: 'years',  label: Number(intervalValue) === 1 ? 'Año' : 'Años' },
                                ]}
                                onChange={(v) => setIntervalUnit(v as any)}
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-graphite mt-1">Ej: "cada 2 meses" para una suscripción bimensual.</p>
                </div>

                <Input
                    type="date"
                    label={`Próxima Renovación ${active ? '*' : '(Opcional)'}`}
                    value={nextRenewal}
                    required={active}
                    onChange={(e: any) => setNextRenewal(e.target.value)}
                />

                <SelectField
                    label="Espacio de pago"
                    value={contextId}
                    options={state.contexts.map((c: any) => ({ value: c.id, label: c.name }))}
                    onChange={(v) => { setContextId(v); setAccountId(''); }}
                />
                <SelectField
                    label="Cuenta de pago"
                    placeholder="Seleccionar cuenta"
                    value={accountId}
                    options={(state.contexts.find((c: any) => c.id === contextId)?.accounts || []).map((a: any) => ({ value: a.id, label: a.name }))}
                    onChange={(v) => { setAccountId(v); setSubAccountId(''); }}
                />
                {activeAccount && activeAccount.subAccounts.length > 0 && (
                    <SelectField
                        label="Sub-cuenta de pago (opcional)"
                        value={subAccountId}
                        options={[
                            { value: '', label: 'Ninguna' },
                            ...activeAccount.subAccounts.map((s: any) => ({ value: s.id, label: s.name })),
                        ]}
                        onChange={setSubAccountId}
                    />
                )}

                <SelectField
                    label="Categoría (opcional)"
                    value={categoryId}
                    options={[
                        { value: '', label: 'Sin categoría' },
                        ...state.categories.filter((c: any) => c.contextId === contextId).map((c: any) => ({ value: c.id, label: c.name, swatch: c.color })),
                    ]}
                    onChange={setCategoryId}
                />

                <div className="mb-5">
                    <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">Últimos 4 dígitos de tarjeta (Opcional)</label>
                    <div className="flex items-center gap-2">
                        <span className="text-graphite text-sm">••••</span>
                        <input
                            type="text"
                            value={cardLastFour}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setCardLastFour(val);
                            }}
                            maxLength={4}
                            placeholder="0000"
                            className="w-24 p-3 bg-stone border border-onyx/[0.22] text-sm font-mono tracking-widest focus:outline-none focus:border-alloy focus:ring-[3px] focus:ring-alloy/20 transition-colors text-center"
                        />
                    </div>
                </div>

                <div className="mb-5">
                     <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">Estado</label>
                     <div className="flex gap-4">
                         <button type="button" onClick={() => setActive(true)} className={`px-4 py-2 text-xs font-bold uppercase ${active ? 'bg-green-100 text-green-800' : 'bg-stone text-gray-500'}`}>Activo</button>
                         <button type="button" onClick={() => setActive(false)} className={`px-4 py-2 text-xs font-bold uppercase ${!active ? 'bg-red-100 text-red-800' : 'bg-stone text-gray-500'}`}>Pausado</button>
                     </div>
                </div>

                {/* Per-subscription renewal reminder */}
                <div className="mb-5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-graphite mb-2">Aviso de Renovación</label>
                    <p className="text-[11px] text-graphite mb-3">Te avisaremos cuando falte este tiempo para la próxima renovación. Deja vacío para no recibir aviso.</p>
                    <div className="grid grid-cols-5 gap-3">
                        <input
                            type="number"
                            min="0"
                            max="999"
                            placeholder="3"
                            value={reminderValue}
                            onChange={(e) => setReminderValue(e.target.value)}
                            className="col-span-2 w-full h-12 px-4 bg-white border border-onyx/[0.22] rounded-xl text-onyx focus:border-alloy focus:ring-[3px] focus:ring-alloy/20 outline-none text-center font-display font-bold"
                        />
                        <div className="col-span-3">
                            <SelectField
                                value={reminderUnit}
                                options={[
                                    { value: 'minutes', label: 'Minutos antes' },
                                    { value: 'hours', label: 'Horas antes' },
                                    { value: 'days', label: 'Días antes' },
                                ]}
                                onChange={(v) => setReminderUnit(v as any)}
                            />
                        </div>
                    </div>
                </div>

                {/* Overdue notification toggle */}
                <div className="mb-5 p-4 bg-stone/40 rounded-2xl border border-black/5 flex items-start gap-3">
                    <input
                        type="checkbox"
                        id="notifyIfOverdue"
                        checked={notifyIfOverdue}
                        onChange={(e) => setNotifyIfOverdue(e.target.checked)}
                        className="mt-1 accent-onyx w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="notifyIfOverdue" className="text-sm cursor-pointer flex-1">
                        <span className="block font-display font-bold text-onyx">Avisarme si no la pago a tiempo</span>
                        <span className="text-xs text-graphite">Notificación diaria cuando la fecha de cobro haya pasado y aún no haya registrado el gasto.</span>
                    </label>
                </div>

                <button type="submit" className="w-full py-4 bg-onyx text-white font-display font-bold uppercase tracking-widest text-sm rounded-xl">
                    {initialData ? 'Actualizar Suscripción' : 'Añadir Suscripción'}
                </button>
            </form>
        </Modal>
    )
}

export const NewContextForm: React.FC<any> = ({ onSubmit, onClose }) => {
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [initialBalance, setInitialBalance] = useState<number | ''>('');
    const [distributed, setDistributed] = useState(false);

    const defaultPockets = [
        { id: 'b_income', name: 'Income', type: 'INCOME', percentageTarget: 0 },
        { id: 'b_profit', name: 'Profit', type: 'HOLDING', percentageTarget: 5 },
        { id: 'b_owner', name: 'Owner Pay', type: 'HOLDING', percentageTarget: 50 },
        { id: 'b_tax', name: 'Tax', type: 'HOLDING', percentageTarget: 15 },
        { id: 'b_opex', name: 'Opex', type: 'EXPENSE', percentageTarget: 30 },
    ];

    return (
        <Modal isOpen={true} onClose={onClose} title="Iniciar Nuevo Negocio">
            <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, currency, initialBalance, distributed }); onClose(); }}>
                <div className="bg-stone p-4 border border-black/5 mb-6">
                     <p className="text-sm text-graphite font-sans">
                         Esto creará un nuevo espacio de negocio con la estructura de cuentas estándar <strong>Profit First</strong> (Income, Profit, Owner Pay, Tax, Opex).
                     </p>
                </div>
                <Input type="text" label="Nombre del Negocio" required maxLength={100} placeholder="Ej. Agencia Diseño LLC" value={name} onChange={(e: any) => setName(e.target.value)} />

                <SelectField
                    label="Moneda"
                    value={currency}
                    options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}`, hint: c.symbol }))}
                    onChange={setCurrency}
                    searchable
                />


                <div className="mb-6">
                    <label className="block text-xs font-bold uppercase tracking-widest text-graphite mb-2">Dinero Disponible (Opcional)</label>
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-graphite font-bold">$</span>
                            <input
                                type="number"
                                value={initialBalance}
                                min="0"
                                max="999999999"
                                step="0.01"
                                onChange={(e) => {
                                    setInitialBalance(e.target.value ? Number(e.target.value) : '');
                                    setDistributed(false);
                                }}
                                placeholder="0.00"
                                className="w-full p-4 pl-8 bg-stone border border-onyx/[0.22] text-onyx font-sans outline-none focus:border-alloy focus:ring-[3px] focus:ring-alloy/20"
                            />
                        </div>
                        {Number(initialBalance) > 0 && !distributed && (
                            <button 
                                type="button"
                                onClick={() => setDistributed(true)}
                                className="px-6 py-4 bg-alloy text-white font-display font-bold tracking-wide hover:bg-onyx transition-colors"
                            >
                                Distribuir
                            </button>
                        )}
                        {Number(initialBalance) > 0 && distributed && (
                            <button 
                                type="button"
                                onClick={() => setDistributed(false)}
                                className="px-6 py-4 bg-stone text-onyx font-display font-bold tracking-wide hover:bg-black/5 transition-colors border border-black/5"
                            >
                                Deshacer
                            </button>
                        )}
                    </div>
                </div>

                {distributed && Number(initialBalance) > 0 && (
                    <div className="space-y-2 mb-6 p-4 bg-stone border border-black/5">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-graphite mb-3">Distribución Estimada</h4>
                        {defaultPockets.filter(p => p.type !== 'INCOME').map(pocket => (
                            <div key={pocket.id} className="flex justify-between items-center text-sm">
                                <span className="text-onyx">{pocket.name} ({pocket.percentageTarget}%)</span>
                                <span className="font-mono font-bold text-alloy">
                                    + ${(Number(initialBalance) * (pocket.percentageTarget / 100)).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <button type="submit" className="w-full py-4 bg-gold hover:bg-alloy text-white font-display font-bold uppercase tracking-widest text-sm transition-colors">Lanzar Espacio de Negocio</button>
            </form>
        </Modal>
    )
}