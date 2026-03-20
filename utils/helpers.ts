// --- ID Generation ---
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}_${crypto.randomUUID()}`;
};

// --- Form Validation ---
export interface ValidationError {
  field: string;
  message: string;
}

export const validateRequired = (value: string | number | undefined, fieldName: string): ValidationError | null => {
  if (value === undefined || value === null || value === '') {
    return { field: fieldName, message: `${fieldName} es obligatorio` };
  }
  return null;
};

export const validatePositiveNumber = (value: number | string, fieldName: string): ValidationError | null => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num <= 0) {
    return { field: fieldName, message: `${fieldName} debe ser mayor a 0` };
  }
  return null;
};

export const validateMinLength = (value: string, min: number, fieldName: string): ValidationError | null => {
  if (value.length < min) {
    return { field: fieldName, message: `${fieldName} debe tener al menos ${min} caracteres` };
  }
  return null;
};

export const validatePasswordMatch = (password: string, confirm: string): ValidationError | null => {
  if (password !== confirm) {
    return { field: 'confirmPassword', message: 'Las contraseñas no coinciden' };
  }
  return null;
};

export const validateTransaction = (data: {
  amount: string | number;
  contextId: string;
  accountId: string;
  notes: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  const amountErr = validatePositiveNumber(data.amount, 'Monto');
  if (amountErr) errors.push(amountErr);

  const ctxErr = validateRequired(data.contextId, 'Espacio');
  if (ctxErr) errors.push(ctxErr);

  const accErr = validateRequired(data.accountId, 'Cuenta');
  if (accErr) errors.push(accErr);

  const notesErr = validateRequired(data.notes, 'Descripción');
  if (notesErr) errors.push(notesErr);

  return errors;
};

export const validateTransfer = (data: {
  amount: string | number;
  fromAccount: string;
  toAccount: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  const amountErr = validatePositiveNumber(data.amount, 'Monto');
  if (amountErr) errors.push(amountErr);

  const fromErr = validateRequired(data.fromAccount, 'Cuenta origen');
  if (fromErr) errors.push(fromErr);

  const toErr = validateRequired(data.toAccount, 'Cuenta destino');
  if (toErr) errors.push(toErr);

  return errors;
};

export const validateSubscription = (data: {
  name: string;
  amount: string | number;
  active: boolean;
  nextRenewal: string;
  accountId: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];

  const nameErr = validateRequired(data.name, 'Nombre');
  if (nameErr) errors.push(nameErr);

  const amountErr = validatePositiveNumber(data.amount, 'Monto');
  if (amountErr) errors.push(amountErr);

  const accErr = validateRequired(data.accountId, 'Cuenta de pago');
  if (accErr) errors.push(accErr);

  if (data.active && !data.nextRenewal) {
    errors.push({ field: 'nextRenewal', message: 'La fecha de renovación es obligatoria para suscripciones activas' });
  }

  return errors;
};
