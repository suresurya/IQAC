import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    category: { type: String, enum: ["Event", "Exam", "Placement", "General"], default: "General" },
    publishedOn: { type: Date, default: Date.now },
    audienceRoles: [{ type: String, enum: ["admin", "hod", "faculty", "student"] }],
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("Announcement", announcementSchema);
