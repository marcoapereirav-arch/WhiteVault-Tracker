import { AppState, Category, FinancialContext } from "./types";

export const INITIAL_CATEGORIES: Category[] = [
  // Personal Categories
  { id: 'c1', name: 'Comida / Restaurantes', color: '#ef4444', icon: 'Utensils', contextId: 'ctx_personal', accountId: 'p_play' },
  { id: 'c2', name: 'Transporte / Auto', color: '#f59e0b', icon: 'Car', contextId: 'ctx_personal', accountId: 'p_needs' },
  { id: 'c3', name: 'Vivienda', color: '#3b82f6', icon: 'Home', contextId: 'ctx_personal', accountId: 'p_needs' },
  { id: 'c8', name: 'Entretenimiento', color: '#f97316', icon: 'Film', contextId: 'ctx_personal', accountId: 'p_play' },
  
  // Business Categories
  { id: 'c4', name: 'Software / SaaS', color: '#8b5cf6', icon: 'Laptop', contextId: 'ctx_biz1', accountId: 'b1_opex', subAccountId: 'b1_sub_tools' },
  { id: 'c5', name: 'Marketing / Ads', color: '#ec4899', icon: 'Megaphone', contextId: 'ctx_biz1', accountId: 'b1_opex', subAccountId: 'b1_sub_ads' },
  { id: 'c6', name: 'Equipo / Nómina', color: '#10b981', icon: 'Users', contextId: 'ctx_biz1', accountId: 'b1_opex' },
  { id: 'c7', name: 'Impuestos', color: '#64748b', icon: 'DollarSign', contextId: 'ctx_biz1', accountId: 'b1_tax' },
];

export const MOCK_CONTEXTS: FinancialContext[] = [
  {
    id: 'ctx_personal',
    name: 'Finanzas Personales',
    type: 'PERSONAL',
    accounts: [
      { id: 'p_income', name: 'Income (Ingresos)', type: 'INCOME', balance: 2450, subAccounts: [] },
      { id: 'p_needs', name: 'Necesidades Básicas', type: 'EXPENSE', balance: 800, percentageTarget: 50, subAccounts: [] },
      { id: 'p_freedom', name: 'Libertad Financiera', type: 'HOLDING', balance: 12500, percentageTarget: 10, subAccounts: [] },
      { id: 'p_edu', name: 'Educación', type: 'EXPENSE', balance: 150, percentageTarget: 5, subAccounts: [] },
      { id: 'p_lt_save', name: 'Ahorro Largo Plazo', type: 'HOLDING', balance: 4500, percentageTarget: 10, subAccounts: [] },
      { id: 'p_play', name: 'Ocio y Lujos', type: 'EXPENSE', balance: 320, percentageTarget: 10, subAccounts: [] },
      { id: 'p_give', name: 'Donaciones', type: 'EXPENSE', balance: 50, percentageTarget: 5, subAccounts: [] },
      { id: 'p_cash', name: 'Efectivo / Cash', type: 'HOLDING', balance: 120, percentageTarget: 10, subAccounts: [] },
    ]
  },
  {
    id: 'ctx_biz1',
    name: 'Agencia Digital SL',
    type: 'BUSINESS',
    accounts: [
      { id: 'b1_income', name: 'Income (Entrada)', type: 'INCOME', balance: 8500, subAccounts: [] },
      { id: 'b1_profit', name: 'Profit', type: 'HOLDING', balance: 4200, percentageTarget: 5, subAccounts: [] },
      { id: 'b1_owner', name: 'Owner Pay', type: 'HOLDING', balance: 1500, percentageTarget: 50, subAccounts: [] },
      { id: 'b1_tax', name: 'Tax', type: 'HOLDING', balance: 9500, percentageTarget: 15, subAccounts: [] },
      { 
        id: 'b1_opex', 
        name: 'Opex', 
        type: 'EXPENSE', 
        balance: 2300, 
        percentageTarget: 30, 
        subAccounts: [
          { id: 'b1_sub_ads', name: 'Google & Meta Ads', balance: 1200, startDate: '2023-01-01' },
          { id: 'b1_sub_tools', name: 'Herramientas SaaS', balance: 450, startDate: '2023-01-01' },
          { id: 'b1_sub_hiring', name: 'Fondo Contratación', balance: 3500, target: 10000, startDate: '2023-05-01' }
        ] 
      },
    ]
  }
];

const generateDates = (daysBack: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    // Return ISO with Time
    return d.toISOString();
};

export const INITIAL_STATE: AppState = {
  contexts: MOCK_CONTEXTS,
  transactions: [
    // Income Biz
    { id: 't1', type: 'INCOME', amount: 4500, date: generateDates(0), contextId: 'ctx_biz1', accountId: 'b1_income', notes: 'Factura Cliente A' },
    { id: 't2', type: 'INCOME', amount: 3200, date: generateDates(2), contextId: 'ctx_biz1', accountId: 'b1_income', notes: 'Proyecto Web B' },
    { id: 't3', type: 'INCOME', amount: 1500, date: generateDates(5), contextId: 'ctx_biz1', accountId: 'b1_income', notes: 'Consultoría' },
    { id: 't4', type: 'INCOME', amount: 2800, date: generateDates(8), contextId: 'ctx_biz1', accountId: 'b1_income', notes: 'Retainer Mensual' },
    
    // Expenses Biz
    { id: 't5', type: 'EXPENSE', amount: 500, date: generateDates(1), contextId: 'ctx_biz1', accountId: 'b1_opex', subAccountId: 'b1_sub_ads', categoryId: 'c5', notes: 'Campaña Meta Ads' },
    { id: 't6', type: 'EXPENSE', amount: 120, date: generateDates(3), contextId: 'ctx_biz1', accountId: 'b1_opex', subAccountId: 'b1_sub_tools', categoryId: 'c4', notes: 'Suscripción Figma' },
    { id: 't7', type: 'EXPENSE', amount: 1200, date: generateDates(6), contextId: 'ctx_biz1', accountId: 'b1_opex', categoryId: 'c6', notes: 'Pago Freelance Dev' },
    
    // Transfers (Distributions)
    { id: 't8', type: 'TRANSFER', amount: 2000, date: generateDates(1), contextId: 'ctx_biz1', accountId: 'b1_income', toContextId: 'ctx_biz1', toAccountId: 'b1_owner', notes: 'Distribución Owner Pay' },
    
    // Personal Income
    { id: 't9', type: 'INCOME', amount: 2000, date: generateDates(1), contextId: 'ctx_personal', accountId: 'p_income', notes: 'Sueldo Mensual' },
    
    // Personal Expenses
    { id: 't10', type: 'EXPENSE', amount: 85, date: generateDates(0), contextId: 'ctx_personal', accountId: 'p_play', categoryId: 'c1', notes: 'Cena Restaurante' },
    { id: 't11', type: 'EXPENSE', amount: 45, date: generateDates(2), contextId: 'ctx_personal', accountId: 'p_transport', categoryId: 'c2', notes: 'Gasolina' },
    { id: 't12', type: 'EXPENSE', amount: 1200, date: generateDates(4), contextId: 'ctx_personal', accountId: 'p_needs', categoryId: 'c3', notes: 'Renta Apartamento' },
    { id: 't13', type: 'EXPENSE', amount: 15, date: generateDates(7), contextId: 'ctx_personal', accountId: 'p_play', categoryId: 'c8', notes: 'Netflix' },
  ],
  subscriptions: [
    { id: 's1', name: 'Netflix', amount: 15, frequency: 'MONTHLY', nextRenewal: generateDates(-5), contextId: 'ctx_personal', accountId: 'p_play', active: true, paymentMethod: 'Tarjeta', categoryId: 'c8' },
    { id: 's2', name: 'Adobe CC', amount: 60, frequency: 'MONTHLY', nextRenewal: generateDates(-10), contextId: 'ctx_biz1', accountId: 'b1_opex', subAccountId: 'b1_sub_tools', active: true, paymentMethod: 'Tarjeta Corp', categoryId: 'c4' },
    { id: 's3', name: 'Google Workspace', amount: 25, frequency: 'MONTHLY', nextRenewal: generateDates(-2), contextId: 'ctx_biz1', accountId: 'b1_opex', subAccountId: 'b1_sub_tools', active: true, paymentMethod: 'Tarjeta Corp', categoryId: 'c4' },
    { id: 's4', name: 'Hosting Vercel', amount: 20, frequency: 'MONTHLY', nextRenewal: generateDates(-15), contextId: 'ctx_biz1', accountId: 'b1_opex', subAccountId: 'b1_sub_tools', active: true, paymentMethod: 'Paypal', categoryId: 'c4' },
    { id: 's5', name: 'Gimnasio', amount: 45, frequency: 'MONTHLY', nextRenewal: generateDates(-20), contextId: 'ctx_personal', accountId: 'p_needs', active: true, paymentMethod: 'Tarjeta', categoryId: 'c3' },
  ],
  categories: INITIAL_CATEGORIES,
  user: {
    name: 'Alex Builder',
    email: 'alex@whitevault.com',
    currency: 'USD',
    darkMode: false,
    language: 'ES',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }
};