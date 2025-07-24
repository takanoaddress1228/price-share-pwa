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
  RadioGroup, // 追加
  Radio, // 追加
  FormControlLabel, // 追加
  Autocomplete, // 追加
} from '@mui/material';
import { useLocation, useNavigate, useParams } from 'react-router-dom'; // useParams を追加

const ProductRegistrationPage = () => {
  const navigate = useNavigate(); // 追加
  const initialProductState = {
    manufacturer: '',
    productName: '',
    priceExcludingTax: '',
    volume: '',
    unit: 'g',
    storeName: '',
    largeCategory: '',
    mediumCategory: '',
    smallCategory: '',
    priceType: '通常',
    startDate: null,
    endDate: null,
    id: null, // 既存のproduct_definitionのID
  };

  const [product, setProduct] = useState(initialProductState);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [productDataToConfirm, setProductDataToConfirm] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false); // 追加
  const [productIdToEdit, setProductIdToEdit] = useState(null); // 追加
  const [largeCategories, setLargeCategories] = useState([]); // 追加

  const handleChange = (field, value) => {
    setProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const location = useLocation(); // 追加
  const { productId } = useParams(); // 追加

  useEffect(() => {
    const fetchCategories = async () => {
      const docRef = doc(db, "categories", "definitions");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setLargeCategories(docSnap.data().largeCategories);
      } else {
        console.log("No such categories document!");
      }
    };
    fetchCategories();
  }, []); // 空の依存配列で初回のみ実行

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
          setProduct(prev => ({
            ...prev,
            manufacturer: data.manufacturer || '',
            productName: data.productName || '',
            priceExcludingTax: data.priceExcludingTax || '',
            volume: data.volume || '',
            unit: data.unit || 'g',
            storeName: data.storeName || '',
            largeCategory: data.largeCategory || '',
            mediumCategory: data.mediumCategory || '',
            smallCategory: data.smallCategory || '',
            startDate: data.startDate || null,
            endDate: data.endDate || null,
          }));
          
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
      setProduct(initialProductState);

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
    if (!product.manufacturer || !product.productName || !product.priceExcludingTax || !product.volume || !product.unit || !product.storeName || !product.largeCategory || !product.mediumCategory || !product.smallCategory) {
      alert('すべての項目を入力してください。');
      return;
    }

    const productData = {
      manufacturer: product.manufacturer,
      productName: product.productName,
      priceExcludingTax: Number(product.priceExcludingTax),
      volume: Number(product.volume),
      unit: product.unit,
      storeName: product.storeName,
      largeCategory: product.largeCategory,
      mediumCategory: product.mediumCategory,
      smallCategory: product.smallCategory,
      priceType: product.priceType,
      startDate: product.startDate,
      endDate: product.endDate,
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
        await updateDoc(docRef, {
          manufacturer: productDataToConfirm.manufacturer,
          productName: productDataToConfirm.productName,
          priceExcludingTax: productDataToConfirm.priceExcludingTax,
          volume: productDataToConfirm.volume,
          unit: productDataToConfirm.unit,
          storeName: productDataToConfirm.storeName,
          largeCategory: productDataToConfirm.largeCategory,
          mediumCategory: productDataToConfirm.mediumCategory,
          smallCategory: productDataToConfirm.smallCategory,
          priceType: productDataToConfirm.priceType,
          startDate: productDataToConfirm.startDate,
          endDate: productDataToConfirm.endDate,
        });
        alert('商品を更新しました！');
        navigate('/price-share-pwa/search'); // 更新後、商品一覧へ戻る
      } else {
        // 新規登録の場合
        await addDoc(collection(db, "products"), {
          manufacturer: productDataToConfirm.manufacturer,
          productName: productDataToConfirm.productName,
          priceExcludingTax: productDataToConfirm.priceExcludingTax,
          volume: productDataToConfirm.volume,
          unit: productDataToConfirm.unit,
          storeName: productDataToConfirm.storeName,
          largeCategory: productDataToConfirm.largeCategory,
          mediumCategory: productDataToConfirm.mediumCategory,
          smallCategory: productDataToConfirm.smallCategory,
          priceType: productDataToConfirm.priceType,
          startDate: productDataToConfirm.startDate,
          endDate: productDataToConfirm.endDate,
          userId: auth.currentUser.uid, // 新規登録時のみuserIdを設定
          rating: 0, // 新規登録時のみratingを設定
          createdAt: serverTimestamp(), // 新規登録時のみcreatedAtを設定
        });
        alert('商品を登録しました！');
      }
      // フォームをクリア
      setProduct(initialProductState);

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
    setProduct(initialProductState);
  };

  return (
    <Box sx={{ p: 3, pt: '70px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h1">
          {isEditMode ? '商品を編集' : '商品登録'}
        </Typography>
        <Button variant="outlined" sx={{ color: '#616161', py: 1.5, borderColor: '#bdbdbd', '&:hover': { borderColor: '#757575' } }} onClick={handleLogout}>
          ログアウト
        </Button>
      </Box>
      <Box component="form" onSubmit={handleAddProduct} sx={{ mb: 6 }}>
        {/* 1. 商品名 */}
        <TextField
          fullWidth
          label="商品名"
          placeholder="黄金の味 中辛"
          value={product.productName}
          onChange={(e) => handleChange('productName', e.target.value)}
          margin="normal"
          InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
          InputProps={{ style: { color: '#424242' } }}
        />
        {/* 2. 税抜き価格 */}
        <TextField
          fullWidth
          label="税抜き価格"
          placeholder="398"
          type="number"
          value={product.priceExcludingTax}
          onChange={(e) => handleChange('priceExcludingTax', e.target.value)}
          margin="normal"
          InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
          InputProps={{ style: { color: '#424242' } }}
        />
        {/* 3. 価格タイプ */}
        <FormControl component="fieldset" margin="normal" fullWidth>
          <RadioGroup
            row
            name="priceType"
            value={product.priceType}
            onChange={(e) => handleChange('priceType', e.target.value)}
          >
            <FormControlLabel value="通常" control={<Radio />} label="通常価格" />
            <FormControlLabel value="日替り" control={<Radio />} label="日替り価格" />
            <FormControlLabel value="月間特売" control={<Radio />} label="月間特売" />
          </RadioGroup>
        </FormControl>

        {(product.priceType === '日替り' || product.priceType === '月間特売') && (
          <>
            <TextField
              fullWidth
              label={product.priceType === '日替り' ? '日付' : '開始日'}
              type="date"
              value={product.startDate instanceof Date ? product.startDate.toISOString().split('T')[0] : ''}
              onChange={(e) => handleChange('startDate', e.target.value ? new Date(e.target.value) : null)}
              margin="normal"
              id="startDate-input"
              name="startDate"
              InputLabelProps={{
                shrink: true,
              }}
            />
            {product.priceType === '月間特売' && (
              <TextField
                fullWidth
                label="終了日"
                type="date"
                value={product.endDate instanceof Date ? product.endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => handleChange('endDate', e.target.value ? new Date(e.target.value) : null)}
                margin="normal"
                id="endDate-input"
                name="endDate"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            )}
          </>
        )}
        {/* 4. 内容量・単位 */}
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 3, my: 3 }}>
          <TextField
            label="内容量"
            placeholder="210"
            type="number"
            value={product.volume}
            onChange={(e) => handleChange('volume', e.target.value)}
            sx={{ flex: 1 }}
            InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
            InputProps={{ style: { color: '#424242' } }}
          />
          <FormControl sx={{ width: '100px' }}>
            <InputLabel id="unit-label" style={{ color: '#616161' }}>単位</InputLabel>
            <Select
              labelId="unit-label"
              id="unit-select"
              value={product.unit}
              label="単位"
              onChange={(e) => handleChange('unit', e.target.value)}
              sx={{ color: '#424242' }}
            >
              <MenuItem value={"g"}>g</MenuItem>
              <MenuItem value={"ml"}>ml</MenuItem>
              <MenuItem value={"kg"}>kg</MenuItem>
              <MenuItem value={"入り"}>入り</MenuItem>
            </Select>
          </FormControl>
        </Box>
        {/* 5. 店名 */}
        <TextField
          fullWidth
          label="店名と店舗名"
          placeholder="イオン東雲店"
          value={product.storeName}
          onChange={(e) => handleChange('storeName', e.target.value)}
          margin="dense"
          InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
          InputProps={{ style: { color: '#424242' } }}
        />
        {/* 6. メーカー */}
        <TextField
          fullWidth
          label="メーカー"
          placeholder="エバラ食品"
          value={product.manufacturer}
          onChange={(e) => handleChange('manufacturer', e.target.value)}
          margin="normal"
          InputLabelProps={{ style: { color: '#616161' }, shrink: true }}
          InputProps={{ style: { color: '#424242' } }}
        />
        {/* 7. カテゴリ */}
        <Autocomplete
          fullWidth
          options={largeCategories.map(cat => cat.name)}
          getOptionLabel={(option) => option || ''}
          value={product.largeCategory || null}
          onChange={(event, newValue) => {
            handleChange('largeCategory', newValue);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="カテゴリー"
              margin="normal"
              fullWidth
              id="large-category-select"
              name="largeCategory"
              required
              InputLabelProps={{ shrink: true }}
            />
          )}
          sx={{ mt: 3 }}
        />
        {product.largeCategory && (
          <Autocomplete
            fullWidth
            options={largeCategories.find(cat => cat.name === product.largeCategory)?.mediumCategories?.map(cat => cat.name) || []}
            getOptionLabel={(option) => option || ''}
            value={product.mediumCategory || null}
            onChange={(event, newValue) => {
              handleChange('mediumCategory', newValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="サブカテゴリー"
                margin="normal"
                fullWidth
                id="medium-category-select"
                name="mediumCategory"
                required
                InputLabelProps={{ shrink: true }}
              />
            )}
            sx={{ mt: 2 }}
          />
        )}
        {product.mediumCategory && (
          <Autocomplete
            fullWidth
            options={largeCategories.find(cat => cat.name === product.largeCategory)?.mediumCategories?.find(medCat => medCat.name === product.mediumCategory)?.smallCategories || []}
            getOptionLabel={(option) => option || ''}
            value={product.smallCategory || null}
            onChange={(event, newValue) => {
              handleChange('smallCategory', newValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="小カテゴリー"
                margin="normal"
                fullWidth
                id="small-category-select"
                name="smallCategory"
                required
                InputLabelProps={{ shrink: true }}
              />
            )}
            sx={{ mt: 2 }}
          />
        )}
        
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