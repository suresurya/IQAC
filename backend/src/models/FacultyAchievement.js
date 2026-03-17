import mongoose from "mongoose";
import { mainDB } from "../config/db.js";

const facultyAchievementSchema = new mongoose.Schema(
  {
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["Publication", "Patent", "Conference", "Workshop", "Award", "Grant"],
      required: true
    },
    level: { type: String, enum: ["College", "State", "National", "International"], required: true },
    date: { type: Date, required: true }
  },
  { timestamps: true }
);

facultyAchievementSchema.index({ department: 1 });

export default mainDB.model("FacultyAchievement", facultyAchievementSchema);
