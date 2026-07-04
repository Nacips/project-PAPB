import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    updateDoc,
} from "firebase/firestore";

import { db } from "../config/firebase";

export const tambahData = async (
  namaCollection: string,
  data: any
) => {
  return await addDoc(collection(db, namaCollection), data);
};

export const getData = async (
  namaCollection: string
) => {
  const snapshot = await getDocs(
    collection(db, namaCollection)
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const editData = async (
  namaCollection: string,
  id: string,
  data: any
) => {
  return await updateDoc(
    doc(db, namaCollection, id),
    data
  );
};

export const hapusData = async (
  namaCollection: string,
  id: string
) => {
  return await deleteDoc(
    doc(db, namaCollection, id)
  );
};