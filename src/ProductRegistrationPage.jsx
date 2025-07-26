import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc,
  updateDoc, query, where, getDocs, deleteDoc } from
  'firebase/firestore';
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
  DialogTitle,
  Paper,
  Autocomplete,
  InputAdornment,
  IconButton,
  RadioGroup,
  Radio,
  FormControlLabel,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { useNavigate, useParams } from 'react-router-dom';

const ProductRegistrationPage = () => {
  const navigate = useNavigate();

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [productIdToEdit, setProductIdToEdit] = useState(null);
  const [largeCategories, setLargeCategories] = useState([]);
  const [productNameSuggestions, setProductNameSuggestions] = useState([]);
  const [isProductSelected, setIsProductSelected] = useState(false);

  const { productId: urlPriceId } = useParams();

// ひらがなをカタカナに変換する関数
const toHalfWidthKatakana = (str) => {
  return str.replace(/./g, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 0x3041 && code <= 0x3093) { // ひらがな
      return String.fromCharCode(code + 0x60);
    }
    return char;
  });
};

// カタカナをひらがなに変換する関数
const toHiragana = (str) => {
  return str.replace(/./g, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 0x30a1 && code <= 0x30f6) { // カタカナ
      return String.fromCharCode(code - 0x60);
    }
    return char;
  });
};

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
}, []);

useEffect(() => {
  if (urlPriceId) {
    setIsEditMode(true);
    setProductIdToEdit(urlPriceId);
    const fetchProductForEdit = async () => {
      // まず新しい`prices`コレクションから検索
      const priceDocRef = doc(db, "prices", urlPriceId);
      const priceDocSnap = await getDoc(priceDocRef);

      if (priceDocSnap.exists()) {
        // 新しい形式のデータが見つかった場合
        const priceData = priceDocSnap.data();
        const productDefinitionId = priceData.productDefinitionId;

        if (productDefinitionId) {
          const definitionDocRef = doc(db, "product_definitions", productDefinitionId);
          const definitionDocSnap = await getDoc(definitionDocRef);

          if (definitionDocSnap.exists()) {
            const definitionData = definitionDocSnap.data();
            setProduct({
              manufacturer: definitionData.manufacturer || '',
              productName: definitionData.productName || '',
              volume: definitionData.volume || '',
              unit: definitionData.unit || 'g',
              largeCategory: definitionData.largeCategory || '',
              mediumCategory: definitionData.mediumCategory || '',
              smallCategory: definitionData.smallCategory || '',
              priceExcludingTax: priceData.priceExcludingTax || '',
              storeName: priceData.storeName || '',
              priceType: priceData.priceType || '通常',
              startDate: priceData.startDate?.toDate() || null, // TimestampをDateオブジェクトに変換
              endDate: priceData.endDate?.toDate() || null,     // TimestampをDateオブジェクトに変換
              id: productDefinitionId,
            });
            setIsProductSelected(true);
          }
        }
      } else {
        //
        // 新しい形式で見つからなければ、古い`products`コレクションを検索
        const oldProductDocRef = doc(db, "products", urlPriceId);
        const oldProductDocSnap = await getDoc(oldProductDocRef);

if (oldProductDocSnap.exists()) {
  const oldProductData = oldProductDocSnap.data();
  setProduct({
    manufacturer: oldProductData.manufacturer || '',
    productName: oldProductData.productName || '',
    volume: oldProductData.volume || '',
    unit: oldProductData.unit || 'g',
    largeCategory: oldProductData.largeCategory || '',
    mediumCategory: oldProductData.mediumCategory || '',
    smallCategory: oldProductData.smallCategory || '',
    priceExcludingTax: oldProductData.priceExcludingTax || '',
    storeName: oldProductData.storeName || '',
    priceType: '通常', // 古い形式のデータにはpriceTypeがないため、デフォルト値を設定
    startDate: null,
    endDate: null,
    id: null, // 古い形式なのでdefinitionのIDは無い
    isOldFormat: true, // 古い形式であることを示すフラグ
  });
  setIsProductSelected(true); // 編集モードなのでフィールドは埋まっている状態
} else {
  console.log("No such document in prices or products!");
  navigate('/price-share-pwa/register');
}
}
};
fetchProductForEdit();
} else {
// 新規登録モード
setIsEditMode(false);
setProductIdToEdit(null);
setProduct(initialProductState);
setIsProductSelected(false);
}
}, [urlPriceId, navigate]);

const handleChange = (field, value) => {
  setProduct(prev => {
    const newState = { ...prev, [field]: value };
    if (field === 'largeCategory') {
      newState.mediumCategory = '';
      newState.smallCategory = '';
    } else if (field === 'mediumCategory') {
      newState.smallCategory = '';
    }
    if (field === 'productName' && isProductSelected) {
      // ユーザーが商品名を編集し始めたら、既存の商品の選択を解除
      setIsProductSelected(false);
      newState.id = null;
    }
    return newState;
  });
};

// 商品名サジェストの取得
const fetchProductNameSuggestions = async (searchTerm) => {
  if (searchTerm.length < 2) {
    setProductNameSuggestions([]);
    return;
  }
  const q = query(
    collection(db, "product_definitions"),
    where("productName", ">=", searchTerm),
    where("productName", "<=", searchTerm + '\uf8ff')
  );
  const querySnapshot = await getDocs(q);

  const uniqueSuggestions = [];
  const seen = new Set(); // 重複をチェックするためのSet

  querySnapshot.docs.forEach(doc => {
    const data = doc.data();
    // ユニークキーを商品名と内容量のみで生成するように変更
    const uniqueKey = `${data.productName}-${data.volume}`;

    if (!seen.has(uniqueKey)) {
      seen.add(uniqueKey);
      uniqueSuggestions.push({
        id: doc.id,
        label: `${data.productName} (${data.volume}${data.unit})`, // 表示用のラベル
        ...data
      });
    }
  });
  setProductNameSuggestions(uniqueSuggestions);
};


// Autocompleteで商品が選択された時のハンドラ
const handleProductSelect = (event, value) => {
  if (value) {
    // valueが直接選択されたオブジェクトになる
    setProduct(prev => ({
        ...prev, // Keep all previous properties
        manufacturer: value.manufacturer || '',
        productName: value.productName || '',
        volume: value.volume || '',
        unit: value.unit || 'g',
        largeCategory: value.largeCategory || '',
        mediumCategory: value.mediumCategory || '',
        smallCategory: value.smallCategory || '',
        id: value.id, // product_definitionのID
      }));
    setIsProductSelected(true);
    setProductNameSuggestions([]);
  } else {
    setIsProductSelected(false);
  }
};

const handleLogout = async () => {
  try {
    await signOut(auth);
    navigate('/price-share-pwa/login');
  } catch (error) {
    console.error("ログアウトエラー:", error);
  }
};

const handleSubmit = (e) => {
  e.preventDefault();
  if (!product.priceExcludingTax || !product.storeName) {
    alert('価格と店名を入力してください。');
    return;
  }
  if (
    !isProductSelected &&
    (
      !product.productName ||
      !product.volume ||
      !product.unit ||
      !product.manufacturer ||
      !product.largeCategory ||
      !product.mediumCategory ||
      !product.smallCategory
    )
  ) {
    alert('新しい商品を登録する場合は、すべての商品情報を入力してください。');
    return;
  }
  setShowConfirmationDialog(true);
};

const handleConfirmAction = async () => {
  setShowConfirmationDialog(false);
  try {
    if (isEditMode && productIdToEdit) {
      // === 古い形式のデータを更新する場合 ===
      if (product.isOldFormat) {
        // 1. 新しい商品定義(product_definitions)を作成
        const definitionRef = await addDoc(collection(db, "product_definitions"), {
          productName: product.productName,
          volume: product.volume,
          unit: product.unit,
          manufacturer: product.manufacturer,
          largeCategory: product.largeCategory,
          mediumCategory: product.mediumCategory,
          smallCategory: product.smallCategory,
          createdAt: serverTimestamp(),
        });

        // 2. 新しい価格情報(prices)を作成
        await addDoc(collection(db, "prices"), {
          productDefinitionId: definitionRef.id,
          priceExcludingTax: product.priceExcludingTax,
          storeName: product.storeName,
          userId: auth.currentUser.uid,
          rating: 0,
          priceType: product.priceType,
          startDate: product.startDate, // Dateオブジェクトをそのまま保存
          endDate: product.endDate,     // Dateオブジェクトをそのまま保存
          createdAt: serverTimestamp(),
        });

        // 3. 古い商品(products)を削除
        await deleteDoc(doc(db, "products", productIdToEdit));

        alert('商品を新しい形式に更新しました！');

      } else {
        // === 新しい形式のデータを更新する場合 ===
        const priceDocRef = doc(db, "prices", productIdToEdit);
await updateDoc(priceDocRef, {
  priceExcludingTax: product.priceExcludingTax,
  storeName: product.storeName,
  priceType: product.priceType,
  startDate: product.startDate, // Dateオブジェクトをそのまま保存
  endDate: product.endDate,     // Dateオブジェクトをそのまま保存
});

const definitionDocRef = doc(db, "product_definitions", product.id);
await updateDoc(definitionDocRef, {
  manufacturer: product.manufacturer,
  productName: product.productName,
  volume: product.volume,
  unit: product.unit,
  largeCategory: product.largeCategory,
  mediumCategory: product.mediumCategory,
  smallCategory: product.smallCategory,
});

alert('商品を更新しました！');
}
navigate('/price-share-pwa/search');

} else {
  // === 新規登録処理 ===
  let productDefinitionId = product.id;

  // オートコンプリートで商品が選択されている場合
  if (productDefinitionId) {
    const definitionDocRef = doc(db, "product_definitions", productDefinitionId);
    const definitionDocSnap = await getDoc(definitionDocRef);

    if (definitionDocSnap.exists()) {
      const existingDefinition = definitionDocSnap.data();
      // 既存の商品定義と現在の入力内容を比較
      const isSameProductDefinition = (
        existingDefinition.productName === product.productName &&
        existingDefinition.volume === product.volume &&
        existingDefinition.unit === product.unit &&
        existingDefinition.manufacturer === product.manufacturer &&
        existingDefinition.largeCategory === product.largeCategory &&
        existingDefinition.mediumCategory === product.mediumCategory &&
        existingDefinition.smallCategory === product.smallCategory
      );

      // 既存の商品定義と異なる場合は、新しい商品定義を作成
      if (!isSameProductDefinition) {
        productDefinitionId = null; // 新しい商品定義を作成するためにIDをリセット
      }
    } else {
      // 選択されたIDの商品定義が存在しない場合は、新しい商品定義を作成
      productDefinitionId = null;
    }
  }

  // productDefinitionIdがnullの場合、新しい商品定義を作成
  if (!productDefinitionId) {
    const definitionRef = await addDoc(collection(db, "product_definitions"), {
      productName: product.productName,
      volume: product.volume,
      unit: product.unit,
      manufacturer: product.manufacturer,
      largeCategory: product.largeCategory,
      mediumCategory: product.mediumCategory,
      smallCategory: product.smallCategory,
      createdAt: serverTimestamp(),
    });
    productDefinitionId = definitionRef.id;
  }

  await addDoc(collection(db, "prices"), {
    productDefinitionId: productDefinitionId,
    priceExcludingTax: product.priceExcludingTax,
    storeName: product.storeName,
    userId: auth.currentUser.uid,
    rating: 0,
    priceType: product.priceType,
    startDate: product.startDate, // Dateオブジェクトをそのまま保存
    endDate: product.endDate,     // Dateオブジェクトをそのまま保存
    createdAt: serverTimestamp(),
  });

  alert('商品を登録しました！');
}

handleClearForm();
} catch (e) {
  console.error("エラー:", e);
alert('処理に失敗しました。');
}
};

const handleCancelAction = () => {
  setShowConfirmationDialog(false);
};

const handleClearForm = () => {
  setProduct(initialProductState);
  setIsProductSelected(false);
  if (isEditMode) {
    navigate('/price-share-pwa/register');
  }
};

return (
  <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, pt: 0, maxWidth: '600px', mx: 'auto' }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 2 }}>
      <Typography variant="h5" component="h1">
        {isEditMode ? '商品を編集' : '商品登録'}
      </Typography>
      <Button
        variant="outlined"
        sx={{
          color: '#616161',
          py: 1.5,
          borderColor: '#bdbdbd',
          '&:hover': { borderColor: '#757575' },
        }}
        onClick={handleLogout}
      >
        ログアウト
      </Button>
    </Box>
    <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box component="form" onSubmit={handleSubmit}>
        {/* 1. 商品名 */}
        <Autocomplete
  freeSolo
  id="productName-autocomplete" // <-- Autocompleteにidを追加
  options={productNameSuggestions} // suggestionsオブジェクトを直接渡す
  getOptionLabel={(option) => option.label || option} // オプションからラベルを取得
  isOptionEqualToValue={(option, value) => option.id === value.id} // オプションの比較方法
  onInputChange={(event, newInputValue, reason) => {
    if (reason === 'input') {
      handleChange('productName', newInputValue);
      const timer = setTimeout(() => {
        if (!isProductSelected) {
          fetchProductNameSuggestions(newInputValue);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }}
  onChange={handleProductSelect}
  value={product.productName || ''} // valueは文字列のまま
  renderInput={(params) => (
    <TextField
      {...params}
      label="商品名で検索または入力"
      placeholder="例: 黄金の味 中辛"
      margin="normal"
      fullWidth
      name="productName"
      InputProps={{
        ...params.InputProps,
        endAdornment: (
          <InputAdornment position="end">
            {product.productName && (
              <IconButton
                onClick={() => handleChange('productName', '')}
                edge="end"
                size="small"
              >
                <ClearIcon />
              </IconButton>
            )}
          </InputAdornment>
        ),
      }}
    />
  )}
  renderOption={(props, option) => (
    <li {...props} key={option.id + option.label}>
      {option.label}
    </li>
  )}
  sx={{ mb: 2 }}
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
            required
            id="priceExcludingTax-input"
            name="priceExcludingTax"
            InputProps={{
              sx: {
                '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                  webkitAppearance: 'none',
                  margin: 0,
                },
                MozAppearance: 'textfield',
              },
              endAdornment: (
                <InputAdornment position="end">
                  {product.priceExcludingTax && (
                    <IconButton
                      onClick={() => handleChange('priceExcludingTax', '')}
                      edge="end"
                      size="small"
                    >
                      <ClearIcon />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
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
<Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, my: 2 }}>
  <TextField
    label="内容量"
    placeholder="210"
    type="text"
    value={product.volume}
    onChange={(e) => handleChange('volume', e.target.value)}
    sx={{ flex: 1 }}
    required
    id="volume-input"
    name="volume"
    InputProps={{
      sx: {
        '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
          webkitAppearance: 'none',
          margin: 0,
        },
        MozAppearance: 'textfield',
      },
      endAdornment: (
        <InputAdornment position="end">
          {product.volume && (
            <IconButton
              onClick={() => handleChange('volume', '')}
              edge="end"
              size="small"
            >
              <ClearIcon />
            </IconButton>
          )}
        </InputAdornment>
      ),
    }}
  />
  <FormControl sx={{ minWidth: '80px' }}>
    <InputLabel id="unit-label">単位</InputLabel>
    <Select
      value={product.unit}
      label="単位"
      onChange={(e) => handleChange('unit', e.target.value)}
      labelId="unit-label"
      id="unit-select"
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
  label="店名・店舗名"
  placeholder="例: イオン東雲店"
  value={product.storeName}
  onChange={(e) => handleChange('storeName', e.target.value)}
  margin="normal"
  required
  id="storeName-input"
  name="storeName"
  InputProps={{
    endAdornment: (
      <InputAdornment position="end">
        {product.storeName && (
          <IconButton
            onClick={() => handleChange('storeName', '')}
            edge="end"
            size="small"
          >
            <ClearIcon />
          </IconButton>
        )}
      </InputAdornment>
    ),
  }}
/>

{/* 6. メーカー */}
<TextField
  fullWidth
  label="メーカー"
  placeholder="例: エバラ食品"
  value={product.manufacturer}
  onChange={(e) => handleChange('manufacturer', e.target.value)}
  margin="normal"
  required
  id="manufacturer-input"
  name="manufacturer"
  InputProps={{
    endAdornment: (
      <InputAdornment position="end">
        {product.manufacturer && (
          <IconButton
            onClick={() => handleChange('manufacturer', '')}
            edge="end"
            size="small"
          >
            <ClearIcon />
          </IconButton>
        )}
      </InputAdornment>
    ),
  }}
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
    options={
      largeCategories.find(cat => cat.name === product.largeCategory)?.mediumCategories?.map(cat => cat.name) || []
    }
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
        name="mediumCategory"
        required
        InputLabelProps={{ shrink: true }}
      />
    )}
    sx={{ mt: 2 }}
  />
)}

{product.mediumCategory && (
<Box>    
  <Autocomplete
    fullWidth
    options={
      largeCategories
        .find(cat => cat.name === product.largeCategory)
        ?.mediumCategories?.find(medCat => medCat.name === product.mediumCategory)
        ?.smallCategories || []
    }
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
        name="smallCategory"
        required
        InputLabelProps={{ shrink: true }}
        />
      )}
    />
  </Box>
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
</Paper>

{/* 確認ダイアログ */}
<Dialog
  open={showConfirmationDialog}
  onClose={handleCancelAction}
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
        minWidth: '150px',
        py: 1.5,
        fontSize: '1.1rem',
        backgroundColor: '#2196F3',
        '&:hover': {
          backgroundColor: '#1976D2',
        },
        mr: 2,
      }}
      autoFocus
    >
      {isEditMode ? '更新する' : '登録する'}
    </Button>
    <Button
      onClick={handleCancelAction}
      variant="outlined"
      sx={{
        color: '#616161',
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
