import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  FileCheck2,
  FileSpreadsheet,
  Building,
  CheckCircle2,
  Scale,
} from 'lucide-react';
import { Transaction, TaxProfile, DocumentRecord } from '../../types';
import { calculateAnnualTax } from '../../lib/tax-engine';

interface ReportsViewProps {
  transactions: Transaction[];
  documents: DocumentRecord[];
  profile: TaxProfile;
  activeYear: number;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  documents,
  profile,
  activeYear,
}) => {
  const [reportType, setReportType] = useState<'annual' | 'monthly'>('annual');
  const [selectedMonth, setSelectedMonth] = useState<number>(0);

  const yearTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const tYear = parseInt(t.date.slice(0, 4), 10);
      return tYear === activeYear;
    });
  }, [transactions, activeYear]);

  const taxSummary = useMemo(() => {
    return calculateAnnualTax(yearTransactions, profile);
  }, [yearTransactions, profile]);

  // Monthly Table Data
  const monthlyBreakdown = useMemo(() => {
    return MONTH_NAMES.map((monthName, idx) => {
      let income = 0;
      let isrWithheld = 0;
      let expenses = 0;
      let personalDeductions = 0;
      let businessDeductions = 0;

      yearTransactions.forEach((t) => {
        const m = new Date(t.date + 'T12:00:00').getMonth();
        if (m === idx) {
          const amt = t.amountGross || t.amountNet;
          if (t.type === 'income') {
            income += amt;
            isrWithheld += t.isrRetained || 0;
          } else {
            expenses += amt;
            if (t.fiscalClassification === 'personal_deduction') {
              personalDeductions += amt;
            } else if (t.fiscalClassification === 'business_deduction') {
              businessDeductions += amt;
            }
          }
        }
      });

      return {
        month: monthName,
        income,
        isrWithheld,
        expenses,
        personalDeductions,
        businessDeductions,
        netFlow: income - expenses,
      };
    });
  }, [yearTransactions]);

  const exportFullReportCSV = () => {
    const headers = ['Mes', 'Ingresos Brutos', 'ISR Retenido', 'Gastos Totales', 'Deducciones Personales', 'Deducciones Actividad', 'Flujo Neto'];
    const rows = monthlyBreakdown.map((m) => [
      m.month,
      m.income.toFixed(2),
      m.isrWithheld.toFixed(2),
      m.expenses.toFixed(2),
      m.personalDeductions.toFixed(2),
      m.businessDeductions.toFixed(2),
      m.netFlow.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Cierre_Fiscal_${activeYear}_${profile.rfc || 'Contribuyente'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Reportes Financieros y Cierre Fiscal {activeYear}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Genera hojas de trabajo y reportes ejecutivos listos para revisión contable.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportFullReportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center space-x-1.5 border border-slate-200"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Descargar Cierre (CSV)</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Hoja Contable</span>
          </button>
        </div>
      </div>

      {/* Printable Annual Executive Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* Document Header in Print */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-5 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-slate-900">
                Cédula de Trabajo Fiscal & Cierre Anual
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                {activeYear}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Contribuyente: <strong>{profile.taxName}</strong> | RFC: <strong className="font-mono">{profile.rfc || 'No especificado'}</strong>
            </p>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-500">
            <p>Generado: {new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="text-emerald-700 font-semibold mt-0.5">Sistema: Mi Control Fiscal</p>
          </div>
        </div>

        {/* Executive Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Ingresos Totales Acumulables</span>
            <p className="text-base font-bold text-slate-900 mt-1 font-mono">
              ${taxSummary.grossIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Total Deducciones Personales</span>
            <p className="text-base font-bold text-emerald-700 mt-1 font-mono">
              ${taxSummary.netPersonalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">Total Retenciones de ISR</span>
            <p className="text-base font-bold text-amber-700 mt-1 font-mono">
              ${taxSummary.isrWithheld.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
            <span className="text-blue-700 font-medium">
              {taxSummary.isRefundEstimated ? 'Posible Saldo a Favor' : 'Impuesto Estimado'}
            </span>
            <p className="text-base font-bold text-blue-900 mt-1 font-mono">
              ${Math.abs(taxSummary.estimatedBalance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Monthly Ledger Table */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            Desglose Mensual de Operaciones Fiscales {activeYear}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Mes</th>
                  <th className="py-2.5 px-3 text-right">Ingresos Brutos</th>
                  <th className="py-2.5 px-3 text-right">ISR Retenido</th>
                  <th className="py-2.5 px-3 text-right">Gastos Totales</th>
                  <th className="py-2.5 px-3 text-right">Deduc. Personales</th>
                  <th className="py-2.5 px-3 text-right">Deduc. Actividad</th>
                  <th className="py-2.5 px-3 text-right">Flujo Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {monthlyBreakdown.map((m) => (
                  <tr key={m.month} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-sans font-medium text-slate-900">{m.month}</td>
                    <td className="py-2 px-3 text-right">${m.income.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right text-amber-700">${m.isrWithheld.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right">${m.expenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right text-emerald-700">${m.personalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right text-blue-700">${m.businessDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    <td className={`py-2 px-3 text-right font-bold ${m.netFlow >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      ${m.netFlow.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td className="py-2.5 px-3 font-sans">TOTAL ANUAL</td>
                  <td className="py-2.5 px-3 text-right">
                    ${monthlyBreakdown.reduce((a, b) => a + b.income, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-700">
                    ${monthlyBreakdown.reduce((a, b) => a + b.isrWithheld, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    ${monthlyBreakdown.reduce((a, b) => a + b.expenses, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-700">
                    ${monthlyBreakdown.reduce((a, b) => a + b.personalDeductions, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-blue-700">
                    ${monthlyBreakdown.reduce((a, b) => a + b.businessDeductions, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    ${monthlyBreakdown.reduce((a, b) => a + b.netFlow, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">Notas para el Contador o Auditor:</p>
          <p>
            1. Esta cédula fue elaborada con base en los CFDI timbrados en XML y comprobantes registrados por el contribuyente en el sistema Mi Control Fiscal.
          </p>
          <p>
            2. Las deducciones personales fueron validadas contra la forma de pago (excluyendo pagos en efectivo) y sujetas al tope del 15% o 5 UMAs anuales conforme al artículo 151 de la Ley del Impuesto sobre la Renta.
          </p>
        </div>
      </div>
    </div>
  );
};
