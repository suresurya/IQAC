/**
 * IQAC COMPLETE TEST SUITE — FIXED VERSION
 * All 8 bugs from previous version corrected:
 *   Bug 1: Mistral test now rejects fallback string as a passing result
 *   Bug 2: All LLM job tests reject "unavailable" fallback string
 *   Bug 3: Dept name check uses full department name not just first word
 *   Bug 4: High risk count uses word boundary regex not plain substring
 *   Bug 5: Total students word form check uses exact match per number
 *   Bug 6: Load test threshold 240s → 30s when Groq is configured
 *   Bug 7: POST /students create endpoint test added to Suite 3
 *   Bug 8: Worst dept check handles equal CGPA tie between departments
 * Run: node src/utils/testAll.js
 */

import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "../config/db.js";
import Student from "../models/Student.js";
import Department from "../models/Department.js";
import User from "../models/User.js";
import Placement from "../models/Placement.js";
import Research from "../models/Research.js";
import AccreditationItem from "../models/AccreditationItem.js";
import {
  callMistral,
  generateStudentProgressAnalysis,
  generateDepartmentPerformanceAnalysis,
  generateCGPADistributionAnalysis,
  generateBacklogAnalysis,
  generatePlacementForecast,
  generateFacultyContributionSummary,
  generateAccreditationReadinessAssessment,
  answerNaturalLanguageQuery,
  getCached,
  setCache,
  clearCache
} from "../services/llmService.js";

// ── FALLBACK DETECTION ────────────────────────────────────────
// These phrases are returned when Mistral/Groq is down or errored.
// Any test that receives these strings must FAIL — not pass.
const FALLBACK_PHRASES = [
  "unavailable",
  "timed out",
  "data is accurate",
  "ai analysis unavailable",
  "temporarily unavailable",
  "core data is accurate"
];

const isRealLLMResponse = (text) => {
  if (!text || text.length < 30) return false;
  const lower = text.toLowerCase();
  return !FALLBACK_PHRASES.some(phrase => lower.includes(phrase));
};

// ── NUMBER MATCHING ───────────────────────────────────────────
// Maps integers to their English word forms for exact matching.
// Prevents "4" matching "7.4" or "fourteen" matching random text.
const NUMBER_WORDS = {
  1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
  6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
  11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen",
  15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen",
  19: "nineteen", 20: "twenty", 30: "thirty", 40: "forty",
  50: "fifty", 60: "sixty", 70: "seventy", 80: "eighty",
  90: "ninety", 100: "one hundred"
};

const containsNumber = (text, num) => {
  if (!text) return false;
  // Word boundary check — "4" does not match "7.4" or "24"
  const numRegex = new RegExp(`\\b${num}\\b`);
  const wordForm = NUMBER_WORDS[num];
  const wordRegex = wordForm ? new RegExp(`\\b${wordForm}\\b`, "i") : null;
  return numRegex.test(text) || (wordRegex ? wordRegex.test(text) : false);
};

// ── TEST RUNNER ───────────────────────────────────────────────
const results = [];
let totalPass = 0;
let totalFail = 0;
let currentSuite = "";

const suite = (name) => {
  currentSuite = name;
  console.log(`\n${"═".repeat(65)}`);
  console.log(`  ${name}`);
  console.log(`${"═".repeat(65)}`);
};

const test = async (name, fn) => {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    const passed = result !== false;
    if (passed) {
      totalPass++;
      console.log(`  ✓  ${name.padEnd(55)} ${duration}ms`);
    } else {
      totalFail++;
      console.log(`  ✗  ${name.padEnd(55)} FAIL`);
    }
    results.push({ suite: currentSuite, name, passed, duration });
    return result;
  } catch (err) {
    totalFail++;
    const duration = Date.now() - start;
    console.log(`  ✗  ${name.padEnd(55)} ERROR: ${err.message.substring(0, 55)}`);
    results.push({ suite: currentSuite, name, passed: false, error: err.message, duration });
    return false;
  }
};

const expect = (value, condition, message) => {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}. Got: ${JSON.stringify(value)}`);
  }
  return true;
};

// ── SETUP ─────────────────────────────────────────────────────
let adminToken = "";
let hodToken = "";
let facultyToken = "";
let studentToken = "";
let testStudentId = "";
let testDeptId = "";
const BASE_URL = "http://localhost:5000/api";

const apiCall = async (method, path, body = null, token = "") => {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

// ── SHARED DATA (built once in Suite 7, reused in 8, 9, 11, 12) ─
let liveStudents, liveDepts, livePlacements, liveResearch, liveNBA, liveNAAC;
let aggregatedStudentData, aggregatedDeptData, aggregatedCgpaDist;
let aggregatedBacklogData, aggregatedPlacementData, aggregatedFacultyData;
let aggregatedAccreditationData, aggregatedDbSummary;

const getLatest = (s) =>
  s.metrics?.length > 0 ? s.metrics[s.metrics.length - 1] : null;

// ═══════════════════════════════════════════════════════════════
const run = async () => {
  console.log("\n" + "█".repeat(65));
  console.log("  IQAC COMPLETE TEST SUITE — FIXED VERSION");
  console.log("  Tests all features against real MongoDB + Mistral/Groq");
  console.log("█".repeat(65));

  await connectDB();
  console.log("\n  MongoDB connected ✓");

  // ──────────────────────────────────────────────
  suite("SUITE 1 — Pre-flight Checks");
  // ──────────────────────────────────────────────

  await test("Backend server running at port 5000", async () => {
    const { status, data } = await apiCall("GET", "/health");
    return expect(status, status === 200, "health 200") &&
      expect(data.success, data.success === true, "success true");
  });

  await test("MongoDB has students", async () => {
    const n = await Student.countDocuments();
    return expect(n, n > 0, "students > 0");
  });

  await test("MongoDB has departments", async () => {
    const n = await Department.countDocuments();
    return expect(n, n > 0, "departments > 0");
  });

  await test("MongoDB has users", async () => {
    const n = await User.countDocuments();
    return expect(n, n > 0, "users > 0");
  });

  await test("Ollama running at port 11434", async () => {
    const res = await fetch("http://localhost:11434", {
      signal: AbortSignal.timeout(3000)
    }).catch(() => null);
    return expect(res, res !== null, "Ollama reachable");
  });

  await test("Mistral model available in Ollama", async () => {
    const res = await fetch("http://localhost:11434/api/tags", {
      signal: AbortSignal.timeout(3000)
    }).catch(() => null);
    if (!res) return false;
    const data = await res.json().catch(() => ({}));
    const has = data.models?.some(m => m.name?.includes("mistral"));
    return expect(has, has, "mistral in model list");
  });

  // BUG 1 FIX: rejects the fallback string "AI analysis unavailable..."
  await test("Mistral gives real response not fallback string", async () => {
    const r = await callMistral("Say exactly: IQAC_TEST_OK", 15);
    return expect(r, isRealLLMResponse(r),
      `real LLM response — got: "${r?.substring(0, 60)}"`);
  });

  // ──────────────────────────────────────────────
  suite("SUITE 2 — Authentication Tests");
  // ──────────────────────────────────────────────

  await test("Admin login succeeds", async () => {
    const { status, data } = await apiCall("POST", "/auth/login", {
      email: "admin@iqac.edu", password: "Admin@123"
    });
    adminToken = data.token || "";
    return expect(status, status === 200, "200") &&
      expect(data.token, !!data.token, "token present");
  });

  await test("HOD login succeeds", async () => {
    const hod = await User.findOne({ role: "hod" });
    if (!hod) { console.log("    (skipped — no HOD in DB)"); return true; }
    const { status, data } = await apiCall("POST", "/auth/login", {
      email: hod.email, password: "Admin@123"
    });
    hodToken = data.token || "";
    return expect(status, status === 200, "hod 200");
  });

  await test("Faculty login succeeds", async () => {
    const fac = await User.findOne({ role: "faculty" });
    if (!fac) { console.log("    (skipped — no faculty in DB)"); return true; }
    const { status, data } = await apiCall("POST", "/auth/login", {
      email: fac.email, password: "Admin@123"
    });
    facultyToken = data.token || "";
    return expect(status, status === 200, "faculty 200");
  });

  await test("Wrong password returns 401", async () => {
    const { status } = await apiCall("POST", "/auth/login", {
      email: "admin@iqac.edu", password: "wrongpassword"
    });
    return expect(status, status === 401, "401");
  });

  await test("Non-existent email returns 401", async () => {
    const { status } = await apiCall("POST", "/auth/login", {
      email: "nobody@nowhere.com", password: "Admin@123"
    });
    return expect(status, status === 401, "401");
  });

  await test("No token returns 401", async () => {
    const { status } = await apiCall("GET", "/analytics/overview");
    return expect(status, status === 401, "401 without token");
  });

  await test("Valid token returns 200", async () => {
    const { status } = await apiCall("GET", "/analytics/overview", null, adminToken);
    return expect(status, status === 200, "200 with token");
  });

  await test("GET /auth/me returns admin role", async () => {
    const { status, data } = await apiCall("GET", "/auth/me", null, adminToken);
    return expect(status, status === 200, "200") &&
      expect(data.data?.role, data.data?.role === "admin", "admin role");
  });

  await test("Invalid token returns 401", async () => {
    const { status } = await apiCall("GET", "/analytics/overview", null, "bad.token");
    return expect(status, status === 401, "401 for invalid token");
  });

  // ──────────────────────────────────────────────
  suite("SUITE 3 — Student API Tests");
  // ──────────────────────────────────────────────

  await test("GET /students returns list", async () => {
    const { status, data } = await apiCall("GET", "/students", null, adminToken);
    testStudentId = data.data?.[0]?._id || "";
    return expect(status, status === 200, "200") &&
      expect(data.data, Array.isArray(data.data), "array");
  });

  await test("GET /students filters by department", async () => {
    const dept = await Department.findOne();
    testDeptId = String(dept?._id || "");
    const { status } = await apiCall(`GET`, `/students?department=${testDeptId}`, null, adminToken);
    return expect(status, status === 200, "200");
  });

  await test("GET /students filters by riskLevel HIGH", async () => {
    const { status, data } = await apiCall("GET", "/students?riskLevel=HIGH", null, adminToken);
    const allHigh = data.data?.every(s => s.riskLevel === "HIGH");
    return expect(status, status === 200, "200") &&
      expect(allHigh, allHigh !== false, "all HIGH");
  });

  await test("GET /students/:id/dashboard returns full data", async () => {
    if (!testStudentId) return true;
    const { status, data } = await apiCall(
      "GET", `/students/${testStudentId}/dashboard`, null, adminToken
    );
    return expect(status, status === 200, "200") &&
      expect(data.data?.student, !!data.data?.student, "student present");
  });

  await test("GET /students/:id/dashboard 404 for bad ID", async () => {
    const { status } = await apiCall(
      "GET", "/students/000000000000000000000000/dashboard", null, adminToken
    );
    return expect(status, status === 404, "404");
  });

  // BUG 7 FIX: POST /students create endpoint was not tested before
  await test("POST /students creates new student", async () => {
    const dept = await Department.findOne();
    const { status } = await apiCall("POST", "/students", {
      rollNo: `TESTROLL${Date.now()}`,
      name: "Test Create Student",
      email: `testcreate${Date.now()}@test.edu`,
      department: dept?._id,
      currentSemester: 1,
      batch: "2023-2027"
    }, adminToken);
    return expect(status, status === 201, "201 for create");
  });

  await test("POST /students/:id/metrics adds semester data", async () => {
    if (!testStudentId) return true;
    const { status } = await apiCall(
      "POST", `/students/${testStudentId}/metrics`, {
      semester: 7, academicYear: "2024-25",
      sgpa: 7.5, cgpa: 7.4, backlogCount: 0, attendancePercent: 85
    }, adminToken
    );
    return expect(status, status === 200, "200");
  });

  // ──────────────────────────────────────────────
  suite("SUITE 4 — Department API Tests");
  // ──────────────────────────────────────────────

  await test("GET /departments returns all", async () => {
    const { status, data } = await apiCall("GET", "/departments", null, adminToken);
    return expect(status, status === 200, "200") &&
      expect(data.data?.length, data.data?.length > 0, "length > 0");
  });

  await test("GET /departments/:id/analytics returns metrics", async () => {
    if (!testDeptId) return true;
    const { status, data } = await apiCall(
      "GET", `/departments/${testDeptId}/analytics`, null, adminToken
    );
    return expect(status, status === 200, "200") &&
      expect(data.data?.averageCgpa, data.data?.averageCgpa !== undefined, "averageCgpa present");
  });

  await test("POST /departments/:id/placement adds data", async () => {
    if (!testDeptId) return true;
    const { status } = await apiCall(
      "POST", `/departments/${testDeptId}/placement`, {
      academicYear: "2024-25", totalEligible: 100, totalPlaced: 82,
      highestPackageLPA: 38, medianPackageLPA: 8.2,
      majorRecruiters: ["TCS", "Infosys"]
    }, adminToken
    );
    return expect(status, [200, 201].includes(status), "200 or 201");
  });

  // ──────────────────────────────────────────────
  suite("SUITE 5 — Analytics API Tests");
  // ──────────────────────────────────────────────

  await test("GET /analytics/overview returns KPIs", async () => {
    const { status, data } = await apiCall("GET", "/analytics/overview", null, adminToken);
    return expect(status, status === 200, "200") &&
      expect(data.data?.totalStudents, data.data?.totalStudents > 0, "totalStudents > 0") &&
      expect(data.data?.averageCgpa, data.data?.averageCgpa > 0, "averageCgpa > 0");
  });

  await test("Overview student count matches MongoDB", async () => {
    const actual = await Student.countDocuments();
    const { data } = await apiCall("GET", "/analytics/overview", null, adminToken);
    return expect(
      data.data?.totalStudents,
      data.data?.totalStudents === actual,
      `API ${data.data?.totalStudents} === DB ${actual}`
    );
  });

  await test("GET /analytics/department-comparison returns ranked list", async () => {
    const { status, data } = await apiCall(
      "GET", "/analytics/department-comparison", null, adminToken
    );
    return expect(status, status === 200, "200") &&
      expect(data.data, Array.isArray(data.data), "array");
  });

  await test("GET /analytics/risk-students HIGH returns only HIGH", async () => {
    const { status, data } = await apiCall(
      "GET", "/analytics/risk-students?risk=HIGH", null, adminToken
    );
    const allHigh = data.data?.every(s => s.riskLevel === "HIGH");
    return expect(status, status === 200, "200") &&
      expect(allHigh, allHigh !== false, "all HIGH");
  });

  await test("Risk student count matches MongoDB", async () => {
    const actual = await Student.countDocuments({ riskLevel: "HIGH" });
    const { data } = await apiCall(
      "GET", "/analytics/risk-students?risk=HIGH", null, adminToken
    );
    return expect(
      data.data?.length,
      data.data?.length === actual,
      `API ${data.data?.length} === DB ${actual}`
    );
  });

  // ──────────────────────────────────────────────
  suite("SUITE 6 — Accreditation API Tests");
  // ──────────────────────────────────────────────

  await test("GET /accreditation/readiness NBA returns score", async () => {
    const { status, data } = await apiCall(
      "GET", "/accreditation/readiness?type=NBA", null, adminToken
    );
    return expect(status, status === 200, "200") &&
      expect(data.data?.readinessScore, data.data?.readinessScore >= 0, ">= 0");
  });

  await test("GET /accreditation/readiness NAAC returns score", async () => {
    const { status, data } = await apiCall(
      "GET", "/accreditation/readiness?type=NAAC", null, adminToken
    );
    return expect(status, status === 200, "200") &&
      expect(data.data?.type, data.data?.type === "NAAC", "NAAC type");
  });

  await test("GET /accreditation/items returns all", async () => {
    const { status, data } = await apiCall("GET", "/accreditation/items", null, adminToken);
    return expect(status, status === 200, "200") &&
      expect(data.data, Array.isArray(data.data), "array");
  });

  await test("GET /accreditation/items filters NBA only", async () => {
    const { status, data } = await apiCall(
      "GET", "/accreditation/items?type=NBA", null, adminToken
    );
    const allNBA = data.data?.every(i => i.type === "NBA");
    return expect(status, status === 200, "200") &&
      expect(allNBA, allNBA !== false, "all NBA");
  });

  await test("Readiness score calculated correctly", async () => {
    const total = await AccreditationItem.countDocuments({ type: "NBA" });
    const completed = await AccreditationItem.countDocuments({ type: "NBA", completed: true });
    const expected = total ? parseFloat(((completed / total) * 100).toFixed(2)) : 0;
    const { data } = await apiCall("GET", "/accreditation/readiness?type=NBA", null, adminToken);
    const apiScore = data.data?.readinessScore;
    return expect(apiScore, Math.abs(apiScore - expected) < 1, `${apiScore} ≈ ${expected}`);
  });

  // ──────────────────────────────────────────────
  suite("SUITE 7 — LLM Data Aggregation");
  // ──────────────────────────────────────────────

  await test("Fetch all live data from MongoDB", async () => {
    [liveStudents, liveDepts, livePlacements, liveResearch, liveNBA, liveNAAC] =
      await Promise.all([
        Student.find().populate("department", "name code").lean(),
        Department.find().lean(),
        Placement.find().populate("department", "name code").lean(),
        Research.find()
          .populate("department", "name code")
          .populate("faculty", "name")
          .lean(),
        AccreditationItem.find({ type: "NBA" }).lean(),
        AccreditationItem.find({ type: "NAAC" }).lean()
      ]);
    return expect(liveStudents.length, liveStudents.length > 0, "students loaded");
  });

  await test("Build student aggregation correctly", async () => {
    const latestMetrics = liveStudents.map(getLatest).filter(Boolean);
    const cgpaSum = latestMetrics.reduce((s, m) => s + m.cgpa, 0);
    const avgCgpa = latestMetrics.length
      ? parseFloat((cgpaSum / latestMetrics.length).toFixed(2))
      : 0;

    aggregatedStudentData = {
      totalStudents: liveStudents.length,
      highRisk: liveStudents.filter(s => s.riskLevel === "HIGH").length,
      mediumRisk: liveStudents.filter(s => s.riskLevel === "MEDIUM").length,
      lowRisk: liveStudents.filter(s => s.riskLevel === "LOW").length,
      averageCgpa: avgCgpa,
      attendanceShortage: latestMetrics.filter(m => (m.attendancePercent || 100) < 75).length,
      totalBacklogs: latestMetrics.reduce((s, m) => s + (m.backlogCount || 0), 0),
      semesterWise: [1, 2, 3, 4, 5, 6].map(sem => {
        const sm = liveStudents
          .map(s => s.metrics?.find(m => m.semester === sem))
          .filter(Boolean);
        return {
          semester: sem,
          averageCgpa: sm.length ? +(sm.reduce((a, m) => a + m.cgpa, 0) / sm.length).toFixed(2) : 0,
          averageAttendance: sm.length ? +(sm.reduce((a, m) => a + (m.attendancePercent || 75), 0) / sm.length).toFixed(1) : 75,
          passPercent: sm.length ? +(sm.filter(m => m.backlogCount === 0).length / sm.length * 100).toFixed(1) : 80
        };
      }).filter(s => s.averageCgpa > 0),
      worstSemester: { semester: 3, passPercent: 70 },
      topDepartment: liveDepts[0]?.name || "CSE",
      bottomDepartment: liveDepts.at(-1)?.name || "CIVIL"
    };

    const dbHigh = await Student.countDocuments({ riskLevel: "HIGH" });
    return expect(
      aggregatedStudentData.highRisk,
      aggregatedStudentData.highRisk === dbHigh,
      `agg ${aggregatedStudentData.highRisk} === DB ${dbHigh}`
    );
  });

  await test("Build department comparison data", async () => {
    aggregatedDeptData = liveDepts.map(d => {
      const sid = String(d._id);
      const ds = liveStudents.filter(s => String(s.department?._id || s.department) === sid);
      const dm = ds.map(getLatest).filter(Boolean);
      const dp = livePlacements.filter(p => String(p.department?._id || p.department) === sid);
      const dr = liveResearch.filter(r => String(r.department?._id || r.department) === sid);
      let elig = 0, placed = 0;
      dp.forEach(p => { elig += p.totalEligible; placed += p.totalPlaced; });
      const avgC = dm.length ? dm.reduce((a, m) => a + m.cgpa, 0) / dm.length : 7;
      const passP = dm.length ? dm.filter(m => m.backlogCount === 0).length / dm.length * 100 : 80;
      const placR = elig > 0 ? placed / elig * 100 : 70;
      return {
        name: d.name,
        code: d.code,
        averageCgpa: parseFloat(avgC.toFixed(2)),
        passPercent: parseFloat(passP.toFixed(2)),
        backlogRate: parseFloat((dm.filter(m => m.backlogCount > 0).length / Math.max(dm.length, 1) * 100).toFixed(2)),
        placementRate: parseFloat(placR.toFixed(2)),
        researchCount: dr.length,
        achievementCount: 0,
        score: parseFloat((passP * 0.35 + avgC * 10 * 0.35 + placR * 0.3).toFixed(2))
      };
    });
    return expect(aggregatedDeptData.length, aggregatedDeptData.length === liveDepts.length, "count matches");
  });

  await test("Build CGPA distribution", async () => {
    const cgpas = liveStudents
      .map(s => getLatest(s)?.cgpa)
      .filter(c => c != null && c > 0)
      .sort((a, b) => a - b);
    aggregatedCgpaDist = {
      below_6: cgpas.filter(c => c < 6).length,
      six_to_seven: cgpas.filter(c => c >= 6 && c < 7).length,
      seven_to_eight: cgpas.filter(c => c >= 7 && c < 8).length,
      eight_to_nine: cgpas.filter(c => c >= 8 && c < 9).length,
      above_nine: cgpas.filter(c => c >= 9).length,
      averageCgpa: aggregatedStudentData.averageCgpa,
      medianCgpa: cgpas[Math.floor(cgpas.length / 2)] || 7,
      belowNBAThreshold: cgpas.filter(c => c < 6.5).length,
      totalStudents: liveStudents.length
    };
    return expect(aggregatedCgpaDist.totalStudents, aggregatedCgpaDist.totalStudents > 0, "> 0");
  });

  await test("Build backlog analysis data", async () => {
    const lm = liveStudents.map(getLatest).filter(Boolean);
    aggregatedBacklogData = {
      summary: {
        studentsWithNoBacklogs: lm.filter(m => (m.backlogCount || 0) === 0).length,
        studentsWithOneBacklog: lm.filter(m => (m.backlogCount || 0) === 1).length,
        studentsWithTwoBacklogs: lm.filter(m => (m.backlogCount || 0) === 2).length,
        studentsWithThreePlus: lm.filter(m => (m.backlogCount || 0) >= 3).length
      },
      byDepartment: aggregatedDeptData.map(d => ({
        department: d.name,
        totalBacklogs: Math.round(d.backlogRate),
        studentsAffected: Math.round(d.backlogRate / 10)
      })),
      bySemester: [1, 2, 3, 4, 5, 6].map(sem => ({
        semester: sem,
        studentsWithBacklogs: liveStudents.filter(s =>
          s.metrics?.some(m => m.semester === sem && m.backlogCount > 0)
        ).length
      })),
      topOffenders: liveStudents
        .filter(s => s.riskLevel === "HIGH")
        .slice(0, 10)
        .map(s => ({
          rollNo: s.rollNo,
          name: s.name,
          department: s.department?.code || "N/A",
          cgpa: getLatest(s)?.cgpa || 0,
          backlogCount: getLatest(s)?.backlogCount || 0
        })),
      totalStudents: liveStudents.length
    };
    const total = Object.values(aggregatedBacklogData.summary).reduce((a, b) => a + b, 0);
    return expect(total, Math.abs(total - lm.length) <= 2, `summary ${total} ≈ ${lm.length}`);
  });

  await test("Build placement data", async () => {
    const freq = {};
    livePlacements.flatMap(p => p.majorRecruiters || [])
      .forEach(r => { freq[r] = (freq[r] || 0) + 1; });
    aggregatedPlacementData = {
      institutionSummary: {
        totalEligible: livePlacements.reduce((s, p) => s + p.totalEligible, 0),
        totalPlaced: livePlacements.reduce((s, p) => s + p.totalPlaced, 0),
        overallPlacementRate: livePlacements.length
          ? parseFloat((livePlacements.reduce((s, p) => s + (p.totalEligible ? p.totalPlaced / p.totalEligible : 0), 0) / livePlacements.length * 100).toFixed(2))
          : 0,
        topPackage: Math.max(...livePlacements.map(p => p.highestPackageLPA || 0), 0),
        averageMedianPackage: livePlacements.length
          ? parseFloat((livePlacements.reduce((s, p) => s + (p.medianPackageLPA || 0), 0) / livePlacements.length).toFixed(2))
          : 0
      },
      byDepartment: livePlacements.map(p => ({
        department: p.department?.name || "Unknown",
        academicYear: p.academicYear,
        totalEligible: p.totalEligible,
        totalPlaced: p.totalPlaced,
        placementRate: p.totalEligible ? parseFloat((p.totalPlaced / p.totalEligible * 100).toFixed(2)) : 0,
        highestPackageLPA: p.highestPackageLPA || 0,
        medianPackageLPA: p.medianPackageLPA || 0
      })),
      topRecruiters: Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([r]) => r).slice(0, 10)
    };
    return expect(
      aggregatedPlacementData.institutionSummary.totalEligible,
      aggregatedPlacementData.institutionSummary.totalEligible >= 0,
      ">= 0"
    );
  });

  await test("Build faculty contribution data", async () => {
    const byType = {}, byFac = {};
    liveResearch.forEach(r => {
      byType[r.publicationType] = (byType[r.publicationType] || 0) + 1;
      const n = r.faculty?.name || "Unknown";
      byFac[n] = (byFac[n] || 0) + 1;
    });
    aggregatedFacultyData = {
      department: "All Departments",
      totalFaculty: await User.countDocuments({ role: "faculty" }) || 5,
      publications: liveResearch.slice(0, 5).map(r => ({
        faculty: r.faculty?.name || "Unknown",
        title: r.title,
        publicationType: r.publicationType,
        journalOrConference: r.journalOrConference || ""
      })),
      byType,
      byFaculty: Object.entries(byFac).map(([faculty, count]) => ({ faculty, count })),
      totalPublications: liveResearch.length
    };
    return expect(aggregatedFacultyData.totalPublications, aggregatedFacultyData.totalPublications >= 0, ">= 0");
  });

  await test("Build accreditation readiness data", async () => {
    const nbaC = liveNBA.filter(i => i.completed).length;
    const naacC = liveNAAC.filter(i => i.completed).length;
    aggregatedAccreditationData = {
      nba: {
        type: "NBA", totalItems: liveNBA.length || 1, completedItems: nbaC,
        readinessScore: liveNBA.length ? parseFloat((nbaC / liveNBA.length * 100).toFixed(2)) : 75,
        missingItems: liveNBA.filter(i => !i.completed).slice(0, 5).map(i => ({ title: i.title, criterion: i.criterion }))
      },
      naac: {
        type: "NAAC", totalItems: liveNAAC.length || 1, completedItems: naacC,
        readinessScore: liveNAAC.length ? parseFloat((naacC / liveNAAC.length * 100).toFixed(2)) : 70,
        missingItems: liveNAAC.filter(i => !i.completed).slice(0, 5).map(i => ({ title: i.title, criterion: i.criterion }))
      }
    };
    aggregatedDbSummary = {
      totalStudents: liveStudents.length,
      highRiskCount: aggregatedStudentData.highRisk,
      mediumRiskCount: aggregatedStudentData.mediumRisk,
      lowRiskCount: aggregatedStudentData.lowRisk,
      averageCgpa: aggregatedStudentData.averageCgpa,
      attendanceShortageCount: aggregatedStudentData.attendanceShortage,
      departments: aggregatedDeptData,
      accreditation: {
        nbaReadiness: aggregatedAccreditationData.nba.readinessScore,
        naacReadiness: aggregatedAccreditationData.naac.readinessScore,
        pendingNBA: liveNBA.filter(i => !i.completed).length,
        pendingNAAC: liveNAAC.filter(i => !i.completed).length
      }
    };
    return expect(
      aggregatedAccreditationData.nba.readinessScore,
      aggregatedAccreditationData.nba.readinessScore >= 0 &&
      aggregatedAccreditationData.nba.readinessScore <= 100,
      "NBA score 0-100"
    );
  });

  // ──────────────────────────────────────────────
  suite("SUITE 8 — LLM Job Tests (Mistral/Groq)");
  // ──────────────────────────────────────────────

  // BUG 2 FIX: Every job has an "is real LLM response" check that
  // rejects the fallback string. Previously these tests passed even
  // when Mistral was completely down returning "unavailable" strings.

  let j1, j2, j3, j4, j5, j6, j7;

  await test("Job 1 Student Progress responds", async () => {
    j1 = await generateStudentProgressAnalysis(aggregatedStudentData);
    return expect(j1, j1?.length > 30, "length > 30");
  });
  await test("Job 1 is real LLM not fallback string", async () => {
    return expect(j1, isRealLLMResponse(j1),
      `not fallback — got: "${j1?.substring(0, 60)}"`);
  });
  await test("Job 1 mentions CGPA, academic, or risk", async () => {
    const l = j1?.toLowerCase() || "";
    return expect(l, l.includes("cgpa") || l.includes("academic") || l.includes("risk"), "academic keyword present");
  });

  await test("Job 2 Department Performance responds", async () => {
    j2 = await generateDepartmentPerformanceAnalysis(aggregatedDeptData);
    return expect(j2, j2?.length > 30, "length > 30");
  });
  await test("Job 2 is real LLM not fallback string", async () => {
    return expect(j2, isRealLLMResponse(j2),
      `not fallback — got: "${j2?.substring(0, 60)}"`);
  });
  // BUG 3 FIX: checks full lowercase department name not just first word
  await test("Job 2 mentions a department full name", async () => {
    const l = j2?.toLowerCase() || "";
    const has = aggregatedDeptData.some(d => l.includes(d.name.toLowerCase()));
    return expect(has, has, "full department name in response");
  });

  await test("Job 3 CGPA Distribution responds", async () => {
    j3 = await generateCGPADistributionAnalysis(aggregatedCgpaDist);
    return expect(j3, j3?.length > 30, "length > 30");
  });
  await test("Job 3 is real LLM not fallback string", async () => {
    return expect(j3, isRealLLMResponse(j3),
      `not fallback — got: "${j3?.substring(0, 60)}"`);
  });
  await test("Job 3 mentions NBA or 6.5 threshold", async () => {
    const l = j3?.toLowerCase() || "";
    return expect(l, l.includes("nba") || l.includes("threshold") || l.includes("6.5"), "NBA or threshold");
  });

  await test("Job 4 Backlog Analysis responds", async () => {
    j4 = await generateBacklogAnalysis(aggregatedBacklogData);
    return expect(j4, j4?.length > 30, "length > 30");
  });
  await test("Job 4 is real LLM not fallback string", async () => {
    return expect(j4, isRealLLMResponse(j4),
      `not fallback — got: "${j4?.substring(0, 60)}"`);
  });
  await test("Job 4 mentions backlog or semester", async () => {
    const l = j4?.toLowerCase() || "";
    return expect(l, l.includes("backlog") || l.includes("semester"), "backlog or semester");
  });

  await test("Job 5 Placement Forecast responds", async () => {
    j5 = await generatePlacementForecast(aggregatedPlacementData);
    return expect(j5, j5?.length > 20, "length > 20");
  });
  await test("Job 5 is real LLM not fallback string", async () => {
    return expect(j5, isRealLLMResponse(j5),
      `not fallback — got: "${j5?.substring(0, 60)}"`);
  });

  await test("Job 6 Faculty Contribution responds", async () => {
    j6 = await generateFacultyContributionSummary(aggregatedFacultyData);
    return expect(j6, j6?.length > 20, "length > 20");
  });
  await test("Job 6 is real LLM not fallback string", async () => {
    return expect(j6, isRealLLMResponse(j6),
      `not fallback — got: "${j6?.substring(0, 60)}"`);
  });

  await test("Job 7 Accreditation Readiness responds", async () => {
    j7 = await generateAccreditationReadinessAssessment(aggregatedAccreditationData);
    return expect(j7, j7?.length > 30, "length > 30");
  });
  await test("Job 7 is real LLM not fallback string", async () => {
    return expect(j7, isRealLLMResponse(j7),
      `not fallback — got: "${j7?.substring(0, 60)}"`);
  });
  await test("Job 7 mentions NBA or NAAC", async () => {
    const l = j7?.toLowerCase() || "";
    return expect(l, l.includes("nba") || l.includes("naac"), "NBA or NAAC");
  });

  // ──────────────────────────────────────────────
  suite("SUITE 9 — LLM Accuracy Tests");
  // ──────────────────────────────────────────────

  // BUG 4 FIX: word boundary regex — "4" will not match "7.4" or "24"
  await test("High risk count in answer matches DB", async () => {
    const a = await answerNaturalLanguageQuery(
      "How many students are at high risk?", aggregatedDbSummary
    );
    const count = aggregatedStudentData.highRisk;
    return expect(a, containsNumber(a, count),
      `answer contains ${count} — got: "${a?.substring(0, 80)}"`);
  });

  // BUG 5 FIX: containsNumber uses exact word form for the specific total
  await test("Total students in answer matches DB", async () => {
    const a = await answerNaturalLanguageQuery(
      "How many total students are there?", aggregatedDbSummary
    );
    const total = aggregatedStudentData.totalStudents;
    return expect(a, containsNumber(a, total),
      `answer contains ${total} — got: "${a?.substring(0, 80)}"`);
  });

  await test("Avg CGPA appears in answer", async () => {
    const a = await answerNaturalLanguageQuery(
      "What is the average CGPA?", aggregatedDbSummary
    );
    const cgpaStr = String(aggregatedStudentData.averageCgpa).substring(0, 3);
    return expect(a, a?.includes(cgpaStr),
      `answer contains ${cgpaStr} — got: "${a?.substring(0, 80)}"`);
  });

  // BUG 8 FIX: handles tie — any department with the lowest CGPA is correct
  await test("Worst department identified correctly", async () => {
    const a = await answerNaturalLanguageQuery(
      "Which department has the lowest average CGPA?", aggregatedDbSummary
    );
    const sorted = [...aggregatedDeptData].sort((a, b) => a.averageCgpa - b.averageCgpa);
    const lowestScore = sorted[0]?.averageCgpa;
    // All departments tied at lowest are equally correct answers
    const tiedDepts = sorted.filter(d => d.averageCgpa === lowestScore);
    const lower = a?.toLowerCase() || "";
    const anyMatch = tiedDepts.some(d => lower.includes(d.name.toLowerCase()));
    return expect(anyMatch, anyMatch,
      `answer mentions one of: [${tiedDepts.map(d => d.name).join(", ")}] — got: "${a?.substring(0, 80)}"`);
  });

  await test("NBA readiness answered", async () => {
    const a = await answerNaturalLanguageQuery(
      "Is our institution ready for NBA?", aggregatedDbSummary
    );
    const l = a?.toLowerCase() || "";
    return expect(l, l.includes("nba") || l.includes("%") || l.includes("ready"),
      "addresses NBA readiness");
  });

  // ──────────────────────────────────────────────
  suite("SUITE 10 — Cache Tests");
  // ──────────────────────────────────────────────

  await test("setCache and getCached work", async () => {
    setCache("test_key_001", "test_value_abc");
    const v = getCached("test_key_001");
    return expect(v, v === "test_value_abc", "stores and retrieves");
  });

  await test("Cache miss returns null", async () => {
    const v = getCached("nonexistent_key_xyz_999");
    return expect(v, v === null, "null for unknown key");
  });

  await test("clearCache removes all entries", async () => {
    setCache("clear_test", "val");
    clearCache();
    const v = getCached("clear_test");
    return expect(v, v === null, "null after clear");
  });

  // ──────────────────────────────────────────────
  suite("SUITE 11 — Load Tests");
  // ──────────────────────────────────────────────

  // BUG 6 FIX: 30s limit when Groq is configured, 90s for Ollama-only
  // Previous 240s limit was meaningless — test passed even at 3 minutes
  await test("3 sequential LLM calls complete in time", async () => {
    clearCache();
    const limit = process.env.GROQ_API_KEY ? 30000 : 90000;
    const start = Date.now();
    await generateStudentProgressAnalysis(aggregatedStudentData);
    await generateCGPADistributionAnalysis(aggregatedCgpaDist);
    await generateBacklogAnalysis(aggregatedBacklogData);
    const total = Date.now() - start;
    console.log(`     3 sequential calls: ${total}ms (limit: ${limit}ms)`);
    return expect(total, total < limit,
      `${total}ms < ${limit}ms — add GROQ_API_KEY for faster responses`);
  });

  // ──────────────────────────────────────────────
  suite("SUITE 12 — NL Search (10 Questions)");
  // ──────────────────────────────────────────────

  const nlTests = [
    "Which department has the highest placement rate?",
    "How many students have attendance below 75 percent?",
    "What percentage of students are low risk?",
    "What is the NBA accreditation readiness score?",
    "How many research publications exist?",
    "Which semester has the most backlogs?",
    "Is NAAC readiness above 80 percent?",
    "How many accreditation items are pending?",
    "What is the total number of students placed?",
    "What is the overall pass percentage?"
  ];

  for (let i = 0; i < nlTests.length; i++) {
    const q = nlTests[i];
    await test(`Q${i + 1}: "${q.substring(0, 45)}..."`, async () => {
      const a = await answerNaturalLanguageQuery(q, aggregatedDbSummary);
      return expect(a, a && a.length > 10 && isRealLLMResponse(a),
        "non-empty real LLM answer");
    });
  }

  // ──────────────────────────────────────────────
  suite("SUITE 13 — Security Tests");
  // ──────────────────────────────────────────────

  await test("Student cannot access analytics", async () => {
    if (!studentToken) { console.log("    (skipped — no student token)"); return true; }
    const { status } = await apiCall("GET", "/analytics/overview", null, studentToken);
    return expect(status, status === 403, "403 for student role");
  });

  await test("Missing required fields returns 400+", async () => {
    const { status } = await apiCall("POST", "/students", { name: "NoRoll" }, adminToken);
    return expect(status, status >= 400, "validation error >= 400");
  });

  // ──────────────────────────────────────────────
  // FINAL REPORT
  // ──────────────────────────────────────────────
  console.log("\n" + "█".repeat(65));
  console.log("  FINAL TEST REPORT");
  console.log("█".repeat(65));

  const suiteNames = [...new Set(results.map(r => r.suite))];
  suiteNames.forEach(sN => {
    const sr = results.filter(r => r.suite === sN);
    const p = sr.filter(r => r.passed).length;
    console.log(`  ${p === sr.length ? "✓" : "✗"}  ${sN.padEnd(50)} ${p}/${sr.length}`);
  });

  const avgTime = results.reduce((s, r) => s + r.duration, 0) / results.length;
  console.log("\n" + "─".repeat(65));
  console.log(`  TOTAL PASSED  : ${totalPass}`);
  console.log(`  TOTAL FAILED  : ${totalFail}`);
  console.log(`  TOTAL TESTS   : ${results.length}`);
  console.log(`  SUCCESS RATE  : ${Math.round(totalPass / results.length * 100)}%`);
  console.log(`  AVG TEST TIME : ${Math.round(avgTime)}ms`);

  if (totalFail > 0) {
    console.log(`\n  FAILED TESTS:`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`    ✗ ${r.name}`);
      if (r.error) console.log(`      → ${r.error.substring(0, 100)}`);
    });

    if (results.some(r => !r.passed && r.suite.includes("SUITE 8"))) {
      console.log(`\n  LLM FIX NEEDED:`);
      console.log(`    Groq not configured — responses are fallback strings`);
      console.log(`    Add GROQ_API_KEY=your-key to backend/.env`);
      console.log(`    Get key at: console.groq.com`);
    }
    if (results.some(r => !r.passed && r.name.includes("Ollama"))) {
      console.log(`\n  OLLAMA FIX NEEDED:`);
      console.log(`    Run: ollama serve`);
      console.log(`    Then: ollama pull mistral:latest`);
    }
  }

  console.log("\n" + "█".repeat(65));
  process.exit(totalFail > 0 ? 1 : 0);
};

run().catch(err => {
  console.error("\nTEST SUITE CRASHED:", err.message);
  console.error(err.stack);
  process.exit(1);
});