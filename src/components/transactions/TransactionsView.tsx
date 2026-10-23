import React, { useState, useMemo } from 'react';
import {
  ListOrdered,
  Download,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Tag,
  Building,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Transaction, TaxProfile } from '../../types';

interface TransactionsViewProps {
  transactions: Transaction[];
  profile: TaxProfile;
  activeYear: number;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  profile,
  activeYear,
  onDeleteTransaction,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        const tYear = parseInt(t.date.slice(0, 4), 10);
        if (tYear !== activeYear) return false;
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          return t.concept.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, activeYear, filterType, searchTerm]);

  const exportCSV = () => {
    const headers = ['ID', 'Fecha', 'Tipo', 'Concepto', 'Categoría', 'Bruto MXN', 'Neto MXN', 'ISR Retenido', 'Clasificación'];
    const rows = filteredTransactions.map((t) => [
      t.id,
      t.date,
      t.type === 'income' ? 'Ingreso' : 'Egreso',
      `"${t.concept.replace(/"/g, '""')}"`,
      t.category,
      (t.amountGross || t.amountNet).toFixed(2),
      t.amountNet.toFixed(2),
      (t.isrRetained || 0).toFixed(2),
      t.fiscalClassification || 'general',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Libro_Movimientos_${activeYear}_MiControlFiscal.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Libro de Movimientos {activeYear}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro cronológico unificado de ingresos y egresos con su trazabilidad documental.
          </p>
        </div>
        <div>
          <button
            onClick={exportCSV}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center space-x-1.5 border border-slate-200"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar Libro Completo (CSV)</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en el libro de movimientos..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Tipo:</span>
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({transactions.filter((t) => t.date.startsWith(String(activeYear))).length})
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterType === 'income' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterType === 'expense' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Egresos
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Concepto & Categoría</th>
                <th className="py-3 px-4">Clasificación Fiscal</th>
                <th className="py-3 px-4 text-right">Monto Bruto</th>
                <th className="py-3 px-4 text-right">Monto Neto</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No hay registros con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium font-mono">
                      {tx.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          tx.type === 'income'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {tx.type === 'income' ? (
                          <>
                            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                            <span>Ingreso</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-3 h-3 text-rose-600" />
                            <span>Egreso</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>
                        <p>{tx.concept}</p>
                        <span className="text-[10px] text-slate-500 font-normal">{tx.category}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium">
                        {tx.fiscalClassification === 'personal_deduction'
                          ? 'Deducción Personal (Art. 151)'
                          : tx.fiscalClassification === 'business_deduction'
                          ? 'Deducción de Actividad'
                          : tx.fiscalClassification === 'non_deducible'
                          ? 'No Deducible'
                          : 'General'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800">
                      ${(tx.amountGross || tx.amountNet).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono font-bold ${
                        tx.type === 'income' ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      ${tx.amountNet.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
