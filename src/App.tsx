import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import ProductMaster from '@/pages/ProductMaster';
import PartnerMaster from '@/pages/PartnerMaster';
import PurchasesList from '@/pages/PurchasesList';
import PurchaseForm from '@/pages/PurchaseForm';
import SalesList from '@/pages/SalesList';
import SalesForm from '@/pages/SalesForm';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductMaster />} />
          <Route path="partners" element={<PartnerMaster />} />
          <Route path="purchases" element={<PurchasesList />} />
          <Route path="purchases/new" element={<PurchaseForm />} />
          <Route path="sales" element={<SalesList />} />
          <Route path="sales/new" element={<SalesForm />} />
          <Route path="hris" element={<div className="p-4">HRIS (Coming Soon)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
