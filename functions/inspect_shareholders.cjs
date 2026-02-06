const admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listShareholders() {
    console.log("Listing Shareholders...");
    const snap = await db.collection("shareholders").get();
    snap.docs.forEach(d => {
        console.log(`ID: ${d.id}, Name: "${d.data().name}", Email: ${d.data().email}`);
    });
}

listShareholders();
