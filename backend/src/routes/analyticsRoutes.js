import { Router } from "express";
import {
	departmentComparison,
	extendedDepartmentComparison,
	institutionalOverview,
	riskStudents,
	sectionComparison,
	studentComparison
} from "../controllers/analyticsController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/overview", protect, authorize("admin", "hod", "faculty"), institutionalOverview);
router.get("/department-comparison", protect, authorize("admin", "hod"), departmentComparison);
router.get("/department-comparison-extended", protect, authorize("admin", "hod", "faculty"), extendedDepartmentComparison);
router.get("/risk-students", protect, authorize("admin", "hod", "faculty"), riskStudents);
router.get("/student-comparison", protect, authorize("admin", "hod", "faculty"), studentComparison);
router.get("/section-comparison", protect, authorize("admin", "hod", "faculty"), sectionComparison);

export default router;
