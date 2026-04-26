// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD-QUczJJHtUHfut589-n2pDyH5Fthq7PQ",
  authDomain: "bihar-kirayaghar.firebaseapp.com",
  projectId: "bihar-kirayaghar",
  storageBucket: "bihar-kirayaghar.firebasestorage.app",
  messagingSenderId: "1054555126172",
  appId: "1:1054555126172:web:94fdf90ea0d01133a43059"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
export const storage = getStorage(app);