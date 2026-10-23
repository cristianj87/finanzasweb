import React, { useState, useMemo } from 'react';
import { Transaction, FiscalRegimeCode, FISCAL_REGIMES } from '../../types';
import {
  TrendingUp,
  Plus,
  Search,
  Filter,
  Building,
  Briefcase,
  HelpCircle,
  FileCheck,
  CheckCircle,
  Clock,
  Download,
  AlertTriangle,
} from 'lucide-react';

interface IncomeViewProps {
  transactions: Transaction[];
  activeYear: number;
  currentUserId: string;
  onAddTransaction: (tx: Transaction) => Promise<void>;
  onDeleteTransaction: (txId: string) => Promise<void>;
}

const INCOME_CATEGORIES = [
  'Sueldos y Salarios',
  'Servicios Profesionales',
  'Actividades Empresariales',
  'Arrendamiento',
  'Intereses y Rendimientos',
  'Dividendos',
  'Otros Ingresos',
];

export const IncomeView: React.FC<IncomeViewProps> = ({
  transactions,
  activeYear,
  currentUserId,
  onAddTransaction,
  onDeleteTransaction,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Income Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formConcept, setFormConcept] = useState('');
  const [formCategory, setFormCategory] = useState('Sueldos y Salarios');
  const [formGross, setFormGross] = useState<number>(0);
  const [formNet, setFormNet] = useState<number>(0);
  const [formIsrRetained, setFormIsrRetained] = useState<number>(0);
  const [formIva, setFormIva] = useState<number>(0);
  const [formPaymentMethod, setFormPaymentMethod] = useState<'PUE' | 'PPD'>('PUE');
  const [formRegime, setFormRegime] = useState<FiscalRegimeCode>('605');

  // Filter incomes
  const incomeTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'income') return false;
      if (!t.date) return false;
      const tYear = parseInt(t.date.slice(0, 4), 10);
      if (tYear !== activeYear) return false;

      if (selectedMonth !== 'all') {
        const m = parseInt(t.date.slice(5, 7), 10) - 1;
        if (m !== selectedMonth) return false;
      }

      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchConcept = t.concept.toLowerCase().includes(q);
        const matchCat = t.category.toLowerCase().includes(q);
        const matchUuid = (t.documentUuid || '').toLowerCase().includes(q);
        if (!matchConcept && !matchCat && !matchUuid) return false;
      }
      return true;
    });
  }, [transactions, activeYear, selectedMonth, selectedCategory, search]);

  // Aggregate stats
  const totals = useMemo(() => {
    let gross = 0;
    let net = 0;
    let isr = 0;
    let iva = 0;
    let pueCount = 0;
    let ppdCount = 0;

    incomeTransactions.forEach(t => {
      gross += t.amountGross || t.amountNet;
      net += t.amountNet || t.amountGross;
      isr += t.isrRetained || 0;
      iva += t.iva || 0;
      if (t.paymentMethod === 'PPD') ppdCount++;
      else pueCount++;
    });

    return { gross, net, isr, iva, pueCount, ppdCount };
  }, [incomeTransactions]);

  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConcept || formGross <= 0) return;

    const newTx: Transaction = {
      id: `tx-inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: currentUserId,
      type: 'income',
      date: formDate,
      concept: formConcept.trim(),
      category: formCategory,
      amountGross: formGross,
      amountNet: formNet > 0 ? formNet : formGross - formIsrRetained,
      iva: formIva,
      ivaRetained: 0,
      isrRetained: formIsrRetained,
      fiscalRegime: formRegime,
      paymentMethod: formPaymentMethod,
      status: 'verified',
      isPaid: formPaymentMethod === 'PUE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onAddTransaction(newTx);
    setIsModalOpen(false);
    setFormConcept('');
    setFormGross(0);
    setFormNet(0);
    setFormIsrRetained(0);
    setFormIva(0);
  };

  const exportCSV = () => {
    const headers = ['Fecha', 'Concepto', 'Categoria', 'Importe Bruto', 'ISR Retenido', 'Neto Recibido', 'Metodo', 'UUID'];
    const rows = incomeTransactions.map(t => [
      t.date,
      `"${t.concept.replace(/"/g, '""')}"`,
      `"${t.category}"`,
      t.amountGross,
      t.isrRetained,
      t.amountNet,
      t.paymentMethod || 'PUE',
      t.documentUuid || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ingresos_${activeYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Mis Ingresos {activeYear}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Registro y control de sueldos, honorarios, arrendamientos y facturas emitidas ante el SAT.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Ingreso Manual</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Ingresos Brutos Acumulados</span>
          <span className="text-xl font-extrabold text-slate-900 block mt-1">
            ${totals.gross.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Total antes de impuestos</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Neto Cobrado Efectivo</span>
          <span className="text-xl font-extrabold text-emerald-700 block mt-1">
            ${totals.net.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-emerald-600 block mt-0.5">Dinero real disponible</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-sm">
          <span className="text-xs font-semibold text-blue-900 block">ISR Retenido Acumulado</span>
          <span className="text-xl font-extrabold text-blue-700 block mt-1">
            ${totals.isr.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-blue-600 block mt-0.5">Impuesto retenido a tu favor para SAT</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Métodos de Cobro</span>
          <div className="flex items-center gap-3 mt-1.5 text-xs font-bold">
            <span className="text-emerald-700">{totals.pueCount} PUE (De contado)</span>
            <span className="text-amber-700">{totals.ppdCount} PPD (En parcialidades)</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">Control de cobro efectivo</span>
        </div>
      </div>

      {/* Info notice about PUE vs PPD */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-900">
        <HelpCircle className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Aviso fiscal importante:</strong> En la legislación mexicana (LISR), para personas físicas con actividad profesional o arrendamiento los ingresos acumulan <em>al cobro efectivo</em>. Las facturas con método <strong>PUE</strong> se consideran cobradas en la fecha de emisión; las facturas <strong>PPD</strong> requieren su Complemento de Recepción de Pagos (REP) para no duplicar ni adelantar impuestos.
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por concepto o UUID..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none text-slate-700"
          >
            <option value="all">Todas las fuentes</option>
            {INCOME_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none text-slate-700"
          >
            <option value="all">Todos los meses</option>
            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Income List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Fecha</th>
                <th className="px-4 py-3.5">Concepto / Fuente</th>
                <th className="px-4 py-3.5">Bruto</th>
                <th className="px-4 py-3.5">ISR Retenido</th>
                <th className="px-4 py-3.5">Neto Recibido</th>
                <th className="px-4 py-3.5">Método / Estado</th>
                <th className="px-4 py-3.5 text-right">Comprobante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {incomeTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No hay ingresos registrados para el período o filtros seleccionados.
                  </td>
                </tr>
              ) : (
                incomeTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                      {t.date}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-900 block">{t.concept}</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium text-[10px]">
                          {t.category}
                        </span>
                        {t.fiscalRegime && (
                          <span className="font-mono text-[10px] text-slate-400">
                            Rég. {t.fiscalRegime}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">
                      ${(t.amountGross || t.amountNet).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-blue-700">
                      {t.isrRetained > 0 ? `-$${t.isrRetained.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '$0.00'}
                    </td>
                    <td className="px-4 py-3.5 font-extrabold text-emerald-700">
                      ${(t.amountNet || t.amountGross).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.paymentMethod === 'PPD'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {t.paymentMethod || 'PUE'} - {t.isPaid ? 'Cobrado' : 'Pendiente de cobro'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-[11px] text-slate-500">
                      {t.documentUuid ? (
                        <span title={t.documentUuid} className="cursor-help text-blue-600 underline">
                          UUID SAT
                        </span>
                      ) : (
                        <span className="text-slate-400">Manual</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Income Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
              <h3 className="text-base font-bold">Registrar Ingreso Manual</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-emerald-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIncome} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Concepto del Ingreso *</label>
                <input
                  type="text"
                  required
                  value={formConcept}
                  onChange={e => setFormConcept(e.target.value)}
                  placeholder="Ej. Quincena de nómina o Consultoría proyecto X"
                  className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Cobro *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fuente / Categoría *</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {INCOME_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Importe Bruto ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formGross || ''}
                    onChange={e => setFormGross(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs border rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">ISR Retenido ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formIsrRetained || ''}
                    onChange={e => setFormIsrRetained(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs border rounded-xl font-bold text-blue-700 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Neto Recibido ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formNet || ''}
                    onChange={e => setFormNet(parseFloat(e.target.value) || 0)}
                    placeholder={formGross > 0 ? (formGross - formIsrRetained).toString() : '0.00'}
                    className="w-full px-3 py-2 text-xs border rounded-xl font-extrabold text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Método de Pago</label>
                  <select
                    value={formPaymentMethod}
                    onChange={e => setFormPaymentMethod(e.target.value as 'PUE' | 'PPD')}
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="PUE">PUE (Pago en una sola exhibición)</option>
                    <option value="PPD">PPD (En parcialidades / diferido)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 -mx-6 -mb-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
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
