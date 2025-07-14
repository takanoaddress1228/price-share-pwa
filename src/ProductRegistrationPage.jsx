import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import {
  Box,
  Button,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton, // 追加
} from '@mui/material';
import { useLocation, useNavigate, useParams } from 'react-router-dom'; // useParams を追加

const ProductRegistrationPage = () => {
  const navigate = useNavigate(); // 追加
  const [manufacturer, setManufacturer] = useState('');
  const [productName, setProductName] = useState('');
  const [priceExcludingTax, setPriceExcludingTax] = useState('');
  const [volume, setVolume] = useState('');
  const [unit, setUnit] = useState('g');
  const [storeName, setStoreName] = useState('');
  const [tags, setTags] = useState('');
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [productDataToConfirm, setProductDataToConfirm] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false); // 追加
  const [productIdToEdit, setProductIdToEdit] = useState(null); // 追加

  const location = useLocation(); // 追加
  const { productId } = useParams(); // 追加

  useEffect(() => {
    console.log('useEffect triggered', productId);
    if (productId) {
      console.log('Edit mode detected. Product ID:', productId);
      setIsEditMode(true);
      setProductIdToEdit(productId);
      const fetchProduct = async () => {
        console.log('Fetching product...');
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('Product data fetched:', data);
          setManufacturer(data.manufacturer || '');
          setProductName(data.productName || '');
          setPriceExcludingTax(data.priceExcludingTax || '');
          setVolume(data.volume || '');
          setUnit(data.unit || 'g');
          setStoreName(data.storeName || '');
          setTags((data.tags || []).join(', '));
        } else {
          console.log("No such document!");
          navigate('/price-share-pwa/register'); // 見つからなければ登録画面へ
        }
      };
      fetchProduct();
    } else {
      console.log('Not in edit mode. Clearing form.');
      setIsEditMode(false);
      setProductIdToEdit(null);
      // 新規登録モードに戻る際にフォームをクリア
      setManufacturer('');
      setProductName('');
      setPriceExcludingTax('');
      setVolume('');
      setUnit('g');
      setStoreName('');
      setTags('');
    }
  }, [productId, navigate]);

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

    const productData = {
      manufacturer: manufacturer,
      productName: productName,
      priceExcludingTax: Number(priceExcludingTax),
      volume: Number(volume),
      unit: unit,
      storeName: storeName,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
    };

    setProductDataToConfirm(productData); // 確認用にデータをセット
    setShowConfirmationDialog(true); // 確認ダイアログを表示
  };

  const handleConfirmAction = async () => { // handleConfirmAdd を変更
    setShowConfirmationDialog(false); // ダイアログを閉じる
    try {
      if (isEditMode && productIdToEdit) {
        // 更新の場合
        const docRef = doc(db, "products", productIdToEdit);
        await updateDoc(docRef, productDataToConfirm);
        alert('商品を更新しました！');
        navigate('/price-share-pwa/search'); // 更新後、商品一覧へ戻る
      } else {
        // 新規登録の場合
        await addDoc(collection(db, "products"), {
          ...productDataToConfirm,
          userId: auth.currentUser.uid, // 新規登録時のみuserIdを設定
          rating: 0, // 新規登録時のみratingを設定
          createdAt: serverTimestamp(), // 新規登録時のみcreatedAtを設定
        });
        alert('商品を登録しました！');
      }
      // フォームをクリア
      setManufacturer('');
      setProductName('');
      setPriceExcludingTax('');
      setVolume('');
      setUnit('g');
      setStoreName('');
      setTags('');
      setProductDataToConfirm(null); // 確認データをクリア
      setIsEditMode(false); // 編集モードを解除
      setProductIdToEdit(null); // 編集IDをクリア
    } catch (e) {
      console.error(isEditMode ? "商品更新エラー: " : "商品追加エラー: ", e);
      alert(isEditMode ? '商品の更新に失敗しました。' : '商品の追加に失敗しました。');
    }
  };

  const handleCancelAdd = () => {
    setShowConfirmationDialog(false); // ダイアログを閉じる
    setProductDataToConfirm(null); // 確認データをクリア
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
    <Box sx={{ p: 3, pt: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h1">
          {isEditMode ? '商品を編集' : '商品登録'}
        </Typography>
        <Button variant="text" sx={{ color: '#616161', py: 1.5 }} onClick={handleLogout}>
          ログアウト
        </Button>
      </Box>
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
          margin="dense"
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
          sx={{ mt: 3 }}
          InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
          InputProps={{ style: { color: '#424242' } }}
        />
        <Button type="submit" variant="contained" sx={{ mt: 2, py: 1.5, width: '48%', backgroundColor: '#757575', '&:hover': { backgroundColor: '#616161' } }}>
          {isEditMode ? '商品を更新' : '商品を登録'}
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

      {/* 確認ダイアログ */}
      <Dialog
        open={showConfirmationDialog}
        onClose={handleCancelAdd}
        aria-labelledby="confirmation-dialog-title"
        aria-describedby="confirmation-dialog-description"
      >
        <DialogTitle id="confirmation-dialog-title">{"この内容で登録しますか？"}</DialogTitle>
        <DialogContent>
          {productDataToConfirm && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2"><b>メーカー:</b> {productDataToConfirm.manufacturer}</Typography>
              <Typography variant="body2"><b>商品名:</b> {productDataToConfirm.productName}</Typography>
              <Typography variant="body2"><b>税抜き価格:</b> {productDataToConfirm.priceExcludingTax}円</Typography>
              <Typography variant="body2"><b>内容量:</b> {productDataToConfirm.volume}{productDataToConfirm.unit}</Typography>
              <Typography variant="body2"><b>店名:</b> {productDataToConfirm.storeName}</Typography>
              <Typography variant="body2"><b>タグ:</b> {productDataToConfirm.tags.join(', ')}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            sx={{
              minWidth: '150px', // 大きめに表示
              py: 1.5,
              fontSize: '1.1rem',
              backgroundColor: '#2196F3', // 青色
              '&:hover': {
                backgroundColor: '#1976D2',
              },
              mr: 2, // 「やり直す」ボタンとの間にスペース
            }}
            autoFocus
          >
            {isEditMode ? '更新する' : '登録する'}
          </Button>
          <Button
            onClick={handleCancelAdd}
            variant="outlined"
            sx={{
              color: '#616161', // グレー色
              borderColor: '#bdbdbd',
              '&:hover': {
                borderColor: '#757575',
              },
            }}
          >
            やり直す
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductRegistrationPage;