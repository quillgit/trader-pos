import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ProductMaster from '@/pages/ProductMaster';
import PartnerMaster from '@/pages/PartnerMaster';
import EmployeeMaster from '@/pages/EmployeeMaster';
import PurchasesList from '@/pages/PurchasesList';
import PurchaseForm from '@/pages/PurchaseForm';
import SalesList from '@/pages/SalesList';
import SalesForm from '@/pages/SalesForm';
import ExpenseForm from '@/pages/ExpenseForm';
import Settings from '@/pages/Settings';
import Reports from '@/pages/Reports';
import HRISDashboard from '@/pages/HRIS/Dashboard';
import AttendancePage from '@/pages/HRIS/Attendance';
import PayrollPage from '@/pages/HRIS/Payroll';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductMaster />} />
          <Route path="partners" element={<PartnerMaster />} />
          <Route path="employees" element={<EmployeeMaster />} />
          <Route path="purchases" element={<PurchasesList />} />
          <Route path="purchases/new" element={<PurchaseForm />} />
          <Route path="sales" element={<SalesList />} />
          <Route path="sales/new" element={<SalesForm />} />
          <Route path="expenses/new" element={<ExpenseForm />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="hris" element={<HRISDashboard />} />
          <Route path="hris/attendance" element={<AttendancePage />} />
          <Route path="hris/payroll" element={<PayrollPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
