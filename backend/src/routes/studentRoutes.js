import { Router } from "express";
import {
  addSemesterMetric,
  createStudent,
  getStudentActivities,
  getStudentAnnouncements,
  getStudentAttendance,
  getStudentDashboard,
  getStudentMarks,
  getStudentProfile,
  listStudents
} from "../controllers/studentController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", protect, authorize("admin", "hod"), createStudent);
router.get("/", protect, authorize("admin", "hod", "faculty"), listStudents);
router.get("/:studentId/profile", protect, authorize("admin", "hod", "faculty", "student"), getStudentProfile);
router.get("/:studentId/attendance", protect, authorize("admin", "hod", "faculty", "student"), getStudentAttendance);
router.get("/:studentId/marks", protect, authorize("admin", "hod", "faculty", "student"), getStudentMarks);
router.get("/:studentId/activities", protect, authorize("admin", "hod", "faculty", "student"), getStudentActivities);
router.get("/:studentId/announcements", protect, authorize("admin", "hod", "faculty", "student"), getStudentAnnouncements);
router.get("/:studentId/dashboard", protect, authorize("admin", "hod", "faculty", "student"), getStudentDashboard);
router.post("/:studentId/metrics", protect, authorize("admin", "hod", "faculty"), addSemesterMetric);

export default router;
