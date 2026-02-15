
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ⚠️ REMPLACE LES POINTS (...) CI-DESSOUS PAR TES VRAIES CLES FIREBASE
// (Tu les trouves dans la console Firebase > Paramètres du projet)
const firebaseConfig = {
  apiKey: "AIzaSyAZDCN7LTHrGacH-Y8mBStZ1eml5xeImo4",
  authDomain: "tombola-731c0.firebaseapp.com",
  databaseURL: "https://tombola-731c0-default-rtdb.firebaseio.com"
};

// Initialisation
const app = initializeApp(firebaseConfig);

// EXPORTATION DE LA BASE DE DONNÉES (C'est ça qui manquait !)
export const db = getFirestore(app);
