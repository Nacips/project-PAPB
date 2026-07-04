// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAScj5vcBRudvYJvzJUFVH8R1wdBquc6w4",
  authDomain: "esuratdesa.firebaseapp.com",
  projectId: "esuratdesa",
  storageBucket: "esuratdesa.firebasestorage.app",
  messagingSenderId: "589830704626",
  appId: "1:589830704626:web:33cccc306e0c28a57e6f6b",
  measurementId: "G-PK4TXP1TRZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;