import React, { useState } from 'react';
import { auth, db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
  Box,
  Button,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

const ProductRegistrationPage = () => {
  const [manufacturer, setManufacturer] = useState('');
  const [productName, setProductName] = useState('');
  const [priceExcludingTax, setPriceExcludingTax] = useState('');
  const [volume, setVolume] = useState('');
  const [unit, setUnit] = useState('g');
  const [storeName, setStoreName] = useState('');
  const [tags, setTags] = useState('');

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!manufacturer || !productName || !priceExcludingTax || !volume || !unit || !storeName) {
      alert('すべての項目を入力してください。');
      return;
    }

    try {
      await addDoc(collection(db, "products"), {
        userId: auth.currentUser.uid,
        manufacturer: manufacturer,
        productName: productName,
        priceExcludingTax: Number(priceExcludingTax),
        volume: Number(volume),
        unit: unit,
        storeName: storeName,
        rating: 0,
        createdAt: serverTimestamp(),
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
      });
      setManufacturer('');
      setProductName('');
      setPriceExcludingTax('');
      setVolume('');
      setUnit('g');
      setStoreName('');
      setTags('');
      alert('商品を登録しました！');
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
    setUnit('g');
    setStoreName('');
    setTags('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        商品登録
      </Typography>
      <Box component="form" onSubmit={handleAddProduct} sx={{ mb: 6 }}>
        <TextField
          fullWidth
          label="メーカー"
          placeholder="エバラ食品"
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          margin="normal"
          InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
          InputProps={{ style: { color: '#424242' } }}
        />
        <TextField
          fullWidth
          label="商品名"
          placeholder="黄金の味 中辛"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          margin="normal"
          InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
          InputProps={{ style: { color: '#424242' } }}
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
          InputProps={{ style: { color: '#424242' } }}
        />
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 3, my: 3 }}>
          <TextField
            label="内容量"
            placeholder="210"
            type="number"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            sx={{ flex: 1 }}
            InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
            InputProps={{ style: { color: '#424242' } }}
          />
          <FormControl sx={{ width: '100px' }}>
            <InputLabel id="unit-label" style={{ color: '#616161' }}>単位</InputLabel>
            <Select
              labelId="unit-label"
              id="unit-select"
              value={unit}
              label="単位"
              onChange={(e) => setUnit(e.target.value)}
              sx={{ color: '#424242' }}
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
          margin="normal"
          InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
          InputProps={{ style: { color: '#424242' } }}
        />
        <TextField
          fullWidth
          label="タグ (カンマ区切り)"
          placeholder="焼き肉たれ,たれ"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          margin="normal"
          InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
          InputProps={{ style: { color: '#424242' } }}
        />
        <Button type="submit" variant="contained" sx={{ mt: 2, py: 1.5, width: '48%', backgroundColor: '#757575', '&:hover': { backgroundColor: '#616161' } }}>
          商品を登録
        </Button>
        <Button
          type="button"
          variant="outlined"
          sx={{ mt: 3, py: 1.5, width: '48%', ml: '4%', color: '#757575', borderColor: '#bdbdbd' }}
          onClick={handleClearForm}
        >
          クリア
        </Button>
      </Box>
    </Box>
  );
};

export default ProductRegistrationPage;
