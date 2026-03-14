import mongoose from "mongoose";

const markSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    subjectCode: { type: String, required: true, uppercase: true },
    subjectName: { type: String, required: true },
    semester: { type: Number, required: true },
    academicYear: { type: String, required: true },
    internal: { type: Number, default: 0 },
    external: { type: Number, default: 0 },
    total: { type: Number, required: true },
    grade: { type: String, default: "" },
    credits: { type: Number, default: 0 },
    passed: { type: Boolean, default: true },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

markSchema.index({ student: 1, subjectCode: 1, semester: 1, academicYear: 1 }, { unique: true });

export default mongoose.model("Mark", markSchema);
