import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

// Load config from .env
const envFile = fs.readFileSync(".env", "utf8");
const config = {};
envFile.split("\n").forEach(line => {
    const [key, value] = line.split("=");
    if (key && value) config[key] = value.trim().replace(/^"|"$/g, "");
});

const firebaseConfig = {
    apiKey: config.VITE_FIREBASE_API_KEY,
    authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: config.VITE_FIREBASE_PROJECT_ID,
    storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: config.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkPasses() {
    console.log("Fetching bookings...");
    const snapshot = await getDocs(collection(db, "bookings"));
    const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const passes = bookings.filter(b => b.type === 'pass');
    console.log(`Found ${passes.length} pass documents.`);
    if (passes.length > 0) {
        console.log("Sample pass document:", passes[0]);
    }
    process.exit(0);
}

checkPasses();
