import React from 'react';
import { Box, Typography, Rating, Button, IconButton } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import { auth, db } from '../firebase'; // firebaseをインポート
import { doc, deleteDoc } from 'firebase/firestore'; // deleteDocをインポート

const ProductListItem = ({ product, userRatingsByProductName, formatUnitPrice, formatRegistrationDate, formatSpecialPriceDate, handleShowRelatedProducts, navigate, isHiddenView = false, handleToggleHiddenStatus }) => {
  return (
    <Box> {/* Outer Box for two lines */}
      {/* Line 1: Star Rating, Product Name, Price, Volume/Unit, Unit Price */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 0.5, mb: 0.5 }}> {/* mb for spacing between lines */}
        {/* Star Rating */}
        <Box
          onClick={() => {
            // setCurrentProductForRating(product); // ProductListPageから渡されないためコメントアウト
            // setDialogRatingValue(userRatingsByProductName[product.productName] || 0); // ProductListPageから渡されないためコメントアウト
            // setOpenRatingDialog(true); // ProductListPageから渡されないためコメントアウト
          }}
          sx={{ cursor: 'pointer', flexShrink: 0 }}
        >
          <Rating
            name={`rating-${product.id}`}
            value={userRatingsByProductName[product.productName] || 0}
            max={3}
            size="small"
            readOnly
            sx={{ '& .MuiRating-icon': { fontSize: '0.7rem' } }} // アイコンのサイズをさらに小さくする
          />
        </Box>
        {/* Product Name */}
        <Typography component="span" variant="body1" sx={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${product.productName}`}</Typography>
        {/* Volume/Unit */}
        <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '10%', flexShrink: 0, fontSize: '0.7rem' }}>{`${product.volume}${product.unit}`}</Typography>
        {/* Price */}
        <Typography component="span" variant="body1" sx={{ width: 'auto', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: product.priceType === '通常' ? 'text.primary' : (product.priceType === '日替り' ? '#B22222' : '#FF8C00') }}>{`${product.priceExcludingTax}円`}</Typography>
        {product.priceType !== '通常' && (
          <Typography component="span" variant="caption" sx={{ color: product.priceType === '日替り' ? '#B22222' : '#FF8C00', fontSize: '0.7rem', ml: 0.5 }}>
            {formatSpecialPriceDate(product.priceType === '日替り' ? product.startDate : product.endDate, product.priceType)}
          </Typography>
        )}
        {/* Unit Price */}
        <Typography component="span" variant="caption" color="red" sx={{ width: '12%', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.7rem' }}>{`${formatUnitPrice(product.volume > 0 ? (product.priceExcludingTax / product.volume) : Infinity, product.unit)}`}</Typography>
      </Box>

      {/* Line 2: Manufacturer, Store Name, Other Button, Hidden Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 0.5 }}>
        {/* Manufacturer */}
        <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '20%', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${product.manufacturer}`}</Typography>
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
          sx={isHiddenView ? { // If it's a hidden product (button says "再表示")
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
          onClick={() => handleToggleHiddenStatus(product.id, isHiddenView)}
        >
          {isHiddenView ? '再表示' : '非表示'}
        </Button>
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
                  deleteDoc(doc(db, "prices", product.id));
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
  );
};

export default ProductListItem;
