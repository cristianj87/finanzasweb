import React, { useState, useMemo } from 'react';
import { Transaction } from '../../types';
import {
  ArrowLeftRight,
  TrendingUp,
  Receipt,
  Search,
  Filter,
  Download,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface TransactionsViewProps {
  transactions: Transaction[];
  activeYear: number;
  onDeleteTransaction: (id: string) => Promise<void>;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  activeYear,
  onDeleteTransaction,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [monthFilter, setMonthFilter] = useState<number | 'all'>('all');

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        if (!t.date) return false;
        const tYear = parseInt(t.date.slice(0, 4), 10);
        if (tYear !== activeYear) return false;

        if (typeFilter !== 'all' && t.type !== typeFilter) return false;

        if (monthFilter !== 'all') {
          const m = parseInt(t.date.slice(5, 7), 10) - 1;
          if (m !== monthFilter) return false;
        }

        if (search.trim()) {
          const q = search.toLowerCase();
          const matchConcept = t.concept.toLowerCase().includes(q);
          const matchCat = t.category.toLowerCase().includes(q);
          const matchUuid = (t.documentUuid || '').toLowerCase().includes(q);
          if (!matchConcept && !matchCat && !matchUuid) return false;
        }

        return true;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, activeYear, typeFilter, monthFilter, search]);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      const amt = t.amountGross || t.amountNet;
      if (t.type === 'income') income += amt;
      else expense += amt;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const exportCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Concepto', 'Categoria', 'Importe', 'ISR Retenido', 'Clasificacion', 'UUID'];
    const rows = filteredTransactions.map(t => [
      t.date,
      t.type === 'income' ? 'Ingreso' : 'Egreso',
      `"${t.concept.replace(/"/g, '""')}"`,
      `"${t.category}"`,
      t.amountGross || t.amountNet,
      t.isrRetained || 0,
      t.fiscalClassification || '',
      t.documentUuid || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Movimientos_${activeYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Libro de Movimientos {activeYear}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Historial consolidado de entradas, salidas y deducciones del ejercicio.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Exportar Estado de Movimientos</span>
        </button>
      </div>

      {/* Mini Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Total Entradas</span>
          <span className="text-lg font-extrabold text-emerald-700 block mt-1">
            +${stats.income.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Total Salidas</span>
          <span className="text-lg font-extrabold text-rose-700 block mt-1">
            -${stats.expense.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 block">Balance Neto</span>
          <span className={`text-lg font-extrabold block mt-1 ${stats.balance >= 0 ? 'text-blue-900' : 'text-rose-700'}`}>
            ${stats.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en todos los movimientos..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Type Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition ${typeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`px-3 py-1.5 rounded-lg transition ${typeFilter === 'income' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Ingresos
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`px-3 py-1.5 rounded-lg transition ${typeFilter === 'expense' ? 'bg-white text-rose-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Gastos
            </button>
          </div>

          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none text-slate-700"
          >
            <option value="all">Todo el año</option>
            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Fecha</th>
                <th className="px-4 py-3.5">Tipo</th>
                <th className="px-4 py-3.5">Concepto</th>
                <th className="px-4 py-3.5">Categoría</th>
                <th className="px-4 py-3.5">Monto</th>
                <th className="px-4 py-3.5">Tratamiento Fiscal</th>
                <th className="px-4 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No hay movimientos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => {
                  const isIncome = t.type === 'income';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                        {t.date}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isIncome
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {isIncome ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <Receipt className="w-3 h-3 text-rose-600" />}
                          {isIncome ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900 max-w-sm truncate">
                        {t.concept}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium">
                          {t.category}
                        </span>
                      </td>
                      <td className={`px-4 py-3.5 font-extrabold ${isIncome ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {isIncome ? '+' : '-'}${(t.amountGross || t.amountNet).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5">
                        {t.fiscalClassification === 'personal_deduction' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Deducción Personal Art. 151
                          </span>
                        ) : t.fiscalClassification === 'business_deduction' ? (
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            Deducción Actividad
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {isIncome ? `ISR ret: $${t.isrRetained || 0}` : 'Gasto personal'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => onDeleteTransaction(t.id)}
                          title="Eliminar movimiento"
                          className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
};
