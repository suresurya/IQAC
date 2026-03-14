import Student from "../models/Student.js";
import Department from "../models/Department.js";
import Placement from "../models/Placement.js";
import Research from "../models/Research.js";
import Section from "../models/Section.js";
import Mark from "../models/Mark.js";
import FacultyAchievement from "../models/FacultyAchievement.js";

export const institutionalOverview = async (_, res) => {
  const students = await Student.find();
  const departments = await Department.find();
  const placements = await Placement.find();
  const research = await Research.find();

  const latestMetrics = students.map((s) => s.metrics.at(-1)).filter(Boolean);

  const highRisk = students.filter((s) => s.riskLevel === "HIGH").length;
  const mediumRisk = students.filter((s) => s.riskLevel === "MEDIUM").length;
  const lowRisk = students.filter((s) => s.riskLevel === "LOW").length;

  const avgCgpa = latestMetrics.length
    ? latestMetrics.reduce((sum, m) => sum + m.cgpa, 0) / latestMetrics.length
    : 0;

  const avgPassPercent = latestMetrics.length
    ? (latestMetrics.filter((m) => m.backlogCount === 0).length / latestMetrics.length) * 100
    : 0;

  const placementRate = placements.length
    ? placements.reduce((sum, p) => sum + (p.totalEligible ? p.totalPlaced / p.totalEligible : 0), 0) * 100 / placements.length
    : 0;

  res.status(200).json({
    success: true,
    data: {
      totalStudents: students.length,
      totalDepartments: departments.length,
      averageCgpa: Number(avgCgpa.toFixed(2)),
      averagePassPercent: Number(avgPassPercent.toFixed(2)),
      placementRate: Number(placementRate.toFixed(2)),
      researchPublications: research.length,
      riskDistribution: { highRisk, mediumRisk, lowRisk }
    }
  });
};

export const departmentComparison = async (_, res) => {
  const departments = await Department.find();
  const students = await Student.find();
  const placements = await Placement.find();

  const rows = departments.map((d) => {
    const deptStudents = students.filter((s) => String(s.department) === String(d._id));
    const latest = deptStudents.map((s) => s.metrics.at(-1)).filter(Boolean);
    const deptPlacements = placements.filter((p) => String(p.department) === String(d._id));

    const passPercent = latest.length
      ? (latest.filter((m) => m.backlogCount === 0).length / latest.length) * 100
      : 0;

    const averageCgpa = latest.length
      ? latest.reduce((sum, m) => sum + m.cgpa, 0) / latest.length
      : 0;

    const backlogRate = latest.length
      ? (latest.filter((m) => m.backlogCount > 0).length / latest.length) * 100
      : 0;

    const placementRate = deptPlacements.length
      ? deptPlacements.reduce((sum, p) => sum + (p.totalEligible ? p.totalPlaced / p.totalEligible : 0), 0) * 100 / deptPlacements.length
      : 0;

    return {
      department: d.name,
      code: d.code,
      passPercent: Number(passPercent.toFixed(2)),
      averageCgpa: Number(averageCgpa.toFixed(2)),
      backlogRate: Number(backlogRate.toFixed(2)),
      placementRate: Number(placementRate.toFixed(2)),
      score: Number((passPercent * 0.35 + averageCgpa * 10 * 0.35 + placementRate * 0.3).toFixed(2))
    };
  });

  const ranked = rows.sort((a, b) => b.score - a.score).map((row, idx) => ({ rank: idx + 1, ...row }));
  return res.status(200).json({ success: true, data: ranked });
};

export const riskStudents = async (req, res) => {
  const { risk = "HIGH" } = req.query;
  const data = await Student.find({ riskLevel: risk }).populate("department", "name code");
  return res.status(200).json({ success: true, data });
};

export const studentComparison = async (req, res) => {
  const { studentIdA, studentIdB } = req.query;
  const [a, b] = await Promise.all([
    Student.findById(studentIdA).populate("department", "name code"),
    Student.findById(studentIdB).populate("department", "name code")
  ]);

  if (!a || !b) return res.status(404).json({ success: false, message: "Students not found" });

  const latestA = a.metrics.at(-1);
  const latestB = b.metrics.at(-1);

  return res.status(200).json({
    success: true,
    data: {
      studentA: {
        id: a._id,
        name: a.name,
        rollNo: a.rollNo,
        department: a.department,
        cgpa: latestA?.cgpa || 0,
        sgpa: latestA?.sgpa || 0,
        riskLevel: a.riskLevel,
        trend: a.metrics.map((m) => ({ semester: m.semester, cgpa: m.cgpa }))
      },
      studentB: {
        id: b._id,
        name: b.name,
        rollNo: b.rollNo,
        department: b.department,
        cgpa: latestB?.cgpa || 0,
        sgpa: latestB?.sgpa || 0,
        riskLevel: b.riskLevel,
        trend: b.metrics.map((m) => ({ semester: m.semester, cgpa: m.cgpa }))
      }
    }
  });
};

export const sectionComparison = async (_, res) => {
  const [sections, students, marks] = await Promise.all([
    Section.find().populate("department", "name code"),
    Student.find(),
    Mark.find()
  ]);

  const rows = sections.map((section) => {
    const sectionStudents = students.filter((s) => String(s.section) === String(section._id));
    const sectionLatest = sectionStudents.map((s) => s.metrics.at(-1)).filter(Boolean);
    const sectionMarks = marks.filter((m) => String(m.section) === String(section._id));

    const passPercent = sectionMarks.length
      ? (sectionMarks.filter((m) => m.passed).length / sectionMarks.length) * 100
      : 0;

    const averageCgpa = sectionLatest.length
      ? sectionLatest.reduce((sum, m) => sum + m.cgpa, 0) / sectionLatest.length
      : 0;

    const riskDistribution = {
      high: sectionStudents.filter((s) => s.riskLevel === "HIGH").length,
      medium: sectionStudents.filter((s) => s.riskLevel === "MEDIUM").length,
      low: sectionStudents.filter((s) => s.riskLevel === "LOW").length
    };

    return {
      sectionId: section._id,
      section: section.code,
      department: section.department?.code || "-",
      passPercent: Number(passPercent.toFixed(2)),
      averageCgpa: Number(averageCgpa.toFixed(2)),
      riskDistribution
    };
  });

  return res.status(200).json({ success: true, data: rows });
};

export const extendedDepartmentComparison = async (_, res) => {
  const [departments, students, marks, facultyAchievements] = await Promise.all([
    Department.find(),
    Student.find(),
    Mark.find(),
    FacultyAchievement.find()
  ]);

  const rows = departments.map((department) => {
    const deptStudents = students.filter((s) => String(s.department) === String(department._id));
    const latest = deptStudents.map((s) => s.metrics.at(-1)).filter(Boolean);
    const deptMarks = marks.filter((m) => {
      const student = deptStudents.find((s) => String(s._id) === String(m.student));
      return Boolean(student);
    });

    const passPercent = deptMarks.length
      ? (deptMarks.filter((m) => m.passed).length / deptMarks.length) * 100
      : 0;
    const cgpa = latest.length ? latest.reduce((sum, m) => sum + m.cgpa, 0) / latest.length : 0;

    return {
      departmentId: department._id,
      department: department.name,
      passPercent: Number(passPercent.toFixed(2)),
      averageCgpa: Number(cgpa.toFixed(2)),
      facultyContribution: facultyAchievements.filter((a) => String(a.department) === String(department._id)).length,
      riskDistribution: {
        high: deptStudents.filter((s) => s.riskLevel === "HIGH").length,
        medium: deptStudents.filter((s) => s.riskLevel === "MEDIUM").length,
        low: deptStudents.filter((s) => s.riskLevel === "LOW").length
      }
    };
  });

  return res.status(200).json({ success: true, data: rows });
};
