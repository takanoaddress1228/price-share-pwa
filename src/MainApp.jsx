import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import {
  Box,
  Button,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  Paper,
  Select, // Selectを追加
  MenuItem, // MenuItemを追加
  FormControl, // FormControlを追加
  InputLabel,
  Rating, // Ratingを追加
} from '@mui/material';

const MainApp = () => {
  const [manufacturer, setManufacturer] = useState('');
  const [productName, setProductName] = useState('');
  const [priceExcludingTax, setPriceExcludingTax] = useState('');
  const [volume, setVolume] = useState('');
  const [unit, setUnit] = useState('g'); // デフォルト値を設定
  const [storeName, setStoreName] = useState('');
  const [products, setProducts] = useState([]); // 商品一覧を保持するstate

  // 商品データをリアルタイムで取得
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);
    });

    // クリーンアップ関数
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!manufacturer || !productName || !priceExcludingTax || !volume || !unit || !storeName) {
      alert('すべての項目を入力してください。');
      return;
    }

    try {
      await addDoc(collection(db, "products"), {
        userId: auth.currentUser.uid, // ユーザーID
        manufacturer: manufacturer,
        productName: productName,
        priceExcludingTax: Number(priceExcludingTax), // 数値として保存
        volume: Number(volume), // 数値として保存
        unit: unit,
        storeName: storeName,
        rating: 0, // 初期値として0を設定（未評価）
        createdAt: serverTimestamp(), // 登録日時
      });
      // フォームをクリア
      setManufacturer('');
      setProductName('');
      setPriceExcludingTax('');
      setVolume('');
      setUnit('g'); // デフォルト値に戻す
      setStoreName('');
    } catch (e) {
      console.error("商品追加エラー: ", e);
      alert('商品の追加に失敗しました。');
    }
  };

  const handleClearForm = () => {
    setManufacturer('');
    setProductName('');
    setPriceExcludingTax('');
    setVolume('');
    setUnit('g'); // デフォルト値に戻す
    setStoreName('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h1">
            商品登録
          </Typography>
          <Button variant="outlined" sx={{ color: '#616161', borderColor: '#bdbdbd', py: 1.5 }} onClick={handleLogout}>
            ログアウト
          </Button>
        </Box>

        <Box component="form" onSubmit={handleAddProduct} sx={{ mb: 4 }}>
          <TextField
            fullWidth
            label="メーカー"
            placeholder="エバラ食品"
            value={manufacturer}
            onChange={(e) => setManufacturer(e.target.value)}
            margin="normal"
            InputLabelProps={{ style: { color: '#616161' }, shrink: true }} // ラベルの色と常に枠外表示
            InputProps={{ style: { color: '#424242' } }} // 入力文字の色
          />
          <TextField
            fullWidth
            label="商品名"
            placeholder="黄金の味 中辛"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            margin="normal"
            InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
            InputProps={{ style: { color: '#424242' } }} // 入力文字の色
          />
          <TextField
            fullWidth
            label="税抜き価格"
            placeholder="398"
            type="number"
            value={priceExcludingTax}
            onChange={(e) => setPriceExcludingTax(e.target.value)}
            margin="normal"
            InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
            InputProps={{ style: { color: '#424242' } }} // 入力文字の色
          />
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, my: 2 }}>
          <TextField
            label="内容量"
            placeholder="210"
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            sx={{ flex: 1 }}
            InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
            InputProps={{ style: { color: '#424242' } }} // 入力文字の色
          />
          <FormControl sx={{ width: '100px' }}>
            <InputLabel id="unit-label" style={{ color: '#616161' }}>単位</InputLabel>
            <Select
              labelId="unit-label"
              id="unit-select"
              value={unit}
              label="単位"
              onChange={(e) => setUnit(e.target.value)}
              sx={{ color: '#424242' }} // 選択された値の色
            >
              <MenuItem value={"g"}>g</MenuItem>
            <MenuItem value={"ml"}>ml</MenuItem>
            <MenuItem value={"kg"}>kg</MenuItem>
            <MenuItem value={"入り"}>入り</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <TextField
          fullWidth
          label="店名と店舗名"
          placeholder="イオン東雲店"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          margin="dense"
          InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
          InputProps={{ style: { color: '#424242' } }} // 入力文字の色
        />
          <Button type="submit" variant="contained" sx={{ mt: 2, py: 1.5, width: '48%', backgroundColor: '#757575', '&:hover': { backgroundColor: '#616161' } }}>
            商品を登録
          </Button>
          <Button
            type="button"
            variant="outlined"
            sx={{ mt: 2, py: 1.5, width: '48%', ml: '4%', color: '#757575', borderColor: '#bdbdbd' }}
            onClick={handleClearForm}
          >
            クリア
          </Button>
        </Box>

        <Typography variant="h5" gutterBottom>
          登録された商品一覧
        </Typography>
        <List>
          {products.length === 0 ? (
            <Typography variant="body2" color="text.secondary">まだ商品が登録されていません。</Typography>
          ) : (
            products.map((product) => (
              <Paper key={product.id} sx={{ mb: 1, p: 1 }}>
                <ListItem disablePadding>
                  <ListItemText
                                        primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Rating
                          name={`rating-${product.id}`}
                          value={product.rating || 0} // ユーザーの評価、なければ0
                          max={3}
                          size="small"
                          sx={{ mr: 1 }}
                          onChange={async (event, newValue) => {
                            if (auth.currentUser) {
                              const ratingRef = collection(db, `products/${product.id}/ratings`);
                              await setDoc(doc(ratingRef, auth.currentUser.uid), { rating: newValue });
                            } else {
                              alert('ログインして評価してください。');
                            }
                          }}
                        />
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '10%' }}>{`${product.manufacturer}`}</Typography>
                        <Typography component="span" variant="body1" sx={{ width: '25%' }}>{`${product.productName}`}</Typography>
                        <Typography component="span" variant="body1" sx={{ width: '15%' }}>{`${product.priceExcludingTax}円`}</Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '15%' }}>{`${product.volume}${product.unit}`}</Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '15%' }}>{`${product.volume > 0 ? (product.priceExcludingTax / product.volume).toFixed(2) : '-'}${product.unit}`}</Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '15%' }}>{`${product.storeName}`}</Typography>
                        <Button variant="outlined" size="small" sx={{ ml: 1, width: '10%' }}>他店舗</Button>
                      </Box>
                    }
                  />
                </ListItem>
              </Paper>
            ))
          )}
        </List>
      </Box>
    </Box>
  );
};

export default MainApp;