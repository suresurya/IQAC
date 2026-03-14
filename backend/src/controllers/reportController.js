import Student from "../models/Student.js";
import Placement from "../models/Placement.js";
import Research from "../models/Research.js";
import ReportLog from "../models/ReportLog.js";
import { buildExcelBuffer, buildPdfBuffer } from "../services/reportService.js";

const getReportRows = async (reportType, query) => {
  const studentFilter = {};
  if (query.department) studentFilter.department = query.department;
  if (query.section) studentFilter.section = String(query.section).toUpperCase();

  if (reportType === "STUDENT_PROGRESS") {
    const students = await Student.find(studentFilter).populate("department", "name code");
    return students.map((s) => {
      const latest = s.metrics.at(-1) || {};
      return {
        rollNo: s.rollNo,
        name: s.name,
        section: s.section,
        department: s.department?.code || "NA",
        cgpa: latest.cgpa || 0,
        attendancePercent: latest.attendancePercent || 0,
        backlogCount: latest.backlogCount || 0,
        riskLevel: s.riskLevel
      };
    });
  }

  if (reportType === "SECTION_WISE") {
    const students = await Student.find(studentFilter);
    const map = new Map();

    students.forEach((s) => {
      const sec = s.section || "A";
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec).push(s);
    });

    return Array.from(map.entries()).map(([section, list]) => {
      const latest = list.map((s) => s.metrics.at(-1)).filter(Boolean);
      const avgCgpa = latest.length ? latest.reduce((sum, m) => sum + Number(m.cgpa || 0), 0) / latest.length : 0;
      const passPercent = latest.length
        ? (latest.filter((m) => Number(m.backlogCount || 0) === 0).length / latest.length) * 100
        : 0;

      return {
        section,
        totalStudents: list.length,
        averageCgpa: Number(avgCgpa.toFixed(2)),
        passPercent: Number(passPercent.toFixed(2))
      };
    });
  }

  if (reportType === "PLACEMENT") {
    const placements = await Placement.find(query.department ? { department: query.department } : {}).populate("department", "name code");
    return placements.map((p) => ({
      department: p.department?.code || "NA",
      academicYear: p.academicYear,
      totalEligible: p.totalEligible,
      totalPlaced: p.totalPlaced,
      placementRate: p.totalEligible ? Number(((p.totalPlaced / p.totalEligible) * 100).toFixed(2)) : 0
    }));
  }

  if (reportType === "FACULTY_CONTRIBUTION") {
    const research = await Research.find(query.department ? { department: query.department } : {}).populate("department", "name code").populate("faculty", "name email");
    return research.map((r) => ({
      faculty: r.faculty?.name || "Unknown",
      department: r.department?.code || "NA",
      publicationType: r.publicationType,
      title: r.title,
      accreditationCriteria: r.accreditationCriteria
    }));
  }

  const students = await Student.find(studentFilter);
  return students.map((s) => {
    const latest = s.metrics.at(-1) || {};
    return {
      rollNo: s.rollNo,
      section: s.section,
      semester: latest.semester || 0,
      cgpa: latest.cgpa || 0,
      backlogCount: latest.backlogCount || 0
    };
  });
};

export const generateReport = async (req, res) => {
  const { reportType = "STUDENT_PROGRESS", format = "PDF", ...filters } = req.body;

  const rows = await getReportRows(reportType, filters);

  await ReportLog.create({
    reportType,
    generatedBy: req.user._id,
    filters,
    format
  });

  const filename = `${reportType.toLowerCase()}_${Date.now()}.${format === "PDF" ? "pdf" : "xlsx"}`;

  if (format === "EXCEL") {
    const buffer = await buildExcelBuffer(reportType, rows);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    return res.send(buffer);
  }

  const buffer = await buildPdfBuffer(reportType, rows);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  return res.send(buffer);
};

export const reportHistory = async (_, res) => {
  const logs = await ReportLog.find().populate("generatedBy", "name email role").sort({ createdAt: -1 }).limit(50);
  return res.status(200).json({ success: true, data: logs });
};
