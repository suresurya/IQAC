import { Router } from "express";
import {
	departmentComparison,
	extendedDepartmentComparison,
	institutionalOverview,
	riskStudents,
	sectionComparison,
	studentComparison,
	subjectPassAnalytics,
	achievementAnalytics,
	studentParticipationAnalytics,
	publicStats
} from "../controllers/analyticsController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

// Public (no auth)
router.get("/public-stats", publicStats);

// Protected analytics
router.get("/overview", protect, authorize("admin", "hod", "faculty"), institutionalOverview);
router.get("/department-comparison", protect, authorize("admin", "hod"), departmentComparison);
router.get("/department-comparison-extended", protect, authorize("admin", "hod", "faculty"), extendedDepartmentComparison);
router.get("/risk-students", protect, authorize("admin", "hod", "faculty"), riskStudents);
router.get("/student-comparison", protect, authorize("admin", "hod", "faculty"), studentComparison);
router.get("/section-comparison", protect, authorize("admin", "hod", "faculty"), sectionComparison);

router.get("/subject-pass", protect, authorize("admin", "hod", "faculty"), subjectPassAnalytics);
router.get("/achievements", protect, authorize("admin", "hod", "faculty"), achievementAnalytics);
router.get("/student-participation", protect, authorize("admin", "hod", "faculty"), studentParticipationAnalytics);

export default router;
