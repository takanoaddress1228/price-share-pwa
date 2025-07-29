import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import {
  Box,
  Button,
  Typography,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  AppBar, // 追加
  Toolbar, // 追加
  IconButton, // 追加
  Menu, // 追加
  MenuItem, // 追加
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert'; // 追加
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// 各画面コンポーネント
import ProductRegistrationPage from './ProductRegistrationPage';
import ProductListPage from './ProductListPage';
import FavoriteProductsPage from './FavoriteProductsPage';
import SettingsAndInquiryPage from './SettingsAndInquiryPage'; // 追加


const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [anchorEl, setAnchorEl] = useState(null); // メニューのアンカー要素
  const open = Boolean(anchorEl); // メニューが開いているかどうかの状態

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getInitialValue = () => {
    const currentPath = location.pathname;
    if (currentPath.includes('/other')) {
      return 0;
    } else if (currentPath.includes('/search')) {
      return 2;
    } else if (currentPath.includes('/register') || currentPath === BASE_URL) {
      return 1;
    }
    return 1; // Default to 商品登録
  };

  const BASE_URL = import.meta.env.BASE_URL;

  const [value, setValue] = useState(getInitialValue());

  const commonBottomNavActionSx = {
    flex: 1,
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    '&:focus': { outline: 'none' },
    '&:active': { outline: 'none' },
    '&:focus-visible': { outline: 'none' },
  };

  useEffect(() => {
    const currentPath = location.pathname;
    if (currentPath.includes('/other')) {
      setValue(0);
    } else if (currentPath.includes('/search')) {
      setValue(2);
    } else if (currentPath.includes('/register') || currentPath === BASE_URL) {
      setValue(1);
    }
  }, [location.pathname]);

  return (
    <Box sx={{ pb: 7 }}> {/* BottomNavigationの高さ分だけpadding-bottomを追加 */}
      <AppBar position="fixed" sx={{ top: 0, bottom: 'auto', backgroundColor: '#fff', boxShadow: 'none', borderBottom: '1px solid #e0e0e0' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#333' }}>
            価格登録アプリ
          </Typography>
          <IconButton
            aria-label="more"
            aria-controls="long-menu"
            aria-haspopup="true"
            onClick={handleMenuOpen}
            sx={{ color: '#333' }}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            id="long-menu"
            MenuListProps={{
              'aria-labelledby': 'long-button',
            }}
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            PaperProps={{
              style: {
                maxHeight: 48 * 4.5,
                width: '20ch',
              },
            }}
          >
            <MenuItem onClick={() => { handleMenuClose(); navigate('/register'); }}>
              ホーム
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }}>
              設定・お問い合わせ
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); auth.signOut(); }}>
              ログアウト
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/register/:productId?" element={<ProductRegistrationPage />} />
        <Route path="/search" element={<ProductListPage />} />
        <Route path="/other" element={<FavoriteProductsPage />} />
        <Route path="/settings" element={<SettingsAndInquiryPage />} /> {/* 追加 */}
        <Route path="/" element={<ProductRegistrationPage />} />
      </Routes>

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, width: '100%', boxShadow: 'none', borderTop: '1px solid #e0e0e0' }} elevation={0}>
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
            sx={commonBottomNavActionSx}
          />
          <BottomNavigationAction
            label="商品登録"
            icon={<AddCircleOutlineIcon sx={{ color: value === 1 ? 'primary.main' : 'text.secondary' }} />}
            sx={commonBottomNavActionSx}
          />
          <BottomNavigationAction
            label="最安値検索"
            icon={<SearchIcon sx={{ color: value === 2 ? 'primary.main' : 'text.secondary' }} />}
            sx={commonBottomNavActionSx}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default Dashboard;
