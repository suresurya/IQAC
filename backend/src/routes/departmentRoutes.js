import { Router } from "express";
import {
  addAchievement,
  addPlacement,
  createDepartment,
  departmentAnalytics,
  getDepartmentAchievements,
  getDepartmentFaculty,
  getHodDepartmentDashboard,
  getMyHodDepartmentDashboard,
  getDepartmentOverview,
  getDepartmentPerformanceAnalytics,
  getDepartmentStudents,
  getRiskStudents,
  getSectionAnalysis,
  listDepartments
} from "../controllers/departmentController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/", protect, authorize("admin"), createDepartment);
router.get("/", protect, authorize("admin", "hod", "faculty"), listDepartments);
router.get("/me/hod-dashboard", protect, authorize("admin", "hod"), getMyHodDepartmentDashboard);
router.get("/:departmentId/analytics", protect, authorize("admin", "hod", "faculty"), departmentAnalytics);
router.get("/:departmentId/hod-dashboard", protect, authorize("admin", "hod"), getHodDepartmentDashboard);
router.get("/:departmentId/overview", protect, authorize("admin", "hod"), getDepartmentOverview);
router.get("/:departmentId/students", protect, authorize("admin", "hod"), getDepartmentStudents);
router.get("/:departmentId/sections", protect, authorize("admin", "hod"), getSectionAnalysis);
router.get("/:departmentId/faculty", protect, authorize("admin", "hod"), getDepartmentFaculty);
router.get("/:departmentId/achievements", protect, authorize("admin", "hod"), getDepartmentAchievements);
router.get("/:departmentId/risk-students", protect, authorize("admin", "hod"), getRiskStudents);
router.get("/:departmentId/performance-analytics", protect, authorize("admin", "hod"), getDepartmentPerformanceAnalytics);
router.post("/:departmentId/placement", protect, authorize("admin", "hod"), addPlacement);
router.post("/:departmentId/achievement", protect, authorize("admin", "hod", "faculty"), addAchievement);

export default router;
