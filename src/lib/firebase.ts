import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Helper: Pulisce la stringa dalle virgolette accidentali (es. "AIzaSy..." diventa AIzaSy...) e dagli spazi vuoti
const cleanEnvVar = (val: string | undefined) => {
  if (!val) return "";
  return val.replace(/^["']|["']$/g, '').trim();
};

// Your web app's Firebase configuration
// These are loaded from environment variables (e.g., .env file locally or GitHub Actions)
const firebaseConfig = {
  apiKey: cleanEnvVar(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: cleanEnvVar(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnvVar(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnvVar(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnvVar(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnvVar(import.meta.env.VITE_FIREBASE_APP_ID)
};

// Debug: Check if env vars are loaded (masking the key for security)
if (!firebaseConfig.apiKey) {
  console.error("🔥 ERRORE FIREBASE: L'API Key manca! Controlla il file .env in locale o le Variables su GitHub.");
} else if (firebaseConfig.apiKey === "demo-api-key") {
  console.warn("⚠️ ATTENZIONE: Stai ancora usando la demo-api-key finta.");
} else {
  console.log("✅ Firebase config trovata. API Key inizia con:", firebaseConfig.apiKey.substring(0, 5) + "...");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Cloud Firestore
export const db = getFirestore(app);
