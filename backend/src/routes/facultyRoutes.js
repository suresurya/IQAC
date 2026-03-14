import { Router } from "express";
import {
	addResearch,
	addTeachingAssignment,
	bulkUploadSectionMarks,
	getFacultyPortal,
	getSectionStudents,
	updateFacultyProfile,
	uploadAttendance,
	uploadMarks
} from "../controllers/facultyController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/students/:studentId/marks", protect, authorize("faculty", "hod", "admin"), uploadMarks);
router.post("/students/:studentId/attendance", protect, authorize("faculty", "hod", "admin"), uploadAttendance);
router.post("/research", protect, authorize("faculty", "hod", "admin"), addResearch);
router.get("/portal", protect, authorize("faculty", "hod", "admin"), getFacultyPortal);
router.put("/profile", protect, authorize("faculty", "hod", "admin"), updateFacultyProfile);
router.post("/assignments", protect, authorize("faculty", "hod", "admin"), addTeachingAssignment);
router.get("/sections/:section/students", protect, authorize("faculty", "hod", "admin"), getSectionStudents);
router.post("/sections/:section/marks/bulk", protect, authorize("faculty", "hod", "admin"), bulkUploadSectionMarks);

export default router;
