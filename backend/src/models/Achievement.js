import mongoose from "mongoose";
import { mainDB } from "../config/db.js";

const achievementSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["Faculty", "Student", "Department"],
      required: true
    },
    level: { type: String, enum: ["Institute", "State", "National", "International"], required: true },
    date: { type: Date, required: true },
    accreditationCriteria: { type: String, default: "NAAC-C5" }
  },
  { timestamps: true }
);

achievementSchema.index({ department: 1, category: 1, level: 1 });
achievementSchema.index({ accreditationCriteria: 1 });

export default mainDB.model("Achievement", achievementSchema);
