import React from 'react';
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Receipt,
  ListOrdered,
  Calculator,
  BarChart3,
  Settings,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export type NavigationTab =
  | 'dashboard'
  | 'documents'
  | 'income'
  | 'expenses'
  | 'transactions'
  | 'tax-prep'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  pendingReviewCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingReviewCount = 0,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Panel General',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'documents' as NavigationTab,
      label: 'Bóveda de Documentos',
      icon: FileText,
      badge: pendingReviewCount > 0 ? pendingReviewCount : null,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      id: 'income' as NavigationTab,
      label: 'Ingresos y Nómina',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'expenses' as NavigationTab,
      label: 'Gastos y Deducciones',
      icon: Receipt,
      badge: null,
    },
    {
      id: 'transactions' as NavigationTab,
      label: 'Libro de Movimientos',
      icon: ListOrdered,
      badge: null,
    },
    {
      id: 'tax-prep' as NavigationTab,
      label: 'Preparación Fiscal SAT',
      icon: Calculator,
      badge: 'Art. 151',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      id: 'reports' as NavigationTab,
      label: 'Reportes y Cierres',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'settings' as NavigationTab,
      label: 'Perfil y Regímenes',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-100">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Almacenamiento Local Seguro</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Tus datos fiscales se procesan de manera privada en tu navegador.
          </p>
        </div>
      </div>

      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-800 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-blue-700' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    item.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Legal Notice */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <p className="text-[11px] text-slate-500 leading-tight">
          <strong>Aviso legal:</strong> Herramienta de apoyo y cálculo referencial conforme a la LISR. No sustituye la asesoría de un contador público certificado.
        </p>
      </div>
    </aside>
  );
};
