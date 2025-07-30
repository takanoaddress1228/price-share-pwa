import React from 'react';
import { Box, Typography, Rating, Button, IconButton } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import { auth, db } from '../firebase'; // firebaseをインポート
import { doc, deleteDoc } from 'firebase/firestore'; // deleteDocをインポート

const ProductListItem = ({ product, userRatingsByProductName, formatUnitPrice, formatRegistrationDate, formatSpecialPriceDate, handleShowRelatedProducts, navigate, isHiddenView = false, handleToggleHiddenStatus, setCurrentProductForRating, setDialogRatingValue, setOpenRatingDialog }) => {
  return (
    <Box> {/* Outer Box for two lines */}
      {/* Line 1: Star Rating, Product Name, Price, Volume/Unit, Unit Price */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 0.5, justifyContent: 'space-between' }}> {/* mb for spacing between lines */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 1, minWidth: 0 }}> {/* Group 1: Star Rating + Product Name */}
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
              sx={{ '& .MuiRating-icon': { fontSize: '0.7rem' } }}
            />
          </Box>
          {/* Product Name */}
          <Typography component="span" variant="body1" sx={{ flexGrow: 1, maxWidth: '17rem' }}>{`${product.productName}`}</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', flexShrink: 0, ml: 'auto' }}> {/* Group 2: Special Price Date + Price + Volume/Unit + Unit Price */}
          {product.priceType !== '通常' && (
            <Typography component="span" variant="caption" sx={{ color: product.priceType === '日替り' ? '#B22222' : '#FF8C00', whiteSpace: 'nowrap', flexShrink: 0, mr: 0.5, fontSize: '0.7rem' }}>
              {formatSpecialPriceDate(product.priceType === '日替り' ? product.startDate : product.endDate, product.priceType)}
            </Typography>
          )}
          {/* Price */}
          <Typography component="span" variant="body1" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: product.priceType === '通常' ? 'text.primary' : (product.priceType === '日替り' ? '#B22222' : '#FF8C00') }}>{`${product.priceExcludingTax}円`}</Typography>
          {/* Volume/Unit */}
          <Typography component="span" variant="body1" color="text.secondary" sx={{ ml: 1 }}>{`${product.volume}${product.unit === '入り' ? '入' : product.unit}`}</Typography>
          {/* Unit Price */}
          <Typography component="span" color="red" sx={{ fontSize: '0.7rem', ml: 1 }}>@</Typography> {/* 小さな@ */}
          <Typography component="span" variant="body1" color="red" sx={{
            whiteSpace: 'normal',
            overflow: 'visible',
            textOverflow: 'clip',
          }}>{`${formatUnitPrice(product.volume > 0 ? (product.priceExcludingTax / product.volume) : Infinity, product.unit)}`}</Typography>
        </Box>
      </Box>

      {/* Line 2: Manufacturer, Store Name, Other Button, Hidden Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 0.5 }}>
        {/* Manufacturer */}
        <Typography component="span" variant="caption" color="text.secondary" sx={{ width: '20%', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${product.manufacturer}`}</Typography>
        {/* Store Name */}
        <Typography component="span" variant="caption" color="text.secondary" sx={{
          flexGrow: 1, // flexGrow を 1 に戻す
          flexShrink: 1, // Changed from 0 to 1
          fontSize: '0.7rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          mr: 1
        }}>{`${product.storeName}`}</Typography>
        <Typography component="span" variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', flexShrink: 0, ml: 'auto' }}> {/* ml: 'auto' を追加 */}
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
