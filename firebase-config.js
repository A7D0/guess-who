// ====== Firebase Setup (Merged + Clean) ======

// استيراد الـ SDK الحديثة
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// إعدادات مشروعك (الحديثة فقط)
const firebaseConfig = {
  apiKey: "AIzaSyDXXsG-2UnZu0nHjmjS_Hg58g6OQJHmThg",
  authDomain: "guess-who-acace.firebaseapp.com",
  databaseURL: "https://guess-who-acace-default-rtdb.firebaseio.com",
  projectId: "guess-who-acace",
  storageBucket: "guess-who-acace.firebasestorage.app",
  messagingSenderId: "508465770564",
  appId: "1:508465770564:web:b2d3044690437881320c11",
  measurementId: "G-KZ4TV5S54G"
};

// تشغيل Firebase
const app = initializeApp(firebaseConfig);

// تشغيل Analytics (اختياري)
const analytics = getAnalytics(app);

// تشغيل Realtime Database
export const database = getDatabase(app);
