const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const admin = require('firebase-admin');

const PORT = process.env.PORT || 8080;

// ✅ Load Firebase credentials
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(morgan('dev'));
app.use(express.json());
app.use(cors());

// Levels for UNIUYO
const levelArr = ['100', '200', '300', '400', '500'];

// 🔹 Fetch course dates
app.post('/serverCourse', async (req, res) => {
  try {
    const { course } = req.body;
    if (!course) {
      return res.status(400).json({ message: "Course not provided!" });
    }

    const dateSnapshot = await db.collection(course).listDocuments();

    if (!dateSnapshot || dateSnapshot.length === 0) {
      return res.status(404).json({ message: "No dates found!" });
    }

    const dateArr = dateSnapshot.map(doc => doc.id);
    res.status(200).json({ dateArr });
  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 🔹 Attendance report
app.post('/server', async (req, res) => {
  try {
    const { course, reg, dept } = req.body;
    if (!course || !reg || !dept) {
      return res.status(400).json({ message: 'Enter course, reg, and dept!' });
    }

    // Helper to fetch student name if missing
    async function fetchName() {
      for (const level of levelArr) {
        const stud = await db.collection('UNIUYO').doc(level).collection(dept).doc(reg).get();
        if (stud.exists) return stud.data().name;
      }
      return null;
    }

    const DB = db.collection(course);
    const arrDB = await DB.listDocuments();
    const dates = arrDB.map(arr => arr.id);

    if (!dates.length) {
      return res.status(400).send({ message: `No dates found under course ${course}` });
    }

    let numberTimesPresent = 0;
    let student;

    for (const date of dates) {
      student = await db.collection(course).doc(date).collection(dept).doc(reg).get();
      if (student.exists) numberTimesPresent++;
    }
    //would be cool to build ;
    let name = student?.data()?.name || await fetchName();

    const pertComing = (numberTimesPresent / dates.length) * 100;
    const reportdata = { dates, numberTimesPresent, pertComing, name };

    res.status(200).send({ reportdata });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send({ message: 'Server error', error: err.message });
  }
});

// 🔹 Start server
app.listen(PORT, () => {
  console.log(`✅ Server now running on http://localhost:${PORT}`);
});