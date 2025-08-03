export const toHalfWidthKatakana = (str) => {
  return str.replace(/./g, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 0x3041 && code <= 0x3093) { // ひらがな
      return String.fromCharCode(code + 0x60);
    }
    return char;
  });
};

export const toHiragana = (str) => {
  return str.replace(/./g, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 0x30a1 && code <= 0x30f6) { // カタカナ
      return String.fromCharCode(code - 0x60);
    }
    return char;
  });
};

export const applyProductFilters = (
  products,
  searchKeyword,
  hiddenProductIds,
  showHiddenProductsView,
  userRatingsByProductName,
  largeCategory,
  mediumCategory,
  smallCategory,
  isFavoritePage = false // お気に入りページかどうかを判定するフラグ
) => {
  let baseProducts = products;

  // お気に入りページの場合、星評価が1つ以上あるものに絞る
  if (isFavoritePage) {
    baseProducts = baseProducts.filter(product => (userRatingsByProductName[product.productName] || 0) > 0);
  }

  // 非表示にした商品表示の場合
  if (showHiddenProductsView) {
    baseProducts = baseProducts.filter(product => hiddenProductIds.includes(product.id));
  } else {
    // 通常表示の場合、非表示の商品を除外
    baseProducts = baseProducts.filter(product => !hiddenProductIds.includes(product.id));
  }

  // カテゴリーによるフィルタリング
  if (largeCategory) {
    baseProducts = baseProducts.filter(product => product.largeCategory === largeCategory);
  }
  if (mediumCategory) {
    baseProducts = baseProducts.filter(product => product.mediumCategory === mediumCategory);
  }
  if (smallCategory) {
    baseProducts = baseProducts.filter(product => product.smallCategory === smallCategory);
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
};