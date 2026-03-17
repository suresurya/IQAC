import mongoose from "mongoose";
import { mainDB } from "../config/db.js";

const accreditationItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, default: "" },
    type: { type: String, enum: ["NAAC", "NBA", "AUDIT"], required: true },
    criterion: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    academicYear: { type: String, required: true },
    evidenceUrl: { type: String, default: "" },
    completed: { type: Boolean, default: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

accreditationItemSchema.index({ type: 1, academicYear: 1 });
accreditationItemSchema.index({ department: 1 });

export default mainDB.model("AccreditationItem", accreditationItemSchema);
