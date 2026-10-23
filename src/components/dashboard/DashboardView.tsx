import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, DocumentRecord, TaxProfile } from '../../types';
import {
  TrendingUp,
  Receipt,
  Wallet,
  ShieldCheck,
  Building,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';

interface DashboardViewProps {
  transactions: Transaction[];
  documents: DocumentRecord[];
  profile: TaxProfile | null;
  activeYear: number;
  onNavigate: (tab: any) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const COLORS = ['#1d4ed8', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#ea580c', '#64748b'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  documents,
  profile,
  activeYear,
  onNavigate,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');

  // Filter transactions by Year and Month
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (!t.date) return false;
      const tYear = parseInt(t.date.slice(0, 4), 10);
      if (tYear !== activeYear) return false;

      if (selectedMonth !== 'all') {
        const tMonth = parseInt(t.date.slice(5, 7), 10) - 1;
        if (tMonth !== selectedMonth) return false;
      }
      return true;
    });
  }, [transactions, activeYear, selectedMonth]);

  // Overall calculations
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let payrollIncome = 0;
    let professionalIncome = 0;
    let isrWithheld = 0;
    let isrProvisional = 0;
    let personalExpenses = 0;
    let personalDeductions = 0;
    let businessDeductions = 0;
    let netCashAvailable = 0;

    filteredTransactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amountGross || t.amountNet;
        isrWithheld += t.isrRetained || 0;
        if (t.category.toLowerCase().includes('nómina') || t.category.toLowerCase().includes('sueldo')) {
          payrollIncome += t.amountGross || t.amountNet;
        } else {
          professionalIncome += t.amountGross || t.amountNet;
        }
        netCashAvailable += t.amountNet || t.amountGross;
      } else if (t.type === 'expense') {
        totalExpense += t.amountGross || t.amountNet;
        netCashAvailable -= t.amountGross || t.amountNet;

        if (t.fiscalClassification === 'personal_deduction') {
          personalDeductions += t.amountGross || t.amountNet;
        } else if (t.fiscalClassification === 'business_deduction') {
          businessDeductions += t.amountGross || t.amountNet;
        } else {
          personalExpenses += t.amountGross || t.amountNet;
        }
      }
    });

    const pendingDocs = documents.filter(d => d.status === 'needs_review' || d.status === 'pending').length;

    return {
      totalIncome,
      totalExpense,
      payrollIncome,
      professionalIncome,
      isrWithheld,
      isrProvisional,
      personalExpenses,
      personalDeductions,
      businessDeductions,
      netCashAvailable,
      pendingDocs,
    };
  }, [filteredTransactions, documents]);

  // Monthly comparison data for BarChart
  const monthlyData = useMemo(() => {
    const data = MONTH_NAMES.map((name, index) => ({
      name: name.slice(0, 3),
      fullName: name,
      Ingresos: 0,
      Gastos: 0,
    }));

    transactions.forEach(t => {
      if (!t.date) return;
      const tYear = parseInt(t.date.slice(0, 4), 10);
      if (tYear !== activeYear) return;
      const mIdx = parseInt(t.date.slice(5, 7), 10) - 1;
      if (mIdx >= 0 && mIdx < 12) {
        if (t.type === 'income') {
          data[mIdx].Ingresos += t.amountGross || t.amountNet;
        } else if (t.type === 'expense') {
          data[mIdx].Gastos += t.amountGross || t.amountNet;
        }
      }
    });

    return data;
  }, [transactions, activeYear]);

  // Expenses by Category for PieChart
  const expenseCategoriesData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const cat = t.category || 'Otros gastos';
        map[cat] = (map[cat] || 0) + (t.amountGross || t.amountNet);
      });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // Incomes by Category
  const incomeCategoriesData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'income')
      .forEach(t => {
        const cat = t.category || 'Otros ingresos';
        map[cat] = (map[cat] || 0) + (t.amountGross || t.amountNet);
      });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // Deductions Distribution
  const fiscalExpenseData = useMemo(() => {
    return [
      { name: 'Deducciones Personales (Art. 151)', value: stats.personalDeductions, color: '#059669' },
      { name: 'Deducciones Autorizadas (Actividad)', value: stats.businessDeductions, color: '#2563eb' },
      { name: 'Gastos Personales Corrientes', value: stats.personalExpenses, color: '#94a3b8' },
    ].filter(i => i.value > 0);
  }, [stats]);

  // Deterministic financial summary of the active period
  const periodSummary = useMemo(() => {
    const periodName = selectedMonth === 'all' ? `el ejercicio fiscal ${activeYear}` : MONTH_NAMES[selectedMonth];
    const personalDedsCount = filteredTransactions.filter(t => t.fiscalClassification === 'personal_deduction').length;
    return `Durante ${periodName} registraste $${stats.totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })} de ingresos y $${stats.totalExpense.toLocaleString('es-MX', { minimumFractionDigits: 2 })} de gastos. Se han identificado ${personalDedsCount} comprobantes como posibles deducciones personales y tienes ${stats.pendingDocs} documentos pendientes de revisión.`;
  }, [selectedMonth, activeYear, stats, filteredTransactions]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Month Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Panel Financiero y Fiscal {activeYear}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Contribuyente: <strong className="text-slate-800">{profile?.taxName || 'Usuario'}</strong>
            {profile?.rfc && <span className="ml-2 font-mono text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{profile.rfc}</span>}
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Filtrar por mes:</span>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
          >
            <option value="all">Todo el año {activeYear}</option>
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Deterministic Executive Summary */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="flex-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-300">
              Resumen Financiero del Período
            </h2>
            <p className="text-sm text-slate-100 mt-1.5 leading-relaxed font-normal">
              {periodSummary}
            </p>
          </div>
        </div>
      </div>

      {/* 10 Key KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Ingresos */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Ingresos Totales</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-slate-900 block tracking-tight">
              ${stats.totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
              <ArrowUpRight className="w-3 h-3" />
              Antes de retenciones
            </span>
          </div>
        </div>

        {/* Total Gastos */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Gastos Totales</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-slate-900 block tracking-tight">
              ${stats.totalExpense.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
              <ArrowDownRight className="w-3 h-3" />
              Egresos registrados
            </span>
          </div>
        </div>

        {/* Ingresos por Nómina */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Ingreso por Nómina</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-slate-900 block tracking-tight">
              ${stats.payrollIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              Sueldos brutos recibidos
            </span>
          </div>
        </div>

        {/* Honorarios / Actividades */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Actividad / Honorarios</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-slate-900 block tracking-tight">
              ${stats.professionalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              Facturado como independiente
            </span>
          </div>
        </div>

        {/* ISR Retenido */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-700 text-xs font-semibold">
            <span>ISR Retenido SAT</span>
            <div className="p-1.5 rounded-lg bg-blue-600 text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-blue-900 block tracking-tight">
              ${stats.isrWithheld.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-blue-700 font-medium block mt-0.5">
              Acreditable en tu declaración
            </span>
          </div>
        </div>

        {/* Posibles Deducciones Personales */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-700 text-xs font-semibold">
            <span>Deducciones Personales</span>
            <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-emerald-800 block tracking-tight">
              ${stats.personalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-emerald-700 font-medium block mt-0.5">
              Art. 151 (Médicos, lentes...)
            </span>
          </div>
        </div>

        {/* Deducciones Autorizadas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Deducciones Autorizadas</span>
            <div className="p-1.5 rounded-lg bg-cyan-50 text-cyan-700">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-slate-900 block tracking-tight">
              ${stats.businessDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              Gastos de tu actividad
            </span>
          </div>
        </div>

        {/* Gastos Personales Corrientes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Gastos No Deducibles</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-slate-700 block tracking-tight">
              ${stats.personalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
              Gasto corriente de vida
            </span>
          </div>
        </div>

        {/* Saldo Financiero Disponible */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Flujo Neto Estimado</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-lg font-extrabold block tracking-tight ${stats.netCashAvailable >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              ${stats.netCashAvailable.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              Neto recibido menos gastos
            </span>
          </div>
        </div>

        {/* Pendientes de Validación */}
        <div
          onClick={() => onNavigate('documents')}
          className="bg-white p-4 rounded-2xl border border-amber-300 bg-amber-50/30 shadow-sm flex flex-col justify-between cursor-pointer hover:bg-amber-100/40 transition"
        >
          <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
            <span>Por Validar</span>
            <div className="p-1.5 rounded-lg bg-amber-500 text-white">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-extrabold text-amber-900 block tracking-tight">
              {stats.pendingDocs}
            </span>
            <span className="text-[11px] text-amber-700 font-medium block mt-0.5 underline">
              Ver comprobantes pendientes
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfica 1: Ingresos vs Gastos por mes */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Evolución de Ingresos y Gastos por Mes</h3>
              <p className="text-xs text-slate-500">Comparativa mensual de entradas y salidas durante {activeYear}</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v >= 1000 ? (v / 1000) + 'k' : v}`} />
                <Tooltip
                  formatter={(value: any) => [`$${Number(value).toLocaleString('es-MX')}`, '']}
                  labelFormatter={(name, payload) => payload?.[0]?.payload?.fullName || name}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Ingresos" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gastos" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 2: Clasificación Fiscal de Gastos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Deducibilidad de Gastos</h3>
            <p className="text-xs text-slate-500">Deducciones personales vs corrientes</p>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[240px]">
            {fiscalExpenseData.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-10">
                Sin gastos registrados aún en el período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={fiscalExpenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {fiscalExpenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString('es-MX')}`, 'Importe']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Charts: Categorías de Gastos e Ingresos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por Categoría */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Gastos por Categoría</h3>
              <p className="text-xs text-slate-500">Distribución de tus egresos</p>
            </div>
          </div>
          <div className="h-64">
            {expenseCategoriesData.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-20">No hay gastos para mostrar</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategoriesData}
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name.slice(0, 10)} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {expenseCategoriesData.map((_, index) => (
                      <Cell key={`cat-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString('es-MX')}`, 'Importe']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Fuentes de Ingreso */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Distribución de Ingresos</h3>
              <p className="text-xs text-slate-500">Por régimen y tipo de entrada</p>
            </div>
          </div>
          <div className="h-64">
            {incomeCategoriesData.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-20">No hay ingresos registrados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeCategoriesData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => `$${v >= 1000 ? (v / 1000) + 'k' : v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString('es-MX')}`, 'Ingreso']} />
                  <Bar dataKey="value" fill="#059669" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
