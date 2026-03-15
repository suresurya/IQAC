import mongoose from "mongoose";

const facultySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    name: { type: String, required: true, trim: true },
    employeeId: { type: String, required: true, trim: true, uppercase: true, unique: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    username: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: "", trim: true },
    designation: { type: String, default: "Assistant Professor", trim: true },
    qualification: { type: String, default: "", trim: true },
    experience: { type: Number, default: 0, min: 0 },
    contactNumber: { type: String, default: "" },
    officeLocation: { type: String, default: "", trim: true },
    joiningDate: { type: Date },
    profilePhoto: { type: String, default: "" },
    researchInterests: [{ type: String, trim: true }],
    sections: [{ type: String, trim: true, uppercase: true }],
    subjects: [
      {
        subjectName: { type: String, trim: true, required: true },
        semester: { type: Number, min: 1, max: 12, required: true }
      }
    ],
    researchArea: { type: String, default: "", trim: true },
    publications: { type: Number, default: 0, min: 0 },
    googleScholarLink: { type: String, default: "", trim: true },
    orcidId: { type: String, default: "", trim: true },
    achievements: [{ type: String, trim: true }],
    awards: [{ type: String, trim: true }],
    patents: [{ type: String, trim: true }],
    conferenceParticipation: [{ type: String, trim: true }]
  },
  { timestamps: true }
);

export default mongoose.model("Faculty", facultySchema);
