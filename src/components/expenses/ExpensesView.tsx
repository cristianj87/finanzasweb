import React, { useState, useMemo } from 'react';
import { Transaction, FiscalClassification } from '../../types';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  Info,
  ShieldAlert,
  ShieldCheck,
  Tag,
  CreditCard,
  Edit3,
} from 'lucide-react';

interface ExpensesViewProps {
  transactions: Transaction[];
  activeYear: number;
  currentUserId: string;
  onAddTransaction: (tx: Transaction) => Promise<void>;
  onUpdateTransaction: (tx: Transaction) => Promise<void>;
  onDeleteTransaction: (txId: string) => Promise<void>;
}

const EXPENSE_CATEGORIES = [
  'Alimentación y Despensa',
  'Transporte y Viajes',
  'Combustible y Gasolina',
  'Servicios del Hogar',
  'Internet y Telefonía',
  'Educación y Colegiaturas',
  'Salud y Gastos Médicos',
  'Vivienda y Renta',
  'Seguros',
  'Tecnología y Software',
  'Servicios Profesionales',
  'Material de Trabajo',
  'Entretenimiento',
  'Ropa y Calzado',
  'Otros Gastos',
];

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  transactions,
  activeYear,
  currentUserId,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedClassification, setSelectedClassification] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<Transaction | null>(null);

  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formConcept, setFormConcept] = useState('');
  const [formCategory, setFormCategory] = useState('Alimentación y Despensa');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formClassification, setFormClassification] = useState<FiscalClassification>('personal_expense');
  const [formPaymentForm, setFormPaymentForm] = useState('04'); // Tarjeta crédito
  const [formNotes, setFormNotes] = useState('');

  const expenseTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'expense') return false;
      if (!t.date) return false;
      const tYear = parseInt(t.date.slice(0, 4), 10);
      if (tYear !== activeYear) return false;

      if (selectedMonth !== 'all') {
        const m = parseInt(t.date.slice(5, 7), 10) - 1;
        if (m !== selectedMonth) return false;
      }

      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
      if (selectedClassification !== 'all' && t.fiscalClassification !== selectedClassification) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchConcept = t.concept.toLowerCase().includes(q);
        const matchCat = t.category.toLowerCase().includes(q);
        const matchUuid = (t.documentUuid || '').toLowerCase().includes(q);
        if (!matchConcept && !matchCat && !matchUuid) return false;
      }
      return true;
    });
  }, [transactions, activeYear, selectedMonth, selectedCategory, selectedClassification, search]);

  // Aggregate stats
  const totals = useMemo(() => {
    let total = 0;
    let personalDeductions = 0;
    let businessDeductions = 0;
    let nonDeductible = 0;

    expenseTransactions.forEach(t => {
      const amt = t.amountGross || t.amountNet;
      total += amt;
      if (t.fiscalClassification === 'personal_deduction') {
        personalDeductions += amt;
      } else if (t.fiscalClassification === 'business_deduction') {
        businessDeductions += amt;
      } else {
        nonDeductible += amt;
      }
    });

    return { total, personalDeductions, businessDeductions, nonDeductible };
  }, [expenseTransactions]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formConcept || formAmount <= 0) return;

    let explanation = 'Gasto registrado manualmente por el usuario.';
    if (formClassification === 'personal_deduction') {
      explanation = 'Deducción personal anual catalogada por el usuario (Art. 151 LISR).';
    } else if (formClassification === 'business_deduction') {
      explanation = 'Gasto operativo indispensable para la actividad profesional o comercial.';
    }

    const newTx: Transaction = {
      id: `tx-exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: currentUserId,
      type: 'expense',
      date: formDate,
      concept: formConcept.trim(),
      category: formCategory,
      amountGross: formAmount,
      amountNet: formAmount,
      iva: 0,
      ivaRetained: 0,
      isrRetained: 0,
      fiscalClassification: formClassification,
      fiscalExplanation: explanation,
      paymentForm: formPaymentForm,
      paymentMethod: 'PUE',
      status: 'verified',
      isPaid: true,
      notes: formNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onAddTransaction(newTx);
    setIsModalOpen(false);
    setFormConcept('');
    setFormAmount(0);
    setFormNotes('');
  };

  const handleUpdateClassification = async (tx: Transaction, newClass: FiscalClassification) => {
    const updated = {
      ...tx,
      fiscalClassification: newClass,
      fiscalExplanation: `Reclasificado por el usuario como: ${getClassificationBadge(newClass).label}`,
      updatedAt: new Date().toISOString(),
    };
    await onUpdateTransaction(updated);
    if (selectedTxForDetail?.id === tx.id) {
      setSelectedTxForDetail(updated);
    }
  };

  const getClassificationBadge = (cls?: FiscalClassification) => {
    switch (cls) {
      case 'personal_deduction':
        return {
          label: 'Deducción Personal (Art. 151)',
          style: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-500/20',
          icon: ShieldCheck,
        };
      case 'business_deduction':
        return {
          label: 'Deducción de Actividad',
          style: 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-500/20',
          icon: Tag,
        };
      case 'non_deducible':
        return {
          label: 'No Deducible',
          style: 'bg-rose-50 text-rose-800 border-rose-300',
          icon: ShieldAlert,
        };
      case 'needs_review':
        return {
          label: 'Pendiente de Revisión',
          style: 'bg-amber-50 text-amber-800 border-amber-300',
          icon: AlertCircle,
        };
      default:
        return {
          label: 'Gasto Personal Corriente',
          style: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: HelpCircle,
        };
    }
  };

  const exportCSV = () => {
    const headers = ['Fecha', 'Concepto', 'Categoria', 'Importe', 'Clasificacion Fiscal', 'Forma Pago', 'Explicacion'];
    const rows = expenseTransactions.map(t => [
      t.date,
      `"${t.concept.replace(/"/g, '""')}"`,
      `"${t.category}"`,
      t.amountGross || t.amountNet,
      t.fiscalClassification || 'personal_expense',
      t.paymentForm || '',
      `"${(t.fiscalExplanation || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Gastos_${activeYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Mis Gastos y Egresos {activeYear}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Clasificación fiscal inteligente: distingue deducciones personales, gastos operativos y gastos corrientes.
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
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Gasto Manual</span>
          </button>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Total de Gastos</span>
          <span className="text-xl font-extrabold text-slate-900 block mt-1">
            ${totals.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Suma total de salidas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <span className="text-xs font-semibold text-emerald-900 block">Posibles Deducciones Personales</span>
          <span className="text-xl font-extrabold text-emerald-700 block mt-1">
            ${totals.personalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-emerald-600 block mt-0.5">Art. 151 (Médicos, colegiaturas, etc.)</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-sm">
          <span className="text-xs font-semibold text-blue-900 block">Deducciones Autorizadas</span>
          <span className="text-xl font-extrabold text-blue-700 block mt-1">
            ${totals.businessDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-blue-600 block mt-0.5">Gastos operativos de tu actividad</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Gastos No Deducibles</span>
          <span className="text-xl font-extrabold text-slate-700 block mt-1">
            ${totals.nonDeductible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Vida diaria y consumos personales</span>
        </div>
      </div>

      {/* Educational Card: Deducibilidad SAT */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">¿Cómo saber si una factura es deducible en México?</p>
          <p className="text-amber-800 leading-relaxed">
            Tener una factura CFDI no la hace automáticamente deducible. Para deducciones personales (Art. 151 LISR):
            <strong> 1) Debe estar pagada con medios electrónicos</strong> (tarjeta de crédito, débito, transferencia o cheque nominativo; el efectivo '01' invalida la deducción en médicos y colegiaturas);
            <strong> 2) Debe tener el Uso de CFDI correspondiente</strong> (D01 a D10);
            <strong> 3) Estar dentro del año fiscal</strong> del ejercicio a declarar.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por concepto o proveedor..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedClassification}
            onChange={e => setSelectedClassification(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none text-slate-700"
          >
            <option value="all">Todas las clasificaciones</option>
            <option value="personal_deduction">Posible Deducción Personal (Art. 151)</option>
            <option value="business_deduction">Deducción de Actividad</option>
            <option value="personal_expense">Gasto Corriente</option>
            <option value="non_deducible">No Deducible</option>
            <option value="needs_review">Pendiente de Revisión</option>
          </select>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none text-slate-700"
          >
            <option value="all">Todas las categorías</option>
            {EXPENSE_CATEGORIES.map(c => (
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

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Fecha</th>
                <th className="px-4 py-3.5">Concepto / Proveedor</th>
                <th className="px-4 py-3.5">Categoría</th>
                <th className="px-4 py-3.5">Importe</th>
                <th className="px-4 py-3.5">Clasificación Fiscal Inteligente</th>
                <th className="px-4 py-3.5 text-right">Detalle / Ajustar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenseTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No se encontraron gastos para los filtros aplicados.
                  </td>
                </tr>
              ) : (
                expenseTransactions.map(t => {
                  const badge = getClassificationBadge(t.fiscalClassification);
                  const BadgeIcon = badge.icon;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                        {t.date}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-900 block truncate max-w-sm">{t.concept}</span>
                        {t.documentUuid && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            UUID: {t.documentUuid.slice(0, 18)}...
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-extrabold text-slate-900">
                        ${(t.amountGross || t.amountNet).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.style} max-w-fit`}>
                            <BadgeIcon className="w-3.5 h-3.5" />
                            {badge.label}
                          </span>
                          {t.fiscalExplanation && (
                            <span className="text-[10px] text-slate-500 truncate max-w-xs block" title={t.fiscalExplanation}>
                              {t.fiscalExplanation}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedTxForDetail(t)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg transition"
                        >
                          Ver / Editar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail & Fiscal Reclassification Modal */}
      {selectedTxForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Detalle y Tratamiento Fiscal</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedTxForDetail.date}</p>
              </div>
              <button
                onClick={() => setSelectedTxForDetail(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Concepto</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedTxForDetail.concept}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Categoría</span>
                  <span className="font-semibold text-slate-800">{selectedTxForDetail.category}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Importe Total</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    ${(selectedTxForDetail.amountGross || selectedTxForDetail.amountNet).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {selectedTxForDetail.fiscalExplanation && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-blue-700" />
                    Motivo de la clasificación:
                  </span>
                  <p className="leading-relaxed">{selectedTxForDetail.fiscalExplanation}</p>
                </div>
              )}

              {/* Reclassify Controls */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800 block">Cambiar clasificación fiscal:</span>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleUpdateClassification(selectedTxForDetail, 'personal_deduction')}
                    className={`p-2 rounded-xl text-xs font-semibold border text-left flex items-center justify-between ${
                      selectedTxForDetail.fiscalClassification === 'personal_deduction'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>Posible Deducción Personal (Art. 151)</span>
                    <span className="text-[10px] text-slate-500">Médico, lentes, colegiatura</span>
                  </button>

                  <button
                    onClick={() => handleUpdateClassification(selectedTxForDetail, 'business_deduction')}
                    className={`p-2 rounded-xl text-xs font-semibold border text-left flex items-center justify-between ${
                      selectedTxForDetail.fiscalClassification === 'business_deduction'
                        ? 'bg-blue-50 border-blue-500 text-blue-900'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>Deducción de Actividad Profesional / Comercial</span>
                    <span className="text-[10px] text-slate-500">Gasto indispensable</span>
                  </button>

                  <button
                    onClick={() => handleUpdateClassification(selectedTxForDetail, 'personal_expense')}
                    className={`p-2 rounded-xl text-xs font-semibold border text-left flex items-center justify-between ${
                      selectedTxForDetail.fiscalClassification === 'personal_expense'
                        ? 'bg-slate-100 border-slate-400 text-slate-900'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>Gasto Personal Corriente</span>
                    <span className="text-[10px] text-slate-500">No deducible</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedTxForDetail(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-blue-900 text-white p-5 flex items-center justify-between">
              <h3 className="text-base font-bold">Registrar Gasto Manual</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-blue-200 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Concepto o Proveedor *</label>
                <input
                  type="text"
                  required
                  value={formConcept}
                  onChange={e => setFormConcept(e.target.value)}
                  placeholder="Ej. Gasolina Pemex o Consulta dental"
                  className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha del Gasto *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría *</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Importe ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formAmount || ''}
                    onChange={e => setFormAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-xs border rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Forma de Pago</label>
                  <select
                    value={formPaymentForm}
                    onChange={e => setFormPaymentForm(e.target.value)}
                    className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="04">04 - Tarjeta de crédito</option>
                    <option value="28">28 - Tarjeta de débito</option>
                    <option value="03">03 - Transferencia bancaria (SPEI)</option>
                    <option value="01">01 - Efectivo (No deducible para salud)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clasificación Fiscal Estimada *</label>
                <select
                  value={formClassification}
                  onChange={e => setFormClassification(e.target.value as FiscalClassification)}
                  className="w-full px-3 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="personal_expense">Gasto personal corriente (vida diaria)</option>
                  <option value="personal_deduction">Posible deducción personal anual (Art. 151)</option>
                  <option value="business_deduction">Deducción de actividad profesional / comercial</option>
                  <option value="non_deducible">Estrictamente no deducible</option>
                </select>
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
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
