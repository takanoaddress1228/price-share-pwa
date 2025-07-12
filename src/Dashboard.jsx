import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import {
  Box,
  Button,
  Typography,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// 各画面コンポーネント
import ProductRegistrationPage from './ProductRegistrationPage';
import ProductListPage from './ProductListPage';
import FavoriteProductsPage from './FavoriteProductsPage';


const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = useState(0);

  useEffect(() => {
    switch (location.pathname) {
      case '/price-share-pwa/other':
        setValue(0);
        break;
      case '/price-share-pwa/register':
      case '/price-share-pwa/':
        setValue(1);
        break;
      case '/price-share-pwa/search':
        setValue(2);
        break;
      default:
        setValue(1);
    }
  }, [location.pathname]);

  return (
    <Box sx={{ pb: 7 }}>
      <Routes>
        <Route path="/register" element={<ProductRegistrationPage />} />
        <Route path="/search" element={<ProductListPage />} />
        <Route path="/other" element={<FavoriteProductsPage />} />
        <Route path="/" element={<ProductRegistrationPage />} />
      </Routes>

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, width: '100%' }} elevation={3}>
        <BottomNavigation
          showLabels
          value={value}
          onChange={(event, newValue) => {
            setValue(newValue);
            if (newValue === 0) navigate('/other');
            if (newValue === 1) navigate('/register');
            if (newValue === 2) navigate('/search');
          }}
        >
          <BottomNavigationAction
            label="お気に入り"
            icon={<StarOutlineIcon sx={{ color: value === 0 ? 'primary.main' : 'text.secondary' }} />} 
            sx={{ flex: 1 }} // 追加
          />
          <BottomNavigationAction
            label="商品登録"
            icon={<AddCircleOutlineIcon sx={{ color: value === 1 ? 'primary.main' : 'text.secondary' }} />} 
            sx={{ flex: 1 }} // 追加
          />
          <BottomNavigationAction
            label="最安値検索"
            icon={<SearchIcon sx={{ color: value === 2 ? 'primary.main' : 'text.secondary' }} />} 
            sx={{ flex: 1 }} // 追加
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default Dashboard;
