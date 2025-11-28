// ====== Firebase Setup (Merged + Clean) ======

// استيراد الـ SDK الحديثة من CDN كنُسَخ Modules لتشغيلها في المتصفح
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-analytics.js";

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
