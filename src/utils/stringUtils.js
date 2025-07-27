// ひらがなをカタカナに変換する関数
export const toHalfWidthKatakana = (str) => {
  return str.replace(/./g, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 0x3041 && code <= 0x3093) { // ひらがな
      return String.fromCharCode(code + 0x60);
    }
    return char;
  });
};

// カタカナをひらがなに変換する関数
export const toHiragana = (str) => {
  return str.replace(/./g, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 0x30a1 && code <= 0x30f6) { // カタカナ
      return String.fromCharCode(code - 0x60);
    }
    return char;
  });
};