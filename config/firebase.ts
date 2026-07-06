import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDMXDlOLB4K48Ul5aKZpOSUVZO90MtbFkM",
  authDomain: "esurat-papb-ariz.firebaseapp.com",
  projectId: "esurat-papb-ariz",
  storageBucket: "esurat-papb-ariz.firebasestorage.app",
  messagingSenderId: "557575985240",
  appId: "1:557575985240:web:324a5e2a410085c718122d"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;