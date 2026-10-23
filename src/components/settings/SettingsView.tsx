import React, { useState } from 'react';
import { TaxProfile, FISCAL_REGIMES, FiscalRegimeCode } from '../../types';
import {
  Settings,
  User,
  Building2,
  Trash2,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  Database,
  ShieldCheck,
} from 'lucide-react';

interface SettingsViewProps {
  profile: TaxProfile | null;
  onUpdateProfile: (profile: TaxProfile) => Promise<void>;
  onLoadDemo: () => void;
  onClearAllData: () => Promise<void>;
  isDemoActive: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onUpdateProfile,
  onLoadDemo,
  onClearAllData,
  isDemoActive,
}) => {
  const [taxName, setTaxName] = useState(profile?.taxName || '');
  const [rfc, setRfc] = useState(profile?.rfc || '');
  const [fiscalYear, setFiscalYear] = useState<number>(profile?.fiscalYear || 2025);
  const [selectedRegimes, setSelectedRegimes] = useState<FiscalRegimeCode[]>(profile?.regimes || ['605']);
  const [hasPayroll, setHasPayroll] = useState(profile?.hasPayroll ?? true);
  const [issuesInvoices, setIssuesInvoices] = useState(profile?.issuesInvoices ?? false);
  const [makesProvisionalPayments, setMakesProvisionalPayments] = useState(profile?.makesProvisionalPayments ?? false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toggleRegime = (code: FiscalRegimeCode) => {
    if (selectedRegimes.includes(code)) {
      if (selectedRegimes.length > 1) {
        setSelectedRegimes(selectedRegimes.filter(c => c !== code));
      }
    } else {
      setSelectedRegimes([...selectedRegimes, code]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);
    try {
      const updated: TaxProfile = {
        ...profile,
        taxName: taxName.trim(),
        rfc: rfc.trim().toUpperCase(),
        fiscalYear,
        regimes: selectedRegimes,
        hasPayroll,
        issuesInvoices,
        makesProvisionalPayments,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateProfile(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error('Error saving settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Configuración del Contribuyente</h1>
          <p className="text-xs text-slate-500 mt-1">
            Administra tus regímenes del SAT, obligaciones fiscales y almacenamiento de datos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-bounce">
              <CheckCircle2 className="w-4 h-4" />
              ¡Guardado exitosamente!
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-blue-700" />
            <h2 className="text-sm font-bold text-slate-900">Datos Generales del Contribuyente</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                value={taxName}
                onChange={e => setTaxName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">RFC (Persona Física)</label>
              <input
                type="text"
                value={rfc}
                onChange={e => setRfc(e.target.value.toUpperCase())}
                placeholder="Ej. ABCD900101XYZ"
                className="w-full px-3.5 py-2 text-xs border rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ejercicio Fiscal Predeterminado</label>
            <select
              value={fiscalYear}
              onChange={e => setFiscalYear(Number(e.target.value))}
              className="w-full sm:w-60 px-3.5 py-2 text-xs border rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value={2026}>Ejercicio 2026</option>
              <option value={2025}>Ejercicio 2025</option>
              <option value={2024}>Ejercicio 2024</option>
            </select>
          </div>
        </div>

        {/* Regimes Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-blue-700" />
            <h2 className="text-sm font-bold text-slate-900">Regímenes Fiscales Registrados ante el SAT</h2>
          </div>
          <p className="text-xs text-slate-500">
            Selecciona todos los regímenes bajo los cuales tributas actualmente en el SAT:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FISCAL_REGIMES.map(regime => {
              const isSelected = selectedRegimes.includes(regime.code);
              return (
                <div
                  key={regime.code}
                  onClick={() => toggleRegime(regime.code)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-semibold text-xs text-slate-900 block">{regime.shortName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Clave {regime.code}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Obligations Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Configuración de Comprobantes Habituales</h2>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hasPayroll}
                onChange={e => setHasPayroll(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span>Tengo recibos de nómina timbrados por uno o más empleadores</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={issuesInvoices}
                onChange={e => setIssuesInvoices(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span>Emito facturas electrónicas CFDI por honorarios, actividades o rentas</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={makesProvisionalPayments}
                onChange={e => setMakesProvisionalPayments(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span>Realizo pagos provisionales de ISR o declaraciones mensuales de IVA</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Cambios del Perfil'}</span>
          </button>
        </div>
      </form>

      {/* Danger Zone / Data Management */}
      <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-rose-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-rose-600" />
          Gestión de Datos y Entorno de Pruebas
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Puedes recargar en cualquier momento el perfil de demostración mexicano ("Carlos Morales Sandoval") para explorar todas las gráficas y reportes, o vaciar toda la información para comenzar desde cero con tus propios CFDI reales.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onLoadDemo}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition"
          >
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Recargar Datos de Ejemplo (DEMO)</span>
          </button>

          <button
            type="button"
            onClick={onClearAllData}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Eliminar Todos mis Datos y Comprobantes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
