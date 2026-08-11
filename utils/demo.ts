import { FinancialContext } from '../types';

// ─── ENTORNO DEMO (solo lectura) ─────────────────────────────────────────
// Genera una copia de la estructura real (mismos espacios, cuentas, sub-cuentas
// y objetivos) pero con los SALDOS escalados para que el patrimonio total sea
// exactamente el objetivo pedido (p.ej. 42.948 € / 22.938 $), conservando la
// forma del reparto real. NO toca los datos reales: se calcula al vuelo para la
// vista. Las transacciones (Libro) siguen siendo las reales — el Demo comparte
// los mismos gastos e ingresos.

export const DEMO_TARGETS: Record<string, number> = { EUR: 42948, USD: 22938 };

const sumByCurrency = (contexts: FinancialContext[]): Record<string, number> => {
  const totals: Record<string, number> = {};
  for (const c of contexts) {
    for (const a of c.accounts) {
      for (const [cur, v] of Object.entries(a.balances || {})) totals[cur] = (totals[cur] || 0) + (v || 0);
      for (const s of a.subAccounts || []) {
        for (const [cur, v] of Object.entries(s.balances || {})) totals[cur] = (totals[cur] || 0) + (v || 0);
      }
    }
  }
  return totals;
};

export const buildDemoContexts = (
  contexts: FinancialContext[],
  targets: Record<string, number> = DEMO_TARGETS
): FinancialContext[] => {
  const totals = sumByCurrency(contexts);

  // Factor de escala por moneda. Si una moneda objetivo no tiene nada en la
  // estructura real, no se puede escalar proporcionalmente: se colocará entera
  // en la primera cuenta (fallback más abajo).
  const factor: Record<string, number | null> = {};
  for (const cur of Object.keys(targets)) {
    factor[cur] = totals[cur] && Math.abs(totals[cur]) > 1e-9 ? targets[cur] / totals[cur] : null;
  }

  const scale = (bal: Record<string, number>): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const [cur, v] of Object.entries(bal || {})) {
      if (targets[cur] != null && factor[cur] != null) {
        out[cur] = Math.round((v || 0) * (factor[cur] as number) * 100) / 100;
      } else {
        out[cur] = v; // moneda sin objetivo: se deja igual
      }
    }
    return out;
  };

  const demo: FinancialContext[] = contexts.map((c) => ({
    ...c,
    accounts: c.accounts.map((a) => ({
      ...a,
      balances: scale(a.balances || {}),
      // Los objetivos (PAYMENT) son contadores: su saldo se queda a 0 igual que
      // en la estructura real. Las metas (SAVING) y subs normales se escalan.
      subAccounts: (a.subAccounts || []).map((s) => ({
        ...s,
        balances: s.goalKind === 'PAYMENT' ? {} : scale(s.balances || {}),
      })),
    })),
  }));

  // Ajuste fino: por el redondeo, la suma escalada puede quedar a unos céntimos
  // del objetivo. Se corrige la diferencia en la cuenta con mayor saldo de esa
  // moneda, para que el total sea EXACTO. Y si una moneda no tenía nada que
  // escalar, se coloca entera ahí.
  const demoTotals = sumByCurrency(demo);
  for (const cur of Object.keys(targets)) {
    const diff = Math.round((targets[cur] - (demoTotals[cur] || 0)) * 100) / 100;
    if (Math.abs(diff) < 0.005) continue;
    // localizar la cuenta con mayor saldo en esta moneda (o la primera con saldo,
    // o la primera cuenta a secas si la moneda no existía)
    let best: { balances: Record<string, number> } | null = null;
    let bestVal = -Infinity;
    for (const c of demo) {
      for (const a of c.accounts) {
        const v = a.balances[cur] || 0;
        if (v > bestVal) { bestVal = v; best = a; }
      }
    }
    if (!best) best = demo[0]?.accounts[0] || null;
    if (best) best.balances[cur] = Math.round(((best.balances[cur] || 0) + diff) * 100) / 100;
  }

  return demo;
};
