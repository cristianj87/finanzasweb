import { Transaction, TaxProfile } from '../types';

// Valor estimado de la UMA anual en México
// 2024: $39,606.36 * 5 = $198,031.80
// 2025: ~$41,600 * 5 = ~$208,000.00
export const UMA_ANUAL_2024 = 39606.36;
export const UMA_ANUAL_2025 = 41600.00;

export interface TaxCalculationBreakdown {
  fiscalYear: number;
  grossIncome: number;
  exemptIncome: number;
  taxableIncome: number;
  // Deducciones
  authorizedDeductions: number; // Actividad profesional / empresarial
  grossPersonalDeductions: number; // Total antes de topes
  umaLimit5x: number;
  percentageLimit15: number;
  applicablePersonalDeductionsLimit: number;
  netPersonalDeductions: number; // Deducciones personales aplicables con tope
  taxBase: number; // Base gravable
  // Impuesto
  estimatedAnnualTax: number; // ISR causado
  isrWithheld: number; // ISR retenido por patrones o clientes
  isrProvisionalPayments: number; // Pagos provisionales realizados
  estimatedBalance: number; // Negativo: Saldo a favor estimado | Positivo: Saldo a cargo
  isRefundEstimated: boolean;
  notes: string[];
  regimesNotes: string[];
}

// Tarifa anual de ISR para personas físicas (Artículo 152 LISR)
interface ISRBracket {
  lowerLimit: number;
  upperLimit: number;
  fixedQuota: number;
  percentage: number;
}

const ANNUAL_ISR_BRACKETS: ISRBracket[] = [
  { lowerLimit: 0.01, upperLimit: 8952.49, fixedQuota: 0.00, percentage: 1.92 },
  { lowerLimit: 8952.50, upperLimit: 75984.55, fixedQuota: 171.88, percentage: 6.40 },
  { lowerLimit: 75984.56, upperLimit: 133536.07, fixedQuota: 4461.94, percentage: 10.88 },
  { lowerLimit: 133536.08, upperLimit: 155229.80, fixedQuota: 10723.55, percentage: 16.00 },
  { lowerLimit: 155229.81, upperLimit: 185852.57, fixedQuota: 14194.54, percentage: 17.92 },
  { lowerLimit: 185852.58, upperLimit: 374837.88, fixedQuota: 19682.13, percentage: 23.52 },
  { lowerLimit: 374837.89, upperLimit: 590796.00, fixedQuota: 64127.08, percentage: 30.00 },
  { lowerLimit: 590796.01, upperLimit: 1127926.84, fixedQuota: 128914.52, percentage: 32.00 },
  { lowerLimit: 1127926.85, upperLimit: 1503902.46, fixedQuota: 300796.39, percentage: 34.00 },
  { lowerLimit: 1503902.47, upperLimit: Infinity, fixedQuota: 428628.10, percentage: 35.00 },
];

export function calculateAnnualTax(
  transactions: Transaction[],
  profile: TaxProfile
): TaxCalculationBreakdown {
  const year = profile.fiscalYear || new Date().getFullYear();
  const umaAnual = year >= 2025 ? UMA_ANUAL_2025 : UMA_ANUAL_2024;
  const notes: string[] = [];
  const regimesNotes: string[] = [];

  const yearTransactions = transactions.filter(t => {
    if (!t.date) return false;
    const tYear = parseInt(t.date.slice(0, 4), 10);
    return tYear === year;
  });

  // Ingresos
  let grossIncome = 0;
  let isrWithheld = 0;
  let isrProvisionalPayments = 0;

  yearTransactions.forEach(t => {
    if (t.type === 'income') {
      grossIncome += t.amountGross || t.amountNet;
      isrWithheld += t.isrRetained || 0;
    }
  });

  // Gastos
  let authorizedDeductions = 0;
  let grossPersonalDeductions = 0;

  yearTransactions.forEach(t => {
    if (t.type === 'expense') {
      if (t.fiscalClassification === 'personal_deduction') {
        grossPersonalDeductions += t.amountGross || t.amountNet;
      } else if (t.fiscalClassification === 'business_deduction') {
        authorizedDeductions += t.amountGross || t.amountNet;
      }
    }
  });

  // Regímenes
  const hasResico = profile.regimes.includes('626');
  const hasPayroll = profile.regimes.includes('605');
  const hasProfessional = profile.regimes.includes('612');

  if (hasResico) {
    regimesNotes.push('Régimen RESICO: Recuerda que para RESICO no aplican las deducciones personales del Art. 151 en la declaración anual, ya que tributa con tasa reducida directa.');
  }
  if (hasPayroll) {
    regimesNotes.push('Sueldos y Salarios: Si solo tuviste un patrón durante el año y tus ingresos no superaron $400,000, la declaración anual puede ser opcional, salvo que desees deducir gastos personales para generar saldo a favor.');
  }
  if (hasProfessional) {
    regimesNotes.push('Servicios Profesionales: Puedes aplicar tanto deducciones autorizadas de tus actividades como deducciones personales en la anual.');
  }

  // Límites de deducciones personales (Art. 151 LISR):
  // Menor entre 5 UMAs anuales o el 15% del total de ingresos
  const umaLimit5x = umaAnual * 5;
  const percentageLimit15 = grossIncome * 0.15;
  const applicablePersonalDeductionsLimit = Math.min(umaLimit5x, percentageLimit15);

  const netPersonalDeductions = Math.min(grossPersonalDeductions, applicablePersonalDeductionsLimit);

  if (grossPersonalDeductions > applicablePersonalDeductionsLimit && grossIncome > 0) {
    notes.push(`Tus deducciones personales ($${grossPersonalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}) superan el tope legal del 15% de ingresos ($${applicablePersonalDeductionsLimit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}). Se aplicó el tope legal.`);
  }

  // Base gravable
  const exemptIncome = 0; // Exenciones de aguinaldo/prima se calculan si hay desglose
  const taxableIncome = Math.max(0, grossIncome - authorizedDeductions);
  const taxBase = Math.max(0, taxableIncome - (hasResico ? 0 : netPersonalDeductions));

  // Tarifa Art. 152
  let estimatedAnnualTax = 0;
  if (taxBase > 0) {
    const bracket = ANNUAL_ISR_BRACKETS.find(
      b => taxBase >= b.lowerLimit && taxBase <= b.upperLimit
    );
    if (bracket) {
      const excess = taxBase - bracket.lowerLimit;
      const taxOnExcess = excess * (bracket.percentage / 100);
      estimatedAnnualTax = bracket.fixedQuota + taxOnExcess;
    }
  }

  // Saldo: Impuesto causado - Retenciones - Pagos provisionales
  // Si da negativo, el resultado es a favor del contribuyente
  const rawBalance = estimatedAnnualTax - isrWithheld - isrProvisionalPayments;
  const estimatedBalance = Math.round(rawBalance * 100) / 100;
  const isRefundEstimated = estimatedBalance < 0;

  if (isRefundEstimated) {
    notes.push(`Estimación favorable: Tienes un posible saldo a favor de $${Math.abs(estimatedBalance).toLocaleString('es-MX', { minimumFractionDigits: 2 })} debido a que las retenciones superaron el ISR causado.`);
  } else if (estimatedBalance > 0) {
    notes.push(`Estimación de impuesto a pagar: $${estimatedBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}. Verifica si cuentas con deducciones personales pendientes de registrar.`);
  }

  return {
    fiscalYear: year,
    grossIncome,
    exemptIncome,
    taxableIncome,
    authorizedDeductions,
    grossPersonalDeductions,
    umaLimit5x,
    percentageLimit15,
    applicablePersonalDeductionsLimit,
    netPersonalDeductions,
    taxBase,
    estimatedAnnualTax,
    isrWithheld,
    isrProvisionalPayments,
    estimatedBalance,
    isRefundEstimated,
    notes,
    regimesNotes,
  };
}
