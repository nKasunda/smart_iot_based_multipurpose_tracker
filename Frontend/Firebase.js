import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAtGi9byXozmHBS5C8yKFbzHQvsEaQ7KCU",
  authDomain: "iot-tracker-951c2.firebaseapp.com",
  projectId: "iot-tracker-951c2",
  storageBucket: "iot-tracker-951c2.firebasestorage.app",
  messagingSenderId: "28243838831",
  appId: "1:28243838831:web:478fe490bc430a9527ca9a",
  measurementId: "G-DBCRHP628F",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
