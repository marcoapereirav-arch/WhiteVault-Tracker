// WhiteVault™ — Mobile Primitives
// Shared UI building blocks tuned for native-app feel: bottom tab bar,
// bottom sheets, FAB, toast, safe-area shell, headers, gestures.

import React, { useEffect, useRef, useState, useCallback, useMemo, ReactNode } from 'react';
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

// ─── SAFE-AREA SHELL (mobile + desktop with sidebar) ────────────────────
export const MobileShell: React.FC<{ children: ReactNode; sidebar?: ReactNode; className?: string }> = ({ children, sidebar, className = '' }) => {
  return (
    <div className={`min-h-[100svh] bg-stone text-onyx ${className}`}>
      <div className="lg:flex lg:items-stretch lg:min-h-[100svh]">
        {sidebar}
        <div className="mx-auto max-w-[480px] lg:max-w-none lg:flex-1 w-full min-h-[100svh] bg-stone relative">
          {children}
        </div>
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
      <div className={`flex items-center justify-between px-5 lg:px-8 ${large ? 'py-3 lg:py-5' : 'py-3.5 lg:py-4'} lg:max-w-[1200px] lg:mx-auto lg:w-full`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {leading && <div className="flex-shrink-0">{leading}</div>}
          {!large && (
            <div className="min-w-0">
              {subtitle && (
                <div className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.2em] text-graphite">{subtitle}</div>
              )}
              {title && <h1 className="text-base lg:text-xl font-display font-bold text-onyx truncate">{title}</h1>}
            </div>
          )}
        </div>
        {trailing && <div className="flex-shrink-0 flex items-center gap-2">{trailing}</div>}
      </div>
      {large && (title || subtitle) && (
        <div className="px-5 lg:px-8 pb-4 lg:pb-6 lg:max-w-[1200px] lg:mx-auto lg:w-full">
          {subtitle && (
            <div className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.25em] text-gold mb-1.5">{subtitle}</div>
          )}
          {title && <h1 className="text-3xl lg:text-4xl font-display font-bold text-onyx tracking-tight">{title}</h1>}
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
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none lg:hidden"
    >
      <div className="relative mx-auto max-w-[480px] pointer-events-auto">
        {/* El mínimo sube de 8px a 14px: en navegador (sin barra de gestos) los
            botones quedaban tan pegados al borde que iOS se comía el primer
            toque como si fuera un gesto del sistema. */}
        <div className="relative bg-white/95 backdrop-blur-xl border-t border-black/5 pb-[max(env(safe-area-inset-bottom),14px)] pt-1.5">
          <div className="flex items-end justify-around relative">
            {left.map((t) => <TabItemBtn key={t.id} item={t} active={activeId === t.id} onClick={() => onChange(t.id)} />)}
            {/* Hueco reservado: el botón real se pinta fuera de este contenedor */}
            <div className="flex-1" aria-hidden />
            {right.map((t) => <TabItemBtn key={t.id} item={t} active={activeId === t.id} onClick={() => onChange(t.id)} />)}
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-px bg-metallic opacity-60" />
        </div>

        {/* El FAB va FUERA del contenedor con backdrop-blur.
            Antes vivía dentro y sobresalía 28px por arriba con un margen
            negativo. Esa mitad que se salía de un elemento con backdrop-filter
            perdía toques: medido en WebKit real, 3 de cada 20 toques cerca del
            borde superior o inferior no llegaban a disparar la acción, aunque sí
            se veía la animación de pulsado. Ahora es hermano de la barra, con
            zona táctil cuadrada de 72px que NO se transforma; el círculo y su
            animación van en una capa interna sin eventos. */}
        <FabButton onClick={onFabPress} />
      </div>
    </nav>
  );
};

// ─── DESKTOP SIDEBAR ────────────────────────────────────────────────────
interface DesktopSidebarProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  onFabPress: () => void;
  user: { name: string; email: string; avatarUrl?: string };
  onUserClick?: () => void;
  brand?: { isotype: string };
}
export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ tabs, activeId, onChange, onFabPress, user, onUserClick, brand }) => {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[240px] lg:flex-shrink-0 lg:bg-white lg:border-r lg:border-black/5 lg:sticky lg:top-0 lg:h-[100svh] lg:overflow-y-auto">
      {/* Brand */}
      <div className="px-6 pt-7 pb-6 border-b border-black/5">
        <div className="flex items-center gap-3">
          {brand?.isotype && <img src={brand.isotype} alt="WhiteVault" className="w-8 h-8 object-contain" />}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">WhiteVault™</div>
            <div className="text-xs text-graphite mt-0.5">Disciplined Premium</div>
          </div>
        </div>
      </div>

      {/* Quick action */}
      <div className="px-4 pt-4">
        <button
          onClick={() => { haptic('medium'); onFabPress(); }}
          className="w-full h-11 bg-onyx text-white text-xs font-display font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] hover:bg-graphite transition-all"
        >
          <Plus />
          Acción Rápida
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { haptic('selection'); onChange(t.id); }}
              className={`w-full flex items-center gap-3 px-3 h-11 rounded-xl transition-all ${active ? 'bg-stone text-onyx' : 'text-graphite hover:bg-stone/60 hover:text-onyx'}`}
            >
              <Icon className={`w-[18px] h-[18px] ${active ? 'text-gold' : ''}`} />
              <span className="text-sm font-medium tracking-tight">{t.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 bg-gold rounded-full" />}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 pb-5 pt-3 border-t border-black/5">
        <button
          onClick={() => { haptic('selection'); onUserClick?.(); }}
          className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-stone transition-colors"
        >
          <div className="w-9 h-9 bg-onyx rounded-xl flex items-center justify-center text-white font-display font-bold text-sm overflow-hidden flex-shrink-0">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : (user.name.charAt(0) || '?')}
          </div>
          <div className="text-left min-w-0 flex-1">
            <div className="text-sm font-display font-bold text-onyx truncate">{user.name || 'Usuario'}</div>
            <div className="text-[10px] text-graphite truncate">{user.email}</div>
          </div>
          <Icons.Settings className="w-4 h-4 text-graphite flex-shrink-0" />
        </button>
      </div>
    </aside>
  );
};

const Plus: React.FC = () => <Icons.Plus className="w-4 h-4" />;

const TabItemBtn: React.FC<{ item: TabItem; active: boolean; onClick: () => void }> = ({ item, active, onClick }) => {
  const Icon = item.icon;
  return (
    <button
      onClick={() => { haptic('selection'); onClick(); }}
      // min-h-[52px] + touch-manipulation: zona de toque cómoda y sin el
      // retardo de doble-tap de iOS.
      // active:bg-stone además del scale: iOS NO soporta navigator.vibrate, así
      // que el haptic no hace nada ahí. Sin un cambio de color visible el
      // usuario no sabe si el toque entró y acaba pulsando varias veces.
      className="flex-1 flex flex-col items-center justify-end py-2 px-1 min-h-[52px] rounded-xl touch-manipulation active:bg-stone active:scale-95 transition-[transform,background-color] duration-75"
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
    // Zona táctil: cuadrado de 72px centrado sobre el borde superior de la barra.
    // NO lleva transform ni border-radius, así que su área de impacto es un
    // rectángulo simple y constante durante todo el gesto. El aspecto visual
    // (círculo, sombra, animación de pulsado) va en el <span> interior, que está
    // marcado como no interactivo para que nunca intercepte el toque.
    <button
      onClick={() => { haptic('medium'); onClick(); }}
      aria-label="Acciones rápidas"
      className="group absolute left-1/2 -translate-x-1/2 top-0 -translate-y-1/2 w-[72px] h-[72px] flex items-center justify-center z-20 pointer-events-auto touch-manipulation bg-transparent"
    >
      <span className="w-14 h-14 rounded-full bg-onyx text-white flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.25)] border-[3px] border-stone pointer-events-none transition-[transform,background-color] duration-75 group-active:scale-90 group-active:bg-graphite">
        <Icons.Plus className="w-6 h-6" />
      </span>
    </button>
  );
};

// ─── BLOQUEO DE SCROLL COMPARTIDO ───────────────────────────────────────
// Estado a nivel de módulo: lo comparten TODAS las hojas. Ver el comentario en
// el efecto de BottomSheet para el porqué.
let hojasAbiertas = 0;
let scrollGuardado = 0;

const bloquearScroll = () => {
  hojasAbiertas += 1;
  if (hojasAbiertas > 1) return; // ya estaba bloqueado por una hoja de fuera
  scrollGuardado = window.scrollY;
  const body = document.body;
  body.style.position = 'fixed';
  body.style.top = `-${scrollGuardado}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
};

const desbloquearScroll = () => {
  hojasAbiertas = Math.max(0, hojasAbiertas - 1);
  if (hojasAbiertas > 0) return; // quedan hojas abiertas: sigue bloqueado
  const body = document.body;
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  window.scrollTo(0, scrollGuardado);
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
  const [keyboardInset, setKeyboardInset] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);
  const dragging = useRef(false);

  // Bloqueo del scroll de fondo para iOS (overflow:hidden solo no basta ahí).
  //
  // Contado a nivel de módulo porque la app tiene una docena de hojas montadas y
  // se abren anidadas. Cada una bloqueando por su cuenta provocaba: la segunda
  // leía scrollY = 0 (el body ya estaba fijo) y machacaba la posición guardada,
  // y al cerrar la de dentro se desbloqueaba el fondo con la de fuera todavía
  // abierta. Resultado: el fondo scrolleaba detrás de la hoja y al cerrar todo
  // el usuario aparecía arriba del todo. Sólo bloquea la primera y sólo
  // desbloquea la última, conservando la posición original.
  useEffect(() => {
    if (open) {
      setIsMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
      bloquearScroll();
      return () => { desbloquearScroll(); };
    } else if (isMounted) {
      setIsVisible(false);
      const t = setTimeout(() => setIsMounted(false), 280);
      return () => clearTimeout(t);
    }
  }, [open, isMounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Teclado del móvil.
  //
  // El scroll-lock de arriba pone el body en position:fixed, así que iOS ya no
  // puede desplazar la página para dejar a la vista el campo enfocado: el
  // teclado se le queda encima. Lo resolvemos nosotros: medimos cuánto ocupa
  // el teclado con visualViewport, reservamos ese hueco al final del contenido
  // y llevamos el campo enfocado a la zona visible.
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const medir = () => {
      const alto = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // Por debajo de 80px es ruido (barras del navegador), no el teclado.
      setKeyboardInset(alto > 80 ? alto : 0);
    };

    vv.addEventListener('resize', medir);
    vv.addEventListener('scroll', medir);
    medir();
    return () => {
      vv.removeEventListener('resize', medir);
      vv.removeEventListener('scroll', medir);
      setKeyboardInset(0);
    };
  }, [open]);

  // Al enfocar un campo, lo llevamos a la zona visible del área que scrollea.
  //
  // Depende de isMounted además de open: en el render en que `open` pasa a true
  // el componente todavía devuelve null, así que scrollRef.current aún es null y
  // el listener no llegaba a engancharse nunca.
  useEffect(() => {
    if (!open || !isMounted) return;
    const cont = scrollRef.current;
    if (!cont) return;

    let pendiente: number | undefined;
    const alEnfocar = (e: FocusEvent) => {
      const campo = e.target as HTMLElement | null;
      if (!campo || !cont.contains(campo)) return;
      if (!campo.matches('input, textarea, select, [contenteditable]')) return;
      // Se espera a que el teclado termine de subir para no medir a medias.
      window.clearTimeout(pendiente);
      pendiente = window.setTimeout(() => {
        campo.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 320);
    };

    cont.addEventListener('focusin', alEnfocar);
    return () => {
      window.clearTimeout(pendiente);
      cont.removeEventListener('focusin', alEnfocar);
    };
  }, [open, isMounted]);

  // Drag-to-close: only engages when the scrollable content is already at the
  // top (so it doesn't fight with scrolling the list inside the sheet).
  const handleTouchStart = (e: React.TouchEvent) => {
    const atTop = (scrollRef.current?.scrollTop ?? 0) <= 0;
    if (!atTop) { startY.current = null; return; }
    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
    dragging.current = true;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null || !dragging.current) return;
    currentY.current = e.touches[0].clientY;
    const dy = currentY.current - startY.current;
    if (dy > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
      sheetRef.current.style.transition = 'none';
    }
  };
  const handleTouchEnd = () => {
    if (sheetRef.current) {
      sheetRef.current.style.transition = '';
      sheetRef.current.style.transform = '';
    }
    if (startY.current !== null && currentY.current !== null) {
      const dy = currentY.current - startY.current;
      if (dy > 90) { haptic('light'); onClose(); }
    }
    startY.current = null;
    currentY.current = null;
    dragging.current = false;
  };

  if (!isMounted) return null;

  const sizeClass = size === 'full'
    ? 'h-[calc(100svh-env(safe-area-inset-top)-12px)]'
    : size === 'half'
    ? 'max-h-[60svh]'
    : 'max-h-[88svh]';

  // Tope propio de cada tamaño, en CSS. Se combina con el hueco del teclado vía
  // min() para que abrir el teclado NUNCA agrande una hoja: sólo la achique.
  const sizeMax = size === 'full'
    ? 'calc(100svh - env(safe-area-inset-top) - 12px)'
    : size === 'half'
    ? '60svh'
    : '88svh';

  return (
    // Mientras la hoja se va (280 ms de animación) este contenedor sigue en el
    // DOM. Si mantiene los eventos, se traga todos los toques que el usuario
    // haga justo después de cerrar — de ahí el "le doy y no me lo lee".
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center ${isVisible ? '' : 'pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      // Con el teclado abierto SUBIMOS el suelo del contenedor. Encoger la hoja
      // no bastaba: al ser inset-0 + items-end, su borde inferior seguía anclado
      // al fondo del viewport de layout, que en iOS queda DETRÁS del teclado.
      style={keyboardInset > 0 ? { bottom: keyboardInset } : undefined}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        onTouchStart={(e) => { e.stopPropagation(); }}
      />
      <div className="relative w-full max-w-[480px] mx-auto pointer-events-none">
        <div
          ref={sheetRef}
          // pointer-events del panel condicionado igual que el del contenedor:
          // si se queda en auto, el panel sigue tragando toques mientras baja.
          className={`${isVisible ? 'pointer-events-auto' : 'pointer-events-none'} bg-stone ${sizeClass} flex flex-col rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
          style={{
            // Con el teclado fuera, el safe-area lo pone el contenedor (bottom).
            paddingBottom: keyboardInset > 0 ? 0 : 'max(env(safe-area-inset-bottom), 8px)',
            // El alto disponible se reduce por el hueco del teclado, pero SIN
            // pisar el tope propio de cada tamaño (auto / half / full).
            maxHeight: keyboardInset > 0
              ? `min(${sizeMax}, calc(100svh - ${keyboardInset}px - 12px))`
              : undefined,
          }}
        >
          {/* Drag zone covers the handle + header so it's easy to grab.
              A big tap target (close button) sits inside. */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="pt-3 pb-1.5 flex justify-center cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 bg-graphite/30 rounded-full" />
            </div>
            <div className="flex items-center gap-3 px-3 pb-2.5 border-b border-black/5">
              <button
                type="button"
                onClick={() => { haptic('light'); onClose(); }}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-stone hover:bg-concrete active:scale-95 transition-all flex-shrink-0"
                aria-label="Cerrar"
              >
                <Icons.ChevronLeft className="w-5 h-5 text-onyx" />
              </button>
              <div className="flex-1 min-w-0">
                {subtitle && (
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold mb-0.5 truncate">{subtitle}</div>
                )}
                {title && <h2 className="text-base font-display font-bold text-onyx tracking-tight truncate">{title}</h2>}
              </div>
              {trailing && <div className="flex-shrink-0">{trailing}</div>}
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain px-6 pt-4 pb-6"
            // Colchón extra para que el último campo pueda subir por encima del
            // teclado en lugar de quedarse pegado al borde.
            style={keyboardInset > 0 ? { paddingBottom: 24 + keyboardInset * 0.35 } : undefined}
          >
            {children}
          </div>
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
      <div className="fixed left-0 right-0 bottom-24 lg:bottom-8 z-[60] pointer-events-none flex flex-col items-center gap-2 px-4">
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
      <div className="flex items-center justify-between px-5 lg:px-1 mb-2">
        {title && <h3 className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.25em] text-graphite">{title}</h3>}
        {trailing}
      </div>
    )}
    <div className="bg-white mx-3 lg:mx-0 border border-black/5 overflow-hidden rounded-2xl">{children}</div>
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

// ─── SELECT FIELD (native-feel bottom-sheet picker) ────────────────────
export interface SelectFieldOption {
  value: string;
  label: string;
  hint?: string;       // secondary text shown to the right (e.g. balance)
  swatch?: string;     // optional left color dot
  iconBg?: string;     // optional left icon background
  group?: string;      // section header in the picker
  disabled?: boolean;
}
interface SelectFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  required?: boolean;
  title?: string;      // sheet title (defaults to label)
  subtitle?: string;
  searchable?: boolean;
  emptyText?: string;
}
export const SelectField: React.FC<SelectFieldProps> = ({ label, placeholder = 'Seleccionar', value, options, onChange, title, subtitle, searchable, emptyText }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || (o.hint?.toLowerCase().includes(q)));
  }, [options, search]);

  // Group filtered options
  const grouped = useMemo(() => {
    const map = new Map<string, SelectFieldOption[]>();
    filtered.forEach((o) => {
      const g = o.group ?? '';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(o);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="mb-4">
      {label && <label className="block text-[10px] font-bold uppercase tracking-widest text-graphite mb-2">{label}</label>}
      <button
        type="button"
        onClick={() => { haptic('selection'); setOpen(true); }}
        className="w-full h-12 px-4 bg-white border border-onyx/[0.22] rounded-xl flex items-center justify-between gap-3 text-left active:scale-[0.99] hover:border-onyx/[0.34] focus:border-alloy focus:ring-[3px] focus:ring-alloy/20 outline-none transition-all"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {selected?.swatch && (
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: selected.swatch }} />
          )}
          <span className={`text-sm truncate ${selected ? 'text-onyx font-medium' : 'text-graphite/60'}`}>
            {selected?.label || placeholder}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {selected?.hint && <span className="text-xs text-graphite tabular">{selected.hint}</span>}
          <Icons.ChevronDown className="w-4 h-4 text-graphite" />
        </div>
      </button>

      <BottomSheet open={open} onClose={() => { setOpen(false); setSearch(''); }} title={title || label || 'Seleccionar'} subtitle={subtitle} size={options.length > 8 ? 'full' : 'auto'}>
        {searchable && options.length > 6 && (
          <div className="relative mb-3">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite" />
            <input
              type="text"
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-9 pr-4 bg-white border border-onyx/[0.22] rounded-xl text-sm"
              autoFocus
            />
          </div>
        )}
        {grouped.length === 0 ? (
          <div className="text-center text-sm text-graphite py-8">{emptyText || 'Sin opciones'}</div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([groupName, opts]) => (
              <div key={groupName || '_'}>
                {groupName && (
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-graphite mb-2 px-1">{groupName}</div>
                )}
                <div className="space-y-1.5">
                  {opts.map((o) => {
                    const isActive = o.value === value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        disabled={o.disabled}
                        onClick={() => { haptic('selection'); onChange(o.value); setOpen(false); setSearch(''); }}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl transition-all text-left active:scale-[0.99] ${
                          isActive ? 'bg-onyx text-white' : o.disabled ? 'bg-stone/40 text-graphite/40 cursor-not-allowed' : 'bg-white border border-black/5 hover:border-onyx'
                        }`}
                      >
                        {o.swatch && (
                          <span className="w-3 h-3 rounded-full flex-shrink-0 border border-black/10" style={{ backgroundColor: o.swatch }} />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-onyx'}`}>{o.label}</div>
                        </div>
                        {o.hint && (
                          <span className={`text-xs tabular flex-shrink-0 ${isActive ? 'text-gold' : 'text-graphite'}`}>{o.hint}</span>
                        )}
                        {isActive && <Icons.Check className="w-4 h-4 text-gold flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  );
};

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

// ─── AUTO-FIT TEXT ──────────────────────────────────────────────────────
// Shrinks font-size until the text fits its container width (one line, no
// ellipsis). Re-measures on resize and when the value changes.
export const AutoFitText: React.FC<{ text: string; max?: number; min?: number; className?: string; weight?: string }> = ({ text, max = 22, min = 11, className = '', weight = 'font-display font-bold' }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(max);

  useEffect(() => {
    const fit = () => {
      const wrap = wrapRef.current;
      const span = spanRef.current;
      if (!wrap || !span) return;
      let lo = min, hi = max, best = min;
      // Binary search the largest size that fits
      const avail = wrap.clientWidth;
      if (avail <= 0) return;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        span.style.fontSize = `${mid}px`;
        if (span.scrollWidth <= avail) { best = mid; lo = mid; }
        else { hi = mid; }
      }
      span.style.fontSize = '';
      setSize(Math.floor(best * 10) / 10);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [text, max, min]);

  return (
    <div ref={wrapRef} className="w-full overflow-hidden">
      <span ref={spanRef} className={`${weight} ${className} whitespace-nowrap inline-block tabular`} style={{ fontSize: `${size}px`, lineHeight: 1.15 }}>
        {text}
      </span>
    </div>
  );
};

// ─── METRIC CARD ────────────────────────────────────────────────────────
// `values` lets you pass multiple currency lines (each rendered on its own
// row, never mixed). When only one currency is present, looks like a single
// big number. When >1, each shows separately with its currency code.
export const MetricCard: React.FC<{ label: string; value?: string; values?: { amount: string; currency?: string }[]; sublabel?: string; tone?: 'default' | 'income' | 'expense' | 'gold'; onClick?: () => void; trend?: { value: string; positive: boolean } }> = ({ label, value, values, sublabel, tone = 'default', onClick, trend }) => {
  const accent =
    tone === 'income' ? 'border-l-emerald-700' :
    tone === 'expense' ? 'border-l-rose-700' :
    tone === 'gold' ? 'border-l-gold' :
    'border-l-onyx';
  const valueColor =
    tone === 'income' ? 'text-emerald-700' :
    tone === 'expense' ? 'text-rose-700' :
    'text-onyx';
  const list = values && values.length > 0 ? values : (value ? [{ amount: value }] : []);
  return (
    <div
      onClick={onClick ? () => { haptic('selection'); onClick(); } : undefined}
      className={`min-w-[170px] bg-white border border-black/5 border-l-4 ${accent} p-4 ${onClick ? 'active:scale-[0.98] cursor-pointer' : ''} transition-transform`}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-graphite mb-2">{label}</div>
      <div className="space-y-0.5">
        {list.length === 0 && (
          <div className={`text-xl font-display font-bold tracking-tight ${valueColor}`}>—</div>
        )}
        {list.map((v, i) => (
          <div key={i} className="flex items-baseline gap-1.5">
            <div className={`text-xl font-display font-bold tracking-tight ${valueColor} truncate tabular`}>{v.amount}</div>
            {v.currency && list.length > 1 && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-graphite">{v.currency}</span>
            )}
          </div>
        ))}
      </div>
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
