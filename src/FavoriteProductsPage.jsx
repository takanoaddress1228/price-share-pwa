import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom'; // 追加
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
  IconButton, // 追加
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import ClearIcon from '@mui/icons-material/Clear'; // 削除アイコン
import EditIcon from '@mui/icons-material/Edit';   // 編集アイコン

const FavoriteProductsPage = () => {
  const navigate = useNavigate(); // 追加
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

  const formatUnitPrice = (price) => {
    if (price === Infinity) return '-';
    if (price >= 100) {
      return Math.round(price);
    } else if (price >= 10) {
      return price.toFixed(1);
    } else {
      return price.toFixed(2);
    }
  };

  const [products, setProducts] = useState([]);
  const [userRatingsByProductName, setUserRatingsByProductName] = useState({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [openRelatedProductsDialog, setOpenRelatedProductsDialog] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);

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

    // クリーンアップ関数
    return () => {
      unsubscribeProducts();
      if (unsubscribeProductNameRatings) {
        unsubscribeProductNameRatings();
      }
    };
  }, [auth.currentUser]);

  const handleShowRelatedProducts = (productName, volume) => {
    const related = products.filter(p => p.productName === productName)
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
    // お気に入り商品は星評価が1つ以上あるもの
    let baseProducts = products.filter(product => (userRatingsByProductName[product.productName] || 0) > 0);

    // 同じ商品名の中で単価が最も安いものだけを抽出
    const cheapestPerProductNameMap = new Map();
    baseProducts.forEach(product => {
      const unitPrice = product.volume > 0 ? (product.priceExcludingTax / product.volume) : Infinity;
      const productWithUnitPrice = { ...product, unitPrice };

      const existingCheapest = cheapestPerProductNameMap.get(product.productName);
      if (!existingCheapest || unitPrice < existingCheapest.unitPrice) {
        cheapestPerProductNameMap.set(product.productName, productWithUnitPrice);
      }
    });
    let productsToShow = Array.from(cheapestPerProductNameMap.values());

    // 検索キーワードと星評価によるフィルタリング
    const keyword = searchKeyword.toLowerCase();
    const searchRating = parseInt(keyword, 10); // キーワードを数値に変換
    const isRatingSearch = !isNaN(searchRating) && searchRating >= 0 && searchRating <= 3; // 0から3の数値で、かつ数値であるか

    let tempFilteredProducts = productsToShow.filter(product => {
      const productNameLower = product.productName.toLowerCase();
      const manufacturerLower = product.manufacturer.toLowerCase();
      const tagsLower = (product.tags || []).map(tag => tag.toLowerCase());

      // ひらがな・カタカナ変換を考慮した検索
      const productNameHiragana = toHiragana(productNameLower);
      const productNameKatakana = toHalfWidthKatakana(productNameLower);
      const manufacturerHiragana = toHiragana(manufacturerLower);
      const manufacturerKatakana = toHalfWidthKatakana(manufacturerLower);

      const tagMatch = tagsLower.some(tag => tag.includes(keyword));

      return (
        (isRatingSearch && (userRatingsByProductName[product.productName] || 0) === searchRating) || // 星評価が一致する場合
        (!isRatingSearch && ( // 星評価検索ではない場合、既存のキーワード検索を実行
          productNameLower.includes(keyword) ||
          manufacturerLower.includes(keyword) ||
          productNameHiragana.includes(keyword) ||
          productNameKatakana.includes(keyword) ||
          manufacturerHiragana.includes(keyword) ||
          manufacturerKatakana.includes(keyword) ||
          tagMatch // タグ検索を追加
        ))
      );
    });

    // 星評価検索の場合、または検索キーワードが空の場合、そのまま返す
    return tempFilteredProducts.sort((a, b) => a.unitPrice - b.unitPrice); // 単価でソート
  })();

  return (
    <Box sx={{ p: 3, pt: '70px' }}>
      <Box sx={{ mb: 2, position: 'sticky', top: 0, zIndex: 100 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', mb: 1 }}>
          <Typography variant="h6" sx={{ whiteSpace: 'nowrap', fontSize: '1.4rem', flexShrink: 0, textAlign: 'center', width: '100%' }}>
            お気に入り商品
          </Typography>
        </Box>
        <TextField
          label="キーワードやタグで検索"
          variant="outlined"
          size="small"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="商品名、星評価 (0-3), タグ"
          sx={{ width: '100%' }}
        />
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
                    <Box> {/* Outer Box for two lines */}
                      {/* Line 1: Star Rating, Product Name, Price, Volume/Unit, Unit Price */}
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 0.5, mb: 0.5 }}> {/* mb for spacing between lines */}
                        {/* Star Rating */}
                        <Box
                          sx={{ cursor: 'pointer', flexShrink: 0 }}
                        >
                          <Rating
                            name={`rating-${product.id}`}
                            value={userRatingsByProductName[product.productName] || 0}
                            max={3}
                            size="small"
                            onChange={async (event, newValue) => {
                              if (auth.currentUser) {
                                const confirmSave = confirm('この評価を保存しますか？同じ商品名の他の商品にも適用されます。');
                                if (confirmSave) {
                                  try {
                                    const ratingRef = collection(db, `users/${auth.currentUser.uid}/productNameRatings`);
                                    await setDoc(doc(ratingRef, product.productName), { rating: newValue });
                                  } catch (error) {
                                    console.error("評価の保存エラー:", error);
                                    alert("評価の保存中にエラーが発生しました。");
                                  }
                                } else {
                                  console.log('評価の保存がキャンセルされました。');
                                }
                              } else {
                                alert('ログインして評価してください。');
                              }
                            }}
                            sx={{ '& .MuiRating-icon': { fontSize: '0.7rem' } }} // アイコンのサイズをさらに小さくする
                          />
                        </Box>
                        {/* Product Name */}
                        <Typography component="span" variant="body1" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${product.productName}`}</Typography>
                        {/* Price */}
                        <Typography component="span" variant="body1" sx={{ width: 'auto', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${product.priceExcludingTax}円`}</Typography>
                        {/* Volume/Unit */}
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '10%', flexShrink: 0, fontSize: '0.7rem' }}>{`${product.volume}${product.unit}`}</Typography>
                        {/* Unit Price */}
                                                <Typography component="span" variant="caption" color="red" sx={{ width: '15%', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>{`${formatUnitPrice(product.volume > 0 ? (product.priceExcludingTax / product.volume) : Infinity)}${product.unit === '入り' ? '' : product.unit}`}</Typography>
                      </Box>

                      {/* Line 2: Manufacturer, Store Name, Other Button */}
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
                        {/* 最安値 Button (gray styling) */}
                        <Button variant="outlined" size="small" sx={{
                          width: 60, height: 36, minWidth: 36, flexShrink: 0,
                          color: '#757575', // グレー系の色
                          borderColor: '#bdbdbd', // グレー系の色
                          '&:hover': {
                            borderColor: '#616161', // ホバー時の色を少し濃く
                            backgroundColor: 'rgba(0, 0, 0, 0.04)', // ホバー時の背景色
                          },
                        }} onClick={() => handleShowRelatedProducts(product.productName, product.volume)}>最安値</Button>
                        {/* 編集・削除ボタン */}
                        {auth.currentUser && product.userId === auth.currentUser.uid && (
                          <>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/register/${product.id}`);
                              }}
                              sx={{ color: '#616161', p: 0.5, ml: 0.5 }} // グレー系の色に変更
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('この商品を削除しますか？')) {
                                  deleteDoc(doc(db, "products", product.id));
                                }
                              }}
                              sx={{ color: '#616161', p: 0.5 }} // グレー系の色に変更
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
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
                          <Typography component="span" variant="body1" color="red" sx={{ width: '35%', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${formatUnitPrice(p.unitPrice)}円${p.unit === '入り' ? '' : '/' + p.unit}`}</Typography>
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
    </Box>
  );
};

export default FavoriteProductsPage;