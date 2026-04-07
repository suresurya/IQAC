import Department from "../models/Department.js";
import Placement from "../models/Placement.js";
import Achievement from "../models/Achievement.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Mark from "../models/Mark.js";
import Research from "../models/Research.js";
import TeachingAssignment from "../models/TeachingAssignment.js";
import Section from "../models/Section.js";
import DepartmentStat from "../models/DepartmentStat.js";
import StudentAchievement from "../models/StudentAchievement.js";
import FacultyAchievement from "../models/FacultyAchievement.js";
import Faculty from "../models/Faculty.js";
import { evaluateRisk } from "../utils/riskEngine.js";

export const createDepartment = async (req, res) => {
  const department = await Department.create(req.body);
  return res.status(201).json({ success: true, data: department });
};

const latestMetric = (student) => student.metrics?.at(-1) || {};

const riskCheck = (metric) => {
  if (!metric) return false;
  return Number(metric.cgpa || 0) < 6 || Number(metric.attendancePercent || 0) < 75 || Number(metric.backlogCount || 0) > 2;
};

const sectionIndicator = ({ avgCgpa, passPercent, backlogRate }) => {
  const score = avgCgpa * 10 * 0.45 + passPercent * 0.4 + (100 - backlogRate) * 0.15;
  if (score >= 75) return "GREEN";
  if (score >= 55) return "YELLOW";
  return "RED";
};

export const listDepartments = async (_, res) => {
  const departments = await Department.find().populate("hod", "name email").sort({ name: 1 });
  return res.status(200).json({ success: true, data: departments });
};

export const addPlacement = async (req, res) => {
  const { departmentId } = req.params;
  const payload = { ...req.body, department: departmentId, enteredBy: req.user._id };

  const placement = await Placement.findOneAndUpdate(
    { department: departmentId, academicYear: req.body.academicYear },
    payload,
    { new: true, upsert: true }
  );

  return res.status(200).json({ success: true, data: placement });
};

export const addAchievement = async (req, res) => {
  const { departmentId } = req.params;
  const achievement = await Achievement.create({ ...req.body, department: departmentId });

  return res.status(201).json({ success: true, data: achievement });
};

export const departmentAnalytics = async (req, res) => {
  const { departmentId } = req.params;

  const students = await Student.find({ department: departmentId });
  const placements = await Placement.find({ department: departmentId });
  const achievements = await Achievement.find({ department: departmentId });

  const latestMetrics = students.map((s) => s.metrics.at(-1)).filter(Boolean);

  const avgCgpa = latestMetrics.length
    ? latestMetrics.reduce((sum, m) => sum + m.cgpa, 0) / latestMetrics.length
    : 0;

  const passPercent = latestMetrics.length
    ? (latestMetrics.filter((m) => m.backlogCount === 0).length / latestMetrics.length) * 100
    : 0;

  const backlogRate = latestMetrics.length
    ? (latestMetrics.filter((m) => m.backlogCount > 0).length / latestMetrics.length) * 100
    : 0;

  const placementRate = placements.length
    ? placements.reduce((sum, p) => sum + (p.totalEligible ? p.totalPlaced / p.totalEligible : 0), 0) * 100 / placements.length
    : 0;

  return res.status(200).json({
    success: true,
    data: {
      studentCount: students.length,
      passPercent: Number(passPercent.toFixed(2)),
      averageCgpa: Number(avgCgpa.toFixed(2)),
      backlogRate: Number(backlogRate.toFixed(2)),
      placementRate: Number(placementRate.toFixed(2)),
      achievements: achievements.length
    }
  });
};

export const getDepartmentOverview = async (req, res) => {
  const { departmentId } = req.params;
  const students = await Student.find({ department: departmentId });
  const faculty = await User.find({ department: departmentId, role: { $in: ["faculty", "hod"] } });
  const sections = await Section.find({ department: departmentId });
  const marks = await Mark.find({ student: { $in: students.map((s) => s._id) } });
  const placements = await Placement.find({ department: departmentId });
  const stats = await DepartmentStat.find({ department: departmentId }).sort({ semester: 1 });

  const latestMetrics = students.map(latestMetric).filter(Boolean);
  const avgCgpa = latestMetrics.length
    ? latestMetrics.reduce((sum, m) => sum + Number(m.cgpa || 0), 0) / latestMetrics.length
    : 0;

  const studentsWithBacklogs = latestMetrics.filter((m) => Number(m.backlogCount || 0) > 0).length;
  const studentsAbove9 = latestMetrics.filter((m) => Number(m.cgpa || 0) >= 9).length;
  const phdFaculty = faculty.filter((f) => f.facultyProfile?.phd).length;

  const cgpaDistribution = {
    below6: latestMetrics.filter((m) => Number(m.cgpa || 0) < 6).length,
    between6And7: latestMetrics.filter((m) => Number(m.cgpa || 0) >= 6 && Number(m.cgpa || 0) < 7).length,
    between7And8: latestMetrics.filter((m) => Number(m.cgpa || 0) >= 7 && Number(m.cgpa || 0) < 8).length,
    between8And9: latestMetrics.filter((m) => Number(m.cgpa || 0) >= 8 && Number(m.cgpa || 0) < 9).length,
    above9: latestMetrics.filter((m) => Number(m.cgpa || 0) >= 9).length
  };

  const sectionMap = new Map();
  students.forEach((s) => {
    const key = s.section || "A";
    if (!sectionMap.has(key)) sectionMap.set(key, []);
    sectionMap.get(key).push(s);
  });

  const sectionPerformance = Array.from(sectionMap.entries()).map(([section, list]) => {
    const metrics = list.map(latestMetric).filter(Boolean);
    const sectionAvg = metrics.length
      ? metrics.reduce((sum, m) => sum + Number(m.cgpa || 0), 0) / metrics.length
      : 0;
    const passPercent = metrics.length
      ? (metrics.filter((m) => Number(m.backlogCount || 0) === 0).length / metrics.length) * 100
      : 0;
    const backlogRate = metrics.length
      ? (metrics.filter((m) => Number(m.backlogCount || 0) > 0).length / metrics.length) * 100
      : 0;

    return {
      section,
      studentCount: list.length,
      averageCgpa: Number(sectionAvg.toFixed(2)),
      passPercent: Number(passPercent.toFixed(2)),
      backlogRate: Number(backlogRate.toFixed(2)),
      indicator: sectionIndicator({ avgCgpa: sectionAvg, passPercent, backlogRate })
    };
  });

  const attendanceOverview = Array.from(sectionMap.entries()).map(([section, list]) => {
    const metrics = list.map(latestMetric).filter(Boolean);
    const attendancePercent = metrics.length
      ? metrics.reduce((sum, m) => sum + Number(m.attendancePercent || 0), 0) / metrics.length
      : 0;

    return { section, attendancePercent: Number(attendancePercent.toFixed(2)) };
  });

  const placementSummary = placements.map((p) => ({
    academicYear: p.academicYear,
    placementRate: p.totalEligible ? Number(((p.totalPlaced / p.totalEligible) * 100).toFixed(2)) : 0
  }));

  const backlogTrends = stats.map((s) => ({ semester: s.semester, backlogRate: s.backlogRate }));
  const cgpaPerSemester = stats.map((s) => ({ semester: s.semester, averageCgpa: s.averageCgpa }));

  return res.status(200).json({
    success: true,
    data: {
      cards: {
        totalStudents: students.length,
        totalFaculty: faculty.length,
        numberOfSections: sectionMap.size || sections.length,
        averageDepartmentCgpa: Number(avgCgpa.toFixed(2)),
        studentsWithBacklogs,
        studentsAbove9Cgpa: studentsAbove9,
        facultyWithPhd: phdFaculty
      },
      cgpaDistribution,
      attendanceOverview,
      sectionPerformance,
      performanceAnalytics: {
        cgpaPerSemester,
        placementSummary,
        internshipParticipation: stats.map((s) => ({ semester: s.semester, percent: s.internshipParticipationPercent })),
        backlogTrends,
        marksCount: marks.length
      }
    }
  });
};

export const getDepartmentStudents = async (req, res) => {
  const { departmentId } = req.params;
  const { search = "", section = "", sort = "desc" } = req.query;

  const baseFilter = { department: departmentId };
  if (section) baseFilter.section = String(section).toUpperCase();
  if (search) {
    baseFilter.$or = [
      { name: { $regex: search, $options: "i" } },
      { rollNo: { $regex: search, $options: "i" } }
    ];
  }

  const students = await Student.find(baseFilter).sort({ name: 1 });

  const rows = students
    .map((s) => {
      const metric = latestMetric(s);
      return {
        _id: s._id,
        rollNo: s.rollNo,
        name: s.name,
        section: s.section,
        semester: s.currentSemester,
        cgpa: Number(metric.cgpa || 0),
        attendancePercent: Number(metric.attendancePercent || 0),
        backlogs: Number(metric.backlogCount || 0),
        atRisk: riskCheck(metric)
      };
    })
    .sort((a, b) => (sort === "asc" ? a.cgpa - b.cgpa : b.cgpa - a.cgpa));

  return res.status(200).json({ success: true, data: rows });
};

export const getSectionAnalysis = async (req, res) => {
  const { departmentId } = req.params;
  const students = await Student.find({ department: departmentId });

  const sectionMap = new Map();
  students.forEach((s) => {
    const key = s.section || "A";
    if (!sectionMap.has(key)) sectionMap.set(key, []);
    sectionMap.get(key).push(s);
  });

  const rows = Array.from(sectionMap.entries()).map(([section, list]) => {
    const metrics = list.map(latestMetric).filter(Boolean);
    const avgCgpa = metrics.length
      ? metrics.reduce((sum, m) => sum + Number(m.cgpa || 0), 0) / metrics.length
      : 0;
    const passPercent = metrics.length
      ? (metrics.filter((m) => Number(m.backlogCount || 0) === 0).length / metrics.length) * 100
      : 0;
    const backlogStudents = metrics.filter((m) => Number(m.backlogCount || 0) > 0).length;

    const topPerformers = list
      .map((s) => ({ name: s.name, rollNo: s.rollNo, cgpa: Number(latestMetric(s).cgpa || 0) }))
      .sort((a, b) => b.cgpa - a.cgpa)
      .slice(0, 5);

    return {
      section,
      totalStudents: list.length,
      averageCgpa: Number(avgCgpa.toFixed(2)),
      passPercentage: Number(passPercent.toFixed(2)),
      studentsWithBacklogs: backlogStudents,
      topPerformers,
      indicator: sectionIndicator({
        avgCgpa,
        passPercent,
        backlogRate: list.length ? (backlogStudents / list.length) * 100 : 0
      })
    };
  });

  return res.status(200).json({ success: true, data: rows });
};

export const getDepartmentFaculty = async (req, res) => {
  const { departmentId } = req.params;
  const { designation = "" } = req.query;

  const faculty = await User.find({
    department: departmentId,
    role: { $in: ["faculty", "hod"] }
  }).select("name email role facultyProfile");

  const assignments = await TeachingAssignment.find({ department: departmentId });

  const rows = faculty
    .map((f) => {
      const subjectsHandled = [
        ...new Set(
          assignments
            .filter((a) => String(a.faculty) === String(f._id))
            .map((a) => `${a.subjectCode} (${a.section})`)
        )
      ];

      return {
        _id: f._id,
        name: f.name,
        designation: f.facultyProfile?.designation || (f.role === "hod" ? "HOD" : "Faculty"),
        subjectsHandled,
        experience: Number(f.facultyProfile?.experienceYears || 0),
        qualification: f.facultyProfile?.qualification || "NA",
        phd: !!f.facultyProfile?.phd
      };
    })
    .filter((f) => !designation || f.designation.toLowerCase().includes(String(designation).toLowerCase()));

  return res.status(200).json({ success: true, data: rows });
};

export const getDepartmentAchievements = async (req, res) => {
  const { departmentId } = req.params;

  const facultyAchievements = await FacultyAchievement.find({ department: departmentId })
    .populate("faculty", "name")
    .sort({ date: -1 });

  const studentAchievements = await StudentAchievement.find({ department: departmentId })
    .populate("student", "name rollNo")
    .sort({ date: -1 });

  return res.status(200).json({
    success: true,
    data: {
      facultyAchievements,
      studentAchievements
    }
  });
};

export const getRiskStudents = async (req, res) => {
  const { departmentId } = req.params;
  const students = await Student.find({ department: departmentId });

  const riskRows = students
    .map((s) => {
      const metric = latestMetric(s);
      const cgpa = Number(metric.cgpa || 0);
      const attendancePercent = Number(metric.attendancePercent || 0);
      const backlogCount = Number(metric.backlogCount || 0);

      const isRisk = cgpa < 6 || attendancePercent < 75 || backlogCount > 2;
      return {
        _id: s._id,
        rollNo: s.rollNo,
        name: s.name,
        section: s.section,
        semester: s.currentSemester,
        cgpa,
        attendancePercent,
        backlogs: backlogCount,
        isRisk
      };
    })
    .filter((s) => s.isRisk)
    .sort((a, b) => a.cgpa - b.cgpa);

  return res.status(200).json({ success: true, data: riskRows });
};

export const getDepartmentPerformanceAnalytics = async (req, res) => {
  const { departmentId } = req.params;

  const stats = await DepartmentStat.find({ department: departmentId }).sort({ semester: 1 });
  const placements = await Placement.find({ department: departmentId }).sort({ academicYear: 1 });

  return res.status(200).json({
    success: true,
    data: {
      averageCgpaPerSemester: stats.map((s) => ({ semester: s.semester, averageCgpa: s.averageCgpa })),
      placementStatistics: placements.map((p) => ({
        academicYear: p.academicYear,
        totalEligible: p.totalEligible,
        totalPlaced: p.totalPlaced,
        placementRate: p.totalEligible ? Number(((p.totalPlaced / p.totalEligible) * 100).toFixed(2)) : 0
      })),
      internshipParticipation: stats.map((s) => ({ semester: s.semester, percent: s.internshipParticipationPercent })),
      backlogTrends: stats.map((s) => ({ semester: s.semester, backlogRate: s.backlogRate }))
    }
  });
};

export const getHodDepartmentDashboard = async (req, res) => {
  const { departmentId } = req.params;
  const normalizedRole = req.user?.role === "department" ? "hod" : req.user?.role;

  if (String(normalizedRole) === "hod") {
    let allowed = false;
    let effectiveUserDepartment = req.user?.department;

    if (effectiveUserDepartment && String(effectiveUserDepartment) === String(departmentId)) {
      allowed = true;
    }

    // If mapped department is missing or stale, verify true ownership via Department.hod.
    if (!allowed) {
      const hodOwnedDepartment = await Department.findOne({ _id: departmentId, hod: req.user._id }).select("_id");
      if (hodOwnedDepartment?._id) {
        effectiveUserDepartment = hodOwnedDepartment._id;
        allowed = true;
      }
    }

    // Final fallback: derive mapping heuristically (email/username/faculty row/code tokens).
    if (!allowed) {
      effectiveUserDepartment = await resolveHodDepartmentId(req.user);
      if (effectiveUserDepartment && String(effectiveUserDepartment) === String(departmentId)) {
        allowed = true;
      }
    }

    if (!allowed) {
      return res.status(403).json({ success: false, message: "Access denied for this department" });
    }

    if (effectiveUserDepartment && String(req.user?.department) !== String(effectiveUserDepartment)) {
      req.user.department = effectiveUserDepartment;
      await User.findByIdAndUpdate(req.user._id, { $set: { department: effectiveUserDepartment } });
    }
  }

  const [department, students, faculties, marks, placements, studentAchievements, facultyAchievements] = await Promise.all([
    Department.findById(departmentId).select("name code"),
    Student.find({ department: departmentId }).select("_id name rollNo section currentSemester metrics"),
    Faculty.find({ department: departmentId }).select("name employeeId designation publications patents awards achievements"),
    Mark.find({ department: departmentId }).select("subjectCode subjectName semester total passed"),
    Placement.find({ department: departmentId }).sort({ academicYear: -1 }),
    StudentAchievement.find({ department: departmentId }).populate("student", "name rollNo").sort({ date: -1 }).limit(25),
    FacultyAchievement.find({ department: departmentId }).populate("faculty", "name").sort({ date: -1 }).limit(25)
  ]);

  if (!department) {
    return res.status(404).json({ success: false, message: "Department not found" });
  }

  const latestMetrics = students
    .map((student) => ({ student, metric: student.metrics?.at(-1) || null }))
    .filter((row) => !!row.metric);

  const avgCgpa = latestMetrics.length
    ? latestMetrics.reduce((sum, row) => sum + Number(row.metric.cgpa || 0), 0) / latestMetrics.length
    : 0;

  const passPercentage = latestMetrics.length
    ? (latestMetrics.filter((row) => Number(row.metric.backlogCount || 0) === 0).length / latestMetrics.length) * 100
    : 0;

  const placementRate = placements.length
    ? placements.reduce((sum, row) => sum + (row.totalEligible ? (row.totalPlaced / row.totalEligible) * 100 : 0), 0) / placements.length
    : 0;

  const attendanceBelow75 = latestMetrics.filter((row) => Number(row.metric.attendancePercent || 0) < 75).length;
  const studentsAtRisk = latestMetrics.filter((row) => Number(row.metric.cgpa || 0) < 6 || Number(row.metric.backlogCount || 0) > 0).length;

  const topStudents = latestMetrics
    .map((row) => ({
      studentId: row.student._id,
      name: row.student.name,
      rollNo: row.student.rollNo,
      section: row.student.section || "-",
      cgpa: Number(Number(row.metric.cgpa || 0).toFixed(2))
    }))
    .sort((a, b) => b.cgpa - a.cgpa)
    .slice(0, 10);

  const riskDistribution = latestMetrics.reduce(
    (acc, row) => {
      const metric = row.metric || {};
      const base = {
        attendancePercent: Number(metric.attendancePercent || 0),
        backlogCount: Number(metric.backlogCount || 0),
        cgpa: Number(metric.cgpa || 0),
        previousCgpa: undefined
      };

      const effectiveRisk = row.student.riskLevel || evaluateRisk(base);

      if (effectiveRisk === "HIGH") acc.high += 1;
      else if (effectiveRisk === "MEDIUM") acc.medium += 1;
      else if (effectiveRisk === "LOW") acc.low += 1;

      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );

  const sectionBuckets = new Map();
  latestMetrics.forEach((row) => {
    const key = String(row.student.section || "A").toUpperCase();
    if (!sectionBuckets.has(key)) sectionBuckets.set(key, []);
    sectionBuckets.get(key).push(Number(row.metric.cgpa || 0));
  });

  const sectionPerformance = Array.from(sectionBuckets.entries())
    .map(([section, cgpas]) => ({
      section: `Section ${section}`,
      averageCgpa: Number((cgpas.reduce((sum, value) => sum + value, 0) / (cgpas.length || 1)).toFixed(2))
    }))
    .sort((a, b) => a.section.localeCompare(b.section));

  const sectionAttendanceBuckets = new Map();
  latestMetrics.forEach((row) => {
    const section = `Section ${String(row.student.section || "A").toUpperCase()}`;
    if (!sectionAttendanceBuckets.has(section)) sectionAttendanceBuckets.set(section, []);
    sectionAttendanceBuckets.get(section).push(Number(row.metric.attendancePercent || 0));
  });

  const sectionAttendanceTrends = Array.from(sectionAttendanceBuckets.entries())
    .map(([section, attendanceValues]) => ({
      section,
      attendancePercent: Number(
        (attendanceValues.reduce((sum, value) => sum + value, 0) / (attendanceValues.length || 1)).toFixed(2)
      )
    }))
    .sort((a, b) => a.section.localeCompare(b.section));

  const subjectBuckets = new Map();
  marks.forEach((mark) => {
    const code = String(mark.subjectCode || mark.subjectName || "SUBJECT").toUpperCase();
    if (!subjectBuckets.has(code)) {
      subjectBuckets.set(code, { subject: code, total: 0, passed: 0 });
    }
    const bucket = subjectBuckets.get(code);
    bucket.total += 1;
    if (mark.passed || Number(mark.total || 0) >= 40) bucket.passed += 1;
  });

  const subjectPassPercentage = Array.from(subjectBuckets.values())
    .map((row) => ({
      subject: row.subject,
      passPercentage: row.total ? Number(((row.passed / row.total) * 100).toFixed(2)) : 0
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject))
    .slice(0, 12);

  const backlogBuckets = new Map();
  latestMetrics.forEach((row) => {
    const semester = Number(row.student.currentSemester || row.metric.semester || 0);
    const backlogCount = Number(row.metric.backlogCount || 0);
    backlogBuckets.set(semester, (backlogBuckets.get(semester) || 0) + backlogCount);
  });

  const backlogAnalysis = Array.from(backlogBuckets.entries())
    .map(([semester, backlogCount]) => ({ semester: `Sem ${semester || "-"}`, backlogCount }))
    .sort((a, b) => Number(String(a.semester).replace(/\D/g, "")) - Number(String(b.semester).replace(/\D/g, "")));

  const facultyContributions = faculties.map((faculty) => ({
    name: faculty.name,
    publications: Number(faculty.publications || 0),
    patents: (faculty.patents || []).length,
    awards: (faculty.awards || []).length
  }));

  const designationDistributionBuckets = faculties.reduce((acc, faculty) => {
    const raw = String(faculty.designation || "Assistant Professor").toLowerCase();
    let key = "Assistant Professor";

    if (raw.includes("professor") && !raw.includes("assistant") && !raw.includes("associate")) {
      key = "Professor";
    } else if (raw.includes("associate")) {
      key = "Associate Professor";
    } else if (raw.includes("assistant")) {
      key = "Assistant Professor";
    } else if (raw) {
      key = String(faculty.designation).trim();
    }

    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const designationDistribution = Object.entries(designationDistributionBuckets).map(([designation, count]) => ({
    designation,
    count
  }));

  const totalPublications = faculties.reduce((sum, faculty) => sum + Number(faculty.publications || 0), 0);
  const totalPatents = faculties.reduce((sum, faculty) => sum + (faculty.patents || []).length, 0);
  const totalResearchGrants = facultyAchievements.filter((row) => {
    const category = String(row.category || "").toLowerCase();
    return category === "grant" || category === "research grant";
  }).length;

  const facultyAchievementsPanel = [
    ...faculties.flatMap((faculty) => [
      ...(faculty.awards || []).map((title) => ({
        id: `${faculty._id}-award-${title}`,
        facultyName: faculty.name,
        title,
        category: "Award"
      })),
      ...(faculty.patents || []).map((title) => ({
        id: `${faculty._id}-patent-${title}`,
        facultyName: faculty.name,
        title,
        category: "Patent"
      })),
      ...(faculty.achievements || []).map((title) => ({
        id: `${faculty._id}-achievement-${title}`,
        facultyName: faculty.name,
        title,
        category: "Achievement"
      }))
    ]),
    ...facultyAchievements.map((row) => ({
      id: row._id,
      facultyName: row.faculty?.name || "Faculty",
      title: row.title,
      category: row.category,
      date: row.date
    }))
  ]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 25);

  const facultyList = faculties.map((faculty) => ({
    rowId: faculty._id,
    facultyId: faculty.employeeId || "",
    name: faculty.name,
    designation: faculty.designation || "Assistant Professor",
    publications: Number(faculty.publications || 0),
    patents: (faculty.patents || []).length,
    awards: (faculty.awards || []).length
  }));

  const departmentAchievements = [
    ...studentAchievements.map((row) => ({
      id: row._id,
      type: "Student",
      title: row.title,
      category: row.category,
      person: row.student?.name || "Student",
      date: row.date
    })),
    ...facultyAchievements.map((row) => ({
      id: row._id,
      type: "Faculty",
      title: row.title,
      category: row.category,
      person: row.faculty?.name || "Faculty",
      date: row.date
    }))
  ]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 20);

  return res.status(200).json({
    success: true,
    data: {
      department: { id: department._id, name: department.name, code: department.code },
      overviewCards: {
        totalStudents: students.length,
        averageCgpa: Number(avgCgpa.toFixed(2)),
        passPercentage: Number(passPercentage.toFixed(2)),
        placementRate: Number(placementRate.toFixed(2)),
        totalFaculty: faculties.length,
        studentsAtRisk,
        attendanceBelow75
      },
      topStudents,
      riskDistribution,
      sectionPerformance,
      subjectPassPercentage,
      backlogAnalysis,
      facultyContributions,
      departmentAchievements,
      sectionAttendanceTrends,
      facultyAnalytics: {
        facultyCount: faculties.length,
        designationDistribution,
        researchOutput: {
          publications: totalPublications,
          patents: totalPatents,
          researchGrants: totalResearchGrants
        },
        achievements: facultyAchievementsPanel,
        facultyList
      }
    }
  });
};

const resolveHodDepartmentId = async (user) => {
  if (user?.department) {
    const existingDepartment = await Department.findById(user.department).select("_id");
    if (existingDepartment?._id) {
      return existingDepartment._id;
    }

    // Auto-heal stale department references on legacy users.
    await User.findByIdAndUpdate(user._id, { $unset: { department: 1 } });
  }

  const deptByHod = await Department.findOne({ hod: user._id }).select("_id");
  if (deptByHod?._id) {
    await User.findByIdAndUpdate(user._id, { $set: { department: deptByHod._id } });
    return deptByHod._id;
  }

  const facultyRow = await Faculty.findOne({ user: user._id }).select("department");
  if (facultyRow?.department) {
    const facultyDepartment = await Department.findById(facultyRow.department).select("_id");
    if (facultyDepartment?._id) {
      await User.findByIdAndUpdate(user._id, { $set: { department: facultyDepartment._id } });
      return facultyDepartment._id;
    }
  }

  const codeMatch = String(user?.email || "").match(/^hod\.([a-z0-9]+)/i);
  if (codeMatch?.[1]) {
    const byCode = await Department.findOne({ code: String(codeMatch[1]).toUpperCase() }).select("_id");
    if (byCode?._id) {
      await User.findByIdAndUpdate(user._id, { $set: { department: byCode._id } });
      return byCode._id;
    }
  }

  const tokenSources = [
    String(user?.name || ""),
    String(user?.email || ""),
    String(user?.username || ""),
    String(user?.facultyId || "")
  ].join(" ");

  const tokens = tokenSources
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  if (tokens.length) {
    const departments = await Department.find().select("_id code name");

    const byCodeToken = departments.find((dept) => tokens.includes(String(dept.code || "").toUpperCase()));
    if (byCodeToken?._id) {
      await User.findByIdAndUpdate(user._id, { $set: { department: byCodeToken._id } });
      return byCodeToken._id;
    }

    const byNameToken = departments.find((dept) => {
      const name = String(dept.name || "").toUpperCase();
      return tokens.some((token) => token.length >= 3 && name.includes(token));
    });

    if (byNameToken?._id) {
      await User.findByIdAndUpdate(user._id, { $set: { department: byNameToken._id } });
      return byNameToken._id;
    }
  }

  return null;
};

export const getMyHodDepartmentDashboard = async (req, res) => {
  const departmentId = await resolveHodDepartmentId(req.user);
  if (!departmentId) {
    return res.status(404).json({ success: false, message: "Department mapping missing for this HOD account." });
  }

  req.user.department = departmentId;

  const proxyReq = {
    ...req,
    params: {
      ...req.params,
      departmentId: String(departmentId)
    }
  };

  return getHodDepartmentDashboard(proxyReq, res);
};
