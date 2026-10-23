import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle2,
  Filter,
  ShieldAlert,
  Search,
  Sparkles,
  HelpCircle,
  Stethoscope,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { Transaction, TaxProfile, FiscalClassification } from '../../types';

interface ExpensesViewProps {
  transactions: Transaction[];
  profile: TaxProfile;
  activeYear: number;
  onAddTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateClassification: (id: string, classification: FiscalClassification) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  transactions,
  profile,
  activeYear,
  onAddTransaction,
  onDeleteTransaction,
  onUpdateClassification,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [concept, setConcept] = useState('');
  const [date, setDate] = useState(`${activeYear}-01-20`);
  const [category, setCategory] = useState('Salud y Gastos Médicos');
  const [amount, setAmount] = useState<number>(2500);
  const [paymentForm, setPaymentForm] = useState('04'); // 04: Tarjeta crédito
  const [fiscalClassification, setFiscalClassification] = useState<FiscalClassification>('personal_deduction');

  const expenseTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      const tYear = parseInt(t.date.slice(0, 4), 10);
      if (tYear !== activeYear) return false;
      if (filterClass !== 'all' && t.fiscalClassification !== filterClass) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return t.concept.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [transactions, activeYear, filterClass, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalExpense = 0;
    let personalDeductions = 0;
    let businessDeductions = 0;
    let nonDeductible = 0;
    let cashAlerts = 0;

    expenseTransactions.forEach((t) => {
      const amt = t.amountGross || t.amountNet;
      totalExpense += amt;
      if (t.fiscalClassification === 'personal_deduction') {
        personalDeductions += amt;
      } else if (t.fiscalClassification === 'business_deduction') {
        businessDeductions += amt;
      } else {
        nonDeductible += amt;
      }

      if (t.paymentForm === '01' && (t.fiscalClassification === 'personal_deduction' || t.category === 'Salud y Gastos Médicos')) {
        cashAlerts++;
      }
    });

    return { totalExpense, personalDeductions, businessDeductions, nonDeductible, cashAlerts };
  }, [expenseTransactions]);

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const isCash = paymentForm === '01';
    let finalClass = fiscalClassification;
    let explanation = 'Gasto registrado manualmente.';

    if (isCash && fiscalClassification === 'personal_deduction') {
      finalClass = 'non_deducible';
      explanation = 'ALERTA SAT: El pago fue registrado en EFECTIVO (01). Conforme al Art. 151 LISR, las deducciones personales no proceden si se liquidan en efectivo.';
    }

    const newTx: Transaction = {
      id: `tx-exp-${Date.now()}`,
      userId: profile.userId,
      type: 'expense',
      date,
      concept,
      category,
      amountGross: Number(amount),
      amountNet: Number(amount),
      iva: 0,
      ivaRetained: 0,
      isrRetained: 0,
      fiscalClassification: finalClass,
      fiscalExplanation: explanation,
      paymentMethod: 'PUE',
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
    const headers = ['Fecha', 'Concepto', 'Categoría', 'Clasificación Fiscal', 'Forma Pago', 'Total MXN'];
    const rows = expenseTransactions.map((t) => [
      t.date,
      `"${t.concept.replace(/"/g, '""')}"`,
      t.category,
      t.fiscalClassification || 'personal_expense',
      t.paymentForm || '03',
      (t.amountGross || t.amountNet).toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Gastos_${activeYear}_MiControlFiscal.csv`);
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
            Control de Gastos y Deducciones
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Identificación de deducciones personales (Art. 151 LISR) y deducciones autorizadas de tu actividad.
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
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* Cash Alert Banner if any */}
      {stats.cashAlerts > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-amber-900 text-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">¡Atención con pagos en efectivo!</p>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              Detectamos {stats.cashAlerts} gasto(s) médicos o personales pagados en Efectivo (01). La Ley del ISR (Art. 151) establece que para hacer deducibles gastos médicos, dentales, hospitalarios y colegiaturas en tu Declaración Anual, el pago <strong>debe realizarse exclusivamente mediante tarjeta de débito/crédito, transferencia electrónica o cheque nominativo</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Total Gastos Registrados</p>
          <p className="text-lg font-bold text-slate-900 mt-1 font-mono">
            ${stats.totalExpense.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <p className="text-xs font-semibold text-emerald-800">Deducciones Personales (Art. 151)</p>
          <p className="text-lg font-bold text-emerald-700 mt-1 font-mono">
            ${stats.personalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Para Declaración Anual</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <p className="text-xs font-semibold text-blue-800">Deducciones Autorizadas</p>
          <p className="text-lg font-bold text-blue-700 mt-1 font-mono">
            ${stats.businessDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-blue-600 mt-0.5">Operativos de tu actividad</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500">Gastos Personales / No Deducibles</p>
          <p className="text-lg font-bold text-slate-700 mt-1 font-mono">
            ${stats.nonDeductible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Table */}
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
            <span className="text-xs text-slate-500 font-semibold">Clasificación:</span>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800"
            >
              <option value="all">Todas las clasificaciones</option>
              <option value="personal_deduction">Deducción Personal (Art. 151)</option>
              <option value="business_deduction">Deducción Autorizada Actividad</option>
              <option value="personal_expense">Gasto Personal General</option>
              <option value="non_deducible">No Deducible (Alerta SAT)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Concepto & Categoría</th>
                <th className="py-3 px-4">Clasificación SAT</th>
                <th className="py-3 px-4">Forma de Pago</th>
                <th className="py-3 px-4 text-right">Importe</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {expenseTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No se registran gastos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                expenseTransactions.map((tx) => {
                  const isPersonalDeduc = tx.fiscalClassification === 'personal_deduction';
                  const isCashWarning = tx.paymentForm === '01' && (isPersonalDeduc || tx.category === 'Salud y Gastos Médicos');

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">{tx.date}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>
                          <p>{tx.concept}</p>
                          <span className="text-[10px] text-slate-500 font-normal">{tx.category}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={tx.fiscalClassification || 'personal_expense'}
                          onChange={(e) => onUpdateClassification(tx.id, e.target.value as FiscalClassification)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-lg border focus:outline-none ${
                            tx.fiscalClassification === 'personal_deduction'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : tx.fiscalClassification === 'business_deduction'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : tx.fiscalClassification === 'non_deducible'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="personal_deduction">Deducción Personal (Art. 151)</option>
                          <option value="business_deduction">Deducción de Actividad</option>
                          <option value="personal_expense">Gasto Personal Común</option>
                          <option value="non_deducible">No Deducible</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-slate-600">
                            {tx.paymentForm === '01' ? '01 Efectivo' : tx.paymentForm === '04' ? '04 Tarjeta' : '03 Transferencia'}
                          </span>
                          {isCashWarning && (
                            <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded border border-rose-200" title="Efectivo en deducciones personales no procede ante el SAT">
                              ¡No Deducible!
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ${(tx.amountGross || tx.amountNet).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Registrar Nuevo Gasto</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Concepto o Proveedor</label>
                <input
                  type="text"
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej. Consulta dental, Compra de papelería..."
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
                  <label className="block font-semibold text-slate-700 mb-1">Importe ($ MXN)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="Salud y Gastos Médicos">Salud y Gastos Médicos</option>
                    <option value="Seguros">Seguros de Gastos Médicos</option>
                    <option value="Educación y Colegiaturas">Educación y Colegiaturas</option>
                    <option value="Internet y Telefonía">Internet y Telefonía</option>
                    <option value="Tecnología y Software">Tecnología y Software</option>
                    <option value="Combustible y Gasolina">Combustible y Gasolina</option>
                    <option value="Alimentación y Despensa">Alimentación y Despensa</option>
                    <option value="Gastos Generales">Gastos Generales</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Forma de Pago</label>
                  <select
                    value={paymentForm}
                    onChange={(e) => setPaymentForm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  >
                    <option value="04">04 Tarjeta de crédito</option>
                    <option value="28">28 Tarjeta de débito</option>
                    <option value="03">03 Transferencia electrónica</option>
                    <option value="02">02 Cheque nominativo</option>
                    <option value="01">01 Efectivo (Riesgo SAT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clasificación Fiscal</label>
                <select
                  value={fiscalClassification}
                  onChange={(e) => setFiscalClassification(e.target.value as FiscalClassification)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                >
                  <option value="personal_deduction">Posible Deducción Personal Anual (Art. 151)</option>
                  <option value="business_deduction">Deducción de Actividad Profesional (Art. 103)</option>
                  <option value="personal_expense">Gasto Personal Común (No deducible)</option>
                </select>
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
