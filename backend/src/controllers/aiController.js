// aiController.js — Optimized: Promise.all, .lean(), safe getLatestMetric
import {
  generateStudentProgressAnalysis,
  generateDepartmentPerformanceAnalysis,
  generateCGPADistributionAnalysis,
  generateBacklogAnalysis,
  generatePlacementForecast,
  generateFacultyContributionSummary,
  generateAccreditationReadinessAssessment,
  answerNaturalLanguageQuery,
  generateStudentInterventionAdvice,
  generateDepartmentRanking,
  buildStreamingSearchPrompt
} from "../services/llmService.js";

import Student from "../models/Student.js";
import Department from "../models/Department.js";
import Mark from "../models/Mark.js";
import Attendance from "../models/Attendance.js";
import Placement from "../models/Placement.js";
import Research from "../models/Research.js";
import Achievement from "../models/Achievement.js";
import AccreditationItem from "../models/AccreditationItem.js";
import ReportLog from "../models/ReportLog.js";
import User from "../models/User.js";
import { buildPdfBuffer } from "../services/reportService.js";

// ─── SAFE HELPER ─────────────────────────────────────────────────
const getLatestMetric = (student) => {
  if (!student.metrics || student.metrics.length === 0) return null;
  return student.metrics[student.metrics.length - 1];
};

const deptIdOf = (student) => String(student.department?._id || student.department || "");

// ─── CONTROLLER 1: Student Progress Report (PDF) ─────────────────
export const studentProgressReport = async (req, res) => {
  const students = await Student.find().populate("department", "name code").lean();
  const total = students.length;

  let highRisk = 0, medRisk = 0, lowRisk = 0;
  let cgpaSum = 0, cgpaCount = 0, shortage = 0, totalBacklogs = 0;

  students.forEach(s => {
    if (s.riskLevel === "HIGH") highRisk++;
    else if (s.riskLevel === "MEDIUM") medRisk++;
    else lowRisk++;

    const m = getLatestMetric(s);
    if (m) {
      cgpaSum += m.cgpa;
      cgpaCount++;
      if (m.attendancePercent < 75) shortage++;
      totalBacklogs += m.backlogCount || 0;
    }
  });

  const averageCgpa = cgpaCount > 0 ? +(cgpaSum / cgpaCount).toFixed(2) : 0;

  // Semester-wise aggregation
  const semMap = {};
  students.forEach(s => {
    (s.metrics || []).forEach(m => {
      if (!semMap[m.semester]) semMap[m.semester] = { cgpaArr: [], attArr: [], passArr: [] };
      semMap[m.semester].cgpaArr.push(m.cgpa);
      semMap[m.semester].attArr.push(m.attendancePercent || 75);
      semMap[m.semester].passArr.push(m.backlogCount === 0 ? 1 : 0);
    });
  });

  const semesterWise = Object.entries(semMap).map(([sem, d]) => ({
    semester: +sem,
    averageCgpa: +(d.cgpaArr.reduce((a, b) => a + b, 0) / d.cgpaArr.length).toFixed(2),
    averageAttendance: +(d.attArr.reduce((a, b) => a + b, 0) / d.attArr.length).toFixed(1),
    passPercent: +(d.passArr.reduce((a, b) => a + b, 0) / d.passArr.length * 100).toFixed(1)
  })).sort((a, b) => a.semester - b.semester);

  const worstSemester = semesterWise.length > 0
    ? semesterWise.reduce((w, s) => s.passPercent < w.passPercent ? s : w, semesterWise[0])
    : { semester: 1, passPercent: 0 };

  // Calculate top and bottom departments dynamically from MongoDB
  const deptCgpaMap = {};
  students.forEach(s => {
    const dCode = s.department?.code || "UNKNOWN";
    const m = getLatestMetric(s);
    if (m) {
      if (!deptCgpaMap[dCode]) deptCgpaMap[dCode] = { sum: 0, count: 0 };
      deptCgpaMap[dCode].sum += m.cgpa;
      deptCgpaMap[dCode].count++;
    }
  });
  const deptAvgs = Object.entries(deptCgpaMap).map(([code, d]) => ({ code, avg: d.sum / d.count }));
  deptAvgs.sort((a, b) => b.avg - a.avg);
  const topDepartment = deptAvgs.length > 0 ? deptAvgs[0].code : "N/A";
  const bottomDepartment = deptAvgs.length > 0 ? deptAvgs[deptAvgs.length - 1].code : "N/A";

  const data = {
    totalStudents: total, highRisk: highRisk, mediumRisk: medRisk, lowRisk: lowRisk,
    averageCgpa, attendanceShortage: shortage, totalBacklogs,
    semesterWise, worstSemester, topDepartment, bottomDepartment
  };

  const analysis = await generateStudentProgressAnalysis(data);

  const content = [
    { type: "section", label: "Executive Summary" },
    { type: "stats", data: [
      { label: "Total Students", value: total },
      { label: "High Risk Students", value: `${highRisk} (${Math.round(highRisk/total*100)}%)` },
      { label: "Average CGPA", value: averageCgpa },
      { label: "NBA Compliance (CGPA >= 6.5)", value: averageCgpa >= 6.5 ? "COMPLIANT" : "NON-COMPLIANT" },
      { label: "Attendance Shortage (<75%)", value: shortage },
      { label: "Total Backlogs", value: totalBacklogs },
      { label: "Top Performing Dept", value: topDepartment },
      { label: "Development Need Dept", value: bottomDepartment }
    ]},
    { type: "section", label: "Semester-wise Trends" },
    { type: "table", 
      headers: ["Semester", "Avg CGPA", "Avg Attendance", "Pass %"],
      rows: semesterWise.map(s => [s.semester, s.averageCgpa, `${s.averageAttendance}%`, `${s.passPercent}%`])
    },
    { type: "ai", data: analysis }
  ];

  const pdfBuffer = await buildPdfBuffer("Student Progress Analysis Report", content);
  await ReportLog.create({ reportType: "STUDENT_PROGRESS", generatedBy: req.user._id, format: "PDF" });

  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=student_progress_${Date.now()}.pdf` });
  res.send(pdfBuffer);
};

// ─── CONTROLLER 2: Department Performance Report (PDF) ───────────
export const departmentPerformanceReport = async (req, res) => {
  const [departments, allStudents, allPlacements, allResearch] = await Promise.all([
    Department.find().lean(),
    Student.find().lean(),
    Placement.find().populate("department", "name code").lean(),
    Research.find().lean()
  ]);

  const deptData = departments.map(dept => {
    const sid = String(dept._id);
    const ds = allStudents.filter(s => String(s.department) === sid);
    const metrics = ds.map(s => getLatestMetric(s)).filter(Boolean);
    const dPlacements = allPlacements.filter(p => String(p.department?._id || p.department) === sid);
    const dResearch = allResearch.filter(r => String(r.department) === sid);

    const avgCgpa = metrics.length ? +(metrics.reduce((a, m) => a + m.cgpa, 0) / metrics.length).toFixed(2) : 0;
    const passPercent = metrics.length ? +(metrics.filter(m => m.backlogCount === 0).length / metrics.length * 100).toFixed(1) : 0;
    const backlogRate = metrics.length ? +(metrics.filter(m => m.backlogCount > 0).length / metrics.length * 100).toFixed(1) : 0;

    let totalElig = 0, totalPlaced = 0;
    dPlacements.forEach(p => { totalElig += p.totalEligible; totalPlaced += p.totalPlaced; });
    const placementRate = totalElig > 0 ? +(totalPlaced / totalElig * 100).toFixed(1) : 0;

    const score = +(avgCgpa * 10 * 0.35 + passPercent * 0.35 + placementRate * 0.3).toFixed(2);

    return {
      name: dept.name, code: dept.code,
      averageCgpa: avgCgpa, passPercent, backlogRate,
      placementRate, researchCount: dResearch.length, score
    };
  }).filter(d => d.averageCgpa > 0).sort((a,b) => b.score - a.score);

  const analysis = await generateDepartmentPerformanceAnalysis(deptData);

  const content = [
    { type: "section", label: "Department Ranking Summary" },
    { type: "table",
      headers: ["Rank", "Department", "Score", "Avg CGPA", "Pass %", "Placement %", "Research"],
      rows: deptData.map((d, i) => [i + 1, `${d.name} (${d.code})`, d.score, d.averageCgpa, `${d.passPercent}%`, `${d.placementRate}%`, d.researchCount]),
      options: { colWidths: [40, 150, 60, 60, 60, 60, 60] }
    },
    { type: "section", label: "Accreditation Benchmarking" },
    { type: "table",
      headers: ["Department", "NBA Status (Pass >= 60%)", "NBA Status (CGPA >= 6.5)"],
      rows: deptData.map(d => [
        d.code, 
        d.passPercent >= 60 ? "COMPLIANT" : "FAIL",
        d.averageCgpa >= 6.5 ? "COMPLIANT" : "FAIL"
      ])
    },
    { type: "ai", data: analysis }
  ];

  const pdfBuffer = await buildPdfBuffer("Department Performance Comparative Analysis", content);
  await ReportLog.create({ reportType: "DEPARTMENT_PERFORMANCE", generatedBy: req.user._id, format: "PDF" });

  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=dept_performance_${Date.now()}.pdf` });
  res.send(pdfBuffer);
};

// ─── CONTROLLER 3: CGPA Distribution (JSON) ──────────────────────
export const cgpaDistributionAnalysis = async (req, res) => {
  const students = await Student.find().lean();
  const cgpas = students.map(s => getLatestMetric(s)?.cgpa).filter(c => c != null && c > 0);
  const total = students.length;

  const sorted = [...cgpas].sort((a, b) => a - b);
  const medianCgpa = sorted.length > 0
    ? +(sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]).toFixed(2)
    : 0;

  const distribution = {
    below_6: cgpas.filter(c => c < 6).length,
    six_to_seven: cgpas.filter(c => c >= 6 && c < 7).length,
    seven_to_eight: cgpas.filter(c => c >= 7 && c < 8).length,
    eight_to_nine: cgpas.filter(c => c >= 8 && c < 9).length,
    above_nine: cgpas.filter(c => c >= 9).length,
    averageCgpa: cgpas.length > 0 ? +(cgpas.reduce((a, b) => a + b, 0) / cgpas.length).toFixed(2) : 0,
    medianCgpa, median: medianCgpa,
    highestCgpa: Math.max(...cgpas, 0),
    lowestCgpa: Math.min(...cgpas, 0),
    belowNBAThreshold: cgpas.filter(c => c < 6.5).length,
    totalStudents: total
  };

  const analysis = await generateCGPADistributionAnalysis(distribution);

  res.json({ success: true, data: { distribution, analysis } });
};

// ─── CONTROLLER 4: Backlog Analysis Report (PDF) ─────────────────
export const backlogAnalysisReport = async (req, res) => {
  const [students, departments] = await Promise.all([
    Student.find().populate("department", "name code").lean(),
    Department.find().lean()
  ]);

  const total = students.length;
  let noBacklog = 0, oneBacklog = 0, twoBacklog = 0, threePlus = 0;
  const deptMap = {};
  const semMap = {};
  const offenders = [];

  students.forEach(s => {
    const m = getLatestMetric(s);
    const bc = m?.backlogCount || 0;
    if (bc === 0) noBacklog++;
    else if (bc === 1) oneBacklog++;
    else if (bc === 2) twoBacklog++;
    else threePlus++;

    const dName = s.department?.name || "Unknown";
    const dCode = s.department?.code || "UNK";
    if (!deptMap[dCode]) deptMap[dCode] = { name: dName, totalBacklogs: 0, studentsAffected: 0, totalStudents: 0, cgpaSum: 0 };
    deptMap[dCode].totalStudents++;
    if (bc > 0) { 
      deptMap[dCode].totalBacklogs += bc; 
      deptMap[dCode].studentsAffected++; 
      deptMap[dCode].cgpaSum += (m?.cgpa || 0);
      offenders.push({ 
        rollNo: s.rollNo, name: s.name, code: dCode, sem: s.currentSemester, 
        backlogs: bc, cgpa: m?.cgpa || 0, att: m?.attendancePercent || 0, risk: s.riskLevel 
      });
    }

    (s.metrics || []).forEach(metric => {
      if ((metric.backlogCount || 0) > 0) {
        if (!semMap[metric.semester]) semMap[metric.semester] = { count: 0, totalBacklogs: 0 };
        semMap[metric.semester].count++;
        semMap[metric.semester].totalBacklogs += metric.backlogCount;
      }
    });
  });

  const cleanPassRate = (noBacklog / total * 100).toFixed(1);
  const analysis = await generateBacklogAnalysis({
    summary: { studentsWithNoBacklogs: noBacklog, studentsWithOneBacklog: oneBacklog, studentsWithTwoBacklogs: twoBacklog, studentsWithThreePlus: threePlus },
    byDepartment: Object.entries(deptMap).map(([code, d]) => ({ department: d.name, totalBacklogs: d.totalBacklogs, studentsAffected: d.studentsAffected })),
    bySemester: Object.entries(semMap).map(([s, d]) => ({ semester: +s, studentsWithBacklogs: d.count })),
    totalStudents: total,
    topOffenders: offenders.sort((a,b) => b.backlogs - a.backlogs || a.cgpa - b.cgpa).slice(0, 50)
  });

  const content = [
    { type: "section", label: "Institutional Backlog Summary" },
    { type: "stats", data: [
      { label: "Total Students", value: total },
      { label: "Zero Backlogs (Clean Pass)", value: `${noBacklog} (${cleanPassRate}%)` },
      { label: "Students with 1 Backlog", value: oneBacklog },
      { label: "Students with 2 Backlogs", value: twoBacklog },
      { label: "Students with 3+ Backlogs", value: threePlus },
      { label: "Severity Status", value: cleanPassRate < 70 ? "CRITICAL" : cleanPassRate < 85 ? "MODERATE" : "MANAGEABLE" }
    ]},
    { type: "section", label: "Department-wise Breakdown" },
    ...Object.entries(deptMap).map(([code, d]) => ({
      type: "stats", data: [
        { label: `${d.name} (${code})`, value: "" },
        { label: "  Affected Students", value: `${d.studentsAffected} / ${d.totalStudents}` },
        { label: "  Total Backlogs", value: d.totalBacklogs },
        { label: "  Average CGPA (Affected)", value: d.studentsAffected > 0 ? (d.cgpaSum / d.studentsAffected).toFixed(2) : "N/A" }
      ]
    })),
    { type: "section", label: "Semester-wise Concentration" },
    { type: "table",
      headers: ["Semester", "Students with Backlogs", "Avg Backlogs / Student"],
      rows: Object.entries(semMap).sort((a,b) => b[1].count - a[1].count).map(([sem, d]) => [sem, d.count, (d.totalBacklogs/d.count).toFixed(2)])
    },
    { type: "section", label: "Critical At-Risk Student Register" },
    { type: "table",
      headers: ["Roll No", "Name", "Dept", "Sem", "Backlogs", "CGPA", "Attendance", "Risk"],
      rows: offenders.map(o => [o.rollNo, o.name, o.code, o.sem, o.backlogs, o.cgpa, `${o.att}%`, o.risk]),
      options: { 
        colWidths: [70, 100, 40, 40, 50, 40, 60, 60],
        highlights: { 4: (val) => val >= 3 } // Highlight 3+ backlogs in red
      }
    },
    { type: "ai", data: analysis }
  ];

  const pdfBuffer = await buildPdfBuffer("Institutional Backlog & At-Risk Analysis Report", content);
  await ReportLog.create({ reportType: "BACKLOG_ANALYSIS", generatedBy: req.user._id, format: "PDF" });

  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=backlog_analysis_${Date.now()}.pdf` });
  res.send(pdfBuffer);
};

// ─── CONTROLLER 5: Placement Forecast Report (PDF) ───────────────
export const placementForecastReport = async (req, res) => {
  const placements = await Placement.find().populate("department", "name code").lean();

  let totalElig = 0, totalPlaced = 0, topPkg = 0, medSum = 0;
  const recruiterFreq = {};
  const yearMap = {};
  const deptMap = {};

  placements.forEach(p => {
    totalElig += p.totalEligible;
    totalPlaced += p.totalPlaced;
    if (p.highestPackageLPA > topPkg) topPkg = p.highestPackageLPA;
    if (p.medianPackageLPA > 0) medSum += p.medianPackageLPA;
    (p.majorRecruiters || []).forEach(r => { recruiterFreq[r] = (recruiterFreq[r] || 0) + 1; });

    if (!yearMap[p.academicYear]) yearMap[p.academicYear] = { elig: 0, placed: 0, hi: 0, med: 0, count: 0 };
    yearMap[p.academicYear].elig += p.totalEligible;
    yearMap[p.academicYear].placed += p.totalPlaced;
    yearMap[p.academicYear].hi = Math.max(yearMap[p.academicYear].hi, p.highestPackageLPA);
    yearMap[p.academicYear].med += p.medianPackageLPA;
    yearMap[p.academicYear].count++;

    const dCode = p.department?.code || "UNK";
    if (!deptMap[dCode]) deptMap[dCode] = { name: p.department?.name || "Unknown", years: [] };
    deptMap[dCode].years.push(p);
  });

  const topRecruiters = Object.entries(recruiterFreq).sort((a, b) => b[1] - a[1]);
  const sortedYears = Object.entries(yearMap).sort((a,b) => a[0].localeCompare(b[0]));

  const analysis = await generatePlacementForecast({
    institutionSummary: { totalEligible: totalElig, totalPlaced: totalPlaced, overallPlacementRate: (totalPlaced/totalElig*100).toFixed(1), topPackage: topPkg, averageMedianPackage: (medSum/placements.length).toFixed(2) },
    byDepartment: placements.map(p => ({ department: p.department?.name, placementRate: (p.totalPlaced/p.totalEligible*100).toFixed(1), academicYear: p.academicYear })),
    topRecruiters: topRecruiters.map(r => r[0])
  });

  const content = [
    { type: "section", label: "Placement Executive Summary" },
    { type: "stats", data: [
      { label: "Total Eligible Students", value: totalElig },
      { label: "Total Placed Students", value: totalPlaced },
      { label: "Overall Placement Rate", value: `${(totalPlaced/totalElig*100).toFixed(1)}%` },
      { label: "Highest Package (LPA)", value: `${topPkg} LPA` },
      { label: "Average Median Package", value: `${(medSum/placements.length).toFixed(2)} LPA` },
      { label: "Unique Recruiters Count", value: Object.keys(recruiterFreq).length }
    ]},
    { type: "section", label: "Academic Year Comparison" },
    { type: "table",
      headers: ["Year", "Eligible", "Placed", "Rate %", "Highest", "Median"],
      rows: sortedYears.map(([year, d]) => [
        year, d.elig, d.placed, `${(d.placed/d.elig*100).toFixed(1)}%`, `${d.hi} LPA`, `${(d.med/d.count).toFixed(2)} LPA`
      ])
    },
    { type: "section", label: "Department-wise Performance" },
    ...Object.entries(deptMap).map(([code, d]) => ({
      type: "table",
      headers: [`${d.name} (${code})`, "Eligible", "Placed", "Rate %", "Highest", "Recruiters"],
      rows: d.years.map(y => [y.academicYear, y.totalEligible, y.totalPlaced, `${(y.totalPlaced/y.totalEligible*100).toFixed(1)}%`, `${y.highestPackageLPA} LPA`, y.majorRecruiters.slice(0,2).join(", ")])
    })),
    { type: "section", label: "Top Recruiting Companies" },
    { type: "table", 
      headers: ["Company Name", "Dept Count", "Total Estimated Hires"],
      rows: topRecruiters.slice(0, 15).map(r => [r[0], r[1], "N/A"])
    },
    { type: "ai", data: analysis }
  ];

  const pdfBuffer = await buildPdfBuffer("Institutional Placement & Career Analytics", content);
  await ReportLog.create({ reportType: "PLACEMENT", generatedBy: req.user._id, format: "PDF" });

  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=placement_forecast_${Date.now()}.pdf` });
  res.send(pdfBuffer);
};

// ─── CONTROLLER 6: Faculty Contribution Report (PDF) ─────────────
export const facultyContributionReport = async (req, res) => {
  const [publications, totalFaculty, departments] = await Promise.all([
    Research.find().populate("faculty", "name").populate("department", "name code").lean(),
    User.countDocuments({ role: "faculty" }),
    Department.find().lean()
  ]);

  const byType = {};
  const byFacultyMap = {};
  const deptPubs = {};

  publications.forEach(p => {
    byType[p.publicationType] = (byType[p.publicationType] || 0) + 1;
    const fId = String(p.faculty?._id || "Unknown");
    if (!byFacultyMap[fId]) byFacultyMap[fId] = { name: p.faculty?.name || "Unknown", Journal: 0, Conference: 0, Patent: 0, Book: 0, Total: 0, dept: p.department?.name };
    byFacultyMap[fId][p.publicationType === "Book Chapter" ? "Book" : p.publicationType]++;
    byFacultyMap[fId].Total++;

    const dCode = p.department?.code || "UNK";
    if (!deptPubs[dCode]) deptPubs[dCode] = { name: p.department?.name, count: 0, types: {} };
    deptPubs[dCode].count++;
    deptPubs[dCode].types[p.publicationType] = (deptPubs[dCode].types[p.publicationType] || 0) + 1;
  });

  const analysis = await generateFacultyContributionSummary({
    department: "All Departments",
    totalFaculty, totalPublications: publications.length,
    byType,
    byFaculty: Object.values(byFacultyMap).map(f => ({ faculty: f.name, count: f.Total })),
    publications: publications.slice(0, 5)
  });

  const content = [
    { type: "section", label: "Research Output Executive Summary" },
    { type: "stats", data: [
      { label: "Total Institutional Publications", value: publications.length },
      { label: "Total Faculty Count", value: totalFaculty },
      { label: "Publications per Faculty Ratio", value: (publications.length / totalFaculty).toFixed(2) },
      { label: "NBA Benchmark (1 per 3 years)", value: (totalFaculty / 3).toFixed(1) },
      { label: "NBA Compliance Status", value: (publications.length / totalFaculty) >= 0.33 ? "COMPLIANT" : "NON-COMPLIANT" }
    ]},
    { type: "section", label: "Publication Type Breakdown" },
    { type: "table",
      headers: ["Type", "Count", "Percentage", "NBA Weight"],
      rows: Object.entries(byType).map(([type, count]) => [
        type, count, `${(count/publications.length*100).toFixed(1)}%`, 
        type === "Journal" ? "High (SJR/JCR)" : type === "Patent" ? "High (IPR)" : "Moderate"
      ])
    },
    { type: "section", label: "Department-wise Output" },
    { type: "table", 
      headers: ["Department", "Total Pubs", "Ratio", "Primary Type"],
      rows: Object.entries(deptPubs).map(([code, d]) => [
        d.name, d.count, "N/A", 
        Object.entries(d.types).sort((a,b) => b[1] - a[1])[0][0]
      ])
    },
    { type: "section", label: "Faculty-wise Contribution Register" },
    { type: "table",
      headers: ["Faculty Name", "Department", "Journal", "Conf", "Patent", "Total", "% of Total"],
      rows: Object.values(byFacultyMap).sort((a,b) => b.Total - a.Total).map(f => [
        f.name, f.dept, f.Journal, f.Conference, f.Patent, f.Total, `${(f.Total/publications.length*100).toFixed(1)}%`
      ]),
      options: {
        colWidths: [100, 100, 50, 50, 50, 50, 60]
      }
    },
    { type: "section", label: "Recent Publications (Last 50)" },
    { type: "table",
      headers: ["Title", "Author", "Type", "Venue", "Date"],
      rows: publications.slice(0, 50).map(p => [
        p.title.substring(0, 40) + "...", p.faculty?.name, p.publicationType, p.journalOrConference?.substring(0, 20), p.publishedOn ? new Date(p.publishedOn).toLocaleDateString() : "N/A"
      ]),
      options: { colWidths: [150, 80, 70, 80, 60] }
    },
    { type: "ai", data: analysis }
  ];

  const pdfBuffer = await buildPdfBuffer("Faculty Research Contribution & Accreditation Report", content);
  await ReportLog.create({ reportType: "FACULTY_CONTRIBUTION", generatedBy: req.user._id, format: "PDF" });

  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename=faculty_contribution_${Date.now()}.pdf` });
  res.send(pdfBuffer);
};


// ─── NEW CONTROLLER 9: Student Intervention Advice (JSON) ─────────
export const studentIntervention = async (req, res) => {
  const { id } = req.params;
  const student = await Student.findById(id).populate("department", "name").lean();
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });

  const m = getLatestMetric(student);
  const trend = (student.metrics || []).map(x => `Sem${x.semester}:${x.cgpa}`).join(" ");

  const advice = await generateStudentInterventionAdvice({
    name: student.name,
    rollNo: student.rollNo,
    department: student.department?.name,
    currentSemester: student.currentSemester,
    riskLevel: student.riskLevel,
    cgpa: m?.cgpa || 0,
    attendance: m?.attendancePercent || 0,
    backlogs: m?.backlogCount || 0,
    cgpaTrend: trend
  });

  res.json({ success: true, data: { advice, student } });
};

// ─── NEW CONTROLLER 10: Department Ranking (JSON) ─────────────────
export const departmentRanking = async (req, res) => {
  const [departments, allStudents, allPlacements, allResearch] = await Promise.all([
    Department.find().lean(),
    Student.find().lean(),
    Placement.find().populate("department", "name code").lean(),
    Research.find().lean()
  ]);

  const deptData = departments.map(dept => {
    const sid = String(dept._id);
    const ds = allStudents.filter(s => String(s.department) === sid);
    const metrics = ds.map(s => getLatestMetric(s)).filter(Boolean);
    const dPlacements = allPlacements.filter(p => String(p.department?._id || p.department) === sid);
    const dResearch = allResearch.filter(r => String(r.department) === sid);

    const avgCgpa = metrics.length ? +(metrics.reduce((a, m) => a + m.cgpa, 0) / metrics.length).toFixed(2) : 0;
    const passPercent = metrics.length ? +(metrics.filter(m => m.backlogCount === 0).length / metrics.length * 100).toFixed(1) : 0;
    
    let totalElig = 0, totalPlaced = 0;
    dPlacements.forEach(p => { totalElig += p.totalEligible; totalPlaced += p.totalPlaced; });
    const placementRate = totalElig > 0 ? +(totalPlaced / totalElig * 100).toFixed(1) : 0;

    const score = +(avgCgpa * 10 * 0.35 + passPercent * 0.35 + placementRate * 0.3).toFixed(2);

    return {
      name: dept.name, code: dept.code, studentCount: ds.length,
      averageCgpa: avgCgpa, passPercent, placementRate, researchCount: dResearch.length, score
    };
  }).filter(d => d.averageCgpa > 0).sort((a,b) => b.score - a.score);

  const rankingText = await generateDepartmentRanking(deptData);
  res.json({ success: true, data: { departments: deptData, rankingText } });
};


// ─── CONTROLLER 7: Accreditation Readiness (JSON) ────────────────
export const accreditationReadinessAssessment = async (req, res) => {
  const [nbaRaw, naacRaw] = await Promise.all([
    AccreditationItem.find({ type: "NBA" }).lean(),
    AccreditationItem.find({ type: "NAAC" }).lean()
  ]);

  const buildData = (items) => ({
    totalItems: items.length,
    completedItems: items.filter(i => i.completed).length,
    readinessScore: items.length > 0 ? +(items.filter(i => i.completed).length / items.length * 100).toFixed(1) : 0,
    missingItems: items.filter(i => !i.completed).slice(0, 5).map(i => ({ title: i.title, criterion: i.criterion }))
  });

  const readinessData = {
    nba: { type: "NBA", ...buildData(nbaRaw) },
    naac: { type: "NAAC", ...buildData(naacRaw) }
  };

  const assessment = await generateAccreditationReadinessAssessment(readinessData);

  const avg = (readinessData.nba.readinessScore + readinessData.naac.readinessScore) / 2;
  const overallVerdict = avg > 80 ? "READY" : avg > 60 ? "REQUIRES ATTENTION" : "CRITICAL";

  res.json({
    success: true,
    data: { nba: readinessData.nba, naac: readinessData.naac, assessment, overallVerdict }
  });
};

// ─── CONTROLLER 8: Natural Language Search (JSON) ─────────────────
export const naturalLanguageSearch = async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) {
    return res.status(400).json({ success: false, message: "Question is required" });
  }

  // Parallel queries
  const [students, departments, placements, nbaItems, naacItems] = await Promise.all([
    Student.find().lean(),
    Department.find().lean(),
    Placement.find().populate("department", "name code").lean(),
    AccreditationItem.find({ type: "NBA" }).lean(),
    AccreditationItem.find({ type: "NAAC" }).lean()
  ]);

  const total = students.length;
  let highRisk = 0, medRisk = 0, lowRisk = 0, cgpaSum = 0, cgpaCount = 0, shortage = 0;

  students.forEach(s => {
    if (s.riskLevel === "HIGH") highRisk++;
    else if (s.riskLevel === "MEDIUM") medRisk++;
    else lowRisk++;
    const m = getLatestMetric(s);
    if (m) { cgpaSum += m.cgpa; cgpaCount++; if (m.attendancePercent < 75) shortage++; }
  });

  const avgCgpa = cgpaCount > 0 ? +(cgpaSum / cgpaCount).toFixed(2) : 0;

  const deptSummaries = departments.map(dept => {
    const sid = String(dept._id);
    const ds = students.filter(s => String(s.department) === sid);
    const metrics = ds.map(getLatestMetric).filter(Boolean);
    const dPlacements = placements.filter(p => String(p.department?._id || p.department) === sid);
    let elig = 0, placed = 0;
    dPlacements.forEach(p => { elig += p.totalEligible; placed += p.totalPlaced; });
    return {
      name: dept.name, code: dept.code,
      averageCgpa: metrics.length ? +(metrics.reduce((a, m) => a + m.cgpa, 0) / metrics.length).toFixed(2) : 0,
      passPercent: metrics.length ? +(metrics.filter(m => m.backlogCount === 0).length / metrics.length * 100).toFixed(1) : 0,
      placementRate: elig > 0 ? +(placed / elig * 100).toFixed(1) : 0
    };
  });

  const nbaCompleted = nbaItems.filter(i => i.completed).length;
  const naacCompleted = naacItems.filter(i => i.completed).length;

  const databaseSummary = {
    totalStudents: total, highRiskCount: highRisk, mediumRiskCount: medRisk, lowRiskCount: lowRisk,
    averageCgpa: avgCgpa, attendanceShortageCount: shortage,
    departments: deptSummaries,
    placements: placements.map(p => ({
      department: p.department?.name || "Unknown",
      placementRate: p.totalEligible > 0 ? +(p.totalPlaced / p.totalEligible * 100).toFixed(1) : 0
    })),
    accreditation: {
      nbaReadiness: nbaItems.length > 0 ? +(nbaCompleted / nbaItems.length * 100).toFixed(1) : 0,
      naacReadiness: naacItems.length > 0 ? +(naacCompleted / naacItems.length * 100).toFixed(1) : 0,
      pendingNBA: nbaItems.length - nbaCompleted,
      pendingNAAC: naacItems.length - naacCompleted
    },
    topStudents: [...students]
      .filter(s => getLatestMetric(s))
      .sort((a, b) => (getLatestMetric(b)?.cgpa || 0) - (getLatestMetric(a)?.cgpa || 0))
      .slice(0, 5)
      .map(s => ({ name: s.name, rollNo: s.rollNo, cgpa: getLatestMetric(s)?.cgpa || 0 })),
    highRiskStudents: students
      .filter(s => s.riskLevel === "HIGH")
      .slice(0, 5)
      .map(s => ({ name: s.name, cgpa: getLatestMetric(s)?.cgpa || 0, attendance: getLatestMetric(s)?.attendancePercent || 0 }))
  };

  const answer = await answerNaturalLanguageQuery(question, databaseSummary);

  res.json({
    success: true,
    data: { answer, question, timestamp: new Date().toISOString() }
  });
};

// ─── CONTROLLER 9: Streaming Search (SSE) ─────────────────────────
// Uses Ollama stream:true to send tokens as they arrive via SSE
export const streamingSearch = async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) {
    return res.status(400).json({ success: false, message: "Question is required" });
  }

  // Parallel DB fetch
  const [students, departments, placements, nbaItems, naacItems] = await Promise.all([
    Student.find().lean(),
    Department.find().lean(),
    Placement.find().populate("department", "name code").lean(),
    AccreditationItem.find({ type: "NBA" }).lean(),
    AccreditationItem.find({ type: "NAAC" }).lean()
  ]);

  let highRisk = 0, medRisk = 0, lowRisk = 0, cgpaSum = 0, cgpaCount = 0, shortage = 0;
  students.forEach(s => {
    if (s.riskLevel === "HIGH") highRisk++;
    else if (s.riskLevel === "MEDIUM") medRisk++;
    else lowRisk++;
    const m = getLatestMetric(s);
    if (m) { cgpaSum += m.cgpa; cgpaCount++; if (m.attendancePercent < 75) shortage++; }
  });
  const avgCgpa = cgpaCount > 0 ? +(cgpaSum / cgpaCount).toFixed(2) : 0;
  const nbaCompleted = nbaItems.filter(i => i.completed).length;
  const naacCompleted = naacItems.filter(i => i.completed).length;

  // Build compact databaseSummary same as Job 8
  const deptSummaries = departments.map(dept => {
    const sid = String(dept._id);
    const ds = students.filter(s => String(s.department) === sid);
    const metrics = ds.map(getLatestMetric).filter(Boolean);
    const dPlacements = placements.filter(p => String(p.department?._id || p.department) === sid);
    let elig = 0, placed = 0;
    dPlacements.forEach(p => { elig += p.totalEligible; placed += p.totalPlaced; });
    return {
      code: dept.code, name: dept.name,
      averageCgpa: metrics.length ? +(metrics.reduce((a, m) => a + m.cgpa, 0) / metrics.length).toFixed(2) : 0,
      passPercent: metrics.length ? +(metrics.filter(m => m.backlogCount === 0).length / metrics.length * 100).toFixed(1) : 0,
      placementRate: elig > 0 ? +(placed / elig * 100).toFixed(1) : 0
    };
  });


  const databaseSummary = {
    totalStudents: students.length, highRiskCount: highRisk, mediumRiskCount: medRisk, lowRiskCount: lowRisk,
    averageCgpa: avgCgpa, attendanceShortageCount: shortage,
    departments: deptSummaries,
    accreditation: {
      nbaReadiness: nbaItems.length > 0 ? +(nbaCompleted / nbaItems.length * 100).toFixed(1) : 0,
      naacReadiness: naacItems.length > 0 ? +(naacCompleted / naacItems.length * 100).toFixed(1) : 0
    },
    topStudents: [...students]
      .filter(s => getLatestMetric(s))
      .sort((a, b) => (getLatestMetric(b)?.cgpa || 0) - (getLatestMetric(a)?.cgpa || 0))
      .slice(0, 5)
      .map(s => ({ name: s.name, rollNo: s.rollNo, cgpa: getLatestMetric(s)?.cgpa || 0 })),
    highRiskStudents: students.filter(s => s.riskLevel === "HIGH").slice(0, 5)
      .map(s => ({ name: s.name, cgpa: getLatestMetric(s)?.cgpa || 0, attendance: getLatestMetric(s)?.attendancePercent || 0 }))
  };

  const q = question.trim().toLowerCase();
  let prompt = question;
  if (!["hello", "hi", "hey", "who are you", "what are you", "test", "ok"].includes(q)) {
      prompt = buildStreamingSearchPrompt(question, databaseSummary);
  }

  // Set SSE headers
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });
  res.flushHeaders();

  try {
    const ollamaRes = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral:latest",
        prompt,
        stream: true,
        options: { num_predict: 80, temperature: 0.3, top_p: 0.9 }
      })
    });

    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(l => l.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) {
            res.write(`data: ${JSON.stringify({ token: json.response })}\n\n`);
          }
          if (json.done) {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          }
        } catch {}
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "AI unavailable" })}\n\n`);
  }

  res.end();
};

