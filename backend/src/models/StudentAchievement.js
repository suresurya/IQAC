import mongoose from "mongoose";

const studentAchievementSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    eventName: { type: String, required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["Hackathon", "Research", "Project Competition", "Sports", "Cultural"],
      required: true
    },
    level: { type: String, enum: ["College", "State", "National", "International"], required: true },
    date: { type: Date, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("StudentAchievement", studentAchievementSchema);
