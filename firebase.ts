const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // C'est cette ligne qui est importante !


// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- REMPLACE CECI PAR TES PROPRES CLES FIREBASE ---
// Tu les trouves dans la console Firebase > Paramètres du projet > Générale > Vos applications
const firebaseConfig = {
  apiKey: "AIzaSyAZDCN7LTHrGacH-Y8mBStZ1eml5xeImo4",
  authDomain: "tombola-731c0.firebaseapp.com",
  databaseURL: "https://tombola-731c0-default-rtdb.firebaseio.com"
};
};
// ---------------------------------------------------

// 1. On initialise Firebase
const app = initializeApp(firebaseConfig);

// 2. C'EST LA LIGNE MAGIQUE QUI MANQUAIT PEUT-ÊTRE :
// On initialise la base de données (Firestore) et on l'exporte pour l'utiliser ailleurs
export const db = getFirestore(app);
