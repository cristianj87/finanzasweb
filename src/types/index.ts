export type FiscalRegimeCode =
  | '605' // Sueldos y Salarios e Ingresos Asimilados a Salarios
  | '612' // Personas Físicas con Actividades Empresariales y Profesionales
  | '626' // Régimen Simplificado de Confianza (RESICO)
  | '606' // Arrendamiento
  | '625' // Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas
  | '608' // Demás ingresos
  | '614' // Ingresos por Intereses
  | '615'; // Ingresos por Obtención de Premios

export interface RegimeOption {
  code: FiscalRegimeCode;
  name: string;
  shortName: string;
  description: string;
  provisionalPayments: boolean;
  canIssueInvoices: boolean;
}

export const FISCAL_REGIMES: RegimeOption[] = [
  {
    code: '605',
    name: 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
    shortName: 'Sueldos y Salarios (Nómina)',
    description: 'Para trabajadores asalariados con contrato laboral y recibos de nómina timbrados por el patrón.',
    provisionalPayments: false,
    canIssueInvoices: false,
  },
  {
    code: '612',
    name: 'Personas Físicas con Actividades Empresariales y Profesionales',
    shortName: 'Servicios Profesionales / Honorarios',
    description: 'Para profesionistas independientes (médicos, abogados, desarrolladores, consultores) y comerciantes.',
    provisionalPayments: true,
    canIssueInvoices: true,
  },
  {
    code: '626',
    name: 'Régimen Simplificado de Confianza (RESICO)',
    shortName: 'RESICO Personas Físicas',
    description: 'Régimen con tasas de ISR reducidas (1% al 2.5%) para ingresos de hasta 3.5 millones de pesos anuales.',
    provisionalPayments: true,
    canIssueInvoices: true,
  },
  {
    code: '606',
    name: 'Arrendamiento',
    shortName: 'Arrendamiento de Inmuebles',
    description: 'Para personas físicas que rentan departamentos, casas, locales comerciales u oficinas.',
    provisionalPayments: true,
    canIssueInvoices: true,
  },
  {
    code: '625',
    name: 'Actividades a través de Plataformas Tecnológicas',
    shortName: 'Plataformas Tecnológicas (Uber, Airbnb, etc.)',
    description: 'Para repartidores, conductores y anfitriones de plataformas digitales.',
    provisionalPayments: true,
    canIssueInvoices: true,
  },
  {
    code: '608',
    name: 'Demás ingresos',
    shortName: 'Otros ingresos e inversiones',
    description: 'Intereses bancarios, dividendos, ganancias de capital o ingresos esporádicos.',
    provisionalPayments: false,
    canIssueInvoices: false,
  },
];

export interface TaxProfile {
  id: string;
  userId: string;
  taxName: string;
  rfc: string;
  fiscalYear: number;
  regimes: FiscalRegimeCode[];
  hasPayroll: boolean;
  issuesInvoices: boolean;
  makesProvisionalPayments: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType =
  | 'payroll'            // Recibo de nómina
  | 'invoice_received'   // Factura recibida (Gasto)
  | 'invoice_issued'     // Factura emitida (Ingreso)
  | 'expense_receipt'    // Comprobante de gasto simple
  | 'payment_receipt'    // Comprobante de pago bancario
  | 'payment_complement' // Complemento para recepción de pagos (REP)
  | 'bank_statement'     // Estado de cuenta bancario
  | 'other';             // Otros documentos fiscales

export type DocumentStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'needs_review'
  | 'error';

export interface DocumentRecord {
  id: string;
  userId: string;
  name: string;
  fileType: 'xml' | 'pdf' | 'image';
  category: DocumentType;
  status: DocumentStatus;
  uuid?: string;
  rfcIssuer?: string;
  nameIssuer?: string;
  rfcReceiver?: string;
  nameReceiver?: string;
  issueDate?: string;
  paymentDate?: string;
  subtotal: number;
  discount: number;
  taxIva: number;
  taxIvaRetained: number;
  taxIsrRetained: number;
  total: number;
  currency: string;
  paymentMethod?: string; // PUE, PPD
  paymentForm?: string;   // 01 Efectivo, 03 Transferencia, 04 Tarjeta...
  cfdiUsage?: string;     // G03 Gastos en general, D01 Honorarios médicos, etc.
  description: string;
  suggestedCategory: string;
  confidence: number;     // 0 a 100
  confidenceExplanation?: string;
  storageUrl?: string;
  isDuplicate?: boolean;
  // Campos específicos de nómina si aplica:
  payrollDetails?: {
    employerName: string;
    employerRfc: string;
    periodStart: string;
    periodEnd: string;
    paymentDate: string;
    daysPaid: number;
    totalPerceptions: number;
    taxedPerceptions: number;
    exemptPerceptions: number;
    totalDeductions: number;
    isrRetained: number;
    employmentSubsidy: number;
    netPaid: number;
  };
  createdAt: string;
  updatedAt: string;
}

export type FiscalClassification =
  | 'personal_expense'      // Gasto personal común (no deducible)
  | 'personal_deduction'    // Posible deducción personal anual (Art. 151 LISR)
  | 'business_deduction'    // Posible deducción autorizada (Actividad profesional/empresarial)
  | 'non_deducible'         // Gasto estrictamente no deducible
  | 'needs_review';         // Pendiente de revisión del usuario

export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  date: string;
  concept: string;
  category: string;
  amountGross: number;
  amountNet: number;
  iva: number;
  ivaRetained: number;
  isrRetained: number;
  fiscalRegime?: FiscalRegimeCode;
  fiscalClassification?: FiscalClassification;
  fiscalExplanation?: string;
  documentId?: string;
  documentUuid?: string;
  paymentMethod?: string;
  paymentForm?: string;
  status: 'verified' | 'needs_review' | 'inconsistent';
  isPaid: boolean;
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  totalIncomeYear: number;
  totalExpenseYear: number;
  payrollIncome: number;
  professionalIncome: number;
  isrRetained: number;
  isrProvisionalPaid: number;
  totalPersonalExpenses: number;
  totalPersonalDeductions: number;
  totalBusinessDeductions: number;
  availableBalance: number;
  pendingReviewCount: number;
}
