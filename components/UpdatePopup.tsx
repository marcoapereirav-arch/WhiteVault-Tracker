// WhiteVault™ — Update popup.
// Shows a "what's new" sheet whenever the app version bumps. The user taps
// "Actualizar" → we store the seen version + reload to pick up the fresh SW.
//
// To ship an update entry: bump APP_VERSION and prepend to CHANGELOG.

import React, { useEffect, useState } from 'react';
import { Icons } from './Icons';
import { haptic } from './Mobile';
import { BrandLoader } from './BrandLoader';

// REGLA: cada vez que se despliega un cambio, se sube APP_VERSION y se añade
// su entrada arriba del CHANGELOG. Sin eso el usuario no ve el pop-op de
// novedades y se queda con la versión vieja en caché. No se despliega sin esto.
export const APP_VERSION = '2026.07.20.5';

interface ChangeEntry {
  version: string;
  date: string;       // display date
  items: string[];    // short, to-the-point checklist
}

// Most recent first. Only the latest entry is shown in the popup, but the
// list lets us keep history if we ever want a full changelog screen.
export const CHANGELOG: ChangeEntry[] = [
  {
    version: '2026.07.20.5',
    date: '20 jul 2026',
    items: [
      'Los botones responden al instante: se acabó tener que tocar dos veces',
      'La app abre en 1,4 segundos en vez de 18',
      'La app responde al doble de rápido al tocar (era lo que se comía los toques)',
      'Botón + con zona de toque más grande',
      'La fecha y la hora ahora usan el selector propio de tu iPhone',
      'La pantalla ya no se recoloca sola mientras tocas',
      'Los botones ahora se iluminan al tocarlos, para que sepas que entró',
      'El fondo ya no se desplaza solo al cerrar ventanas anidadas',
      'Arreglado: la app se quedaba clavada en una versión antigua guardada en el móvil',
      'Ahora cada actualización desaloja la anterior y llega de verdad',
      'El calendario ya selecciona el día que tocas (antes fallaba una fila)',
      'La hora del calendario ya responde al dedo',
      'Al escribir, la pantalla sube y el teclado ya no tapa el campo',
      'Los botones de abajo responden siempre, sin tener que insistir',
      'El botón + abre a la primera',
      'Lo que acabas de mover se queda a la vista hasta el siguiente movimiento',
    ],
  },
  {
    version: '2026.07.19',
    date: '19 jul 2026',
    items: [
      'Nuevo: Metas (subes guardando) y Objetivos (subes pagando)',
      'Nueva pestaña en Bóvedas para ver todas tus metas y objetivos juntos',
      'Ya puedes borrar, renombrar y mover sub-cuentas',
      'Ya puedes renombrar tus cuentas',
      'Abono sin pago: baja una deuda sin que salga dinero',
      'Filtro de prioridad para saber qué pagar antes',
      'Objetivos saldados se archivan solos, con su historial',
      'Eliminar un espacio de negocio, ahora a la vista en Bóvedas',
      'Todos los campos de texto se ven mucho mejor',
    ],
  },
  {
    version: '2026.06.06',
    date: '6 jun 2026',
    items: [
      'Pantalla de carga rediseñada, elegante y on-brand',
      'Animación de carga al actualizar la app',
      'Arreglada la franja blanca al abrir en el móvil',
      'Próximas Renovaciones: ahora muestra los próximos 7 días',
      'Ventana "Más" se cierra bien (arrastrar / atrás)',
      'Más espacio entre secciones del inicio',
    ],
  },
  {
    version: '2026.06.05',
    date: '5 jun 2026',
    items: [
      'Movimiento del Periodo rediseñado, más limpio',
      'Importes se ajustan solos: nunca más puntos suspensivos',
      'Cada moneda en su propia línea, ordenadas igual en todo',
      'Próximas Renovaciones ya no repite las vencidas',
      'Gráficos: sin popup molesto al tocar en el móvil',
      'Calendario: al tocar un día ves sus suscripciones',
      'Ventanas más fáciles de cerrar (sin scroll de fondo)',
      'Switches arreglados y mejor espaciado en cabeceras',
    ],
  },
  {
    version: '2026.06.04',
    date: '4 jun 2026',
    items: [
      'Ajustar Saldo: cuadra una cuenta con tu saldo real sin contar como ingreso',
      'Filtro por moneda en Libro, Suscripciones, Categorías y Dashboard',
      'Flecha atrás en todas las ventanas',
      'Historial de pagos en cada suscripción',
      'Frecuencia flexible: cada N días/semanas/meses/años',
      'Filtros de espacio independientes por sección',
    ],
  },
];

const SEEN_KEY = 'wv_seen_version';

export const UpdatePopup: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [reloading, setReloading] = useState(false);
  const latest = CHANGELOG[0];

  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEN_KEY);
      // First-ever load: mark as seen silently (don't nag new users).
      if (!seen) {
        localStorage.setItem(SEEN_KEY, APP_VERSION);
        return;
      }
      if (seen !== APP_VERSION) {
        setOpen(true);
      }
    } catch {
      /* localStorage unavailable — skip */
    }
  }, []);

  const handleUpdate = () => {
    haptic('medium');
    try { localStorage.setItem(SEEN_KEY, APP_VERSION); } catch {}
    // Show the branded loader, then reload to pick up the freshest SW + bundle.
    setReloading(true);
    setTimeout(() => window.location.reload(), 400);
  };

  if (reloading) return <BrandLoader label="Actualizando" fullscreen />;
  if (!open || !latest) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-[440px] mx-auto bg-stone rounded-t-[28px] sm:rounded-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.3)] wv-pop-in" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
        {/* Header */}
        <div className="px-6 pt-7 pb-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-onyx flex items-center justify-center mb-4">
            <Icons.Sparkles className="w-6 h-6 text-gold" />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">Actualización · {latest.date}</div>
          <h2 className="text-2xl font-display font-bold text-onyx tracking-tight mt-1">Novedades</h2>
        </div>

        {/* Checklist */}
        <div className="px-6 max-h-[50svh] overflow-y-auto">
          <div className="bg-white border border-black/5 rounded-2xl divide-y divide-black/5">
            {latest.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5">
                <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icons.Check className="w-3 h-3 text-emerald-700" />
                </div>
                <span className="text-sm text-onyx leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="px-6 pt-5">
          <button
            onClick={handleUpdate}
            className="w-full h-14 bg-onyx text-white font-display font-bold uppercase tracking-widest text-sm rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Icons.Refresh className="w-4 h-4" />
            Actualizar
          </button>
          <div className="text-center text-[10px] text-graphite/60 mt-3 uppercase tracking-widest">WhiteVault™ · v{APP_VERSION}</div>
        </div>
      </div>
    </div>
  );
};
