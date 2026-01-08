import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, writeBatch, getDocs, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutAdmin() {
  return signOut(auth);
}

export function onAuth(cb: (user: any) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function getAllLicenses() {
  const colRef = collection(db, 'licenses');
  // You might want to order by creation date if you have that field, 
  // but for now we'll just get them all.
  const q = query(colRef); 
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ key: doc.id, ...doc.data() }));
}

export async function saveLicenseRecord(key: string, data: { status: string; plan: string; expiry?: string; maxDevices?: number; created_at?: string }) {
  const ref = doc(db, 'licenses', key);
  await setDoc(ref, data, { merge: true });
}

export async function getLicenseRecord(key: string) {
  const ref = doc(db, 'licenses', key);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveDevicesSnapshot(key: string, devices: Array<{ device_id: string; status: string; last_seen?: string; platform?: string }>) {
  const colRef = collection(db, 'license_devices', key, 'devices');
  const batch = writeBatch(db);
  devices.forEach(d => {
    const dref = doc(colRef, d.device_id);
    batch.set(dref, d, { merge: true });
  });
  await batch.commit();
}
