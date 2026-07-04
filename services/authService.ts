import {
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";

import { auth } from "../config/firebase";

export const register = async (
  email: string,
  password: string
) => {
  return await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
};

export const login = async (
  email: string,
  password: string
) => {
  return await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
};

export const logout = async () => {
  return await signOut(auth);
};

export const forgotPassword = async (
  email: string
) => {
  return await sendPasswordResetEmail(auth, email);
};