import mongoose from "mongoose";

const semesterMetricSchema = new mongoose.Schema(
  {
    semester: { type: Number, required: true },
    academicYear: { type: String, required: true },
    sgpa: { type: Number, min: 0, max: 10, required: true },
    cgpa: { type: Number, min: 0, max: 10, required: true },
    backlogCount: { type: Number, default: 0 },
    attendancePercent: { type: Number, default: 0 }
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    rollNo: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    section: { type: String, required: true, trim: true, uppercase: true, default: "A" },
    currentSemester: { type: Number, required: true },
    batch: { type: String, required: true },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    feeDetails: {
      totalFee: { type: Number, default: 0 },
      paidAmount: { type: Number, default: 0 },
      pendingAmount: { type: Number, default: 0 },
      paymentStatus: {
        type: String,
        enum: ["PAID", "PARTIAL", "PENDING"],
        default: "PENDING"
      }
    },
    metrics: [semesterMetricSchema],
    riskLevel: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "LOW" }
  },
  { timestamps: true }
);

export default mongoose.model("Student", studentSchema);
