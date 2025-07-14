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

  const getInitialValue = () => {
    const currentPath = location.pathname;
    if (currentPath.includes('/other')) {
      return 0;
    } else if (currentPath.includes('/search')) {
      return 2;
    } else if (currentPath.includes('/register') || currentPath === '/price-share-pwa/') {
      return 1;
    }
    return 1; // Default to 商品登録
  };

  const [value, setValue] = useState(getInitialValue());

  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath.includes('/other')) {
      setValue(0);
    } else if (currentPath.includes('/search')) {
      setValue(2);
    } else if (currentPath.includes('/register') || currentPath === '/price-share-pwa/') {
      setValue(1);
    }
  }, [location.pathname]);

  return (
    <Box>
      <Routes>
        <Route path="/register/:productId?" element={<ProductRegistrationPage />} />
        <Route path="/search" element={<ProductListPage />} />
        <Route path="/other" element={<FavoriteProductsPage />} />
        <Route path="/" element={<ProductRegistrationPage />} />
      </Routes>

      <Paper sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, width: '100%', boxShadow: 'none', borderBottom: '1px solid #e0e0e0' }} elevation={0}>
        <BottomNavigation
          showLabels
          value={value}
          onChange={(event, newValue) => {
            setValue(newValue);
            if (newValue === 0) navigate('/other');
            if (newValue === 1) navigate('/register');
            if (newValue === 2) navigate('/search');
          }}
          sx={{ border: 'none', boxShadow: 'none' }}
        >
          <BottomNavigationAction
            label="お気に入り"
            icon={<StarOutlineIcon sx={{ color: value === 0 ? 'primary.main' : 'text.secondary' }} />}
            sx={{ flex: 1, border: 'none', outline: 'none', boxShadow: 'none', '&:focus': { outline: 'none' }, '&:active': { outline: 'none' }, '&:focus-visible': { outline: 'none' } }}
          />
          <BottomNavigationAction
            label="商品登録"
            icon={<AddCircleOutlineIcon sx={{ color: value === 1 ? 'primary.main' : 'text.secondary' }} />}
            sx={{ flex: 1, border: 'none', outline: 'none', boxShadow: 'none', '&:focus': { outline: 'none' }, '&:active': { outline: 'none' }, '&:focus-visible': { outline: 'none' } }}
          />
          <BottomNavigationAction
            label="最安値検索"
            icon={<SearchIcon sx={{ color: value === 2 ? 'primary.main' : 'text.secondary' }} />}
            sx={{ flex: 1, border: 'none', outline: 'none', boxShadow: 'none', '&:focus': { outline: 'none' }, '&:active': { outline: 'none' }, '&:focus-visible': { outline: 'none' } }}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default Dashboard;
