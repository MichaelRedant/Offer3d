import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import NewQuotePage from './pages/NewQuotePage';
import Layout from './components/Layout';
import SettingsPage from './pages/SettingsPage';
import MaterialManager from "./components/settings/MaterialManager";
import ManufacturerManager from "./components/settings/ManufacturerManager";
import DryerManager from "./components/settings/DryerManager";
import PriceRulesManager from "./components/settings/PriceRulesManager";
import QuotesPage from "./pages/QuotesPage";
import QuoteDetailPage from "./pages/QuoteDetailPage";
import KlantenBeheer from "./pages/KlantenBeheer";

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <BrowserRouter basename="/offr3d">
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/offerte" element={<NewQuotePage />} />
      
              <Route path="/instellingen" element={<SettingsPage />} />
              <Route path="/materialen" element={<MaterialManager />} />
              <Route path="/instellingen/fabrikanten" element={<ManufacturerManager />} />
              <Route path="/instellingen/prijslijsten" element={<PriceRulesManager />} />
              <Route path="/instellingen/drogers" element={<DryerManager />} />
              <Route path="/offertes" element={<QuotesPage />} />
              <Route path="/offertes/:id" element={<QuoteDetailPage />} />
              <Route path="/instellingen/klanten" element={<KlantenBeheer />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </SettingsProvider>
  );
}
