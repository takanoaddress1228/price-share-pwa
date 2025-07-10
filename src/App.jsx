import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

// メインアプリのコンポーネント
import MainApp from './MainApp'; 
// ログイン画面のコンポーネント
import Login from './Login';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebaseのログイン状態を監視するリスナー
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // コンポーネントが不要になった時にリスナーを解除
    return () => {
      unsubscribe();
    };
  }, []);

  // ローディング中なら、くるくる回るアイコンを表示
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // userがいればメイン画面、いなければログイン画面を表示
  return user ? <MainApp /> : <Login />;
}

export default App;