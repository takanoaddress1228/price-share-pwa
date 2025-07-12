
import React, { useState } from 'react';
import { auth } from './firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
} from 'firebase/auth';
import {
  Box,
  Button,
  Typography,
  Paper,
  Divider,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

const Login = () => {
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSkip = async () => {
    setError('');
    try {
      await signInAnonymously(auth);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%', // 画面全体の幅を使用
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa', // 白に近い淡いグレーの背景
        p: 2,
      }}
    >
      <Paper
        elevation={3} // 影を柔らかく
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: '12px', // 角を少し丸く
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.08)', // 柔らかい影
          margin: 'auto', // 中央寄せ
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3, color: '#343a40' }}>
          最安値検索アプリ
        </Typography>

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2, mb: 2 }}>
            {error.replace('Firebase: ', '')}
          </Typography>
        )}

        <Button
          fullWidth
          variant="contained"
          startIcon={<GoogleIcon />}
          onClick={handleGoogleSignIn}
          sx={{
            mt: 2,
            mb: 2,
            py: 1.5,
            fontSize: '1.1rem',
            backgroundColor: '#4285F4', // Googleカラーを維持
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#357ae8',
            },
          }}
        >
          Googleでログイン
        </Button>

        <Divider sx={{ my: 3, width: '100%', borderColor: 'rgba(0, 0, 0, 0.1)' }}>または</Divider>

        <Button
          fullWidth
          variant="text"
          onClick={handleSkip}
          sx={{
            mt: 1,
            fontSize: '1rem',
            color: '#6c757d', // 落ち着いたグレー
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          スキップして閲覧
        </Button>
      </Paper>
    </Box>
  );
};

export default Login;
