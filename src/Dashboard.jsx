import React, { useState } from 'react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import {
  Box,
  Button,
  Typography,
  AppBar,
  Toolbar,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import { Routes, Route, useNavigate } from 'react-router-dom';

// 各画面コンポーネント
import ProductRegistrationPage from './ProductRegistrationPage';
import ProductListPage from './ProductListPage';
const CheapestPriceSearchPage = () => <Typography variant="h4">最安値検索画面</Typography>;
const PlaceholderPage = () => <Typography variant="h4">お気に入り画面</Typography>;


const Dashboard = () => {
  const navigate = useNavigate();
  const [value, setValue] = useState(0);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  return (
    <Box sx={{ pb: 7 }}>
      <AppBar position="static" sx={{ backgroundColor: '#616161' }}>
        <Toolbar>
          <Box sx={{ flexGrow: 1 }} />
          <Button color="inherit" onClick={handleLogout}>
            ログアウト
          </Button>
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/register" element={<ProductRegistrationPage />} />
        <Route path="/search" element={<ProductListPage />} />
        <Route path="/other" element={<PlaceholderPage />} />
        <Route path="/" element={<ProductRegistrationPage />} />
      </Routes>

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }} elevation={3}>
        <BottomNavigation
          showLabels
          value={value}
          onChange={(event, newValue) => {
            setValue(newValue);
            // 順序を交換
            if (newValue === 0) navigate('/other'); // お気に入り
            if (newValue === 1) navigate('/register'); // 商品登録
            if (newValue === 2) navigate('/search'); // 最安値検索
          }}
        >
          <BottomNavigationAction
            label="お気に入り" // 変更
            icon={<StarOutlineIcon sx={{ color: value === 0 ? 'primary.main' : 'text.secondary' }} />} // 変更
          />
          <BottomNavigationAction
            label="商品登録"
            icon={<AddCircleOutlineIcon sx={{ color: value === 1 ? 'primary.main' : 'text.secondary' }} />} 
          />
          <BottomNavigationAction
            label="最安値検索" // 変更
            icon={<SearchIcon sx={{ color: value === 2 ? 'primary.main' : 'text.secondary' }} />} // 変更
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default Dashboard;