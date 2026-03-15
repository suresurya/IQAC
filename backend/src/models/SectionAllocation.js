import mongoose from "mongoose";
import { mainDB } from "../config/db.js";

const sectionAllocationSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    section: { type: String, required: true, uppercase: true, trim: true },
    semester: { type: Number, required: true },
    subject: { type: String, required: true, trim: true },
    facultyId: { type: String, required: true, uppercase: true, trim: true },
    facultyUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    academicYear: { type: String, default: "" }
  },
  { timestamps: true }
);

sectionAllocationSchema.index(
  { department: 1, section: 1, semester: 1, subject: 1, facultyId: 1 },
  { unique: true }
);

export default mainDB.model("SectionAllocation", sectionAllocationSchema);
