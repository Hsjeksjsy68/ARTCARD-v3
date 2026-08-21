import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, addDoc, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, increment, where, limit } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAIHRF603LdbosZicKCDEJjlAMVrDOY5Bc",
  authDomain: "gen-lang-client-0720859222.firebaseapp.com",
  projectId: "gen-lang-client-0720859222",
  storageBucket: "gen-lang-client-0720859222.firebasestorage.app",
  messagingSenderId: "57004930038",
  appId: "1:57004930038:web:3196611881da1fe0ec4dd7"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
}, "ai-studio-artcard-ba26417d-dc2c-4e2a-a3d0-604475c246ba");
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { db, auth, provider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, createUserWithEmailAndPassword, signInWithEmailAndPassword, increment, updateProfile, where, limit };
export type { User };
