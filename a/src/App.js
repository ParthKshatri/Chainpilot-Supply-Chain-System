import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import InventoryPage from './pages/InventoryPage';
import PredictionsPage from './pages/PredictionsPage';
import CalendarPage from './pages/CalendarPage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg-page)' }}>
      <div className="loading-spinner" style={{ width:36, height:36 }} />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#1A1033',
              border: '0.5px solid #E2DEFF',
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              boxShadow: '0 4px 20px rgba(124,106,247,0.12)',
              borderRadius: '10px',
              padding: '10px 14px',
            },
            success: { iconTheme: { primary:'#10A37F', secondary:'#fff' } },
            error:   { iconTheme: { primary:'#DC2626', secondary:'#fff' } },
            duration: 3000,
          }}
        />
        <Routes>
          <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index         element={<DashboardPage />} />
            <Route path="products"    element={<ProductsPage />} />
            <Route path="inventory"   element={<InventoryPage />} />
            <Route path="predictions" element={<PredictionsPage />} />
            <Route path="calendar"    element={<CalendarPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
