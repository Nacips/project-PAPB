import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// @ts-ignore: Mengabaikan error bawaan typing TypeScript pada Firebase
import { initializeAuth, getReactNativePersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDMXDlOLB4K48Ul5aKZpOSUVZO90MtbFkM",
  authDomain: "esurat-papb-ariz.firebaseapp.com",
  projectId: "esurat-papb-ariz",
  storageBucket: "esurat-papb-ariz.firebasestorage.app",
  messagingSenderId: "557575985240",
  appId: "1:557575985240:web:324a5e2a410085c718122d"
};

const app = initializeApp(firebaseConfig);

// Inisialisasi Auth dengan AsyncStorage agar sesi login tersimpan
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export default app;