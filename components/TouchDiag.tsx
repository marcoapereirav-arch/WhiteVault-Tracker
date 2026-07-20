// WhiteVault™ — Diagnóstico de toques.  app.whitevault.cc/?diag=1
//
// Réplica exacta de la barra inferior y del botón +. Registra la secuencia REAL
// de eventos de cada toque (touchstart / touchend / click) con sus coordenadas,
// y marca en rojo el toque que NO llegó a disparar la acción. Sirve para ver en
// el dispositivo de verdad qué pasa en el toque que falla, que es justo lo que
// no se reproduce en emuladores.

import React, { useEffect, useRef, useState } from 'react';
import { pressProps } from './Mobile';
import { Icons } from './Icons';

interface Toque {
  n: number;
  destino: string;
  huboClick: boolean;
  startY: number;
  endY: number;
  deriva: number;     // cuánto se movió el dedo
  movidoElemento: number; // cuánto se movió el BOTÓN entre start y end
  ms: number;
}

export const TouchDiag: React.FC = () => {
  const [toques, setToques] = useState<Toque[]>([]);
  const [entorno, setEntorno] = useState<Record<string, string>>({});
  const contador = useRef(0);
  const pendiente = useRef<any>(null);

  useEffect(() => {
    const leer = () => {
      const vv = window.visualViewport;
      setEntorno({
        'Pantalla': `${window.innerWidth}x${window.innerHeight}`,
        'Área visible': vv ? `${Math.round(vv.width)}x${Math.round(vv.height)}` : '—',
        'Desfase visible': vv ? `${Math.round(vv.offsetTop)}px` : '—',
        'Zoom': vv ? String(vv.scale) : '—',
        'Instalada': window.matchMedia('(display-mode: standalone)').matches ? 'SÍ' : 'NO',
      });
    };
    leer();
    window.visualViewport?.addEventListener('resize', leer);
    window.visualViewport?.addEventListener('scroll', leer);
    return () => {
      window.visualViewport?.removeEventListener('resize', leer);
      window.visualViewport?.removeEventListener('scroll', leer);
    };
  }, []);

  const onStart = (destino: string) => (e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLElement;
    pendiente.current = {
      destino,
      startY: Math.round(e.touches[0].clientY),
      startX: Math.round(e.touches[0].clientX),
      elTop: el.getBoundingClientRect().top,
      t: Date.now(),
      click: false,
    };
  };

  const onEnd = () => (e: React.TouchEvent) => {
    const p = pendiente.current;
    if (!p) return;
    const el = e.currentTarget as HTMLElement;
    const endY = Math.round(e.changedTouches[0].clientY);
    const endX = Math.round(e.changedTouches[0].clientX);
    const elTopAhora = el.getBoundingClientRect().top;
    // Se espera 400ms: si el click no llegó en ese tiempo, no llegó.
    window.setTimeout(() => {
      contador.current += 1;
      setToques((prev) => [{
        n: contador.current,
        destino: p.destino,
        huboClick: p.click,
        startY: p.startY,
        endY,
        deriva: Math.round(Math.hypot(endX - p.startX, endY - p.startY)),
        movidoElemento: Math.round(elTopAhora - p.elTop),
        ms: Date.now() - p.t,
      }, ...prev].slice(0, 14));
      pendiente.current = null;
    }, 400);
  };

  const onClick = () => { if (pendiente.current) pendiente.current.click = true; };

  const fallos = toques.filter((t) => !t.huboClick).length;

  const Tab = ({ id }: { id: string }) => (
    <button
      onTouchStart={onStart(id)} onTouchEnd={onEnd()} {...pressProps(onClick)}
      className="flex-1 flex flex-col items-center justify-end py-2 px-1 min-h-[52px] rounded-xl touch-manipulation active:bg-stone active:scale-95 transition-[transform,background-color] duration-75"
    >
      <Icons.Dashboard className="w-[22px] h-[22px] text-graphite" />
      <span className="text-[10px] mt-1">{id}</span>
    </button>
  );

  return (
    <div className="min-h-[100svh] bg-stone text-onyx p-4 pb-44">
      <h1 className="text-xl font-display font-bold mb-1">Diagnóstico de toques</h1>
      <p className="text-xs text-graphite mb-4">
        Toca los botones de abajo (y el <strong>+</strong>) hasta que uno falle. Cuando falle, sale en
        <span className="text-rose-700 font-bold"> rojo</span>. Luego haz captura.
      </p>

      <div className="bg-white border border-onyx/[0.22] rounded-xl p-3 mb-3">
        {Object.entries(entorno).map(([k, v]) => (
          <div key={k} className="flex justify-between text-xs py-0.5">
            <span className="text-graphite">{k}</span><span className="font-mono font-bold">{v}</span>
          </div>
        ))}
      </div>

      <div className={`rounded-xl p-3 mb-3 text-center ${fallos === 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
        <div className="text-[10px] uppercase tracking-widest text-graphite">Toques perdidos</div>
        <div className="text-2xl font-display font-bold tabular">{fallos} / {toques.length}</div>
      </div>

      <div className="bg-white border border-onyx/[0.22] rounded-xl overflow-hidden">
        <div className="grid grid-cols-5 text-[9px] uppercase tracking-wider text-graphite bg-stone px-2 py-1.5 font-bold">
          <span>Botón</span><span>Acción</span><span className="text-right">Dedo</span><span className="text-right">Botón</span><span className="text-right">ms</span>
        </div>
        {toques.length === 0 && <div className="px-2 py-3 text-xs text-graphite">Sin toques todavía…</div>}
        {toques.map((t) => (
          <div key={t.n} className={`grid grid-cols-5 text-xs px-2 py-1.5 border-t border-black/5 ${!t.huboClick ? 'bg-rose-50' : ''}`}>
            <span className="font-bold">{t.destino}</span>
            <span className={t.huboClick ? 'text-emerald-700' : 'text-rose-700 font-bold'}>{t.huboClick ? 'OK' : 'PERDIDO'}</span>
            <span className="text-right font-mono">{t.deriva}px</span>
            <span className="text-right font-mono">{t.movidoElemento > 0 ? '+' : ''}{t.movidoElemento}px</span>
            <span className="text-right font-mono">{t.ms}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-graphite mt-2 leading-snug">
        <strong>Dedo</strong> = cuánto se movió tu dedo. <strong>Botón</strong> = cuánto se movió el botón
        mientras lo tocabas (si no es 0, la pantalla se recoloca sola y ahí está el problema).
      </p>

      {/* Réplica de la barra inferior real */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="relative mx-auto max-w-[480px]">
          <div className="relative bg-white/95 backdrop-blur-xl border-t border-black/5 pb-[max(env(safe-area-inset-bottom),14px)] pt-1.5">
            <div className="flex items-end justify-around relative">
              <Tab id="T1" /><Tab id="T2" />
              <button
                onTouchStart={onStart('FAB +')} onTouchEnd={onEnd()} {...pressProps(onClick)}
                aria-label="Acciones rápidas"
                className="group flex-1 flex items-center justify-center -mt-9 relative z-20 w-[72px] h-[72px] touch-manipulation bg-transparent"
              >
                <span className="w-14 h-14 rounded-full bg-onyx text-white flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.25)] border-[3px] border-stone pointer-events-none transition-transform duration-75 group-active:scale-90">
                  <Icons.Plus className="w-6 h-6" />
                </span>
              </button>
              <Tab id="T3" /><Tab id="T4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
