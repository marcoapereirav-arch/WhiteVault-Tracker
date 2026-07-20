// WhiteVault™ — Diagnóstico de toques.
//
// Pantalla temporal de depuración. Se abre con app.whitevault.cc/?diag=1
// Sirve para medir EN EL DISPOSITIVO REAL si hay desfase entre donde se ve un
// botón y donde aterriza el toque, que es justo el síntoma que no se reproduce
// en emuladores: la animación de pulsado aparece pero la acción no ocurre.

import React, { useEffect, useRef, useState } from 'react';

interface Medida {
  n: number;
  objetivo: string;
  aterrizaEn: string;
  desfaseY: number;
  desfaseX: number;
  fase: string;
}

export const TouchDiag: React.FC = () => {
  const [entorno, setEntorno] = useState<Record<string, string>>({});
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [aciertos, setAciertos] = useState(0);
  const [intentos, setIntentos] = useState(0);
  const contador = useRef(0);

  const leerEntorno = () => {
    const vv = window.visualViewport;
    setEntorno({
      'Pantalla': `${window.innerWidth} x ${window.innerHeight}`,
      'Área visible': vv ? `${Math.round(vv.width)} x ${Math.round(vv.height)}` : 'no disponible',
      'Desfase visible': vv ? `x:${Math.round(vv.offsetLeft)} y:${Math.round(vv.offsetTop)}` : '—',
      'Zoom': vv ? String(vv.scale) : '—',
      'Diferencia altura': vv ? `${Math.round(window.innerHeight - vv.height)} px` : '—',
      'App instalada': window.matchMedia('(display-mode: standalone)').matches ? 'SÍ' : 'NO (navegador)',
      'Scroll': String(Math.round(window.scrollY)),
      'Densidad': String(window.devicePixelRatio),
    });
  };

  useEffect(() => {
    leerEntorno();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', leerEntorno);
    vv?.addEventListener('scroll', leerEntorno);
    window.addEventListener('scroll', leerEntorno);
    return () => {
      vv?.removeEventListener('resize', leerEntorno);
      vv?.removeEventListener('scroll', leerEntorno);
      window.removeEventListener('scroll', leerEntorno);
    };
  }, []);

  // Registra dónde aterriza cada toque comparado con el botón que se tocó.
  const registrar = (etiqueta: string) => (e: React.PointerEvent | React.MouseEvent) => {
    const boton = e.currentTarget as HTMLElement;
    const r = boton.getBoundingClientRect();
    const cx = (e as any).clientX;
    const cy = (e as any).clientY;
    const centroX = r.left + r.width / 2;
    const centroY = r.top + r.height / 2;
    const enEsePunto = document.elementFromPoint(cx, cy) as HTMLElement | null;
    const destino = enEsePunto?.closest('[data-diag]')?.getAttribute('data-diag') || enEsePunto?.tagName || '(nada)';
    const dentro = cy >= r.top && cy <= r.bottom && cx >= r.left && cx <= r.right;

    contador.current += 1;
    setIntentos((v) => v + 1);
    if (dentro && destino === etiqueta) setAciertos((v) => v + 1);
    setMedidas((prev) => [{
      n: contador.current,
      objetivo: etiqueta,
      aterrizaEn: destino,
      desfaseY: Math.round(cy - centroY),
      desfaseX: Math.round(cx - centroX),
      fase: (e as any).type,
    }, ...prev].slice(0, 12));
  };

  const Boton = ({ id }: { id: string }) => (
    <button
      data-diag={id}
      onClick={registrar(id)}
      className="flex-1 h-16 rounded-xl bg-onyx text-white font-display font-bold text-sm active:bg-alloy active:scale-95 transition-[transform,background-color] duration-75 touch-manipulation"
    >
      {id}
    </button>
  );

  return (
    <div className="min-h-[100svh] bg-stone text-onyx p-4 pb-40">
      <h1 className="text-xl font-display font-bold mb-1">Diagnóstico de toques</h1>
      <p className="text-xs text-graphite mb-4">
        Toca los botones de abajo unas 10 veces, como lo harías normalmente. Luego haz captura de toda la pantalla.
      </p>

      <div className="bg-white border border-onyx/[0.22] rounded-xl p-3 mb-4">
        {Object.entries(entorno).map(([k, v]) => (
          <div key={k} className="flex justify-between text-xs py-0.5">
            <span className="text-graphite">{k}</span>
            <span className="font-mono font-bold">{v}</span>
          </div>
        ))}
      </div>

      <div className={`rounded-xl p-3 mb-4 text-center ${aciertos === intentos ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
        <div className="text-[10px] uppercase tracking-widest text-graphite">Toques correctos</div>
        <div className="text-2xl font-display font-bold tabular">{aciertos} / {intentos}</div>
      </div>

      <div className="bg-white border border-onyx/[0.22] rounded-xl overflow-hidden mb-4">
        <div className="grid grid-cols-4 text-[10px] uppercase tracking-wider text-graphite bg-stone px-2 py-1.5 font-bold">
          <span>Tocas</span><span>Llega a</span><span className="text-right">Desf. Y</span><span className="text-right">Desf. X</span>
        </div>
        {medidas.length === 0 && <div className="px-2 py-3 text-xs text-graphite">Sin toques todavía…</div>}
        {medidas.map((m) => (
          <div key={m.n} className={`grid grid-cols-4 text-xs px-2 py-1.5 border-t border-black/5 ${m.objetivo !== m.aterrizaEn ? 'bg-rose-50' : ''}`}>
            <span className="font-bold">{m.objetivo}</span>
            <span className={m.objetivo !== m.aterrizaEn ? 'text-rose-700 font-bold' : ''}>{m.aterrizaEn}</span>
            <span className="text-right font-mono">{m.desfaseY > 0 ? '+' : ''}{m.desfaseY}</span>
            <span className="text-right font-mono">{m.desfaseX > 0 ? '+' : ''}{m.desfaseX}</span>
          </div>
        ))}
      </div>

      {/* Zona alta */}
      <div className="flex gap-2 mb-3">
        <Boton id="A1" /><Boton id="A2" /><Boton id="A3" />
      </div>
      {/* Zona media */}
      <div className="flex gap-2 mb-3">
        <Boton id="B1" /><Boton id="B2" /><Boton id="B3" />
      </div>

      {/* Zona baja, imitando la barra inferior real */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-onyx/[0.22] pb-[max(env(safe-area-inset-bottom),14px)] pt-2 px-2">
        <div className="text-[9px] uppercase tracking-widest text-graphite text-center mb-1">Zona de la barra inferior</div>
        <div className="flex gap-2">
          <Boton id="C1" /><Boton id="C2" /><Boton id="C3" />
        </div>
      </div>
    </div>
  );
};
