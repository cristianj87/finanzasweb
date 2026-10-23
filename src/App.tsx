import React, { useState, useEffect } from 'react';
import { TaxProfile, DocumentRecord, Transaction, FiscalClassification } from './types';
import { DEMO_TAX_PROFILE, DEMO_DOCUMENTS, DEMO_TRANSACTIONS } from './lib/demo-data';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { DocumentsView } from './components/documents/DocumentsView';
import { IncomeView } from './components/income/IncomeView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { TaxPrepView } from './components/tax-prep/TaxPrepView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';

const STORAGE_KEYS = {
  PROFILE: 'mcf_tax_profile_v1',
  DOCUMENTS: 'mcf_documents_v1',
  TRANSACTIONS: 'mcf_transactions_v1',
  ACTIVE_YEAR: 'mcf_active_year_v1',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [activeYear, setActiveYear] = useState<number>(2025);

  // Profile State
  const [profile, setProfile] = useState<TaxProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error loading profile from localStorage', e);
    }
    return DEMO_TAX_PROFILE;
  });

  // Documents State
  const [documents, setDocuments] = useState<DocumentRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error loading documents from localStorage', e);
    }
    return DEMO_DOCUMENTS;
  });

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error loading transactions from localStorage', e);
    }
    return DEMO_TRANSACTIONS;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Error saving profile to localStorage', e);
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
    } catch (e) {
      console.error('Error saving documents to localStorage', e);
    }
  }, [documents]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Error saving transactions to localStorage', e);
    }
  }, [transactions]);

  // Document actions
  const handleAddDocument = (newDoc: DocumentRecord, newTx?: Transaction) => {
    setDocuments((prev) => [newDoc, ...prev]);
    if (newTx) {
      setTransactions((prev) => [newTx, ...prev]);
    }
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setTransactions((prev) => prev.filter((t) => t.documentId !== id));
  };

  const handleUpdateDocument = (updatedDoc: DocumentRecord) => {
    setDocuments((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
  };

  // Transaction actions
  const handleAddTransaction = (newTx: Transaction) => {
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateClassification = (id: string, classification: FiscalClassification) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, fiscalClassification: classification } : t))
    );
  };

  // Reset to demo data
  const handleResetDemoData = () => {
    setProfile(DEMO_TAX_PROFILE);
    setDocuments(DEMO_DOCUMENTS);
    setTransactions(DEMO_TRANSACTIONS);
    setActiveYear(2025);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  };

  // Clear all data
  const handleClearAllData = () => {
    setDocuments([]);
    setTransactions([]);
    setProfile({
      id: `profile-${Date.now()}`,
      userId: 'local-user',
      taxName: 'Nuevo Contribuyente',
      rfc: '',
      fiscalYear: activeYear,
      regimes: ['605'],
      hasPayroll: true,
      issuesInvoices: false,
      makesProvisionalPayments: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const pendingReviewDocsCount = documents.filter((d) => d.status === 'needs_review').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Navigation */}
      <Navbar
        profile={profile}
        activeYear={activeYear}
        onYearChange={setActiveYear}
        onResetDemoData={handleResetDemoData}
        hasCustomData={documents.length !== DEMO_DOCUMENTS.length}
      />

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          currentTab={activeTab}
          onSelectTab={setActiveTab}
          pendingReviewCount={pendingReviewDocsCount}
        />

        {/* Dynamic View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              documents={documents}
              profile={profile}
              activeYear={activeYear}
              onNavigateToTab={setActiveTab}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsView
              documents={documents}
              transactions={transactions}
              profile={profile}
              activeYear={activeYear}
              onAddDocument={handleAddDocument}
              onDeleteDocument={handleDeleteDocument}
              onUpdateDocument={handleUpdateDocument}
            />
          )}

          {activeTab === 'income' && (
            <IncomeView
              transactions={transactions}
              profile={profile}
              activeYear={activeYear}
              onAddTransaction={handleAddTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              transactions={transactions}
              profile={profile}
              activeYear={activeYear}
              onAddTransaction={handleAddTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onUpdateClassification={handleUpdateClassification}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              profile={profile}
              activeYear={activeYear}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeTab === 'tax-prep' && (
            <TaxPrepView
              transactions={transactions}
              profile={profile}
              activeYear={activeYear}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              transactions={transactions}
              documents={documents}
              profile={profile}
              activeYear={activeYear}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              profile={profile}
              onUpdateProfile={setProfile}
              onResetDemoData={handleResetDemoData}
              onClearAllData={handleClearAllData}
            />
          )}
        </main>
      </div>
    </div>
  );
}
