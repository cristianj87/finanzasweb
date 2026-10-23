import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  TrendingUp,
  Receipt,
  ArrowLeftRight,
  FileBarChart,
  ClipboardCheck,
  Bot,
  Settings,
  Shield,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'documents'
  | 'income'
  | 'expenses'
  | 'transactions'
  | 'reports'
  | 'tax-prep'
  | 'assistant'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingReviewsCount?: number;
  personalDeductionsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  pendingReviewsCount = 0,
  personalDeductionsCount = 0,
}) => {
  const menuItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'documents' as NavTab,
      label: 'Mis documentos',
      icon: FolderOpen,
      badge: pendingReviewsCount > 0 ? `${pendingReviewsCount} por validar` : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'income' as NavTab,
      label: 'Mis ingresos',
      icon: TrendingUp,
      badge: null,
    },
    {
      id: 'expenses' as NavTab,
      label: 'Mis gastos',
      icon: Receipt,
      badge: personalDeductionsCount > 0 ? `${personalDeductionsCount} deducibles` : null,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'transactions' as NavTab,
      label: 'Movimientos',
      icon: ArrowLeftRight,
      badge: null,
    },
    {
      id: 'reports' as NavTab,
      label: 'Reportes',
      icon: FileBarChart,
      badge: null,
    },
    {
      id: 'tax-prep' as NavTab,
      label: 'Preparar declaración anual',
      icon: ClipboardCheck,
      badge: 'SAT',
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'assistant' as NavTab,
      label: 'Mi asistente financiero',
      icon: Bot,
      badge: 'IA',
      badgeColor: 'bg-purple-100 text-purple-800',
    },
    {
      id: 'settings' as NavTab,
      label: 'Configuración',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-1 flex-1">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Módulos Principales
        </div>

        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-800 text-white shadow-sm shadow-blue-800/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-blue-950 text-emerald-300' : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Safety notice disclaimer card */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/70">
        <div className="flex items-start space-x-2 text-[11px] text-slate-500 leading-relaxed">
          <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>Tus comprobantes e información financiera se aíslan de forma segura bajo tu cuenta de usuario.</span>
        </div>
      </div>
    </aside>
  );
};
