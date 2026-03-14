import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    name: { type: String, required: true, uppercase: true, trim: true },
    semester: { type: Number, required: true },
    academicYear: { type: String, required: true },
    totalStudents: { type: Number, default: 0 }
  },
  { timestamps: true }
);

sectionSchema.index({ department: 1, name: 1, semester: 1, academicYear: 1 }, { unique: true });

export default mongoose.model("Section", sectionSchema);
