import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// メインアプリのコンポーネント (Dashboardにリネーム予定)
import Dashboard from './Dashboard';
// ログイン画面のコンポーネント
import Login from './Login';
// 設定・お問い合わせ画面のコンポーネント
import SettingsAndInquiryPage from './SettingsAndInquiryPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <BrowserRouter basename="/price-share-pwa"> {/* ここにbasenameを追加 */}
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/settings" element={user ? <SettingsAndInquiryPage /> : <Navigate to="/login" />} /> {/* 追加 */}
          <Route path="/*" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </Box>
  );
}

export default App;