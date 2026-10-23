/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, logoutUser, testConnection, handleFirestoreError, OperationType } from './lib/firebase';
import { TaxProfile, DocumentRecord, Transaction } from './types';
import { DEMO_TAX_PROFILE, DEMO_DOCUMENTS, DEMO_TRANSACTIONS } from './lib/demo-data';

import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { DocumentsView } from './components/documents/DocumentsView';
import { IncomeView } from './components/income/IncomeView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { ReportsView } from './components/reports/ReportsView';
import { TaxPrepView } from './components/tax-prep/TaxPrepView';
import { AssistantView } from './components/assistant/AssistantView';
import { SettingsView } from './components/settings/SettingsView';

const LOCAL_STORAGE_KEY_PROFILE = 'mi_control_fiscal_profile';
const LOCAL_STORAGE_KEY_DOCS = 'mi_control_fiscal_docs';
const LOCAL_STORAGE_KEY_TXS = 'mi_control_fiscal_txs';
const LOCAL_STORAGE_KEY_DEMO = 'mi_control_fiscal_demo_flag';

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // Initialize state with localStorage or rich demo data so user enters directly without login
  const [profile, setProfile] = useState<TaxProfile>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PROFILE);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading stored profile', e);
    }
    return DEMO_TAX_PROFILE;
  });

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [activeYear, setActiveYear] = useState<number>(() => profile?.fiscalYear || 2025);
  const [isDemoActive, setIsDemoActive] = useState<boolean>(() => {
    try {
      const flag = localStorage.getItem(LOCAL_STORAGE_KEY_DEMO);
      if (flag !== null) return flag === 'true';
    } catch {}
    return true;
  });

  const [documents, setDocuments] = useState<DocumentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_DOCS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading stored docs', e);
    }
    return DEMO_DOCUMENTS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_TXS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading stored txs', e);
    }
    return DEMO_TRANSACTIONS;
  });

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_DOCS, JSON.stringify(documents));
    } catch {}
  }, [documents]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_TXS, JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_DEMO, isDemoActive ? 'true' : 'false');
    } catch {}
  }, [isDemoActive]);

  // Optional background Firebase Auth connection without blocking the UI
  useEffect(() => {
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async user => {
      setCurrentUser(user);
      if (user) {
        // If a Google user is authenticated, sync remote records if available
        try {
          const profileRef = doc(db, 'users', user.uid, 'taxProfiles', 'default');
          const profileSnap = await getDoc(profileRef).catch(() => null);
          if (profileSnap && profileSnap.exists()) {
            const remoteProfile = profileSnap.data() as TaxProfile;
            setProfile(remoteProfile);
            setActiveYear(remoteProfile.fiscalYear || 2025);
          }

          const docsRef = collection(db, 'users', user.uid, 'documents');
          onSnapshot(docsRef, snapshot => {
            const loadedDocs: DocumentRecord[] = [];
            snapshot.forEach(d => loadedDocs.push(d.data() as DocumentRecord));
            if (loadedDocs.length > 0) {
              setDocuments(loadedDocs);
            }
          }, () => {});

          const txRef = collection(db, 'users', user.uid, 'transactions');
          onSnapshot(txRef, snapshot => {
            const loadedTx: Transaction[] = [];
            snapshot.forEach(d => loadedTx.push(d.data() as Transaction));
            if (loadedTx.length > 0) {
              setTransactions(loadedTx);
            }
          }, () => {});
        } catch (e) {
          console.warn('Sync warning with Firebase:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Profile update
  const handleSaveProfile = async (newProfile: TaxProfile) => {
    setProfile(newProfile);
    setActiveYear(newProfile.fiscalYear);

    if (currentUser) {
      try {
        const profileRef = doc(db, 'users', currentUser.uid, 'taxProfiles', 'default');
        await setDoc(profileRef, newProfile);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.uid}/taxProfiles/default`);
      }
    }
  };

  // Add Document
  const handleAddDocument = async (docRecord: DocumentRecord) => {
    setDocuments(prev => [docRecord, ...prev]);
    if (currentUser) {
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'documents', docRecord.id);
        await setDoc(docRef, docRecord);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.uid}/documents/${docRecord.id}`);
      }
    }
  };

  // Update Document
  const handleUpdateDocument = async (docRecord: DocumentRecord) => {
    setDocuments(prev => prev.map(d => (d.id === docRecord.id ? docRecord : d)));
    if (currentUser) {
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'documents', docRecord.id);
        await setDoc(docRef, docRecord);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}/documents/${docRecord.id}`);
      }
    }
  };

  // Delete Document
  const handleDeleteDocument = async (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
    if (currentUser) {
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'documents', docId);
        await deleteDoc(docRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `users/${currentUser.uid}/documents/${docId}`);
      }
    }
  };

  // Add Transaction
  const handleAddTransaction = async (tx: Transaction) => {
    setTransactions(prev => [tx, ...prev]);
    if (currentUser) {
      try {
        const txRef = doc(db, 'users', currentUser.uid, 'transactions', tx.id);
        await setDoc(txRef, tx);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.uid}/transactions/${tx.id}`);
      }
    }
  };

  // Update Transaction
  const handleUpdateTransaction = async (tx: Transaction) => {
    setTransactions(prev => prev.map(t => (t.id === tx.id ? tx : t)));
    if (currentUser) {
      try {
        const txRef = doc(db, 'users', currentUser.uid, 'transactions', tx.id);
        await setDoc(txRef, tx);
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${currentUser.uid}/transactions/${tx.id}`);
      }
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (txId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== txId));
    if (currentUser) {
      try {
        const txRef = doc(db, 'users', currentUser.uid, 'transactions', txId);
        await deleteDoc(txRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `users/${currentUser.uid}/transactions/${txId}`);
      }
    }
  };

  // Load DEMO data
  const handleLoadDemo = () => {
    setProfile(DEMO_TAX_PROFILE);
    setDocuments(DEMO_DOCUMENTS);
    setTransactions(DEMO_TRANSACTIONS);
    setActiveYear(2025);
    setIsDemoActive(true);
  };

  // Clear DEMO data / Purge
  const handleClearDemo = async () => {
    setDocuments(prev => prev.filter(d => !d.id.startsWith('doc-')));
    setTransactions(prev => prev.filter(t => !t.isDemo));
    setIsDemoActive(false);
  };

  const handleClearAllData = async () => {
    setDocuments([]);
    setTransactions([]);
    setIsDemoActive(false);
  };

  const pendingDocsCount = documents.filter(d => d.status === 'needs_review' || d.status === 'pending').length;
  const personalDeductionsCount = transactions.filter(t => t.fiscalClassification === 'personal_deduction').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        profile={profile}
        activeYear={activeYear}
        onYearChange={setActiveYear}
        userEmail={currentUser?.email}
        onLogout={logoutUser}
        isDemoActive={isDemoActive}
        onLoadDemo={handleLoadDemo}
        onClearDemo={handleClearDemo}
        onOpenSettings={() => setActiveTab('settings')}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          currentTab={activeTab}
          onTabChange={setActiveTab}
          pendingReviewsCount={pendingDocsCount}
          personalDeductionsCount={personalDeductionsCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              transactions={transactions}
              documents={documents}
              profile={profile}
              activeYear={activeYear}
              onNavigate={setActiveTab}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsView
              documents={documents}
              transactions={transactions}
              currentUserId={currentUser?.uid || 'local-user'}
              userRfc={profile?.rfc}
              onAddDocument={handleAddDocument}
              onUpdateDocument={handleUpdateDocument}
              onDeleteDocument={handleDeleteDocument}
              onAddTransaction={handleAddTransaction}
            />
          )}

          {activeTab === 'income' && (
            <IncomeView
              transactions={transactions}
              activeYear={activeYear}
              currentUserId={currentUser?.uid || 'local-user'}
              onAddTransaction={handleAddTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              transactions={transactions}
              activeYear={activeYear}
              currentUserId={currentUser?.uid || 'local-user'}
              onAddTransaction={handleAddTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              activeYear={activeYear}
              onDeleteTransaction={handleDeleteTransaction}
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

          {activeTab === 'tax-prep' && (
            <TaxPrepView
              transactions={transactions}
              documents={documents}
              profile={profile}
              activeYear={activeYear}
            />
          )}

          {activeTab === 'assistant' && (
            <AssistantView
              transactions={transactions}
              documents={documents}
              profile={profile}
              activeYear={activeYear}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              profile={profile}
              onUpdateProfile={handleSaveProfile}
              onLoadDemo={handleLoadDemo}
              onClearAllData={handleClearAllData}
              isDemoActive={isDemoActive}
            />
          )}
        </main>
      </div>
    </div>
  );
}
