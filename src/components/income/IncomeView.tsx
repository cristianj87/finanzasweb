import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  DollarSign,
  Download,
  Filter,
  CheckCircle2,
  Calendar,
  Building,
  Tag,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { Transaction, TaxProfile, FiscalRegimeCode, FISCAL_REGIMES } from '../../types';

interface IncomeViewProps {
  transactions: Transaction[];
  profile: TaxProfile;
  activeYear: number;
  onAddTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const IncomeView: React.FC<IncomeViewProps> = ({
  transactions,
  profile,
  activeYear,
  onAddTransaction,
  onDeleteTransaction,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterRegime, setFilterRegime] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State for manual registration
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(`${activeYear}-01-15`);
  const [category, setCategory] = useState('Sueldos y Salarios');
  const [grossAmount, setGrossAmount] = useState<number>(15000);
  const [isrRetained, setIsrRetained] = useState<number>(1800);
  const [iva, setIva] = useState<number>(0);
  const [ivaRetained, setIvaRetained] = useState<number>(0);
  const [fiscalRegime, setFiscalRegime] = useState<FiscalRegimeCode>('605');
  const [paymentMethod, setPaymentMethod] = useState('PUE');
  const [paymentForm, setPaymentForm] = useState('03');

  const incomeTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'income') return false;
      const tYear = parseInt(t.date.slice(0, 4), 10);
      if (tYear !== activeYear) return false;
      if (filterRegime !== 'all' && t.fiscalRegime !== filterRegime) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return t.concept.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [transactions, activeYear, filterRegime, searchTerm]);

  // Aggregate metrics
  const totals = useMemo(() => {
    let gross = 0;
    let net = 0;
    let isrWithheld = 0;
    let ivaTotal = 0;

    incomeTransactions.forEach((t) => {
      gross += t.amountGross || t.amountNet;
      net += t.amountNet;
      isrWithheld += t.isrRetained || 0;
      ivaTotal += t.iva || 0;
    });

    return { gross, net, isrWithheld, ivaTotal };
  }, [incomeTransactions]);

  const handleCreateIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const net = grossAmount + iva - isrRetained - ivaRetained;

    const newTx: Transaction = {
      id: `tx-inc-${Date.now()}`,
      userId: profile.userId,
      type: 'income',
      date,
      concept,
      category,
      amountGross: Number(grossAmount),
      amountNet: net,
      iva: Number(iva),
      ivaRetained: Number(ivaRetained),
      isrRetained: Number(isrRetained),
      fiscalRegime,
      fiscalClassification: 'personal_expense',
      fiscalExplanation: 'Ingreso acumulable registrado para el cálculo de ISR anual.',
      paymentMethod,
      paymentForm,
      status: 'verified',
      isPaid: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAddTransaction(newTx);
    setShowAddModal(false);
    setConcept('');
  };

  const exportCSV = () => {
    const headers = ['Fecha', 'Concepto', 'Categoría', 'Régimen', 'Monto Bruto', 'ISR Retenido', 'IVA', 'Monto Neto'];
    const rows = incomeTransactions.map((t) => [
      t.date,
      `"${t.concept.replace(/"/g, '""')}"`,
      t.category,
      t.fiscalRegime || '605',
      (t.amountGross || t.amountNet).toFixed(2),
      (t.isrRetained || 0).toFixed(2),
      (t.iva || 0).toFixed(2),
      t.amountNet.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ingresos_${activeYear}_MiControlFiscal.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Control de Ingresos y Nómina
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro detallado de sueldos, honorarios, facturas cobradas y retenciones de impuestos.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center space-x-1.5 border border-slate-200"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Ingreso</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Ingreso Bruto</p>
          <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
            ${totals.gross.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-amber-700">ISR Retenido Acumulado</p>
          <p className="text-lg font-bold text-amber-700 mt-1 font-mono">
            ${totals.isrWithheld.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">IVA Trasladado</p>
          <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
            ${totals.ivaTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-emerald-700">Total Ingreso Neto</p>
          <p className="text-lg font-bold text-emerald-700 mt-1 font-mono">
            ${totals.net.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por concepto o categoría..."
            className="w-full sm:w-72 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-semibold">Régimen:</span>
            <select
              value={filterRegime}
              onChange={(e) => setFilterRegime(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800"
            >
              <option value="all">Todos los regímenes</option>
              {FISCAL_REGIMES.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.shortName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Concepto</th>
                <th className="py-3 px-4">Régimen Fiscal</th>
                <th className="py-3 px-4 text-right">Bruto</th>
                <th className="py-3 px-4 text-right">ISR Retenido</th>
                <th className="py-3 px-4 text-right">IVA</th>
                <th className="py-3 px-4 text-right">Neto Cobrado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {incomeTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No se registran ingresos en el periodo seleccionado.
                  </td>
                </tr>
              ) : (
                incomeTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">{tx.date}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>
                        <p>{tx.concept}</p>
                        <span className="text-[10px] text-blue-600 font-medium">{tx.category}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {tx.fiscalRegime === '605'
                          ? 'Sueldos y Salarios'
                          : tx.fiscalRegime === '612'
                          ? 'Honorarios / Prof.'
                          : tx.fiscalRegime === '626'
                          ? 'RESICO'
                          : 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800">
                      ${(tx.amountGross || tx.amountNet).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-700">
                      ${(tx.isrRetained || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      ${(tx.iva || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                      ${tx.amountNet.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Registrar Ingreso</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateIncome} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Concepto o Descripción</label>
                <input
                  type="text"
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej. Nómina quincenal, Pago de consultoría..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Régimen Fiscal</label>
                  <select
                    value={fiscalRegime}
                    onChange={(e) => setFiscalRegime(e.target.value as FiscalRegimeCode)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    {FISCAL_REGIMES.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.shortName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monto Bruto ($ MXN)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={grossAmount}
                    onChange={(e) => setGrossAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ISR Retenido ($ MXN)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={isrRetained}
                    onChange={(e) => setIsrRetained(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
                >
                  Guardar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
