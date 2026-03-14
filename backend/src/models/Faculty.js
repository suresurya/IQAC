import mongoose from "mongoose";

const facultySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    designation: { type: String, default: "Assistant Professor", trim: true },
    contactNumber: { type: String, default: "" },
    researchInterests: [{ type: String, trim: true }],
    sections: [{ type: mongoose.Schema.Types.ObjectId, ref: "Section" }]
  },
  { timestamps: true }
);

export default mongoose.model("Faculty", facultySchema);
