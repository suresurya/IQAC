import { Router } from "express";
import {
  assignFacultyDepartment,
  assignStudentToSection,
  createDepartment,
  createFaculty,
  createHodCredentials,
  createSection,
  createStudentAccount,
  deleteDepartment,
  listAdminEntities,
  universityAnalytics,
  updateDepartment
} from "../controllers/adminController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect, authorize("admin"));

router.get("/entities", listAdminEntities);
router.get("/analytics", universityAnalytics);

router.post("/departments", createDepartment);
router.put("/departments/:departmentId", updateDepartment);
router.delete("/departments/:departmentId", deleteDepartment);

router.post("/hods", createHodCredentials);
router.post("/faculty", createFaculty);
router.post("/faculty/:facultyUserId/assign-department", assignFacultyDepartment);

router.post("/students", createStudentAccount);
router.post("/sections", createSection);
router.post("/sections/assign-student", assignStudentToSection);

export default router;
