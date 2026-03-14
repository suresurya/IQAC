import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: ["admin", "hod", "faculty", "student"],
      required: true
    },
    registrationNumber: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true
    },
    facultyId: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true
    },
    facultyProfile: {
      designation: { type: String, default: "" },
      qualification: { type: String, default: "" },
      experienceYears: { type: Number, default: 0 },
      phd: { type: Boolean, default: false },
      bio: { type: String, default: "" },
      scholars: [{ type: String }],
      recentPapers: [{ type: String }],
      expertise: [{ type: String }]
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    studentProfile: { type: mongoose.Schema.Types.ObjectId, ref: "Student" }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);
