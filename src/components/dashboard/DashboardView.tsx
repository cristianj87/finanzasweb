import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  FileCheck2,
  AlertCircle,
  HelpCircle,
  Scale,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { Transaction, TaxProfile, DocumentRecord } from '../../types';
import { calculateAnnualTax } from '../../lib/tax-engine';

interface DashboardViewProps {
  transactions: Transaction[];
  documents: DocumentRecord[];
  profile: TaxProfile;
  activeYear: number;
  onNavigateToTab: (tab: any) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  documents,
  profile,
  activeYear,
  onNavigateToTab,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or '0'..'11'

  // Filter transactions by year and optionally month
  const yearTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date) return false;
      const tYear = parseInt(t.date.slice(0, 4), 10);
      return tYear === activeYear;
    });
  }, [transactions, activeYear]);

  const filteredTransactions = useMemo(() => {
    if (selectedMonth === 'all') return yearTransactions;
    const m = parseInt(selectedMonth, 10);
    return yearTransactions.filter((t) => {
      const monthIndex = new Date(t.date + 'T12:00:00').getMonth();
      return monthIndex === m;
    });
  }, [yearTransactions, selectedMonth]);

  // Tax calculations using our deterministic Mexican tax engine
  const taxSummary = useMemo(() => {
    return calculateAnnualTax(yearTransactions, profile);
  }, [yearTransactions, profile]);

  // 10 Key Metrics Calculations
  const metrics = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let payrollIncome = 0;
    let businessIncome = 0;
    let isrWithheld = 0;
    let isrProvisional = 0;
    let personalExpenses = 0;
    let businessDeductions = 0;
    let personalDeductions = 0;

    filteredTransactions.forEach((t) => {
      const gross = t.amountGross || t.amountNet;
      if (t.type === 'income') {
        totalIncome += gross;
        isrWithheld += t.isrRetained || 0;
        if (t.fiscalRegime === '605' || t.category === 'Sueldos y Salarios') {
          payrollIncome += gross;
        } else {
          businessIncome += gross;
        }
      } else {
        totalExpense += gross;
        if (t.fiscalClassification === 'personal_deduction') {
          personalDeductions += gross;
        } else if (t.fiscalClassification === 'business_deduction') {
          businessDeductions += gross;
        } else {
          personalExpenses += gross;
        }
      }
    });

    const netAvailable = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      payrollIncome,
      businessIncome,
      isrWithheld,
      isrProvisional,
      personalExpenses,
      businessDeductions,
      personalDeductions,
      netAvailable,
    };
  }, [filteredTransactions]);

  // Monthly breakdown for Bar and Line charts
  const monthlyChartData = useMemo(() => {
    const data = MONTH_NAMES.map((name, index) => ({
      month: name.slice(0, 3),
      monthFull: name,
      ingresos: 0,
      gastos: 0,
      deducciones: 0,
    }));

    yearTransactions.forEach((t) => {
      const monthIdx = new Date(t.date + 'T12:00:00').getMonth();
      const gross = t.amountGross || t.amountNet;
      if (t.type === 'income') {
        data[monthIdx].ingresos += gross;
      } else {
        data[monthIdx].gastos += gross;
        if (t.fiscalClassification === 'personal_deduction' || t.fiscalClassification === 'business_deduction') {
          data[monthIdx].deducciones += gross;
        }
      }
    });

    // Compute cumulative balance
    let runningBalance = 0;
    return data.map((d) => {
      runningBalance += d.ingresos - d.gastos;
      return {
        ...d,
        flujoNeto: d.ingresos - d.gastos,
        balanceAcumulado: runningBalance,
      };
    });
  }, [yearTransactions]);

  // Income distribution by source
  const incomeDistributionData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        const cat = t.category || 'Otros ingresos';
        map[cat] = (map[cat] || 0) + (t.amountGross || t.amountNet);
      });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  // Expense distribution by category
  const expenseDistributionData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category || 'General';
        map[cat] = (map[cat] || 0) + (t.amountGross || t.amountNet);
      });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredTransactions]);

  // Deductible vs Non-Deductible distribution
  const deductibilityData = useMemo(() => {
    let deduciblesPersonales = 0;
    let deduciblesNegocio = 0;
    let noDeducibles = 0;

    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const amt = t.amountGross || t.amountNet;
        if (t.fiscalClassification === 'personal_deduction') {
          deduciblesPersonales += amt;
        } else if (t.fiscalClassification === 'business_deduction') {
          deduciblesNegocio += amt;
        } else {
          noDeducibles += amt;
        }
      });

    return [
      { name: 'Deducciones Personales (Art. 151)', value: deduciblesPersonales, color: '#10b981' },
      { name: 'Deducciones Autorizadas de Actividad', value: deduciblesNegocio, color: '#3b82f6' },
      { name: 'Gastos No Deducibles / Personales', value: noDeducibles, color: '#94a3b8' },
    ].filter((item) => item.value > 0);
  }, [filteredTransactions]);

  // Plain Spanish dynamic executive summary
  const executiveSummary = useMemo(() => {
    const periodLabel = selectedMonth === 'all' ? `el año fiscal ${activeYear}` : `el mes de ${MONTH_NAMES[parseInt(selectedMonth, 10)]} de ${activeYear}`;
    const personalDedsCount = filteredTransactions.filter(t => t.fiscalClassification === 'personal_deduction').length;
    
    return {
      title: `Resumen de tu situación financiera en ${periodLabel}`,
      body: `Durante este periodo registraste $${metrics.totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })} en ingresos totales y $${metrics.totalExpense.toLocaleString('es-MX', { minimumFractionDigits: 2 })} en egresos. Cuentas con un saldo disponible de $${metrics.netAvailable.toLocaleString('es-MX', { minimumFractionDigits: 2 })}. Se tienen identificadas ${personalDedsCount} partidas con potencial de deducción personal anual ante el SAT (Art. 151 LISR) por un total de $${metrics.personalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`,
      taxStatus: taxSummary.isRefundEstimated
        ? `Actualmente estimas un posible Saldo a Favor preliminar de $${Math.abs(taxSummary.estimatedBalance).toLocaleString('es-MX', { minimumFractionDigits: 2 })} para tu Declaración Anual.`
        : `Tienes un cálculo preliminar de ISR anual de $${taxSummary.estimatedAnnualTax.toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`,
    };
  }, [selectedMonth, activeYear, metrics, filteredTransactions, taxSummary]);

  return (
    <div className="space-y-6">
      {/* Header and Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Panel Financiero y Fiscal {activeYear}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Resumen consolidado de ingresos, deducciones LISR y retenciones de ISR.
          </p>
        </div>

        {/* Month selector */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Periodo:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filtrar por mes"
          >
            <option value="all">Todo el año {activeYear}</option>
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx} value={String(idx)}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Executive Summary Card in Plain Mexican Spanish */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30 shrink-0">
            <FileCheck2 className="w-5 h-5 text-blue-300" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                {executiveSummary.title}
              </h2>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LISR Art. 151 & 152
              </span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {executiveSummary.body}
            </p>
            <div className="pt-2 flex items-center space-x-2 text-xs font-semibold text-blue-200">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{executiveSummary.taxStatus}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 10 Key Indicators Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Total Ingresos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Ingresos</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">
            ${metrics.totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Bruto facturado / percibido</p>
        </div>

        {/* 2. Total Gastos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Gastos</span>
            <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">
            ${metrics.totalExpense.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Egresos registrados</p>
        </div>

        {/* 3. Ingresos Nómina */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Ingresos Nómina</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">
            ${metrics.payrollIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Sueldos y Asimilados</p>
        </div>

        {/* 4. Ingresos Profesionales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Ingresos Honorarios/Act.</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">
            ${metrics.businessIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Facturas emitidas</p>
        </div>

        {/* 5. ISR Retenido */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>ISR Retenido</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">
            ${metrics.isrWithheld.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">A cuenta de tu declaración</p>
        </div>

        {/* 6. ISR Pagos Provisionales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Pagos Provisionales ISR</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">
            ${metrics.isrProvisional.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Pagados directamente al SAT</p>
        </div>

        {/* 7. Gastos Personales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Gastos Personales</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">
            ${metrics.personalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Sin efecto fiscal (vida diaria)</p>
        </div>

        {/* 8. Gastos Deducibles Actividad */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Deducciones Actividad</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">
            ${metrics.businessDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Gastos indispensables negocio</p>
        </div>

        {/* 9. Deducciones Personales Art. 151 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Deducciones Personales</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-bold text-emerald-700 mt-2">
            ${metrics.personalDeductions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">Médicos, seguros, etc.</p>
        </div>

        {/* 10. Saldo Financiero Disponible */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Saldo Disponible</span>
            <div className={`p-1.5 rounded-lg ${metrics.netAvailable >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-lg font-bold mt-2 ${metrics.netAvailable >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
            ${metrics.netAvailable.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Ingresos menos egresos</p>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Ingresos vs Gastos por Mes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Ingresos vs Gastos ({activeYear})</h2>
              <p className="text-xs text-slate-500">Comparativa mensual de flujo de efectivo</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip
                  formatter={(value: any) => [`$${Number(value).toLocaleString('es-MX')}`, '']}
                  labelFormatter={(lbl) => `Mes: ${lbl}`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="ingresos" name="Ingresos" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Evolución Financiera Acumulada */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Evolución Financiera Acumulada</h2>
              <p className="text-xs text-slate-500">Saldo acumulado disponible a lo largo del año</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip
                  formatter={(value: any) => [`$${Number(value).toLocaleString('es-MX')}`, 'Balance']}
                />
                <Line
                  type="monotone"
                  dataKey="balanceAcumulado"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Distribución de Ingresos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Distribución de Ingresos</h2>
              <p className="text-xs text-slate-500">Fuentes de ingresos registradas</p>
            </div>
          </div>
          <div className="h-60 flex items-center justify-center">
            {incomeDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incomeDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {incomeDistributionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${Number(value).toLocaleString('es-MX')}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">Sin ingresos en el periodo seleccionado</p>
            )}
          </div>
        </div>

        {/* 5. Deductible vs Non-Deductible */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Gastos Deducibles vs No Deducibles</h2>
              <p className="text-xs text-slate-500">Clasificación para efectos del SAT</p>
            </div>
          </div>
          <div className="h-60 flex items-center justify-center">
            {deductibilityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deductibilityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {deductibilityData.map((entry, index) => (
                      <Cell key={`cell-deduc-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${Number(value).toLocaleString('es-MX')}`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">Sin gastos en el periodo seleccionado</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">¿Tienes nuevas facturas o recibos de nómina?</h3>
            <p className="text-xs text-slate-500">
              Sube tus archivos XML del SAT para procesarlos automáticamente y actualizar tus deducciones.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigateToTab('documents')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
        >
          Cargar Documentos CFDI
        </button>
      </div>
    </div>
  );
};
