export const formatRegistrationDate = (timestamp) => {
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

export const formatUnitPrice = (price, unit) => {
  if (price === Infinity) return '-';
  if (price >= 100) {
    return `${Math.round(price)}`;
  } else if (price >= 10) {
    return `${price.toFixed(1)}`;
  } else {
    return `${price.toFixed(2)}`;
  }
};

export const formatSpecialPriceDate = (timestamp, type) => {
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