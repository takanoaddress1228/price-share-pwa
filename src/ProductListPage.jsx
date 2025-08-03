import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, getDoc, deleteDoc, where } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  Paper,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Autocomplete,
  InputLabel,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import ProductListItem from './components/ProductListItem'; // 追加
import useCategoryFilter from './hooks/useCategoryFilter'; // 追加
import { applyProductFilters } from './utils/filterUtils';
import useProductsData from './hooks/useProductsData'; // 追加
import { formatRegistrationDate, formatUnitPrice, formatSpecialPriceDate } from './utils/formatters';


const ProductListPage = () => {
  const navigate = useNavigate();
  const location = useLocation(); // useLocation も追加
  const {
    largeCategory,
    setLargeCategory,
    mediumCategory,
    setMediumCategory,
    smallCategory,
    setSmallCategory,
    handleLargeCategoryChange,
    handleMediumCategoryChange,
    handleSmallCategoryChange,
    largeCategories,
    getMediumCategories,
    getSmallCategories,
  } = useCategoryFilter();



  const [searchKeyword, setSearchKeyword] = useState('');
  const [showHiddenProductsView, setShowHiddenProductsView] = useState(false);
  const [openRelatedProductsDialog, setOpenRelatedProductsDialog] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [openRatingDialog, setOpenRatingDialog] = useState(false);
  const [currentProductForRating, setCurrentProductForRating] = useState(null);
  const [dialogRatingValue, setDialogRatingValue] = useState(0);

  const { products, userRatingsByProductName, hiddenProductIds, setHiddenProductIds } = useProductsData();

  const handleToggleHiddenStatus = async (productId, isHidden) => {
    if (!auth.currentUser) {
      alert('ログインして商品の非表示設定を変更してください。');
      return;
    }
    try {
      const hiddenRef = doc(db, `users/${auth.currentUser.uid}/hiddenProducts/${productId}`);
      if (isHidden) {
        await deleteDoc(hiddenRef); // 非表示を解除
      } else {
        await setDoc(hiddenRef, { hidden: true }); // 非表示に設定
      }
    } catch (error) {
      console.error("非表示設定変更エラー:", error);
      alert("商品の非表示設定の変更に失敗しました。");
    }
  };

  const handleShowHiddenProducts = () => {
    setShowHiddenProductsView(true);
    setSearchKeyword(''); // 検索キーワードをクリア
  };

  const handleBackToMainView = () => {
    setShowHiddenProductsView(false);
    setSearchKeyword(''); // 検索キーワードをクリア
  };

  const handleShowRelatedProducts = (productName, volume) => {
    const related = products.filter(p => p.productName === productName && !hiddenProductIds.includes(p.id))
                            .map(p => ({ // unitPriceを追加
                              ...p,
                              unitPrice: p.volume > 0 ? (p.priceExcludingTax / p.volume) : Infinity
                            }))
                            .sort((a, b) => a.unitPrice - b.unitPrice)
                            .slice(0, 3); // 上位3位まで
    setRelatedProducts(related);
    setOpenRelatedProductsDialog(true);
  };

  const handleCloseRelatedProductsDialog = () => {
    setOpenRelatedProductsDialog(false);
    setRelatedProducts([]);
  };

  // 商品リストを検索キーワードでフィルタリング
  const filteredProducts = useMemo(() => {
    return applyProductFilters(
      products,
      searchKeyword,
      hiddenProductIds,
      showHiddenProductsView,
      userRatingsByProductName,
      largeCategory,
      mediumCategory,
      smallCategory
    );
  }, [products, searchKeyword, hiddenProductIds, showHiddenProductsView, userRatingsByProductName, largeCategory, mediumCategory, smallCategory]);

  return (
    <Box sx={{ p: 3, pt: '70px' }}>
      <Box sx={{ mb: 2 }}> {/* 親のBoxのflex設定を削除 */}
        <Box sx={{ mb: 2, position: 'sticky', top: 0, zIndex: 100 }}> {/* Added sticky properties */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', mb: 1 }}> {/* タイトルとボタンの行 */}
          <Typography
            variant="h6"
            sx={{
              whiteSpace: 'nowrap',
              fontSize: '1.4rem', // フォントサイズを大きく
              flexShrink: 0,
              color: showHiddenProductsView ? '#B22222' : '#2196F3', // テキストに応じて色を動的に設定
            }}
          >
            {showHiddenProductsView ? '非表示にした商品' : '登録された商品一覧'}
          </Typography>
          {showHiddenProductsView ? (
            <Button variant="text" sx={{
              py: 0.5,
              color: '#B22222', // ワインレッド系の色
              border: '1px solid #B22222', // ワインレッド系の枠線
              borderWidth: '1px', // 枠線を細く
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: 'none', // 影を削除
              outline: 'none', // アウトラインを削除
              backgroundColor: 'white', // 背景色を白に設定
              '&:hover': {
                borderColor: '#800020', // ホバー時の色を少し濃く
                backgroundColor: 'rgba(178, 34, 34, 0.04)', // ホバー時の背景色
              },
              '&:focus': {
                outline: 'none', // フォーカス時のアウトラインを削除
              },
              '&:active': {
                outline: 'none', // アクティブ時のアウトラインを削除
              },
              '&:focus-visible': {
                outline: 'none', // キーボードナビゲーション時のアウトラインを削除
              },
            }} onClick={handleBackToMainView}>
              戻る
            </Button>
          ) : (
            <Button variant="outlined" sx={{
              py: 0.5,
              color: '#2196F3', // 青色
              borderColor: '#2196F3', // 青色
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: 'none', // 影を削除
              outline: 'none', // アウトラインを削除
              '&:hover': {
                borderColor: '#1976D2', // ホバー時の色を少し濃く
                backgroundColor: 'rgba(33, 150, 243, 0.04)', // ホバー時の背景色
              },
              '&:focus': {
                outline: 'none', // フォーカス時のアウトラインを削除
              },
              '&:active': {
                outline: 'none', // アクティブ時のアウトラインを削除
              },
              '&:focus-visible': {
                outline: 'none', // キーボードナビゲーション時のアウトラインを削除
              },
            }} onClick={handleShowHiddenProducts}>
              非表示をみる
            </Button>
          )}
        </Box>
        {/* 検索フィールドをタイトルの下に配置 */}
        <TextField
          label="商品名で検索"
          variant="outlined"
          size="small"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="商品名を入力"
          sx={{
            width: '100%',
            // デフォルトの枠線色 (グレー系)
            '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
              borderColor: '#bdbdbd', // 薄いグレー
            },
            // フォーカス時の枠線色 (グレー系)
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#616161', // グレー
            },
            // ホバー時の枠線色 (少し濃いグレー)
            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#757575', // 通常のグレー
            },
            // 入力文字の色
            '& .MuiInputBase-input': {
              color: '#424242', // 濃いグレー
            },
          }}
          InputLabelProps={{
            style: {
              color: '#616161', // ラベルの初期色をグレーに固定
            },
            sx: {
              // フローティングラベルがフォーカスされた時の色
              '&.Mui-focused': {
                color: '#B22222', // ワインレッド
              },
            },
          }}
        />
        <Autocomplete
          fullWidth
          options={largeCategories}
          getOptionLabel={(option) => option || ''}
          value={largeCategory || null}
          onChange={handleLargeCategoryChange}
          renderInput={(params) => (
            <TextField
              {...params}
              label="大カテゴリー"
              variant="outlined"
              size="small"
              margin="dense"
              fullWidth
            />
          )}
          sx={{ mt: 1 }}
        />
        {largeCategory && (
          <Autocomplete
            fullWidth
            options={getMediumCategories(largeCategory)}
            getOptionLabel={(option) => option || ''}
            value={mediumCategory || null}
            onChange={handleMediumCategoryChange}
            renderInput={(params) => (
              <TextField
                {...params}
                label="中カテゴリー"
                variant="outlined"
                size="small"
                margin="dense"
                fullWidth
              />
            )}
            sx={{ mt: 1 }}
          />
        )}
        {mediumCategory && (
          <Autocomplete
            fullWidth
            options={getSmallCategories(largeCategory, mediumCategory)}
            getOptionLabel={(option) => option.name || option}
            value={smallCategory || null}
            onChange={handleSmallCategoryChange}
            renderInput={(params) => (
              <TextField
                {...params}
                label="小カテゴリー"
                variant="outlined"
                size="small"
                margin="dense"
                fullWidth
              />
            )}
            sx={{ mt: 1 }}
          />
        )}
      </Box>
      </Box>

      <List>
        {filteredProducts.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>まだ商品が登録されていません。</Typography>
        ) : (
          filteredProducts.map((product) => (
            <Paper key={product.id} sx={{ mb: 1, p: 1, borderLeft: 'none', borderRight: 'none', boxShadow: '0px 1px 1px -1px rgba(0,0,0,0.2)' }} elevation={3}>
              <ListItem disablePadding>
                <ListItemText
                  primary={
                    <ProductListItem
                      product={product}
                      userRatingsByProductName={userRatingsByProductName}
                      formatUnitPrice={formatUnitPrice}
                      formatRegistrationDate={formatRegistrationDate}
                      formatSpecialPriceDate={formatSpecialPriceDate}
                      handleShowRelatedProducts={handleShowRelatedProducts}
                      navigate={navigate}
                      isHiddenView={showHiddenProductsView}
                      handleToggleHiddenStatus={handleToggleHiddenStatus}
                      setCurrentProductForRating={setCurrentProductForRating}
                      setDialogRatingValue={setDialogRatingValue}
                      setOpenRatingDialog={setOpenRatingDialog}
                    />
                  }
                />
              </ListItem>
            </Paper>
          ))
        )}
      </List>

      <Dialog open={openRelatedProductsDialog} onClose={handleCloseRelatedProductsDialog} fullWidth={true} maxWidth="lg">
        <DialogTitle sx={{ textAlign: 'center' }}>最安値</DialogTitle>
        <DialogContent>
          <List>
            {relatedProducts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">関連商品はありません。</Typography>
            ) : (
              relatedProducts.map((p) => (
                <ListItem key={p.id} disablePadding>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}> {/* 2行表示のための変更 */}
                        {/* 1行目: 商品名・価格・内容量 */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0.5 }}>
                          <Typography component="span" variant="body1" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${p.productName}`}</Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Typography component="span" variant="body1" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: p.priceType === '通常' ? 'text.primary' : (p.priceType === '日替り' ? '#B22222' : '#FF8C00') }}>{`${p.priceExcludingTax}円`}</Typography>
                            {p.priceType !== '通常' && ( // 日付表示を追加
                              <Typography component="span" variant="caption" sx={{ color: p.priceType === '日替り' ? '#B22222' : '#FF8C00', fontSize: '0.7rem', ml: 0.5 }}>
                                {formatSpecialPriceDate(p.priceType === '日替り' ? p.startDate : p.endDate, p.priceType)}
                              </Typography>
                            )}
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>{`${p.volume}${p.unit}`}</Typography>
                          </Box>
                        </Box>
                        {/* 2行目: 単価・店名 */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0.5 }}>
                          <Typography component="span" variant="body1" color="red" sx={{ width: '30%', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${formatUnitPrice(p.unitPrice, p.unit)}`}</Typography>
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${p.storeName}`}</Typography>
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', flexShrink: 0 }}>
                            {formatRegistrationDate(p.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))
            )}
          </List>
        </DialogContent>
      </Dialog>

      {/* 評価ダイアログ */}
      <Dialog open={openRatingDialog} onClose={() => setOpenRatingDialog(false)}>
        <DialogTitle>
          <Typography sx={{ color: 'orange' }}>★イマイチ ★★ ふつう ★★★ リピート</Typography>
        </DialogTitle>
        <DialogContent>
          {currentProductForRating && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {currentProductForRating.productName}
              </Typography>
              <Rating                name="dialog-rating"                value={dialogRatingValue}                max={3}                size="large"                onChange={(event, newValue) => {                  setDialogRatingValue(newValue);                }}                sx={{ color: 'orange' }}              />
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 3 }}>                <Button                  variant="contained"                  onClick={async () => {                    if (auth.currentUser) {                      try {                        const ratingRef = collection(db, `users/${auth.currentUser.uid}/productNameRatings`);                        await setDoc(doc(ratingRef, currentProductForRating.productName), { rating: dialogRatingValue });                        setOpenRatingDialog(false);                      } catch (error) {                        console.error("評価の保存エラー:", error);                        alert("評価の保存中にエラーが発生しました。");                      }                    } else {                      alert("ログインして評価してください。");                    }                  }}                >                  保存                </Button>                <Button                  variant="outlined"                  onClick={async () => {                    if (auth.currentUser) {                      try {                        const ratingRef = collection(db, `users/${auth.currentUser.uid}/productNameRatings`);                        await setDoc(doc(ratingRef, currentProductForRating.productName), { rating: 0 });                        setOpenRatingDialog(false);                      } catch (error) {                        console.error("評価の保存エラー:", error);                        alert("評価の保存中にエラーが発生しました。");                      }                    } else {                      alert("ログインして評価してください。");                    }                  }}                  sx={{ ml: 1 }}                >                  クリア                </Button>              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ProductListPage;
