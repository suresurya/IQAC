import mongoose from "mongoose";

const studentActivitySchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    semester: { type: Number, required: true },
    category: {
      type: String,
      enum: ["Hackathon", "Workshop", "Technical Event", "Club Participation"],
      required: true
    },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    date: { type: Date, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("StudentActivity", studentActivitySchema);
