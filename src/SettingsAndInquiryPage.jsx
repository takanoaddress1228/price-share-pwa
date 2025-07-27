import React from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase'; // Firebase authをインポート

const SettingsAndInquiryPage = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/price-share-pwa/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
      alert('ログアウト中にエラーが発生しました。');
    }
  };

  return (
    <Box sx={{ p: 3, pt: '70px' }}>
      <Typography variant="h5" component="h1" gutterBottom>
        設定・お問い合わせ
      </Typography>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          お問い合わせ
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="お問い合わせ内容"
          variant="outlined"
          placeholder="ご意見、ご要望、不具合などはこちらへ"
          sx={{ mb: 2 }}
        />
        <Button variant="contained" color="primary">
          送信
        </Button>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          アカウント
        </Typography>
        <Button variant="outlined" color="secondary" onClick={handleLogout}>
          ログアウト
        </Button>
      </Box>
    </Box>
  );
};

export default SettingsAndInquiryPage;
