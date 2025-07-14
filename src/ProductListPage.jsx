import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, getDoc, deleteDoc, where } from 'firebase/firestore';
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
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star'; // StarIconをインポート

const ProductListPage = () => {
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
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribeProducts = onSnapshot(q, async (snapshot) => {
      const productsData = [];
      for (const docSnapshot of snapshot.docs) {
        const product = { id: docSnapshot.id, ...docSnapshot.data() };
        productsData.push(product);
      }
      setProducts(productsData);
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
      unsubscribeProducts();
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
  const filteredProducts = (() => {
    let baseProducts = products;

    // 非表示にした商品表示の場合
    if (showHiddenProductsView) {
      baseProducts = products.filter(product => hiddenProductIds.includes(product.id));
    } else {
      // 通常表示の場合、非表示の商品を除外
      baseProducts = products.filter(product => !hiddenProductIds.includes(product.id));
    }

    // 検索キーワードと星評価によるフィルタリング
    const keyword = searchKeyword.toLowerCase();
    const searchRating = parseInt(keyword, 10); // キーワードを数値に変換
    const isRatingSearch = !isNaN(searchRating) && searchRating >= 0 && searchRating <= 3; // 0から3の数値で、かつ数値であるか

    let tempFilteredProducts = baseProducts.filter(product => {
      const productNameLower = product.productName.toLowerCase();
      const manufacturerLower = product.manufacturer.toLowerCase();

      // ひらがな・カタカナ変換を考慮した検索
      const productNameHiragana = toHiragana(productNameLower);
      const productNameKatakana = toHalfWidthKatakana(productNameLower);
      const manufacturerHiragana = toHiragana(manufacturerLower);
      const manufacturerKatakana = toHalfWidthKatakana(manufacturerLower);

      return (
        (isRatingSearch && (userRatingsByProductName[product.productName] || 0) === searchRating) || // 星評価が一致する場合
        (!isRatingSearch && ( // 星評価検索ではない場合、既存のキーワード検索を実行
          productNameLower.includes(keyword) ||
          manufacturerLower.includes(keyword) ||
          productNameHiragana.includes(keyword) ||
          productNameKatakana.includes(keyword) ||
          manufacturerHiragana.includes(keyword) ||
          manufacturerKatakana.includes(keyword)
        ))
      );
    });

    // 検索キーワードが入力されている場合（星評価検索を除く）に、
    // 同じ商品名の中で単価が最も安いものだけを表示する
    if (searchKeyword.trim() !== '' && !isRatingSearch) {
      const cheapestPerProductNameMap = new Map();
      tempFilteredProducts.forEach(product => {
        const unitPrice = product.volume > 0 ? (product.priceExcludingTax / product.volume) : Infinity;
        const productWithUnitPrice = { ...product, unitPrice };

        const existingCheapest = cheapestPerProductNameMap.get(product.productName);
        if (!existingCheapest || unitPrice < existingCheapest.unitPrice) {
          cheapestPerProductNameMap.set(product.productName, productWithUnitPrice);
        }
      });
      // Convert map values back to an array and sort them by unitPrice
      return Array.from(cheapestPerProductNameMap.values()).sort((a, b) => a.unitPrice - b.unitPrice);
    }

    // 星評価検索の場合、または検索キーワードが空の場合、そのまま返す
    return tempFilteredProducts;
  })();

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
          label={showHiddenProductsView ? "非表示にした商品を検索" : "商品を検索"}
          variant="outlined"
          size="small"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          // placeholder="商品名、または星評価 (0-3)" // 削除
          sx={{
            width: '100%',
            // デフォルトの枠線色 (グレー系)
            '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
              borderColor: '#bdbdbd', // 薄いグレー
            },
            // フォーカス時の枠線色 (ワインレッド系)
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#B22222', // ワインレッド
            },
            // ホバー時の枠線色 (少し濃いグレー)
            '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#757575', // 通常のグレー
            },
          }}
          InputLabelProps={{
            style: {
              color: '#616161', // ラベルの初期色をグレーに固定
            },
            sx: {
              // フローティングラベルがフォーカスされた時の色 (ワインレッド系)
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
                    <Box> {/* Outer Box for two lines */}
                      {/* Line 1: Star Rating, Product Name, Price, Volume/Unit, Unit Price */}
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 0.5, mb: 0.5 }}> {/* mb for spacing between lines */}
                        {/* Star Rating */}
                        <Box
                          onClick={() => {
                            setCurrentProductForRating(product);
                            setDialogRatingValue(userRatingsByProductName[product.productName] || 0);
                            setOpenRatingDialog(true);
                          }}
                          sx={{ cursor: 'pointer', flexShrink: 0 }}
                        >
                          <Rating
                            name={`rating-${product.id}`}
                            value={userRatingsByProductName[product.productName] || 0}
                            max={3}
                            size="small"
                            readOnly
                          />
                        </Box>
                        {/* Product Name */}
                        <Typography component="span" variant="body1" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${product.productName}`}</Typography>
                        {/* Price */}
                        <Typography component="span" variant="body1" sx={{ width: 'auto', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${product.priceExcludingTax}円`}</Typography>
                        {/* Volume/Unit */}
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '10%', flexShrink: 0, fontSize: '0.7rem' }}>{`${product.volume}${product.unit}`}</Typography>
                        {/* Unit Price */}
                        <Typography component="span" variant="caption" color="red" sx={{ width: '12%', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>{`${product.volume > 0 ? (product.priceExcludingTax / product.volume).toFixed(2) : '-'}${product.unit}`}</Typography>
                      </Box>

                      {/* Line 2: Manufacturer, Store Name, Other Button, Hidden Button */}
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 0.5 }}>
                        {/* Manufacturer */}
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '20%', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>{`${product.manufacturer}`}</Typography>
                        {/* Store Name */}
                        <Typography component="span" variant="caption" color="text.secondary" sx={{
                          flexGrow: 1,
                          flexShrink: 0,
                          fontSize: '0.7rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          mr: 1
                        }}>{`${product.storeName}`}</Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', flexShrink: 0 }}>
                          {formatRegistrationDate(product.createdAt)}
                        </Typography>
                        {/* Other Button */}
                        <Button variant="outlined" size="small" sx={{
                          width: 60, height: 36, minWidth: 36, flexShrink: 0,
                          color: '#757575', // グレー系の色
                          borderColor: '#bdbdbd', // グレー系の色
                          '&:hover': {
                            borderColor: '#616161', // ホバー時の色を少し濃く
                            backgroundColor: 'rgba(0, 0, 0, 0.04)', // ホバー時の背景色
                          },
                        }} onClick={() => handleShowRelatedProducts(product.productName, product.volume)}>最安値</Button>
                        {/* Hidden Button */}
                        <Button
                          variant="outlined"
                          size="small"
                          sx={hiddenProductIds.includes(product.id) ? { // If it's a hidden product (button says "再表示")
                            width: 60, height: 36, minWidth: 36, flexShrink: 0,
                            color: '#B22222', // ワインレッド系の色
                            borderColor: '#B22222', // ワインレッド系の色
                            '&:hover': {
                              borderColor: '#800020', // ホバー時の色を少し濃く
                              backgroundColor: 'rgba(178, 34, 34, 0.04)', // ホバー時の背景色
                            },
                          } : { // If it's not a hidden product (button says "非表示")
                            width: 60, height: 36, minWidth: 36, flexShrink: 0,
                            color: '#2196F3', // 青色
                            borderColor: '#2196F3', // 青色
                            '&:hover': {
                              borderColor: '#1976D2', // ホバー時の色を少し濃く
                              backgroundColor: 'rgba(33, 150, 243, 0.04)', // ホバー時の背景色
                            },
                          }}
                          onClick={() => handleToggleHiddenStatus(product.id, hiddenProductIds.includes(product.id))}
                        >
                          {hiddenProductIds.includes(product.id) ? '再表示' : '非表示'}
                        </Button>
                      </Box>
                    </Box>
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
                        {/* 1行目: 商品名・価格・内容量 */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0.5 }}>
                          <Typography component="span" variant="body1" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${p.productName}`}</Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Typography component="span" variant="body1" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${p.priceExcludingTax}円`}</Typography>
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>{`${p.volume}${p.unit}`}</Typography>
                          </Box>
                        </Box>
                        {/* 2行目: 単価・店名 */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0.5 }}>
                          <Typography component="span" variant="body1" color="red" sx={{ width: '30%', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${p.unitPrice.toFixed(2)}円/${p.unit}`}</Typography>
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${p.storeName}`}</Typography>
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