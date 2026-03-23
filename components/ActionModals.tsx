import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { AppState, Category, FinancialContext, Subscription } from '../types';
import { CURRENCIES } from '../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-onyx/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg shadow-[0_4px_24px_rgba(0,0,0,0.2)] border border-alloy flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-black/5 flex justify-between items-center bg-stone">
          <h2 className="text-xl font-display font-bold text-onyx uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-concrete transition-colors text-onyx">
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
        <div className="h-1 w-full bg-metallic"></div>
      </div>
    </div>
  );
};

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
                                    className="w-full p-3 bg-stone border border-black/10 rounded font-mono text-lg text-center font-bold text-onyx outline-none focus:border-alloy focus:bg-white transition-colors"
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
    
    // Format value for display (User Friendly)
    const displayValue = React.useMemo(() => {
        if (!isDate || !props.value) return props.value;
        try {
            const date = new Date(props.value);
            if (isNaN(date.getTime())) return props.value;
            
            const options: Intl.DateTimeFormatOptions = {
                year: 'numeric', month: '2-digit', day: '2-digit'
            };
            
            if (props.type === 'datetime-local') {
                options.hour = '2-digit';
                options.minute = '2-digit';
            }
            
            return new Intl.DateTimeFormat('es-ES', options).format(date);
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
                        className={`w-full px-4 py-3 bg-white border-b border-black/20 focus:border-alloy outline-none transition-all text-onyx font-sans placeholder:text-gray-300 rounded-none cursor-pointer ${props.className || ''}`}
                    />
                    <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-alloy transition-all duration-300 group-focus-within:w-full"></div>
                    
                    <button 
                        type="button" 
                        onClick={() => setPickerOpen(true)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-alloy transition-colors z-10 cursor-pointer p-1"
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
                    className={`w-full px-4 py-3 bg-white border-b border-black/20 focus:border-alloy outline-none transition-all text-onyx font-sans placeholder:text-gray-300 rounded-none ${props.className || ''}`}
                />
                <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-alloy transition-all duration-300 group-focus-within:w-full"></div>
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
                className={`w-full px-4 py-3 bg-white border-b border-black/20 focus:border-alloy outline-none transition-all text-onyx font-sans rounded-none appearance-none ${props.disabled ? 'bg-gray-50' : ''} ${props.className || ''}`}
            >
                {props.children}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Icons.Expense className="w-4 h-4 text-gray-400" />
            </div>
            <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-alloy transition-all duration-300 group-focus-within:w-full"></div>
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

export const TransactionForm: React.FC<TransactionFormProps> = ({ type, state, onSubmit, onClose, initialData }) => {
    const [contextId, setContextId] = useState(initialData?.contextId || state.contexts[0]?.id || '');
    const [accountId, setAccountId] = useState(initialData?.accountId || '');
    const [subAccountId, setSubAccountId] = useState(initialData?.subAccountId || '');
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [currency, setCurrency] = useState(initialData?.currency || state.user.currency);
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
    const [dateTime, setDateTime] = useState(initialData?.date ? new Date(initialData.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [comments, setComments] = useState(initialData?.comments || '');
    const [distribute, setDistribute] = useState(false);

    const activeContext = state.contexts.find(c => c.id === contextId);
    const activeAccount = activeContext?.accounts.find(a => a.id === accountId);

    useEffect(() => {
        if (type === 'INCOME' && activeContext) {
            const incAcc = activeContext.accounts.find(a => a.type === 'INCOME');
            if (incAcc) setAccountId(incAcc.id);
        }
    }, [type, activeContext]);

    const availableCategories = state.categories.filter(c => c.contextId === contextId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isoDate = new Date(dateTime).toISOString();

        onSubmit({
            ...(initialData ? { id: initialData.id } : {}),
            type, contextId, accountId, subAccountId,
            amount: Number(amount), currency, categoryId, date: isoDate, notes,
            comments: comments || undefined,
            distribute
        });
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={initialData ? `Editar ${type === 'EXPENSE' ? 'Gasto' : 'Ingreso'}` : `Registrar ${type === 'EXPENSE' ? 'Gasto' : 'Ingreso'}`}>
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                    <Select label="Espacio (Contexto)" value={contextId} onChange={(e: any) => { setContextId(e.target.value); setCategoryId(''); }}>
                        {state.contexts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    <Input type="datetime-local" label="Fecha y Hora" value={dateTime} onChange={(e: any) => setDateTime(e.target.value)} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <Input type="number" label="Monto" required min="0.01" max="999999999" step="0.01" value={amount} placeholder="0.00" onChange={(e: any) => setAmount(e.target.value)} />
                    </div>
                    <Select label="Moneda" value={currency} onChange={(e: any) => setCurrency(e.target.value)}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </Select>
                </div>
                <Input type="text" label="Descripción" required maxLength={200} value={notes} placeholder="Ej. Pago Cliente, Renta" onChange={(e: any) => setNotes(e.target.value)} />
                
                <Select label="Cuenta" value={accountId} onChange={(e: any) => { setAccountId(e.target.value); setSubAccountId(''); }}>
                    <option value="">Seleccionar Cuenta</option>
                    {activeContext?.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>

                {activeAccount && activeAccount.subAccounts.length > 0 && (
                    <Select label="Sub-Cuenta (Opcional)" value={subAccountId} onChange={(e: any) => setSubAccountId(e.target.value)}>
                        <option value="">Ninguna</option>
                        {activeAccount.subAccounts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                )}

                {type === 'INCOME' && activeAccount?.type === 'INCOME' && (
                    <div className="mb-6 p-4 bg-stone border border-black/5 flex items-start gap-3 group hover:border-alloy transition-colors">
                        <input 
                            type="checkbox" 
                            id="distribute" 
                            checked={distribute} 
                            onChange={(e) => setDistribute(e.target.checked)}
                            className="mt-1 accent-onyx w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="distribute" className="text-sm cursor-pointer">
                            <span className="block font-bold text-onyx">Distribuir automáticamente</span>
                            <span className="text-xs text-graphite">Repartir este ingreso en las cuentas según los porcentajes definidos (Profit First).</span>
                        </label>
                    </div>
                )}

                {type === 'EXPENSE' && (
                    <Select label="Categoría" value={categoryId} onChange={(e: any) => setCategoryId(e.target.value)}>
                        <option value="">Seleccionar Categoría</option>
                        {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                )}

                <div className="mb-5">
                    <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">Notas (Opcional)</label>
                    <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        maxLength={500}
                        rows={2}
                        placeholder="Añade notas adicionales..."
                        className="w-full p-3 bg-stone border border-black/10 text-sm focus:outline-none focus:border-alloy transition-colors resize-none"
                    />
                </div>

                <button type="submit" className={`w-full py-4 mt-4 font-display font-bold uppercase tracking-widest text-sm text-white transition-all hover:opacity-90 ${type === 'EXPENSE' ? 'bg-red-900' : 'bg-green-900'}`}>
                    {initialData ? 'Guardar Cambios' : `Confirmar ${type === 'EXPENSE' ? 'Gasto' : 'Ingreso'}`}
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
    const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const isoDate = new Date(dateTime).toISOString();
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

    return (
        <Modal isOpen={true} onClose={onClose} title="Ejecutar Transferencia">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input type="datetime-local" label="Fecha y Hora" value={dateTime} onChange={(e: any) => setDateTime(e.target.value)} />
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <Input type="number" label="Monto a Transferir" required min="0.01" max="999999999" step="0.01" value={amount} onChange={(e: any) => setAmount(e.target.value)} />
                    </div>
                    <Select label="Moneda" value={currency} onChange={(e: any) => setCurrency(e.target.value)}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-stone p-6 border border-black/5">
                    <div>
                        <h4 className="font-display font-bold text-red-900 mb-4 text-xs uppercase tracking-widest border-b border-red-900/20 pb-2">Origen (Sale)</h4>
                        <Select label="Espacio" value={fromContext} onChange={(e: any) => setFromContext(e.target.value)}>
                            {state.contexts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                        <Select label="Cuenta" value={fromAccount} onChange={(e: any) => setFromAccount(e.target.value)}>
                            <option value="">Seleccionar Cuenta</option>
                            {getContext(fromContext)?.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </Select>
                         <Select label="Sub (Opcional)" value={fromSub} onChange={(e: any) => setFromSub(e.target.value)}>
                            <option value="">Ninguna</option>
                            {getAccount(fromContext, fromAccount)?.subAccounts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                    </div>

                    <div>
                        <h4 className="font-display font-bold text-green-900 mb-4 text-xs uppercase tracking-widest border-b border-green-900/20 pb-2">Destino (Entra)</h4>
                        <Select label="Espacio" value={toContext} onChange={(e: any) => setToContext(e.target.value)}>
                            {state.contexts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                        <Select label="Cuenta" value={toAccount} onChange={(e: any) => setToAccount(e.target.value)}>
                            <option value="">Seleccionar Cuenta</option>
                            {getContext(toContext)?.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </Select>
                         <Select label="Sub (Opcional)" value={toSub} onChange={(e: any) => setToSub(e.target.value)}>
                            <option value="">Ninguna</option>
                            {getAccount(toContext, toAccount)?.subAccounts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                    </div>
                </div>

                <Input type="text" label="Nota de Referencia" maxLength={200} value={notes} onChange={(e: any) => setNotes(e.target.value)} />
                <button type="submit" className="w-full py-4 bg-onyx hover:bg-graphite text-white font-display font-bold uppercase tracking-widest text-sm transition-all">Ejecutar Transferencia</button>
            </form>
        </Modal>
    );
};

export const SubAccountForm: React.FC<any> = ({ state, onSubmit, onClose }) => {
    const [contextId, setContextId] = useState(state.contexts[0]?.id || '');
    const [accountId, setAccountId] = useState('');
    const [name, setName] = useState('');
    const [target, setTarget] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ 
            contextId, accountId, name, 
            target: target ? Number(target) : undefined,
            startDate
        });
        onClose();
    }

    return (
        <Modal isOpen={true} onClose={onClose} title="Nueva Sub-Cuenta / Meta">
            <form onSubmit={handleSubmit}>
                <Select label="Espacio" value={contextId} onChange={(e: any) => setContextId(e.target.value)}>
                    {state.contexts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Select label="Cuenta Padre" value={accountId} onChange={(e: any) => setAccountId(e.target.value)}>
                    <option value="">Seleccionar Padre</option>
                    {state.contexts.find((c:any) => c.id === contextId)?.accounts.map((a:any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
                <Input type="text" label="Nombre Sub-Cuenta" required maxLength={100} value={name} onChange={(e: any) => setName(e.target.value)} />
                <Input type="number" label="Meta / Target (Opcional)" min="0.01" max="999999999" step="0.01" placeholder="Dejar vacío para sub-cuenta normal" value={target} onChange={(e: any) => setTarget(e.target.value)} />
                <Input type="date" label="Fecha Inicio" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} />
                <button type="submit" className="w-full py-4 bg-onyx text-white font-display font-bold uppercase tracking-widest text-sm">Crear Entidad</button>
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
                <Select label="Espacio Asociado" value={contextId} onChange={(e: any) => { setContextId(e.target.value); setAccountId(''); }}>
                    {state.contexts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                
                <Select label="Cuenta Asociada (Predeterminada)" value={accountId} onChange={(e: any) => { setAccountId(e.target.value); setSubAccountId(''); }}>
                    <option value="">Seleccionar Cuenta</option>
                    {activeContext?.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>

                <Select 
                    label="Sub-Cuenta Asociada (Opcional)" 
                    value={subAccountId} 
                    onChange={(e: any) => setSubAccountId(e.target.value)}
                    disabled={!activeAccount || activeAccount.subAccounts.length === 0}
                >
                    <option value="">{(!activeAccount) ? 'Selecciona una cuenta primero' : (activeAccount.subAccounts.length === 0 ? 'No hay sub-cuentas' : 'Ninguna')}</option>
                    {activeAccount?.subAccounts.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>

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
    const [frequency, setFrequency] = useState(initialData?.frequency || 'MONTHLY');
    // Ensure the date is in YYYY-MM-DD format for <input type="date">
    const [nextRenewal, setNextRenewal] = useState(initialData?.nextRenewal?.split('T')[0] || '');
    const [contextId, setContextId] = useState(initialData?.contextId || state.contexts[0]?.id);
    const [accountId, setAccountId] = useState(initialData?.accountId || '');
    const [subAccountId, setSubAccountId] = useState(initialData?.subAccountId || '');
    const [cardLastFour, setCardLastFour] = useState(initialData?.cardLastFour || '');
    const [active, setActive] = useState(initialData ? initialData.active : true);

    const activeContext = state.contexts.find(c => c.id === contextId);
    const activeAccount = activeContext?.accounts.find(a => a.id === accountId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...(initialData ? { id: initialData.id } : {}),
            name,
            amount: Number(amount),
            currency,
            frequency,
            nextRenewal,
            contextId,
            accountId,
            subAccountId,
            cardLastFour: cardLastFour || undefined,
            active,
            paymentMethod: 'Card'
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
                    <Select label="Moneda" value={currency} onChange={(e: any) => setCurrency(e.target.value)}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </Select>
                </div>
                <Select label="Frecuencia" value={frequency} onChange={(e: any) => setFrequency(e.target.value)}>
                    <option value="WEEKLY">Semanal</option>
                    <option value="MONTHLY">Mensual</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="ANNUAL">Anual</option>
                </Select>
                
                {/* Condition: If paused, date is optional. If active, date is required. */}
                <Input 
                    type="date" 
                    label={`Próxima Renovación ${active ? '*' : '(Opcional)'}`}
                    value={nextRenewal} 
                    required={active} 
                    onChange={(e: any) => setNextRenewal(e.target.value)}
                />

                <Select label="Espacio de Pago" value={contextId} onChange={(e: any) => setContextId(e.target.value)}>
                    {state.contexts.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                <Select label="Cuenta de Pago" value={accountId} onChange={(e: any) => { setAccountId(e.target.value); setSubAccountId(''); }}>
                    <option value="">Seleccionar Cuenta</option>
                    {state.contexts.find((c:any) => c.id === contextId)?.accounts.map((a:any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </Select>
                {activeAccount && activeAccount.subAccounts.length > 0 && (
                     <Select label="Sub-Cuenta de Pago (Opcional)" value={subAccountId} onChange={(e: any) => setSubAccountId(e.target.value)}>
                        <option value="">Ninguna</option>
                        {activeAccount.subAccounts.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                )}
                
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
                            className="w-24 p-3 bg-stone border border-black/10 text-sm font-mono tracking-widest focus:outline-none focus:border-alloy transition-colors text-center"
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
                
                <button type="submit" className="w-full py-4 bg-onyx text-white font-display font-bold uppercase tracking-widest text-sm">
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

                <Select label="Moneda" value={currency} onChange={(e: any) => setCurrency(e.target.value)}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                </Select>

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
                                className="w-full p-4 pl-8 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
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