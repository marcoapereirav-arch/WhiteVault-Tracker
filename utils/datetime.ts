// WhiteVault™ — Timezone-aware date helpers.
//
// JavaScript's native `Date` interpretations are local-to-the-browser, which
// breaks when the browser's timezone differs from the user's saved timezone
// (e.g. user in Madrid but PWA reports UTC). All datetime conversions in
// pickers and forms MUST go through these helpers using the user's timezone.

// Format an ISO timestamp as "YYYY-MM-DDTHH:MM" suitable for a datetime
// picker, with components interpreted in the target timezone (not browser).
export const isoToLocalPickerString = (iso: string, tz: string): string => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: tz,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
    // Intl 'hour: 2-digit' with hour12:false may return "24" at midnight in some implementations.
    const hour = get('hour') === '24' ? '00' : get('hour');
    return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
  } catch {
    return '';
  }
};

// Same as above but date-only ("YYYY-MM-DD").
export const isoToLocalDateString = (iso: string, tz: string): string => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      timeZone: tz,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return '';
  }
};

// Build "now" as picker string in user's timezone (used for new transactions).
export const nowAsPickerString = (tz: string): string => isoToLocalPickerString(new Date().toISOString(), tz);

// Parse a "YYYY-MM-DDTHH:MM" string entered by the user (interpreted as local
// time in the given timezone) and return a Date object representing the
// correct UTC instant.
//
// Algorithm: build a naive UTC date with the given components, then ask the
// browser what that UTC instant displays as in the target timezone. The
// difference between requested vs. shown is the timezone offset; apply it.
export const localPickerStringToDate = (local: string, tz: string): Date => {
  if (!local) return new Date();
  const [datePart = '', timePart = '12:00'] = local.split('T');
  const [y, m, d] = datePart.split('-').map((n) => parseInt(n, 10));
  const [h = 0, mi = 0] = timePart.split(':').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return new Date(local);

  const naiveUtc = new Date(Date.UTC(y, m - 1, d, h, mi));
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: tz,
    }).formatToParts(naiveUtc);
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value || '0', 10);
    const shownHour = get('hour') === 24 ? 0 : get('hour');
    const shown = Date.UTC(get('year'), get('month') - 1, get('day'), shownHour, get('minute'));
    const offsetMs = naiveUtc.getTime() - shown;
    return new Date(naiveUtc.getTime() + offsetMs);
  } catch {
    return new Date(local);
  }
};

// Convert a user-entered picker string directly to an ISO UTC string for DB.
export const localPickerStringToIso = (local: string, tz: string): string => {
  return localPickerStringToDate(local, tz).toISOString();
};

// Format an ISO timestamp for human display in the given timezone.
export const formatDateHuman = (iso: string, tz: string, includeTime = true): string => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const opts: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: '2-digit', day: '2-digit',
      timeZone: tz,
    };
    if (includeTime) {
      opts.hour = '2-digit';
      opts.minute = '2-digit';
    }
    return new Intl.DateTimeFormat('es-ES', opts).format(d);
  } catch {
    return iso;
  }
};
