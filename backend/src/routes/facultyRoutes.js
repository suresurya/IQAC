import { Router } from "express";
import {
	addFaculty,
	addResearch,
	addTeachingAssignment,
	addStudentEvent,
	bulkUploadSectionMarks,
	getFacultyDashboardAnalytics,
	getAllFaculty,
	getFacultyById,
	getFacultyPortal,
	getSectionStudents,
	upsertSectionAllocation,
	updateFaculty,
	updateFacultyProfile,
	uploadAttendance,
	uploadMarks
} from "../controllers/facultyController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/add", protect, authorize("admin"), addFaculty);
router.get("/", protect, authorize("admin", "hod", "faculty"), getAllFaculty);
router.put("/update", protect, authorize("admin", "hod"), updateFaculty);
router.post("/allocations", protect, authorize("admin", "hod"), upsertSectionAllocation);

router.post("/students/:studentId/marks", protect, authorize("faculty", "hod", "admin"), uploadMarks);
router.post("/students/:studentId/attendance", protect, authorize("faculty", "hod", "admin"), uploadAttendance);
router.post("/students/:studentId/event", protect, authorize("faculty", "hod", "admin"), addStudentEvent);
router.post("/research", protect, authorize("faculty", "hod", "admin"), addResearch);
router.get("/portal", protect, authorize("faculty", "hod", "admin"), getFacultyPortal);
router.get("/dashboard-analytics", protect, authorize("faculty", "hod", "admin"), getFacultyDashboardAnalytics);
router.put("/profile", protect, authorize("faculty", "hod", "admin"), updateFacultyProfile);
router.post("/assignments", protect, authorize("faculty", "hod", "admin"), addTeachingAssignment);
router.get("/sections/:section/students", protect, authorize("faculty", "hod", "admin"), getSectionStudents);
router.post("/sections/:section/marks/bulk", protect, authorize("faculty", "hod", "admin"), bulkUploadSectionMarks);
router.get("/:id", protect, authorize("admin", "hod", "faculty"), getFacultyById);

export default router;
