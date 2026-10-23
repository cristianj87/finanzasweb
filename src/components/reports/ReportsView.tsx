import React, { useState, useMemo } from 'react';
import { Transaction, DocumentRecord, TaxProfile } from '../../types';
import { calculateAnnualTax } from '../../lib/tax-engine';
import {
  FileBarChart,
  Printer,
  Download,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Receipt,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface ReportsViewProps {
  transactions: Transaction[];
  documents: DocumentRecord[];
  profile: TaxProfile | null;
  activeYear: number;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  documents,
  profile,
  activeYear,
}) => {
  const [reportType, setReportType] = useState<'annual' | 'monthly'>('annual');
  const [selectedMonth, setSelectedMonth] = useState<number>(0);

  // Filter transactions for report
  const reportTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const tYear = parseInt(t.date.slice(0, 4), 10);
      if (tYear !== activeYear) return false;

      if (reportType === 'monthly') {
        const m = parseInt(t.date.slice(5, 7), 10) - 1;
        if (m !== selectedMonth) return false;
      }
      return true;
    });
  }, [transactions, activeYear, reportType, selectedMonth]);

  // Breakdown metrics
  const reportData = useMemo(() => {
    let grossIncome = 0;
    let netIncome = 0;
    let totalExpense = 0;
    let isrWithheld = 0;
    let ivaCollected = 0;
    let payrollTotal = 0;
    let professionalTotal = 0;
    let personalDeductions = 0;
    let businessDeductions = 0;
    let commonExpenses = 0;

    const incomeByCat: Record<string, number> = {};
    const expenseByCat: Record<string, number> = {};

    reportTransactions.forEach(t => {
      const amt = t.amountGross || t.amountNet;
      if (t.type === 'income') {
        grossIncome += amt;
        netIncome += t.amountNet || amt;
        isrWithheld += t.isrRetained || 0;
        ivaCollected += t.iva || 0;

        if (t.category.toLowerCase().includes('nómina') || t.category.toLowerCase().includes('sueldo')) {
          payrollTotal += amt;
        } else {
          professionalTotal += amt;
        }

        incomeByCat[t.category] = (incomeByCat[t.category] || 0) + amt;
      } else if (t.type === 'expense') {
        totalExpense += amt;
        expenseByCat[t.category] = (expenseByCat[t.category] || 0) + amt;

        if (t.fiscalClassification === 'personal_deduction') {
          personalDeductions += amt;
        } else if (t.fiscalClassification === 'business_deduction') {
          businessDeductions += amt;
        } else {
          commonExpenses += amt;
        }
      }
    });

    const netCashflow = netIncome - totalExpense;
    const pendingDocs = documents.filter(d => d.status === 'needs_review' || d.status === 'pending').length;

    return {
      grossIncome,
      netIncome,
      totalExpense,
      isrWithheld,
      ivaCollected,
      payrollTotal,
      professionalTotal,
      personalDeductions,
      businessDeductions,
      commonExpenses,
      netCashflow,
      pendingDocs,
      incomeByCat,
      expenseByCat,
    };
  }, [reportTransactions, documents]);

  // Tax calculation breakdown for annual report
  const annualTaxCalc = useMemo(() => {
    if (!profile) return null;
    return calculateAnnualTax(transactions, profile);
  }, [transactions, profile]);

  const handlePrint = () => {
    window.print();
  };

  const exportExcelCSV = () => {
    const title = reportType === 'annual'
      ? `Reporte_Anual_${activeYear}_${profile?.taxName || 'Contribuyente'}`
      : `Reporte_${MONTH_NAMES[selectedMonth]}_${activeYear}_${profile?.taxName || 'Contribuyente'}`;

    const headers = ['Concepto / Rubro', 'Importe MXN'];
    const rows = [
      ['Contribuyente', profile?.taxName || 'No especificado'],
      ['RFC', profile?.rfc || 'No especificado'],
      ['Ejercicio Fiscal', activeYear],
      ['Período', reportType === 'annual' ? `Anual Completo ${activeYear}` : `${MONTH_NAMES[selectedMonth]} ${activeYear}`],
      ['Fecha de Generación', new Date().toLocaleDateString('es-MX')],
      ['', ''],
      ['RESUMEN DE INGRESOS', ''],
      ['Ingresos Totales Brutos', reportData.grossIncome],
      ['Sueldos y Salarios', reportData.payrollTotal],
      ['Servicios Profesionales / Actividad', reportData.professionalTotal],
      ['ISR Retenido a Favor', reportData.isrWithheld],
      ['IVA Trasladado', reportData.ivaCollected],
      ['Neto Cobrado', reportData.netIncome],
      ['', ''],
      ['RESUMEN DE EGRESOS', ''],
      ['Gastos Totales', reportData.totalExpense],
      ['Deducciones Personales Identificadas (Art. 151)', reportData.personalDeductions],
      ['Deducciones Autorizadas de la Actividad', reportData.businessDeductions],
      ['Gastos Personales Corrientes', reportData.commonExpenses],
      ['', ''],
      ['FLUJO FINANCIERO DISPONIBLE', reportData.netCashflow],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => `"${e[0]}","${e[1]}"`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar (hidden during print) */}
      <div className="print:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Centro de Reportes Financieros y Fiscales</h1>
          <p className="text-xs text-slate-500 mt-1">
            Genera informes consolidados ejecutivos listos para exportar a Excel o imprimir en PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Type */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setReportType('annual')}
              className={`px-3 py-1.5 rounded-lg transition ${
                reportType === 'annual' ? 'bg-white text-blue-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reporte Anual
            </button>
            <button
              onClick={() => setReportType('monthly')}
              className={`px-3 py-1.5 rounded-lg transition ${
                reportType === 'monthly' ? 'bg-white text-blue-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reporte Mensual
            </button>
          </div>

          {reportType === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i}>{name}</option>
              ))}
            </select>
          )}

          <button
            onClick={exportExcelCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Guardar PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Presentation */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 sm:p-12 space-y-8 print:p-0 print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-6 border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl text-slate-900">Mi Control Fiscal</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                México
              </span>
            </div>
            <h2 className="text-base font-bold text-blue-900 mt-1">
              {reportType === 'annual'
                ? `Informe Fiscal Consolidado del Ejercicio ${activeYear}`
                : `Estado Financiero Mensual — ${MONTH_NAMES[selectedMonth]} ${activeYear}`}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Generado el {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-xs space-y-1 sm:text-right">
            <div>
              <span className="text-slate-400">Contribuyente: </span>
              <strong className="text-slate-800">{profile?.taxName || 'No especificado'}</strong>
            </div>
            <div>
              <span className="text-slate-400">RFC: </span>
              <strong className="font-mono text-slate-900">{profile?.rfc || 'Sin RFC'}</strong>
            </div>
            <div>
              <span className="text-slate-400">Regímenes: </span>
              <span className="text-slate-700 font-medium">
                {profile?.regimes?.join(', ') || '605'}
              </span>
            </div>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Ingresos Brutos</span>
            <span className="text-lg font-extrabold text-slate-900 block mt-1">
              ${reportData.grossIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Gastos Registrados</span>
            <span className="text-lg font-extrabold text-rose-700 block mt-1">
              ${reportData.totalExpense.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200">
            <span className="text-[11px] font-semibold text-blue-900 uppercase block">ISR Retenido</span>
            <span className="text-lg font-extrabold text-blue-700 block mt-1">
              ${reportData.isrWithheld.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-900 uppercase block">Deducciones Art. 151</span>
            <span className="text-lg font-extrabold text-emerald-700 block mt-1">
              ${reportData.personalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Section 1: Desglose de Ingresos */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
            1. Desglose y Fuentes de Ingreso
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Sueldos, Salarios y Asimilados (Nómina):</span>
                <strong className="text-slate-900">${reportData.payrollTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Servicios Profesionales / Actividades:</span>
                <strong className="text-slate-900">${reportData.professionalTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 font-bold">
                <span className="text-slate-900">Total Ingresos Brutos Acumulables:</span>
                <span className="text-slate-900">${reportData.grossIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">ISR Retenido por Patrones y Clientes:</span>
                <strong className="text-blue-700">-${reportData.isrWithheld.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">IVA Trasladado en Operaciones:</span>
                <strong className="text-slate-800">${reportData.ivaCollected.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 font-bold text-emerald-800">
                <span>Neto Efectivamente Recibido:</span>
                <span>${reportData.netIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Desglose de Gastos y Tratamiento Fiscal */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
            2. Gastos y Clasificación para Efectos del SAT
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 space-y-1">
              <span className="font-bold text-emerald-900 block">Deducciones Personales (Art. 151)</span>
              <span className="text-base font-extrabold text-emerald-800 block">
                ${reportData.personalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[11px] text-emerald-700">Honorarios médicos, dentales, nutrición, psicólogo, colegiaturas y lentes graduados.</p>
            </div>

            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 space-y-1">
              <span className="font-bold text-blue-900 block">Deducciones Autorizadas de Actividad</span>
              <span className="text-base font-extrabold text-blue-800 block">
                ${reportData.businessDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[11px] text-blue-700">Gastos indispensables para la generación de tus honorarios o servicios profesionales.</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <span className="font-bold text-slate-700 block">Gastos Corrientes No Deducibles</span>
              <span className="text-base font-extrabold text-slate-700 block">
                ${reportData.commonExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
              <p className="text-[11px] text-slate-500">Alimentación corriente, entretenimiento y compras sin requisitos fiscales.</p>
            </div>
          </div>
        </div>

        {/* Section 3: Proyección Anual si aplica */}
        {reportType === 'annual' && annualTaxCalc && (
          <div className="space-y-3 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-5 rounded-2xl border border-blue-200">
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700" />
              3. Estimación Preliminar de Declaración Anual {activeYear} (Tarifa Art. 152 LISR)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between py-1 border-b border-blue-100">
                  <span className="text-slate-600">Base Gravable Estimada:</span>
                  <strong className="text-slate-900">${annualTaxCalc.taxBase.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-blue-100">
                  <span className="text-slate-600">Deducciones Personales con Tope Legal:</span>
                  <strong className="text-emerald-700">${annualTaxCalc.netPersonalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-blue-100">
                  <span className="text-slate-600">ISR Anual Causado Calculado:</span>
                  <strong className="text-slate-900">${annualTaxCalc.estimatedAnnualTax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between py-1 border-b border-blue-100">
                  <span className="text-slate-600">(-) ISR Retenido Acreditable:</span>
                  <strong className="text-blue-700">-${annualTaxCalc.isrWithheld.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-blue-100">
                  <span className="text-slate-600">(-) Pagos Provisionales:</span>
                  <strong className="text-slate-700">-${annualTaxCalc.isrProvisionalPayments.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div className={`flex justify-between py-1 border-b border-blue-200 font-extrabold text-sm ${
                  annualTaxCalc.isRefundEstimated ? 'text-emerald-700' : 'text-blue-900'
                }`}>
                  <span>{annualTaxCalc.isRefundEstimated ? 'Posible Saldo a Favor Estimado:' : 'Impuesto Estimado a Cargo:'}</span>
                  <span>${Math.abs(annualTaxCalc.estimatedBalance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-blue-800/80 mt-2">
              * Nota legal: Este cálculo es preliminar y se basa en las deducciones y retenciones cargadas. El resultado oficial lo determina el aplicativo del SAT en sueldos y salarios o régimen general.
            </p>
          </div>
        )}

        {/* Signatures / Disclaimer Footer */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-4">
          <p>Documento generado para control interno del contribuyente con Mi Control Fiscal.</p>
          <p>Página 1 de 1</p>
        </div>
      </div>
    </div>
  );
};
