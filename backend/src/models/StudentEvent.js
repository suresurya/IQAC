import mongoose from "mongoose";
import { mainDB } from "../config/db.js";

const studentEventSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    eventName: { type: String, required: true },
    eventType: {
      type: String,
      enum: ["Workshop", "Seminar", "Hackathon", "Sports", "Cultural", "Technical"],
      required: true
    },
    level: {
      type: String,
      enum: ["Institute", "State", "National", "International"],
      required: true
    },
    participationType: {
      type: String,
      enum: ["Participant", "Organizer", "Winner"],
      required: true
    },
    date: { type: Date, required: true },
    academicYear: { type: String, required: true },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

studentEventSchema.index({ department: 1, academicYear: 1 });
studentEventSchema.index({ student: 1 });

export default mainDB.model("StudentEvent", studentEventSchema);
