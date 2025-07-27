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
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import ProductListItem from './components/ProductListItem'; // 追加

const ProductListPage = () => {
  const navigate = useNavigate();
  const location = useLocation(); // useLocation も追加

  const formatRegistrationDate = (timestamp) => {
    if (!timestamp) return '';

    const registeredDate = timestamp.toDate(); // Firestore TimestampをDateオブジェクトに変換
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - registeredDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
      return `${diffDays}日前`;
    } else if (diffDays <= 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}週前`;
    } else if (diffDays <= 180) { // 約6ヶ月
      const months = Math.floor(diffDays / 30);
      return `${months}ヶ月前`;
    } else {
      return '半年前';
    }
  };

  const formatUnitPrice = (price, unit) => {
    if (price === Infinity) return '-';
    if (price >= 100) {
      return `${Math.round(price)}円/${unit}`;
    } else if (price >= 10) {
      return `${price.toFixed(1)}円/${unit}`;
    } else {
      return `${price.toFixed(2)}円/${unit}`;
    }
  };

  const formatSpecialPriceDate = (timestamp, type) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    if (type === '日替り') {
      return `${month}/${day}`;
    } else if (type === '期間特売') {
      return `~${month}/${day}`;
    }
    return '';
  };

  const [products, setProducts] = useState([]);
  const [userRatingsByProductName, setUserRatingsByProductName] = useState({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [hiddenProductIds, setHiddenProductIds] = useState([]);
  const [showHiddenProductsView, setShowHiddenProductsView] = useState(false);
  const [openRelatedProductsDialog, setOpenRelatedProductsDialog] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [openRatingDialog, setOpenRatingDialog] = useState(false);
  const [currentProductForRating, setCurrentProductForRating] = useState(null);
  const [dialogRatingValue, setDialogRatingValue] = useState(0);

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

  // 商品データをリアルタイムで取得
  useEffect(() => {
    const q = query(collection(db, "prices"), orderBy("createdAt", "desc")); // pricesコレクションから取得
    const unsubscribePrices = onSnapshot(q, async (snapshot) => {
      const pricesData = [];
      const productDefinitionIds = new Set();

      snapshot.docs.forEach(docSnap => {
        const price = { id: docSnap.id, ...docSnap.data() };
        pricesData.push(price);
        if (price.productDefinitionId) {
          productDefinitionIds.add(price.productDefinitionId);
        }
      });

      const productDefinitionsMap = new Map();
      if (productDefinitionIds.size > 0) {
        // product_definitionsをバッチで取得
        const definitionQueries = Array.from(productDefinitionIds).map(id => getDoc(doc(db, "product_definitions", id)));
        const definitionSnapshots = await Promise.all(definitionQueries);
        definitionSnapshots.forEach(docSnap => {
          if (docSnap.exists()) {
            productDefinitionsMap.set(docSnap.id, docSnap.data());
          }
        });
      }

      const combinedProducts = pricesData.map(price => {
        const definition = productDefinitionsMap.get(price.productDefinitionId);
        return {
          ...price,
          productName: definition?.productName || price.productName || '',
          manufacturer: definition?.manufacturer || price.manufacturer || '',
          volume: definition?.volume || price.volume || '',
          unit: definition?.unit || price.unit || 'g',
          largeCategory: definition?.largeCategory || price.largeCategory || '',
          mediumCategory: definition?.mediumCategory || price.mediumCategory || '',
          smallCategory: definition?.smallCategory || price.smallCategory || '',
        };
      });
      setProducts(combinedProducts);
    });

    // ユーザーごとの商品名評価をリアルタイムで取得
    let unsubscribeProductNameRatings;
    if (auth.currentUser) {
      const ratingsRef = collection(db, `users/${auth.currentUser.uid}/productNameRatings`);
      unsubscribeProductNameRatings = onSnapshot(ratingsRef, (snapshot) => {
        const ratingsData = {};
        snapshot.docs.forEach(doc => {
          ratingsData[doc.id] = doc.data().rating;
        });
        setUserRatingsByProductName(ratingsData);
      });
    }

    // 非表示商品のIDをリアルタイムで取得
    let unsubscribeHiddenProducts;
    if (auth.currentUser) {
      const hiddenRef = collection(db, `users/${auth.currentUser.uid}/hiddenProducts`);
      unsubscribeHiddenProducts = onSnapshot(hiddenRef, (snapshot) => {
        const hiddenIds = snapshot.docs.map(doc => doc.id);
        setHiddenProductIds(hiddenIds);
      });
    }

    // クリーンアップ関数
    return () => {
      unsubscribePrices();
      if (unsubscribeProductNameRatings) {
        unsubscribeProductNameRatings();
      }
      if (unsubscribeHiddenProducts) {
        unsubscribeHiddenProducts();
      }
    };
  }, [auth.currentUser]);

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
    let baseProducts = products;

    // 非表示にした商品表示の場合
    if (showHiddenProductsView) {
      baseProducts = products.filter(product => hiddenProductIds.includes(product.id));
    } else {
      // 通常表示の場合、非表示の商品を除外
      baseProducts = products.filter(product => !hiddenProductIds.includes(product.id));
    }

    // 検索キーワードによるフィルタリング
    const keyword = searchKeyword.toLowerCase();
    let tempFilteredProducts = baseProducts.filter(product => {
      const productNameLower = product.productName.toLowerCase();
      const manufacturerLower = product.manufacturer.toLowerCase();

      // ひらがな・カタカナ変換を考慮した検索
      const productNameHiragana = toHiragana(productNameLower);
      const productNameKatakana = toHalfWidthKatakana(productNameLower);
      const manufacturerHiragana = toHiragana(manufacturerLower);
      const manufacturerKatakana = toHalfWidthKatakana(manufacturerLower);

      return (
        productNameLower.includes(keyword) ||
        manufacturerLower.includes(keyword) ||
        productNameHiragana.includes(keyword) ||
        productNameKatakana.includes(keyword) ||
        manufacturerHiragana.includes(keyword) ||
        manufacturerKatakana.includes(keyword)
      );
    });

    // 検索キーワードが入力されている場合に、同じ商品名の中で単価が最も安いものだけを表示する
    if (searchKeyword.trim() !== '') {
      const cheapestPerProductNameMap = new Map();
      tempFilteredProducts.forEach(product => {
        const unitPrice = product.volume > 0 ? (product.priceExcludingTax / product.volume) : Infinity;
        const productWithUnitPrice = { ...product, unitPrice };

        const existingCheapest = cheapestPerProductNameMap.get(product.productName);
        if (!existingCheapest || unitPrice < existingCheapest.unitPrice) {
          cheapestPerProductNameMap.set(product.productName, productWithUnitPrice);
        }
      });
      return Array.from(cheapestPerProductNameMap.values()).sort((a, b) => a.unitPrice - b.unitPrice);
    }

    return tempFilteredProducts;
  }, [products, searchKeyword, hiddenProductIds, showHiddenProductsView, userRatingsByProductName]);

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
