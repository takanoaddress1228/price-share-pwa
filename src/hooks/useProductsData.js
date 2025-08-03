import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';

const useProductsData = () => {
  const [products, setProducts] = useState([]);
  const [userRatingsByProductName, setUserRatingsByProductName] = useState({});
  const [hiddenProductIds, setHiddenProductIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // ローディング状態を追加

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true); // データ取得開始時にローディングをtrueに設定

      const q = query(collection(db, "prices"), orderBy("createdAt", "desc"));
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
        setIsLoading(false); // データ取得完了時にローディングをfalseに設定
      });

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

      let unsubscribeHiddenProducts;
      if (auth.currentUser) {
        const hiddenRef = collection(db, `users/${auth.currentUser.uid}/hiddenProducts`);
        unsubscribeHiddenProducts = onSnapshot(hiddenRef, (snapshot) => {
          const hiddenIds = snapshot.docs.map(doc => doc.id);
          setHiddenProductIds(hiddenIds);
        });
      }

      return () => {
        unsubscribePrices();
        if (unsubscribeProductNameRatings) {
          unsubscribeProductNameRatings();
        }
        if (unsubscribeHiddenProducts) {
          unsubscribeHiddenProducts();
        }
      };
    };

    fetchData();
  }, [auth.currentUser]);

  return { products, userRatingsByProductName, hiddenProductIds, setHiddenProductIds, isLoading };
};

export default useProductsData;
