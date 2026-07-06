import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  Unsubscribe,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";

export const tambahData = async (namaCollection: string, data: any) => {
  return await addDoc(collection(db, namaCollection), data);
};

export const getData = async (namaCollection: string) => {
  const snapshot = await getDocs(collection(db, namaCollection));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const editData = async (namaCollection: string, id: string, data: any) => {
  return await updateDoc(doc(db, namaCollection, id), data);
};

export const hapusData = async (
  namaCollection: string,
  id: string
) => {
  console.log(`🗑️ Menghapus dari collection: ${namaCollection}, ID: ${id}`);
  
  try {
    const result = await deleteDoc(doc(db, namaCollection, id));
    console.log(`✅ Berhasil menghapus dari ${namaCollection}`);
    return result;
  } catch (error: any) {
    console.error(`❌ Gagal menghapus dari ${namaCollection}:`, error);
    throw error;
  }
};

export const subscribeToCollection = (
  namaCollection: string,
  callback: (data: any[]) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe => {
  const q = query(collection(db, namaCollection));
  
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      callback(data);
    },
    (error) => {
      if (errorCallback) errorCallback(error);
      console.error("Error listening to collection:", error);
    }
  );
  return unsubscribe;
};

export const subscribeToCollectionWithFilter = (
  namaCollection: string,
  field: string,
  value: any,
  callback: (data: any[]) => void
): Unsubscribe => {
  const q = query(collection(db, namaCollection), where(field, "==", value));
  
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      callback(data);
    },
    (error) => {
      console.error("Error listening to filtered collection:", error);
    }
  );
  return unsubscribe;
};