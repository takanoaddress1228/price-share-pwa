
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAGbmL2zfvGgThXW-0hq6GEu9Ih-hnlILU",
  authDomain: "price-share-pwa.firebaseapp.com",
  projectId: "price-share-pwa",
  storageBucket: "price-share-pwa.appspot.com",
  messagingSenderId: "406404784747",
  appId: "1:406404784747:web:545ae89bbb13cc3bd7072e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the database service
export const db = getFirestore(app);
// Get a reference to the auth service
export const auth = getAuth(app);
