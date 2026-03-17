import mongoose from "mongoose";
import { mainDB } from "../config/db.js";

const researchSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    publicationType: {
      type: String,
      enum: ["Journal", "Conference", "Patent", "Book Chapter"],
      required: true
    },
    journalOrConference: { type: String, default: "" },
    publishedOn: { type: Date, required: true },
    accreditationCriteria: { type: String, default: "NAAC-C3" }
  },
  { timestamps: true }
);

researchSchema.index({ department: 1 });
researchSchema.index({ faculty: 1 });
researchSchema.index({ department: 1, publishedOn: -1 });

export default mainDB.model("Research", researchSchema);
