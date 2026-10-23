import React, { useState } from 'react';
import {
  Settings,
  User,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Building2,
  Calendar,
  AlertCircle,
  Save,
} from 'lucide-react';
import { TaxProfile, FISCAL_REGIMES, FiscalRegimeCode } from '../../types';

interface SettingsViewProps {
  profile: TaxProfile;
  onUpdateProfile: (profile: TaxProfile) => void;
  onResetDemoData: () => void;
  onClearAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onUpdateProfile,
  onResetDemoData,
  onClearAllData,
}) => {
  const [formData, setFormData] = useState<TaxProfile>(profile);
  const [savedNotification, setSavedNotification] = useState(false);

  const handleRegimeToggle = (code: FiscalRegimeCode) => {
    setFormData((prev) => {
      const exists = prev.regimes.includes(code);
      const newRegimes = exists
        ? prev.regimes.filter((r) => r !== code)
        : [...prev.regimes, code];

      // Auto update flags based on regimes
      const hasPayroll = newRegimes.includes('605');
      const issuesInvoices = newRegimes.some((r) => ['612', '626', '606', '625'].includes(r));
      const makesProvisional = newRegimes.some((r) => ['612', '626', '606', '625'].includes(r));

      return {
        ...prev,
        regimes: newRegimes.length > 0 ? newRegimes : ['605'],
        hasPayroll,
        issuesInvoices,
        makesProvisionalPayments: makesProvisional,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Perfil y Configuración Fiscal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra tus datos como Persona Física, tus regímenes SAT y obligaciones tributarias.
          </p>
        </div>
      </div>

      {savedNotification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>¡Configuración fiscal actualizada correctamente!</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contribuyente */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Datos Generales del Contribuyente</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                value={formData.taxName}
                onChange={(e) => setFormData({ ...formData, taxName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del contribuyente"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">RFC (Persona Física)</label>
              <input
                type="text"
                value={formData.rfc}
                onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                maxLength={13}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500"
                placeholder="XXXX000000XXX"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                4 letras, 6 números (AAMMDD) y 3 caracteres de homoclave.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">País de Residencia Fiscal</label>
              <input
                type="text"
                disabled
                value="México"
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ejercicio Fiscal Primario</label>
              <select
                value={formData.fiscalYear}
                onChange={(e) => setFormData({ ...formData, fiscalYear: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
              </select>
            </div>
          </div>
        </div>

        {/* Regímenes SAT */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Regímenes Fiscales Registrados ante el SAT
              </h2>
            </div>
            <span className="text-xs text-slate-500">Puedes seleccionar varios</span>
          </div>

          <p className="text-xs text-slate-500">
            En México una persona física puede tributar en más de un régimen de ingresos simultáneamente (por ejemplo: asalariado con honorarios o inversiones).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {FISCAL_REGIMES.map((regime) => {
              const isSelected = formData.regimes.includes(regime.code);
              return (
                <div
                  key={regime.code}
                  onClick={() => handleRegimeToggle(regime.code)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                        Clave {regime.code}
                      </span>
                      <p className="font-bold text-slate-900 mt-1">{regime.shortName}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && '✓'}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    {regime.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Declaraciones y Obligaciones */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Obligaciones & Características</h2>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900">Recibe Recibos de Nómina timbrados</span>
                <p className="text-slate-500 text-[11px]">Trabajas como empleado bajo contrato laboral.</p>
              </div>
              <input
                type="checkbox"
                checked={formData.hasPayroll}
                onChange={(e) => setFormData({ ...formData, hasPayroll: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900">Emite facturas por actividades o servicios</span>
                <p className="text-slate-500 text-[11px]">Generas CFDI de ingresos a clientes o empresas.</p>
              </div>
              <input
                type="checkbox"
                checked={formData.issuesInvoices}
                onChange={(e) => setFormData({ ...formData, issuesInvoices: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900">Presenta Pagos Provisionales de ISR</span>
                <p className="text-slate-500 text-[11px]">Presentas declaraciones mensuales a cuenta del impuesto anual.</p>
              </div>
              <input
                type="checkbox"
                checked={formData.makesProvisionalPayments}
                onChange={(e) => setFormData({ ...formData, makesProvisionalPayments: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center space-x-2 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración Fiscal</span>
          </button>
        </div>
      </form>

      {/* Danger Zone / Reset */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Gestión de Datos Locales</h2>
        <p className="text-xs text-slate-500">
          Puedes recargar en cualquier momento los datos de prueba de Carlos Morales Sandoval o limpiar la base de datos local para ingresar tus propios comprobantes.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onResetDemoData}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors border border-slate-200"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restablecer Datos de Demostración</span>
          </button>

          <button
            type="button"
            onClick={onClearAllData}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors border border-rose-200"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Borrar Todos los Datos Locales</span>
          </button>
        </div>
      </div>
    </div>
  );
};
