import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useRegisterSW } from 'virtual:pwa-register/react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleRoute from '@/components/RoleRoute';
import { AuthProvider } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ProductMaster from '@/pages/ProductMaster';
import PartnerMaster from '@/pages/PartnerMaster';
import EmployeeMaster from '@/pages/EmployeeMaster';
import ExpenseCategoryMaster from '@/pages/ExpenseCategoryMaster';
import PurchasesList from '@/pages/PurchasesList';
import PurchaseForm from '@/pages/PurchaseForm';
import SalesList from '@/pages/SalesList';
import SalesForm from '@/pages/SalesForm';
import ExpensesList from '@/pages/ExpensesList';
import ExpenseForm from '@/pages/ExpenseForm';
import CashIn from '@/pages/CashIn';
import CashOut from '@/pages/CashOut';
import Settings from '@/pages/Settings';
import AdminLicenses from '@/pages/AdminLicenses';
import Reports from '@/pages/Reports';
import UserGuide from '@/pages/UserGuide';
import PublicHome from '@/pages/PublicHome';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import HRISDashboard from '@/pages/HRIS/Dashboard';
import AttendancePage from '@/pages/HRIS/Attendance';
import PayrollPage from '@/pages/HRIS/Payroll';
import TopupPage from '@/pages/Topup';
import Proposal from '@/pages/Proposal';

function App() {
  useEffect(() => {
    const companyName = localStorage.getItem('COMPANY_NAME');
    if (companyName) {
      document.title = `TraderPOS - ${companyName}`;
    }
  }, []);

  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW();

  useEffect(() => {
    if (offlineReady) {
      toast.success('App ready for offline use');
    }
  }, [offlineReady]);

  const updatingRef = useRef(false);
  useEffect(() => {
    if (needRefresh && !updatingRef.current) {
      updatingRef.current = true;
      const toastId = toast.loading('Updating to latest version...');
      try {
        updateServiceWorker(true);
      } finally {
        // In case reload doesn't happen immediately, prevent endless loading toast
        setTimeout(() => toast.dismiss(toastId), 10000);
      }
    }
  }, [needRefresh, updateServiceWorker]);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/home" element={<PublicHome />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/login" element={<Login />} />
          <Route path="/proposal" element={<Proposal />} />

          <Route path="/app" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            
            {/* Master Data */}
            <Route path="products" element={
              <RoleRoute roles={['ADMIN', 'FINANCE', 'WAREHOUSE']}>
                <ProductMaster />
              </RoleRoute>
            } />
            <Route path="partners" element={
              <RoleRoute roles={['ADMIN', 'FINANCE', 'FIELD']}>
                <PartnerMaster />
              </RoleRoute>
            } />
            <Route path="employees" element={
              <RoleRoute roles={['ADMIN', 'HR']}>
                <EmployeeMaster />
              </RoleRoute>
            } />
            <Route path="expense-categories" element={
              <RoleRoute roles={['ADMIN', 'FINANCE']}>
                <ExpenseCategoryMaster />
              </RoleRoute>
            } />

            {/* Transactions */}
            <Route path="purchases" element={
              <RoleRoute roles={['ADMIN', 'FINANCE', 'FIELD']}>
                <PurchasesList />
              </RoleRoute>
            } />
            <Route path="purchases/new" element={
              <RoleRoute roles={['ADMIN', 'FINANCE', 'FIELD']}>
                <PurchaseForm />
              </RoleRoute>
            } />
            <Route path="purchases/:id/edit" element={
              <RoleRoute roles={['ADMIN', 'FINANCE', 'FIELD']}>
                <PurchaseForm />
              </RoleRoute>
            } />

            <Route path="sales" element={
              <RoleRoute roles={['ADMIN', 'FINANCE', 'FIELD']}>
                <SalesList />
              </RoleRoute>
            } />
            <Route path="sales/new" element={
              <RoleRoute roles={['ADMIN', 'FINANCE', 'FIELD']}>
                <SalesForm />
              </RoleRoute>
            } />
            <Route path="sales/:id/edit" element={
              <RoleRoute roles={['ADMIN', 'FINANCE', 'FIELD']}>
                <SalesForm />
              </RoleRoute>
            } />

            <Route path="topup" element={
              <RoleRoute roles={['ADMIN', 'FINANCE']}>
                <TopupPage />
              </RoleRoute>
            } />

            {/* Finance */}
            <Route path="expenses" element={
              <RoleRoute roles={['ADMIN', 'FINANCE']}>
                <ExpensesList />
              </RoleRoute>
            } />
            <Route path="expenses/new" element={
              <RoleRoute roles={['ADMIN', 'FINANCE']}>
                <ExpenseForm />
              </RoleRoute>
            } />
            <Route path="cash-in" element={
              <RoleRoute roles={['ADMIN', 'FINANCE']}>
                <CashIn />
              </RoleRoute>
            } />
            <Route path="cash-out" element={
              <RoleRoute roles={['ADMIN', 'FINANCE']}>
                <CashOut />
              </RoleRoute>
            } />

            {/* Reports */}
            <Route path="reports" element={
              <RoleRoute roles={['ADMIN', 'FINANCE']}>
                <Reports />
              </RoleRoute>
            } />

            {/* System */}
            <Route path="settings" element={
              <RoleRoute roles={['ADMIN']}>
                <Settings />
              </RoleRoute>
            } />
            <Route path="admin/licenses" element={<AdminLicenses />} />
            <Route path="guide" element={<UserGuide />} />

            {/* HRIS */}
            <Route path="hris" element={
              <RoleRoute roles={['ADMIN', 'HR']}>
                <HRISDashboard />
              </RoleRoute>
            } />
            <Route path="hris/attendance" element={<AttendancePage />} />
            <Route path="hris/payroll" element={
              <RoleRoute roles={['ADMIN', 'HR']}>
                <PayrollPage />
              </RoleRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
