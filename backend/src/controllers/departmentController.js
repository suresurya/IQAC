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
