import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// === 1. Prepare Main IQAC Database URI ===
let mainUri = process.env.MONGO_URI;
if (mainUri) {
  if (mainUri.includes("<db_password>")) {
    mainUri = mainUri.replace("<db_password>", encodeURIComponent(process.env.DB_PASSWORD || ""));
  }
  if (mainUri.includes("<db_username>")) {
    mainUri = mainUri.replace("<db_username>", encodeURIComponent(process.env.DB_USERNAME || ""));
  }
} else {
  console.warn("⚠️ MONGO_URI is missing in backend/.env!");
}

// === 2. Prepare Attendance Database URI ===
let attUri = process.env.ATTENDANCE_MONGO_URI;
if (attUri && attUri.includes("<attendance_db_password>")) {
  attUri = attUri.replace("<attendance_db_password>", encodeURIComponent(process.env.ATTENDANCE_DB_PASSWORD || ""));
}

// === 3. Export Top-Level Connections ===
// These references are created immediately which solves the "Cannot read properties" crash
export const mainDB = mainUri 
    ? mongoose.createConnection(mainUri, { maxPoolSize: 50 }) 
    : mongoose.createConnection(); // Fallback empty to avoid undefined crashes on load

export const attendanceDB = attUri 
    ? mongoose.createConnection(attUri, { maxPoolSize: 20 }) 
    : null;

// === 4. Connection Status Logger (called in server.js) ===
export const connectDB = async () => {
    if (mainUri) {
        mainDB.on('connected', () => console.log("✅ Main IQAC MongoDB connected"));
        mainDB.on('error', (err) => console.error("❌ Main DB Error:", err));
    }

    if (attendanceDB) {
        attendanceDB.on('connected', () => console.log("✅ Attendance Patterns MongoDB connected"));
        attendanceDB.on('error', (err) => console.error("❌ Attendance DB Error:", err));
    } else {
        console.warn("⚠️ Secondary ATTENDANCE DB Connection skipped.");
    }
};
