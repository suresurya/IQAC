import mongoose from "mongoose";

const teachingAssignmentSchema = new mongoose.Schema(
  {
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    semester: { type: Number, required: true },
    academicYear: { type: String, required: true },
    section: { type: String, required: true, uppercase: true, trim: true },
    subjectCode: { type: String, required: true, uppercase: true, trim: true },
    subjectName: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

teachingAssignmentSchema.index(
  { faculty: 1, semester: 1, academicYear: 1, section: 1, subjectCode: 1 },
  { unique: true }
);

export default mongoose.model("TeachingAssignment", teachingAssignmentSchema);
