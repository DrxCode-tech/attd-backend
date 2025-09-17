/*const express = require("express");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// 🔑 Initialize Firebase with Railway environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Firestore reference
const db = admin.firestore();

const PORT = process.env.PORT || 3000;

// test route
app.get("/", (req, res) => {
  res.send("🚀 Railway + Firebase backend is running!");
});

// write sample data
app.post("/api/add", async (req, res) => {
  try {
    const { name } = req.body;
    await db.collection("users").add({ name });
    res.json({ message: "User added", name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// read sample data
app.get("/api/users", async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
*/


const express = require("express");
const admin = require("firebase-admin");
const app = express();
app.use(express.json());

// ✅ Load service account depending on environment
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Running on Railway (environment variable exists)
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Running locally (fallback to JSON file)
  serviceAccount = require("./serviceAccountKey.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.get("/", (req, res) => {
  res.send("🚀 Firebase backend is running!");
});

// Example POST route
app.post("/adexbackend", (req, res) => {
  res.json({ message: "Data received!", data: req.body });
});

// Railway will set PORT automatically, fallback to 8080 locally
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});