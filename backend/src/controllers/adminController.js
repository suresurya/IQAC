import Department from "../models/Department.js";
import Faculty from "../models/Faculty.js";
import FacultyAchievement from "../models/FacultyAchievement.js";
import Placement from "../models/Placement.js";
import Section from "../models/Section.js";
import Student from "../models/Student.js";
import StudentAchievement from "../models/StudentAchievement.js";
import User from "../models/User.js";

const randomPassword = () => `IQAC@${Math.floor(100000 + Math.random() * 900000)}`;

export const createDepartment = async (req, res) => {
  const department = await Department.create(req.body);
  return res.status(201).json({ success: true, data: department });
};

export const updateDepartment = async (req, res) => {
  const { departmentId } = req.params;
  const department = await Department.findByIdAndUpdate(departmentId, req.body, { new: true });
  if (!department) return res.status(404).json({ success: false, message: "Department not found" });
  return res.status(200).json({ success: true, data: department });
};

export const deleteDepartment = async (req, res) => {
  const { departmentId } = req.params;
  const department = await Department.findByIdAndDelete(departmentId);
  if (!department) return res.status(404).json({ success: false, message: "Department not found" });
  return res.status(200).json({ success: true, message: "Department deleted" });
};

export const createFaculty = async (req, res) => {
  const { name, email, departmentId, designation, contactNumber, researchInterests, password } = req.body;

  const department = await Department.findById(departmentId);
  if (!department) return res.status(404).json({ success: false, message: "Department not found" });

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ success: false, message: "Email already exists" });

  const generatedPassword = password || randomPassword();

  const user = await User.create({
    name,
    email,
    password: generatedPassword,
    role: "faculty",
    department: departmentId,
    facultyId: `FAC-${Date.now().toString().slice(-6)}`
  });

  const faculty = await Faculty.create({
    user: user._id,
    department: departmentId,
    designation: designation || "Assistant Professor",
    contactNumber: contactNumber || "",
    researchInterests: researchInterests || []
  });

  return res.status(201).json({
    success: true,
    data: { user, faculty, temporaryPassword: generatedPassword }
  });
};

export const assignFacultyDepartment = async (req, res) => {
  const { facultyUserId } = req.params;
  const { departmentId } = req.body;

  const [facultyUser, department] = await Promise.all([
    User.findById(facultyUserId),
    Department.findById(departmentId)
  ]);

  if (!facultyUser || facultyUser.role !== "faculty") {
    return res.status(404).json({ success: false, message: "Faculty user not found" });
  }
  if (!department) {
    return res.status(404).json({ success: false, message: "Department not found" });
  }

  facultyUser.department = departmentId;
  await facultyUser.save();

  await Faculty.findOneAndUpdate(
    { user: facultyUserId },
    { department: departmentId },
    { upsert: true, new: true }
  );

  return res.status(200).json({ success: true, message: "Faculty assigned to department" });
};

export const createStudentAccount = async (req, res) => {
  const { name, email, rollNo, departmentId, sectionId, semester, batch, password } = req.body;

  const [department, section] = await Promise.all([
    Department.findById(departmentId),
    sectionId ? Section.findById(sectionId) : Promise.resolve(null)
  ]);

  if (!department) return res.status(404).json({ success: false, message: "Department not found" });
  if (sectionId && !section) return res.status(404).json({ success: false, message: "Section not found" });

  const student = await Student.create({
    name,
    email,
    rollNo,
    department: departmentId,
    section: section ? section.name : "A",
    currentSemester: semester || 1,
    batch: batch || "2025-2029",
    metrics: []
  });

  const generatedPassword = password || randomPassword();
  const user = await User.create({
    name,
    email,
    password: generatedPassword,
    role: "student",
    department: departmentId,
    studentProfile: student._id,
    registrationNumber: rollNo
  });

  if (sectionId) {
    await Section.findByIdAndUpdate(sectionId, { $inc: { totalStudents: 1 } });
  }

  return res.status(201).json({
    success: true,
    data: { student, user, temporaryPassword: generatedPassword }
  });
};

export const createSection = async (req, res) => {
  const { name, code, semester, departmentId, academicYear } = req.body;

  const department = await Department.findById(departmentId);
  if (!department) return res.status(404).json({ success: false, message: "Department not found" });

  const section = await Section.create({
    name: String(name || code || "A").toUpperCase(),
    semester,
    academicYear: academicYear || "2025-26",
    department: departmentId,
    totalStudents: 0
  });

  return res.status(201).json({ success: true, data: section });
};

export const assignStudentToSection = async (req, res) => {
  const { sectionId, studentId } = req.body;

  const [section, student] = await Promise.all([
    Section.findById(sectionId),
    Student.findById(studentId)
  ]);

  if (!section) return res.status(404).json({ success: false, message: "Section not found" });
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });

  student.section = section.name;
  await student.save();

  await Section.findByIdAndUpdate(sectionId, { $inc: { totalStudents: 1 } });

  return res.status(200).json({ success: true, message: "Student assigned to section" });
};

export const universityAnalytics = async (_, res) => {
  const [departments, students, faculties, facultyAchievements, studentAchievements, placements] = await Promise.all([
    Department.find(),
    Student.find(),
    Faculty.find(),
    FacultyAchievement.find(),
    StudentAchievement.find(),
    Placement.find()
  ]);

  const compare = departments.map((department) => {
    const deptStudents = students.filter((s) => String(s.department) === String(department._id));
    const latestMetrics = deptStudents.map((s) => s.metrics.at(-1)).filter(Boolean);

    const passPercent = latestMetrics.length
      ? (latestMetrics.filter((m) => m.backlogCount === 0).length / latestMetrics.length) * 100
      : 0;

    const averageCgpa = latestMetrics.length
      ? latestMetrics.reduce((sum, m) => sum + m.cgpa, 0) / latestMetrics.length
      : 0;

    const facultyAchievementCount = facultyAchievements.filter((a) => String(a.department) === String(department._id)).length;

    const riskDistribution = {
      high: deptStudents.filter((s) => s.riskLevel === "HIGH").length,
      medium: deptStudents.filter((s) => s.riskLevel === "MEDIUM").length,
      low: deptStudents.filter((s) => s.riskLevel === "LOW").length
    };

    return {
      departmentId: department._id,
      departmentName: department.name,
      passPercent: Number(passPercent.toFixed(2)),
      averageCgpa: Number(averageCgpa.toFixed(2)),
      facultyAchievementCount,
      riskDistribution
    };
  });

  return res.status(200).json({
    success: true,
    data: {
      summary: {
        totalDepartments: departments.length,
        totalStudents: students.length,
        totalFaculties: faculties.length,
        totalPlacements: placements.length,
        totalFacultyAchievements: facultyAchievements.length,
        totalStudentAchievements: studentAchievements.length
      },
      departmentComparison: compare
    }
  });
};

export const listAdminEntities = async (_, res) => {
  const [departments, faculties, sectionsRaw, studentsRaw, hodUsers] = await Promise.all([
    Department.find().sort({ name: 1 }),
    Faculty.find().populate("user", "name email").populate("department", "name code"),
    Section.find().populate("department", "name code"),
    Student.find().populate("department", "name code"),
    User.find({ role: "hod" }).populate("department", "name code")
  ]);

  const sections = sectionsRaw.map((section) => {
    const row = section.toObject();
    return {
      ...row,
      code: row.name,
      advisor: null
    };
  });

  const students = studentsRaw.map((student) => {
    const row = student.toObject();
    return {
      ...row,
      section: row.section
    };
  });

  return res.status(200).json({
    success: true,
    data: { departments, faculties, sections, students, hodUsers }
  });
};

export const createHodCredentials = async (req, res) => {
  const { name, email, departmentId, password } = req.body;
  const department = await Department.findById(departmentId);
  if (!department) return res.status(404).json({ success: false, message: "Department not found" });

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ success: false, message: "Email already exists" });

  const rawPassword = password || randomPassword();
  const user = await User.create({
    name,
    email,
    password: rawPassword,
    role: "hod",
    department: departmentId
  });

  department.hod = user._id;
  await department.save();

  return res.status(201).json({
    success: true,
    data: { user, temporaryPassword: rawPassword }
  });
};
