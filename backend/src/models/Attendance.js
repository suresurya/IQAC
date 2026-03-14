import mongoose from "mongoose";

const subjectAttendanceSchema = new mongoose.Schema(
  {
    subjectCode: { type: String, required: true, uppercase: true, trim: true },
    subjectName: { type: String, required: true, trim: true },
    classesConducted: { type: Number, required: true },
    classesAttended: { type: Number, required: true },
    percentage: { type: Number, required: true }
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    semester: { type: Number, required: true },
    academicYear: { type: String, required: true },
    totalClasses: { type: Number, required: true },
    attendedClasses: { type: Number, required: true },
    percentage: { type: Number, required: true },
    subjects: [subjectAttendanceSchema],
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, semester: 1, academicYear: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
