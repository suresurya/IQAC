import Student from "../models/Student.js";
import Department from "../models/Department.js";
import Attendance from "../models/Attendance.js";
import Mark from "../models/Mark.js";
import StudentActivity from "../models/StudentActivity.js";
import Announcement from "../models/Announcement.js";
import User from "../models/User.js";
import { evaluateRisk } from "../utils/riskEngine.js";

const ensureStudentAccess = (req, student) => {
  if (req.user.role !== "student") return true;
  return String(req.user.studentProfile) === String(student._id);
};

const gradePointFromGrade = (grade) => {
  const map = { O: 10, "A+": 9, A: 8, "B+": 7, B: 6, C: 5, F: 0 };
  return map[grade] ?? 0;
};

export const createStudent = async (req, res) => {
  const payload = req.body;

  const department = await Department.findById(payload.department);
  if (!department) {
    return res.status(404).json({ success: false, message: "Department not found" });
  }

  const student = await Student.create(payload);
  return res.status(201).json({ success: true, data: student });
};

export const listStudents = async (req, res) => {
  const { department, section, academicYear, semester, riskLevel, search } = req.query;

  const filter = {};
  if (department) filter.department = department;
  if (section) filter.section = String(section).toUpperCase();
  if (riskLevel) filter.riskLevel = riskLevel;
  if (search) filter.$or = [{ name: { $regex: search, $options: "i" } }, { rollNo: { $regex: search, $options: "i" } }];

  const students = await Student.find(filter).populate("department", "name code").sort({ createdAt: -1 });

  const enriched = students.filter((student) => {
    if (!academicYear && !semester) return true;
    return student.metrics.some((m) => {
      if (academicYear && m.academicYear !== academicYear) return false;
      if (semester && m.semester !== Number(semester)) return false;
      return true;
    });
  });

  return res.status(200).json({ success: true, data: enriched });
};

export const addSemesterMetric = async (req, res) => {
  const { studentId } = req.params;
  const { semester, academicYear, sgpa, cgpa, backlogCount, attendancePercent } = req.body;

  const student = await Student.findById(studentId);
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  const previous = student.metrics.find((m) => m.semester === semester - 1);
  const riskLevel = evaluateRisk({
    attendancePercent,
    backlogCount,
    cgpa,
    previousCgpa: previous?.cgpa
  });

  student.metrics.push({ semester, academicYear, sgpa, cgpa, backlogCount, attendancePercent });
  student.currentSemester = Math.max(student.currentSemester, semester);
  student.riskLevel = riskLevel;
  await student.save();

  return res.status(200).json({ success: true, data: student });
};

export const getStudentDashboard = async (req, res) => {
  const { studentId } = req.params;

  const student = await Student.findById(studentId).populate("department", "name code");
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  if (!ensureStudentAccess(req, student)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const attendance = await Attendance.find({ student: studentId }).sort({ semester: 1 });
  const marks = await Mark.find({ student: studentId }).sort({ semester: 1 });
  const activities = await StudentActivity.find({ student: studentId }).sort({ date: -1 });
  const announcements = await Announcement.find({
    active: true,
    audienceRoles: { $in: ["student"] },
    $or: [{ department: student.department?._id }, { department: null }, { department: { $exists: false } }]
  })
    .sort({ publishedOn: -1 })
    .limit(20);

  const latestMetric = student.metrics.at(-1) || {};
  const currentSemester = Number(req.query.semester || student.currentSemester);
  const semesterMarks = marks.filter((m) => m.semester === currentSemester);
  const semesterAttendance = attendance.find((a) => a.semester === currentSemester);

  const totalCredits = marks.reduce((sum, m) => sum + Number(m.credits || 0), 0);
  const currentCredits = semesterMarks.reduce((sum, m) => sum + Number(m.credits || 0), 0);
  const requiredCredits = 160;
  const gpaNumerator = semesterMarks.reduce((sum, m) => sum + gradePointFromGrade(m.grade) * Number(m.credits || 0), 0);
  const gpaDenominator = semesterMarks.reduce((sum, m) => sum + Number(m.credits || 0), 0);
  const semesterGpa = gpaDenominator ? Number((gpaNumerator / gpaDenominator).toFixed(2)) : 0;

  const overview = {
    studentName: student.name,
    rollNumber: student.rollNo,
    department: student.department?.name,
    semester: currentSemester,
    currentCgpa: latestMetric.cgpa || 0,
    attendancePercentage: semesterAttendance?.percentage || latestMetric.attendancePercent || 0,
    backlogCount: latestMetric.backlogCount || 0,
    riskLevel: student.riskLevel
  };

  const recommendation =
    student.riskLevel === "HIGH"
      ? "Immediate mentoring recommended: focus on attendance recovery, subject remedial sessions, and weekly progress reviews."
      : student.riskLevel === "MEDIUM"
        ? "Track closely with bi-weekly faculty reviews and improve consistency in attendance and internal marks."
        : "Maintain current academic momentum with advanced learning goals and placement-focused preparation.";

  const semesterPerformance = student.metrics.map((m) => ({
    semester: m.semester,
    sgpa: m.sgpa,
    cgpa: m.cgpa,
    attendancePercent: m.attendancePercent,
    backlogCount: m.backlogCount
  }));

  return res.status(200).json({
    success: true,
    data: {
      student,
      overview,
      cgpaTrend: student.metrics.map((m) => ({ semester: m.semester, cgpa: m.cgpa })),
      semesterPerformance,
      attendance,
      attendanceBySubject: semesterAttendance?.subjects || [],
      marks,
      semesterMarks,
      internalMarks: semesterMarks.map((m) => ({
        subjectCode: m.subjectCode,
        subjectName: m.subjectName,
        internal: m.internal,
        passed: m.internal >= 16
      })),
      credits: {
        totalCompleted: totalCredits,
        currentSemester: currentCredits,
        requiredForGraduation: requiredCredits
      },
      semesterGpa,
      feeDetails: student.feeDetails || {
        totalFee: 0,
        paidAmount: 0,
        pendingAmount: 0,
        paymentStatus: "PENDING"
      },
      activities,
      announcements,
      personalDetails: {
        name: student.name,
        rollNo: student.rollNo,
        department: student.department?.name,
        email: student.email,
        phone: student.phone || "",
        address: student.address || ""
      },
      backlogBySemester: student.metrics.map((m) => ({ semester: m.semester, backlogCount: m.backlogCount })),
      riskLevel: student.riskLevel,
      recommendation
    }
  });
};

const resolveStudentFromUser = async (user) => {
  if (!user) return null;

  if (user.studentProfile) {
    const byProfile = await Student.findById(user.studentProfile).populate("department", "name code");
    if (byProfile) return byProfile;
  }

  let byRegistration = null;
  if (user.registrationNumber) {
    byRegistration = await Student.findOne({ rollNo: String(user.registrationNumber).toUpperCase() }).populate("department", "name code");
  }

  const byEmail = byRegistration
    ? null
    : await Student.findOne({ email: String(user.email || "").toLowerCase() }).populate("department", "name code");

  const student = byRegistration || byEmail;
  if (student) {
    await User.findByIdAndUpdate(user._id, { $set: { studentProfile: student._id } });
    return student;
  }

  const normalizedRole = String(user.role || "").toLowerCase() === "department" ? "hod" : String(user.role || "").toLowerCase();
  if (normalizedRole !== "student") return null;

  const rollNo = user.registrationNumber
    ? String(user.registrationNumber).toUpperCase()
    : `STU${String(user._id).slice(-6).toUpperCase()}`;

  const year = new Date().getFullYear();
  const created = await Student.create({
    rollNo,
    name: user.name,
    email: String(user.email || "").toLowerCase(),
    department: user.department || undefined,
    currentSemester: 1,
    batch: `${year}-${year + 4}`,
    metrics: [
      {
        semester: 1,
        academicYear: `${year}-${String((year + 1) % 100).padStart(2, "0")}`,
        sgpa: 0,
        cgpa: 0,
        backlogCount: 0,
        attendancePercent: 0
      }
    ],
    riskLevel: "LOW"
  });

  await User.findByIdAndUpdate(user._id, { $set: { studentProfile: created._id } });
  return Student.findById(created._id).populate("department", "name code");
};

export const getMyStudentDashboard = async (req, res) => {
  const student = await resolveStudentFromUser(req.user);
  if (!student) {
    return res.status(404).json({ success: false, message: "Student profile mapping missing for this account." });
  }

  const studentId = student._id;
  const attendance = await Attendance.find({ student: studentId }).sort({ semester: 1 });
  const marks = await Mark.find({ student: studentId }).sort({ semester: 1 });
  const activities = await StudentActivity.find({ student: studentId }).sort({ date: -1 });
  const announcements = await Announcement.find({
    active: true,
    audienceRoles: { $in: ["student"] },
    $or: [{ department: student.department?._id }, { department: null }, { department: { $exists: false } }]
  })
    .sort({ publishedOn: -1 })
    .limit(20);

  const latestMetric = student.metrics.at(-1) || {};
  const currentSemester = Number(req.query.semester || student.currentSemester);
  const semesterMarks = marks.filter((m) => m.semester === currentSemester);
  const semesterAttendance = attendance.find((a) => a.semester === currentSemester);

  const totalCredits = marks.reduce((sum, m) => sum + Number(m.credits || 0), 0);
  const currentCredits = semesterMarks.reduce((sum, m) => sum + Number(m.credits || 0), 0);
  const requiredCredits = 160;
  const gpaNumerator = semesterMarks.reduce((sum, m) => sum + gradePointFromGrade(m.grade) * Number(m.credits || 0), 0);
  const gpaDenominator = semesterMarks.reduce((sum, m) => sum + Number(m.credits || 0), 0);
  const semesterGpa = gpaDenominator ? Number((gpaNumerator / gpaDenominator).toFixed(2)) : 0;

  const overview = {
    studentName: student.name,
    rollNumber: student.rollNo,
    department: student.department?.name,
    semester: currentSemester,
    currentCgpa: latestMetric.cgpa || 0,
    attendancePercentage: semesterAttendance?.percentage || latestMetric.attendancePercent || 0,
    backlogCount: latestMetric.backlogCount || 0,
    riskLevel: student.riskLevel
  };

  const recommendation =
    student.riskLevel === "HIGH"
      ? "Immediate mentoring recommended: focus on attendance recovery, subject remedial sessions, and weekly progress reviews."
      : student.riskLevel === "MEDIUM"
        ? "Track closely with bi-weekly faculty reviews and improve consistency in attendance and internal marks."
        : "Maintain current academic momentum with advanced learning goals and placement-focused preparation.";

  const semesterPerformance = student.metrics.map((m) => ({
    semester: m.semester,
    sgpa: m.sgpa,
    cgpa: m.cgpa,
    attendancePercent: m.attendancePercent,
    backlogCount: m.backlogCount
  }));

  return res.status(200).json({
    success: true,
    data: {
      student,
      overview,
      cgpaTrend: student.metrics.map((m) => ({ semester: m.semester, cgpa: m.cgpa })),
      semesterPerformance,
      attendance,
      attendanceBySubject: semesterAttendance?.subjects || [],
      marks,
      semesterMarks,
      internalMarks: semesterMarks.map((m) => ({
        subjectCode: m.subjectCode,
        subjectName: m.subjectName,
        internal: m.internal,
        passed: m.internal >= 16
      })),
      credits: {
        totalCompleted: totalCredits,
        currentSemester: currentCredits,
        requiredForGraduation: requiredCredits
      },
      semesterGpa,
      feeDetails: student.feeDetails || {
        totalFee: 0,
        paidAmount: 0,
        pendingAmount: 0,
        paymentStatus: "PENDING"
      },
      activities,
      announcements,
      personalDetails: {
        name: student.name,
        rollNo: student.rollNo,
        department: student.department?.name,
        email: student.email,
        phone: student.phone || "",
        address: student.address || ""
      },
      backlogBySemester: student.metrics.map((m) => ({ semester: m.semester, backlogCount: m.backlogCount })),
      riskLevel: student.riskLevel,
      recommendation
    }
  });
};

export const getStudentProfile = async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId).populate("department", "name code");

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  if (!ensureStudentAccess(req, student)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  return res.status(200).json({
    success: true,
    data: {
      name: student.name,
      rollNo: student.rollNo,
      department: student.department?.name,
      semester: student.currentSemester,
      email: student.email,
      phone: student.phone || "",
      address: student.address || "",
      feeDetails: student.feeDetails
    }
  });
};

export const getStudentAttendance = async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);

  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  if (!ensureStudentAccess(req, student)) return res.status(403).json({ success: false, message: "Forbidden" });

  const records = await Attendance.find({ student: studentId }).sort({ semester: -1 });
  return res.status(200).json({ success: true, data: records });
};

export const getStudentMarks = async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);

  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  if (!ensureStudentAccess(req, student)) return res.status(403).json({ success: false, message: "Forbidden" });

  const marks = await Mark.find({ student: studentId }).sort({ semester: -1, subjectCode: 1 });
  return res.status(200).json({ success: true, data: marks });
};

export const getStudentActivities = async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);

  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  if (!ensureStudentAccess(req, student)) return res.status(403).json({ success: false, message: "Forbidden" });

  const items = await StudentActivity.find({ student: studentId }).sort({ date: -1 });
  return res.status(200).json({ success: true, data: items });
};

export const getStudentAnnouncements = async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId).populate("department", "_id");

  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  if (!ensureStudentAccess(req, student)) return res.status(403).json({ success: false, message: "Forbidden" });

  const items = await Announcement.find({
    active: true,
    audienceRoles: { $in: ["student"] },
    $or: [{ department: student.department?._id }, { department: null }, { department: { $exists: false } }]
  }).sort({ publishedOn: -1 });

  return res.status(200).json({ success: true, data: items });
};
