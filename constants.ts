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
  contexts: [],
  transactions: [],
  subscriptions: [],
  categories: [],
  user: {
    name: 'Usuario',
    email: '',
    currency: 'USD',
    darkMode: false,
    language: 'ES',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }
};