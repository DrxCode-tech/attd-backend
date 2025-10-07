// ========================
// 📌 Imports & Setup
// ========================
const express = require('express');
const { MongoClient } = require("mongodb");
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const admin = require('firebase-admin');

// Load environment variables first
dotenv.config();

const PORT = process.env.PORT || 8080;

// ========================
// 📌 Firebase Setup
// ========================
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const fdb = admin.firestore(); // Firebase Firestore reference

// ========================
// 📌 MongoDB Setup
// ========================
const client = new MongoClient(process.env.MONGO_URI);
let mdb;

async function initDB() {
  try {
    await client.connect();
    mdb = client.db("analytics");
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1); // Exit if DB fails
  }
}
initDB();

// ========================
// 📌 Express App Setup
// ========================
const app = express();
app.use(morgan('dev'));
app.use(express.json());
app.use(cors());

// ========================
// 📌 Routes
// ========================

// 1️⃣ Page View Tracking (MongoDB)
app.post("/track", async (req, res) => {
  try {
    const { date, count } = req.body;
    if (!date || !count) {
      return res.status(400).json({ error: "Missing date or count" });
    }

    const metrics = mdb.collection("pageViews");

    // Atomic safe increment
    const result = await metrics.updateOne(
      { date },
      { $inc: { sum: count } },
      { upsert: true }
    );

    return res.json({ success: true, message: "Page view updated", result });
  } catch (err) {
    console.error("❌ Error updating page views:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// 2️⃣ Fetch Course Dates (Firebase)
app.post('/serverCourse', async (req, res) => {
  try {
    const { course } = req.body;
    if (!course) {
      return res.status(400).json({ message: "Course not provided!" });
    }

    const dateSnapshot = await fdb.collection(course).listDocuments();
    if (!dateSnapshot || dateSnapshot.length === 0) {
      return res.status(404).json({ message: "No dates found!" });
    }

    const dateArr = dateSnapshot.map(doc => doc.id);
    return res.status(200).json({ dateArr });
  } catch (err) {
    console.error("❌ Server error:", err.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// 3️⃣ Attendance Report (Firebase)

app.post('/server', async (req, res) => {
  try {
    const { course, reg, dept } = req.body;
    if (!course || !reg || !dept) {
      return res.status(400).json({ message: 'Enter course, reg, and dept!' });
    }

    // Helper: fetch student name if missing
    async function fetchName() {
      const level = reg.split('-')[0];
      const stud = await fdb.collection('UNIUYO').doc(level).collection(dept).doc(reg).get();
      if (stud.exists) return stud.data().name;
      return null;
    }

    const DB = fdb.collection(course);
    const arrDB = await DB.listDocuments();
    const dates = arrDB.map(arr => arr.id);

    if (!dates.length) {
      return res.status(404).json({ message: `No dates found under course ${course}` });
    }

    let numberTimesPresent = 0;
    let student;

    for (const date of dates) {
      student = await fdb.collection(course).doc(date).collection(dept).doc(reg).get();
      if (student.exists) numberTimesPresent++;
    }

    let name = student?.data()?.name || await fetchName();
    const pertComing = (numberTimesPresent / dates.length) * 100;

    const reportdata = { dates, numberTimesPresent, pertComing, name };

    return res.status(200).json({ reportdata });
  } catch (err) {
    console.error("❌ Server error:", err.message);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ========================
// 📌 Start Server
// ========================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
