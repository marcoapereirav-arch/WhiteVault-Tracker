// WhiteVault™ — Mobile Primitives
// Shared UI building blocks tuned for native-app feel: bottom tab bar,
// bottom sheets, FAB, toast, safe-area shell, headers, gestures.

import React, { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { Icons } from './Icons';

// ─── HAPTICS ────────────────────────────────────────────────────────────
export const haptic = (style: 'light' | 'medium' | 'heavy' | 'selection' = 'light') => {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  const map = {
    light: 8,
    medium: 14,
    heavy: 24,
    selection: 5,
  } as const;
  try { navigator.vibrate(map[style]); } catch {}
};

// ─── SAFE-AREA SHELL ────────────────────────────────────────────────────
export const MobileShell: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-[100dvh] bg-stone text-onyx ${className}`}>
      <div className="mx-auto max-w-[480px] min-h-[100dvh] bg-stone relative overflow-hidden">
        {children}
      </div>
    </div>
  );
};

// ─── HEADER ─────────────────────────────────────────────────────────────
interface HeaderProps {
  title?: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  large?: boolean;
  transparent?: boolean;
}
export const MobileHeader: React.FC<HeaderProps> = ({ title, subtitle, leading, trailing, large = false, transparent = false }) => {
  return (
    <header
      className={`sticky top-0 z-30 ${transparent ? 'bg-transparent' : 'bg-stone/80 backdrop-blur-xl'} ${transparent ? '' : 'border-b border-black/5'} pt-[env(safe-area-inset-top)]`}
    >
      <div className={`flex items-center justify-between px-5 ${large ? 'py-3' : 'py-3.5'}`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {leading && <div className="flex-shrink-0">{leading}</div>}
          {!large && (
            <div className="min-w-0">
              {subtitle && (
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-graphite">{subtitle}</div>
              )}
              {title && <h1 className="text-base font-display font-bold text-onyx truncate">{title}</h1>}
            </div>
          )}
        </div>
        {trailing && <div className="flex-shrink-0 flex items-center gap-2">{trailing}</div>}
      </div>
      {large && (title || subtitle) && (
        <div className="px-5 pb-4">
          {subtitle && (
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold mb-1.5">{subtitle}</div>
          )}
          {title && <h1 className="text-3xl font-display font-bold text-onyx tracking-tight">{title}</h1>}
        </div>
      )}
    </header>
  );
};

export const HeaderButton: React.FC<{ onClick?: () => void; children: ReactNode; ariaLabel?: string; badge?: number }> = ({ onClick, children, ariaLabel, badge }) => {
  return (
    <button
      onClick={() => { haptic('light'); onClick?.(); }}
      aria-label={ariaLabel}
      className="relative w-10 h-10 rounded-full flex items-center justify-center bg-white border border-black/5 shadow-sm active:scale-95 transition-transform"
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gold text-onyx text-[10px] font-bold rounded-full flex items-center justify-center border border-stone">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
};

// ─── BOTTOM TAB BAR ─────────────────────────────────────────────────────
export interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface BottomTabBarProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  onFabPress: () => void;
}
export const BottomTabBar: React.FC<BottomTabBarProps> = ({ tabs, activeId, onChange, onFabPress }) => {
  const left = tabs.slice(0, 2);
  const right = tabs.slice(2);
  return (
    <nav
      role="navigation"
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
    >
      <div className="mx-auto max-w-[480px] pointer-events-auto">
        <div className="relative bg-white/95 backdrop-blur-xl border-t border-black/5 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5">
          <div className="flex items-end justify-around relative">
            {left.map((t) => <TabItemBtn key={t.id} item={t} active={activeId === t.id} onClick={() => onChange(t.id)} />)}
            <FabButton onClick={onFabPress} />
            {right.map((t) => <TabItemBtn key={t.id} item={t} active={activeId === t.id} onClick={() => onChange(t.id)} />)}
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-px bg-metallic opacity-60" />
        </div>
      </div>
    </nav>
  );
};

const TabItemBtn: React.FC<{ item: TabItem; active: boolean; onClick: () => void }> = ({ item, active, onClick }) => {
  const Icon = item.icon;
  return (
    <button
      onClick={() => { haptic('selection'); onClick(); }}
      className="flex-1 flex flex-col items-center justify-end py-2 px-1 active:scale-95 transition-transform"
      aria-current={active ? 'page' : undefined}
    >
      <div className={`relative w-7 h-7 flex items-center justify-center transition-all ${active ? 'text-onyx' : 'text-graphite/60'}`}>
        <Icon className="w-[22px] h-[22px]" />
        {active && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-gold rounded-full" />}
      </div>
      <span className={`text-[10px] font-medium tracking-tight mt-1 ${active ? 'text-onyx' : 'text-graphite/60'}`}>
        {item.label}
      </span>
    </button>
  );
};

const FabButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <div className="flex-1 flex items-center justify-center -mt-7 relative">
      <button
        onClick={() => { haptic('medium'); onClick(); }}
        className="w-14 h-14 rounded-full bg-onyx text-white flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.25)] active:scale-90 transition-transform border-[3px] border-stone"
        aria-label="Acciones rápidas"
      >
        <Icons.Plus className="w-6 h-6" />
      </button>
    </div>
  );
};

// ─── BOTTOM SHEET ───────────────────────────────────────────────────────
interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  size?: 'auto' | 'half' | 'full';
  trailing?: ReactNode;
}
export const BottomSheet: React.FC<BottomSheetProps> = ({ open, onClose, title, subtitle, children, size = 'auto', trailing }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
      document.body.style.overflow = 'hidden';
    } else if (isMounted) {
      setIsVisible(false);
      const t = setTimeout(() => setIsMounted(false), 280);
      document.body.style.overflow = '';
      return () => clearTimeout(t);
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, isMounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    currentY.current = e.touches[0].clientY;
    const dy = currentY.current - startY.current;
    if (dy > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };
  const handleTouchEnd = () => {
    if (startY.current === null || currentY.current === null) return;
    const dy = currentY.current - startY.current;
    if (sheetRef.current) sheetRef.current.style.transform = '';
    if (dy > 100) { haptic('light'); onClose(); }
    startY.current = null;
    currentY.current = null;
  };

  if (!isMounted) return null;

  const sizeClass = size === 'full'
    ? 'h-[calc(100dvh-env(safe-area-inset-top)-12px)]'
    : size === 'half'
    ? 'max-h-[60dvh]'
    : 'max-h-[88dvh]';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div className="relative w-full max-w-[480px] mx-auto pointer-events-none">
        <div
          ref={sheetRef}
          className={`pointer-events-auto bg-stone ${sizeClass} flex flex-col rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
        >
          <div
            className="pt-2.5 pb-1 flex justify-center cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="w-10 h-1 bg-graphite/30 rounded-full" />
          </div>
          {(title || trailing) && (
            <div className="flex items-start justify-between px-6 pt-2 pb-3 border-b border-black/5">
              <div>
                {subtitle && (
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold mb-1">{subtitle}</div>
                )}
                {title && <h2 className="text-xl font-display font-bold text-onyx tracking-tight">{title}</h2>}
              </div>
              {trailing}
            </div>
          )}
          <div className="flex-1 overflow-y-auto overscroll-contain px-6 pt-4 pb-6">{children}</div>
        </div>
      </div>
    </div>
  );
};

// ─── FAB ACTION SHEET ───────────────────────────────────────────────────
export const FabSheet: React.FC<{ open: boolean; onClose: () => void; actions: { id: string; label: string; description?: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void; tone?: 'default' | 'income' | 'expense' }[] }> = ({ open, onClose, actions }) => {
  return (
    <BottomSheet open={open} onClose={onClose} title="Acción Rápida" subtitle="Registro Financiero">
      <div className="grid gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          const toneStyle =
            a.tone === 'income' ? 'border-l-4 border-l-emerald-700' :
            a.tone === 'expense' ? 'border-l-4 border-l-rose-700' :
            'border-l-4 border-l-onyx';
          return (
            <button
              key={a.id}
              onClick={() => { haptic('medium'); a.onClick(); onClose(); }}
              className={`group flex items-center gap-4 p-4 bg-white border border-black/5 ${toneStyle} hover:border-alloy active:scale-[0.98] transition-all text-left`}
            >
              <div className="w-11 h-11 rounded-xl bg-stone border border-black/5 flex items-center justify-center group-hover:bg-onyx group-hover:text-white transition-colors flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-display font-bold text-onyx tracking-tight">{a.label}</div>
                {a.description && <div className="text-xs text-graphite mt-0.5">{a.description}</div>}
              </div>
              <Icons.ChevronRight className="w-4 h-4 text-graphite group-hover:text-onyx transition-colors" />
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
};

// ─── TOAST ──────────────────────────────────────────────────────────────
interface Toast { id: string; message: string; tone?: 'default' | 'success' | 'error' | 'info'; action?: { label: string; onClick: () => void } }
const ToastContext = React.createContext<{ show: (t: Omit<Toast, 'id'>) => void } | null>(null);
export const useToast = () => {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
};
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((t: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((p) => [...p, { ...t, id }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed left-0 right-0 bottom-24 z-[60] pointer-events-none flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-[440px] w-full px-4 py-3 bg-onyx text-white shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300 ${
              t.tone === 'success' ? 'border-l-4 border-l-emerald-400' :
              t.tone === 'error' ? 'border-l-4 border-l-rose-400' :
              t.tone === 'info' ? 'border-l-4 border-l-gold' : ''
            }`}
          >
            <span className="text-sm flex-1">{t.message}</span>
            {t.action && (
              <button
                onClick={() => { t.action!.onClick(); setToasts((p) => p.filter((x) => x.id !== t.id)); }}
                className="text-xs font-bold uppercase tracking-widest text-gold"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// ─── SEGMENTED CONTROL ──────────────────────────────────────────────────
export const Segmented: React.FC<{ options: { id: string; label: string }[]; activeId: string; onChange: (id: string) => void; size?: 'sm' | 'md' }> = ({ options, activeId, onChange, size = 'md' }) => {
  const padding = size === 'sm' ? 'py-1.5 text-[11px]' : 'py-2 text-xs';
  return (
    <div className="bg-concrete/40 p-1 rounded-full inline-flex w-full">
      {options.map((o) => {
        const active = o.id === activeId;
        return (
          <button
            key={o.id}
            onClick={() => { haptic('selection'); onChange(o.id); }}
            className={`flex-1 ${padding} px-3 rounded-full font-medium transition-all uppercase tracking-widest text-center ${active ? 'bg-white text-onyx shadow-sm' : 'text-graphite'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
};

// ─── LIST PRIMITIVES ────────────────────────────────────────────────────
export const ListSection: React.FC<{ title?: string; trailing?: ReactNode; children: ReactNode }> = ({ title, trailing, children }) => (
  <section className="mb-6">
    {(title || trailing) && (
      <div className="flex items-center justify-between px-5 mb-2">
        {title && <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-graphite">{title}</h3>}
        {trailing}
      </div>
    )}
    <div className="bg-white mx-3 border border-black/5 overflow-hidden rounded-2xl">{children}</div>
  </section>
);

export const ListRow: React.FC<{ leading?: ReactNode; title: string; subtitle?: string; trailing?: ReactNode; onClick?: () => void; danger?: boolean; chevron?: boolean }> = ({ leading, title, subtitle, trailing, onClick, danger, chevron = true }) => {
  const interactive = !!onClick;
  return (
    <div
      onClick={onClick ? () => { haptic('selection'); onClick(); } : undefined}
      className={`flex items-center gap-3 px-4 py-3 border-b border-black/5 last:border-b-0 ${interactive ? 'active:bg-stone cursor-pointer' : ''}`}
    >
      {leading && <div className="flex-shrink-0">{leading}</div>}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${danger ? 'text-rose-700' : 'text-onyx'} truncate`}>{title}</div>
        {subtitle && <div className="text-xs text-graphite mt-0.5 truncate">{subtitle}</div>}
      </div>
      {trailing && <div className="flex-shrink-0 text-right">{trailing}</div>}
      {interactive && chevron && !trailing && <Icons.ChevronRight className="w-4 h-4 text-graphite/60 flex-shrink-0" />}
    </div>
  );
};

// ─── PRESS-TO-CONFIRM ────────────────────────────────────────────────────
export const PressButton: React.FC<{ onClick?: () => void; children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; full?: boolean; disabled?: boolean; type?: 'button' | 'submit' }> = ({ onClick, children, variant = 'primary', size = 'md', full, disabled, type = 'button' }) => {
  const sizes = { sm: 'h-9 px-4 text-xs', md: 'h-11 px-5 text-sm', lg: 'h-14 px-6 text-base' };
  const variants = {
    primary: 'bg-onyx text-white hover:bg-gold hover:text-onyx',
    secondary: 'bg-white border border-black/10 text-onyx hover:border-onyx',
    ghost: 'bg-transparent text-onyx hover:bg-stone',
    danger: 'bg-rose-700 text-white hover:bg-rose-800',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={() => { haptic('medium'); onClick?.(); }}
      className={`${sizes[size]} ${variants[variant]} ${full ? 'w-full' : ''} font-display font-bold tracking-tight uppercase rounded-xl transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
    >
      {children}
    </button>
  );
};

// ─── PULL TO REFRESH ────────────────────────────────────────────────────
export const PullToRefresh: React.FC<{ onRefresh: () => Promise<void>; children: ReactNode }> = ({ onRefresh, children }) => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const THRESHOLD = 70;

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPull(Math.min(dy * 0.6, 100));
  };
  const onTouchEnd = async () => {
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      haptic('medium');
      try { await onRefresh(); } finally { setRefreshing(false); setPull(0); }
    } else {
      setPull(0);
    }
    startY.current = null;
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex justify-center items-center transition-all overflow-hidden"
        style={{ height: refreshing ? 50 : pull, opacity: pull / THRESHOLD }}
      >
        <div className={`w-5 h-5 border-2 border-onyx border-r-transparent rounded-full ${refreshing ? 'animate-spin' : ''}`} style={{ transform: refreshing ? '' : `rotate(${pull * 3}deg)` }} />
      </div>
      {children}
    </div>
  );
};

// ─── EMPTY STATE ────────────────────────────────────────────────────────
export const EmptyState: React.FC<{ icon: React.ComponentType<{ className?: string }>; title: string; description?: string; action?: { label: string; onClick: () => void } }> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-white border border-black/5 flex items-center justify-center mb-4">
      <Icon className="w-7 h-7 text-graphite" />
    </div>
    <h3 className="text-base font-display font-bold text-onyx tracking-tight mb-1">{title}</h3>
    {description && <p className="text-sm text-graphite max-w-[280px]">{description}</p>}
    {action && (
      <button
        onClick={() => { haptic('medium'); action.onClick(); }}
        className="mt-5 px-5 h-10 bg-onyx text-white text-xs font-display font-bold uppercase tracking-widest rounded-xl active:scale-95 transition-transform"
      >
        {action.label}
      </button>
    )}
  </div>
);

// ─── SKELETON ───────────────────────────────────────────────────────────
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-concrete/40 animate-pulse rounded-md ${className}`} />
);

// ─── ICON CIRCLE ────────────────────────────────────────────────────────
export const IconCircle: React.FC<{ children: ReactNode; tone?: 'default' | 'income' | 'expense' | 'transfer' | 'gold' | 'dark'; size?: 'sm' | 'md' | 'lg'; bgColor?: string }> = ({ children, tone = 'default', size = 'md', bgColor }) => {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  const tones = {
    default: 'bg-stone text-onyx border border-black/5',
    income: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    expense: 'bg-rose-50 text-rose-700 border border-rose-200',
    transfer: 'bg-sky-50 text-sky-700 border border-sky-200',
    gold: 'bg-alloy/10 text-onyx border border-alloy/30',
    dark: 'bg-onyx text-white',
  };
  return (
    <div
      className={`${sizes[size]} ${bgColor ? '' : tones[tone]} rounded-xl flex items-center justify-center flex-shrink-0`}
      style={bgColor ? { backgroundColor: bgColor + '20', color: bgColor, borderColor: bgColor + '30', borderWidth: 1 } : undefined}
    >
      {children}
    </div>
  );
};

// ─── METRIC CARD ────────────────────────────────────────────────────────
export const MetricCard: React.FC<{ label: string; value: string; sublabel?: string; tone?: 'default' | 'income' | 'expense' | 'gold'; onClick?: () => void; trend?: { value: string; positive: boolean } }> = ({ label, value, sublabel, tone = 'default', onClick, trend }) => {
  const accent =
    tone === 'income' ? 'border-l-emerald-700' :
    tone === 'expense' ? 'border-l-rose-700' :
    tone === 'gold' ? 'border-l-gold' :
    'border-l-onyx';
  const valueColor =
    tone === 'income' ? 'text-emerald-700' :
    tone === 'expense' ? 'text-rose-700' :
    'text-onyx';
  return (
    <div
      onClick={onClick ? () => { haptic('selection'); onClick(); } : undefined}
      className={`min-w-[160px] bg-white border border-black/5 border-l-4 ${accent} p-4 ${onClick ? 'active:scale-[0.98] cursor-pointer' : ''} transition-transform`}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-graphite mb-2">{label}</div>
      <div className={`text-xl font-display font-bold tracking-tight ${valueColor} truncate`}>{value}</div>
      <div className="flex items-center gap-2 mt-1.5">
        {sublabel && <div className="text-[11px] text-graphite truncate">{sublabel}</div>}
        {trend && (
          <span className={`text-[11px] font-bold ${trend.positive ? 'text-emerald-700' : 'text-rose-700'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};
