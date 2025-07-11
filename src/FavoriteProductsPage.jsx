import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
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
import StarIcon from '@mui/icons-material/Star';

const FavoriteProductsPage = () => {
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'nowrap' }}>
        <Typography variant="h6" sx={{ whiteSpace: 'nowrap', fontSize: '1rem', flexShrink: 0 }}>
          お気に入り商品一覧
        </Typography>
        <TextField
          label="商品を検索"
          variant="outlined"
          size="small"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="商品名、星評価 (0-3), タグ"
          sx={{ width: '45%', ml: 1 }}
        />
      </Box>

      {/* 星の意味表示を追加 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', fontSize: '0.8rem' }}>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <StarIcon sx={{ color: 'gold', fontSize: '1rem' }} />イマイチ
        </Typography>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <StarIcon sx={{ color: 'gold', fontSize: '1rem' }} /><StarIcon sx={{ color: 'gold', fontSize: '1rem' }} />ふつう
        </Typography>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
          <StarIcon sx={{ color: 'gold', fontSize: '1rem' }} /><StarIcon sx={{ color: 'gold', fontSize: '1rem' }} /><StarIcon sx={{ color: 'gold', fontSize: '1rem' }} />リピート
        </Typography>
      </Box>

      <List>
        {filteredProducts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">お気に入りの商品がありません。</Typography>
        ) : (
          filteredProducts.map((product) => (
            <Paper key={product.id} sx={{ mb: 1, p: 1 }}>
              <ListItem disablePadding>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: 0 }}>
                      <Rating
                        name={`rating-${product.id}`}
                        value={userRatingsByProductName[product.productName] || 0}
                        max={3}
                        size="small"
                        sx={{ mr: 1, flexShrink: 0 }}
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
                      />
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '8%', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>{`${product.manufacturer}`}</Typography>
                      <Typography component="span" variant="body1" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${product.productName}`}</Typography>
                      <Typography component="span" variant="body1" sx={{ width: '8%', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${product.priceExcludingTax}円`}</Typography>
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '7%', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>{`${product.volume}${product.unit}`}</Typography>
                      <Typography component="span" variant="body1" sx={{ width: '10%', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${product.volume > 0 ? (product.priceExcludingTax / product.volume).toFixed(2) : '-'}${product.unit}`}</Typography> {/* 単価表示 */}
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '12%', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>{`${product.storeName}`}</Typography>
                      <Button variant="outlined" size="small" sx={{ ml: 1, width: 'auto', flexShrink: 0 }} onClick={() => handleShowRelatedProducts(product.productName, product.volume)}>他店舗</Button>
                    </Box>
                  }
                />
              </ListItem>
            </Paper>
          ))
        )}
      </List>

      <Dialog open={openRelatedProductsDialog} onClose={handleCloseRelatedProductsDialog} fullWidth={true} maxWidth="lg">
        <DialogTitle>関連商品</DialogTitle>
        <DialogContent>
          <List>
            {relatedProducts.length === 0 ? (
              <Typography variant="body2" color="text.secondary">関連商品はありません。</Typography>
            ) : (
              relatedProducts.map((p, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                        <Typography component="span" variant="body1" sx={{ width: '45%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${p.productName}`}</Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '10%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${p.volume}${p.unit}`}</Typography>
                        <Typography component="span" variant="body1" sx={{ width: '10%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${p.unitPrice.toFixed(2)}円/${p.unit}`}</Typography>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '35%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${p.storeName}`}</Typography>
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