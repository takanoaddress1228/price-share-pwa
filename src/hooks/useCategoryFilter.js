import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const useCategoryFilter = () => {
  const [largeCategory, setLargeCategory] = useState('');
  const [mediumCategory, setMediumCategory] = useState('');
  const [smallCategory, setSmallCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const docRef = doc(db, "categories", "definitions");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCategories(docSnap.data().largeCategories);
      } else {
        console.log("No such categories document!");
      }
    };
    fetchCategories();
  }, []);

  const handleLargeCategoryChange = (event, newValue) => {
    setLargeCategory(newValue);
    setMediumCategory('');
    setSmallCategory('');
  };

  const handleMediumCategoryChange = (event, newValue) => {
    setMediumCategory(newValue);
    setSmallCategory('');
  };

  const handleSmallCategoryChange = (event, newValue) => {
    setSmallCategory(newValue);
  };

  const getMediumCategories = (selectedLargeCategory) => {
    const selectedCat = categories.find(cat => cat.name === selectedLargeCategory);
    return selectedCat ? selectedCat.mediumCategories.map(medCat => medCat.name) : [];
  };

  const getSmallCategories = (selectedLargeCategory, selectedMediumCategory) => {
    const selectedLargeCat = categories.find(cat => cat.name === selectedLargeCategory);
    if (!selectedLargeCat) return [];
    const selectedMediumCat = selectedLargeCat.mediumCategories.find(medCat => medCat.name === selectedMediumCategory);
    return selectedMediumCat ? selectedMediumCat.smallCategories : [];
  };

  return {
    largeCategory,
    setLargeCategory,
    mediumCategory,
    setMediumCategory,
    smallCategory,
    setSmallCategory,
    handleLargeCategoryChange,
    handleMediumCategoryChange,
    handleSmallCategoryChange,
    largeCategories: categories.map(cat => cat.name),
    getMediumCategories,
    getSmallCategories,
  };
};

export default useCategoryFilter;
