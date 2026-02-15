import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- REMPLACE CES VALEURS PAR CELLES DE TA CONSOLE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAZDCN7LTHrGacH-Y8mBStZ1eml5xeImo4",
  authDomain: "tombola-731c0.firebaseapp.com",
  databaseURL: "https://tombola-731c0-default-rtdb.firebaseio.com",
  projectId: "tombola-731c0",
  storageBucket: "tombola-731c0.firebasestorage.app",
  messagingSenderId: "987970383398",
  appId: "1:987970383398:web:93c7a8994ebe44b33d80e7",
  measurementId: "G-XCRP9XHQN1"
};

// Vérification de sécurité pour ne pas faire planter l'appli écran bleu
let app;
let dbInstance;

try {
  if (firebaseConfig.apiKey === "...") {
    console.error("ERREUR CRITIQUE: Les clés API Firebase ne sont pas remplies !");
  } else {
    app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
  }
} catch (error) {
  console.error("Erreur lors de l'initialisation Firebase:", error);
}

export const db = dbInstance;
