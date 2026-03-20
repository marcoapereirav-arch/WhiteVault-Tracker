/**
 * Shared currency formatting utilities.
 * Single source of truth for all currency display across the app.
 */

export const formatCurrencyShort = (amount: number, currency: string): string => {
  const symbol = currency === 'USD' ? '$' : (currency === 'EUR' ? '€' : '$');
  const formatted = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return currency === 'EUR' ? `${formatted} ${symbol}` : `${symbol} ${formatted}`;
};

export const formatCurrencyExact = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};
