import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, where, getDoc } from 'firebase/firestore'; // getDocを追加
import { useNavigate } from 'react-router-dom';
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
  Autocomplete,
  InputLabel,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import { toHalfWidthKatakana, toHiragana, applyProductFilters } from './utils/filterUtils';
import ProductListItem from './components/ProductListItem'; // 追加
import useCategoryFilter from './hooks/useCategoryFilter'; // 追加


const FavoriteProductsPage = () => {
  const navigate = useNavigate();
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
  const [openRelatedProductsDialog, setOpenRelatedProductsDialog] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [openRatingDialog, setOpenRatingDialog] = useState(false); // 評価ダイアログの開閉
  const [currentProductForRating, setCurrentProductForRating] = useState(null); // 評価対象の商品
  const [dialogRatingValue, setDialogRatingValue] = useState(0); // 評価ダイアログの評価値

  const handleShowRelatedProducts = (productName, volume) => {
    // 非表示でない商品のみをフィルタリング対象とする
    const related = products.filter(p => p.productName === productName && !hiddenProductIds.includes(p.id)) // 非表示商品をフィルタリング
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

  // 商品リストを検索キーワードでフィルタリング
  const filteredProducts = useMemo(() => {
    return applyProductFilters(
      products,
      searchKeyword,
      hiddenProductIds,
      false, // showHiddenProductsView は FavoriteProductsPage では常にfalse
      userRatingsByProductName,
      largeCategory,
      mediumCategory,
      smallCategory,
      true // isFavoritePage を true に設定
    );
  }, [products, searchKeyword, hiddenProductIds, userRatingsByProductName, largeCategory, mediumCategory, smallCategory]);

  return (
    <Box sx={{ p: 3, pt: '70px' }}>
      <Box sx={{ mb: 2, position: 'sticky', top: 0, zIndex: 100 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', mb: 1 }}>
          <Typography variant="h6" sx={{ whiteSpace: 'nowrap', fontSize: '1.4rem', flexShrink: 0, textAlign: 'center', width: '100%' }}>
            お気に入り商品
          </Typography>
        </Box>
        <TextField
          label="商品名や星の数で検索"
          variant="outlined"
          size="small"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="商品名または星の数を入力（1-3）"
          sx={{ width: '100%' }}
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
            getOptionLabel={(option) => option || ''}
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

      <List>
        {filteredProducts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">お気に入りの商品がありません。</Typography>
        ) : (
          filteredProducts.map((product) => (
            <Paper key={product.id} sx={{ mb: 1, p: 1, borderLeft: 'none', borderRight: 'none', boxShadow: 'none' }}>
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
              relatedProducts.map((p, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}> {/* 2行表示のための変更 */}
  {/* 1行目: 商品名・内容量・価格・単価 */}
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0.5 }}>
    <Typography component="span" variant="body1" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {`${p.productName}`}
    </Typography>
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <Typography component="span" variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>
        {`${p.volume}${p.unit}`}
      </Typography>
      <Typography component="span" variant="body1" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: p.priceType === '通常' ? 'text.primary' : (p.priceType === '日替り' ? '#B22222' : '#FF8C00') }}>
        {`${p.priceExcludingTax}円`}
      </Typography>
      {p.priceType !== '通常' && (
        <Typography component="span" variant="caption" sx={{ color: p.priceType === '日替り' ? '#B22222' : '#FF8C00', fontSize: '0.7rem', ml: 0.5 }}>
          {formatSpecialPriceDate(p.priceType === '日替り' ? p.startDate : p.endDate, p.priceType)}
        </Typography>
      )}
      <Typography component="span" variant="caption" color="red" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>
        {`${formatUnitPrice(p.volume > 0 ? p.priceExcludingTax / p.volume : Infinity, p.unit)}`}
      </Typography>
    </Box>
  </Box>
  {/* 2行目: メーカー・店名・登録日 */}
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0.5 }}>
    <Typography component="span" variant="caption" color="text.secondary" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {`${p.manufacturer}`}
    </Typography>
    <Typography component="span" variant="caption" color="text.secondary" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {`${p.storeName}`}
    </Typography>
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
        <Rating
          name="dialog-rating"
          value={dialogRatingValue}
          max={3}
          size="large"
          onChange={(event, newValue) => {
            setDialogRatingValue(newValue);
          }}
          sx={{ color: 'orange' }}
        />
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 3 }}>
          <Button
            variant="contained"
            onClick={async () => {
              if (auth.currentUser) {
                try {
                  const ratingRef = collection(db, `users/${auth.currentUser.uid}/productNameRatings`);
                  await setDoc(doc(ratingRef, currentProductForRating.productName), { rating: dialogRatingValue });
                  setOpenRatingDialog(false);
                } catch (error) {
                  console.error("評価の保存エラー:", error);
                  alert("評価の保存中にエラーが発生しました。");
                }
              } else {
                alert("ログインして評価してください。");
              }
            }}
          >
            保存
          </Button>
          <Button
            variant="outlined"
            onClick={async () => {
              if (auth.currentUser) {
                try {
                  const ratingRef = collection(db, `users/${auth.currentUser.uid}/productNameRatings`);
                  await setDoc(doc(ratingRef, currentProductForRating.productName), { rating: 0 });
                  setOpenRatingDialog(false);
                } catch (error) {
                  console.error("評価の保存エラー:", error);
                  alert("評価の保存中にエラーが発生しました。");
                }
              } else {
                alert("ログインして評価してください。");
              }
            }}
            sx={{ ml: 1 }}
          >
            クリア
          </Button>
        </Box>
      </Box>
    )}
  </DialogContent>
</Dialog>
</Box>
  );
};

export default FavoriteProductsPage;