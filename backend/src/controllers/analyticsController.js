import mongoose from "mongoose";
import Student from "../models/Student.js";
import Department from "../models/Department.js";
import Placement from "../models/Placement.js";
import Research from "../models/Research.js";
import Section from "../models/Section.js";
import Mark from "../models/Mark.js";
import FacultyAchievement from "../models/FacultyAchievement.js";
import Achievement from "../models/Achievement.js";
import StudentEvent from "../models/StudentEvent.js";
import {
  buildAnalyticsMatch,
  parsePagination,
  paginatedResponse
} from "../utils/analyticsHelpers.js";

// ─────────────────────────────────────────────────────────────
//  1. INSTITUTIONAL OVERVIEW  (GET /analytics/overview)
//     Filters: department, academicYear, semester
// ─────────────────────────────────────────────────────────────
export const institutionalOverview = async (req, res) => {
  const studentMatch = buildAnalyticsMatch(req.query, ["department"]);
  const metricsMatch = {};
  if (req.query.academicYear) metricsMatch["metrics.academicYear"] = req.query.academicYear;
  if (req.query.semester) metricsMatch["metrics.semester"] = Number(req.query.semester);

  // Student metrics pipeline
  const studentPipeline = [
    { $match: studentMatch },
    { $unwind: "$metrics" },
    ...(Object.keys(metricsMatch).length ? [{ $match: metricsMatch }] : []),
    {
      $group: {
        _id: null,
        studentIds: { $addToSet: "$_id" },
        avgCgpa: { $avg: "$metrics.cgpa" },
        totalMetrics: { $sum: 1 },
        passedMetrics: {
          $sum: { $cond: [{ $eq: ["$metrics.backlogCount", 0] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        totalStudents: { $size: "$studentIds" },
        avgCgpa: { $round: ["$avgCgpa", 2] },
        avgPassPercent: {
          $round: [
            { $multiply: [{ $divide: ["$passedMetrics", { $max: ["$totalMetrics", 1] }] }, 100] },
            2
          ]
        }
      }
    }
  ];

  // Risk distribution (separate lightweight query)
  const riskPipeline = [
    { $match: studentMatch },
    { $group: { _id: "$riskLevel", count: { $sum: 1 } } }
  ];

  // Placement pipeline
  const placementMatch = buildAnalyticsMatch(req.query, ["department"], {});
  if (req.query.academicYear) placementMatch.academicYear = req.query.academicYear;

  const placementPipeline = [
    { $match: placementMatch },
    {
      $group: {
        _id: null,
        totalPlaced: { $sum: "$totalPlaced" },
        totalEligible: { $sum: "$totalEligible" }
      }
    }
  ];

  const [studentResult, riskResult, placementResult, departments, research] = await Promise.all([
    Student.aggregate(studentPipeline).allowDiskUse(true),
    Student.aggregate(riskPipeline),
    Placement.aggregate(placementPipeline),
    Department.countDocuments(buildAnalyticsMatch(req.query, ["department"], { department: "objectid" })
      .department ? { _id: buildAnalyticsMatch(req.query, ["department"]).department } : {}),
    Research.countDocuments(buildAnalyticsMatch(req.query, ["department"]))
  ]);

  const stats = studentResult[0] || { totalStudents: 0, avgCgpa: 0, avgPassPercent: 0 };
  const risk = {};
  for (const r of riskResult) risk[r._id] = r.count;
  const placement = placementResult[0] || { totalPlaced: 0, totalEligible: 0 };

  res.status(200).json({
    success: true,
    data: {
      totalStudents: stats.totalStudents,
      totalDepartments: departments || 0,
      averageCgpa: stats.avgCgpa,
      averagePassPercent: stats.avgPassPercent,
      placementRate: placement.totalEligible
        ? Number(((placement.totalPlaced / placement.totalEligible) * 100).toFixed(2))
        : 0,
      researchPublications: research,
      riskDistribution: {
        highRisk: risk.HIGH || 0,
        mediumRisk: risk.MEDIUM || 0,
        lowRisk: risk.LOW || 0
      }
    }
  });
};

// ─────────────────────────────────────────────────────────────
//  2. DEPARTMENT COMPARISON  (GET /analytics/department-comparison)
//     Filters: department, academicYear, semester
//     Pagination + Sorting
// ─────────────────────────────────────────────────────────────
export const departmentComparison = async (req, res) => {
  const studentMatch = buildAnalyticsMatch(req.query, ["department"]);
  const metricsMatch = {};
  if (req.query.academicYear) metricsMatch["metrics.academicYear"] = req.query.academicYear;
  if (req.query.semester) metricsMatch["metrics.semester"] = Number(req.query.semester);

  const { page, limit, skip, sortStage } = parsePagination(
    req.query, "score",
    ["score", "averageCgpa", "passPercent", "placementRate", "department"]
  );

  const pipeline = [
    { $match: studentMatch },
    { $unwind: "$metrics" },
    ...(Object.keys(metricsMatch).length ? [{ $match: metricsMatch }] : []),
    {
      $group: {
        _id: "$department",
        avgCgpa: { $avg: "$metrics.cgpa" },
        totalMetrics: { $sum: 1 },
        passedMetrics: { $sum: { $cond: [{ $eq: ["$metrics.backlogCount", 0] }, 1, 0] } },
        backlogMetrics: { $sum: { $cond: [{ $gt: ["$metrics.backlogCount", 0] }, 1, 0] } }
      }
    },
    {
      $lookup: {
        from: "departments",
        localField: "_id",
        foreignField: "_id",
        as: "dept"
      }
    },
    { $unwind: "$dept" },
    {
      $lookup: {
        from: "placements",
        let: { deptId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$department", "$$deptId"] },
              ...(req.query.academicYear ? { academicYear: req.query.academicYear } : {})
            }
          },
          {
            $group: {
              _id: null,
              totalPlaced: { $sum: "$totalPlaced" },
              totalEligible: { $sum: "$totalEligible" }
            }
          }
        ],
        as: "placementData"
      }
    },
    {
      $project: {
        department: "$dept.name",
        code: "$dept.code",
        averageCgpa: { $round: ["$avgCgpa", 2] },
        passPercent: {
          $round: [
            { $multiply: [{ $divide: ["$passedMetrics", { $max: ["$totalMetrics", 1] }] }, 100] },
            2
          ]
        },
        backlogRate: {
          $round: [
            { $multiply: [{ $divide: ["$backlogMetrics", { $max: ["$totalMetrics", 1] }] }, 100] },
            2
          ]
        },
        placementRate: {
          $let: {
            vars: {
              pd: { $arrayElemAt: ["$placementData", 0] }
            },
            in: {
              $cond: [
                { $and: ["$$pd", { $gt: ["$$pd.totalEligible", 0] }] },
                { $round: [{ $multiply: [{ $divide: ["$$pd.totalPlaced", "$$pd.totalEligible"] }, 100] }, 2] },
                0
              ]
            }
          }
        }
      }
    },
    {
      $addFields: {
        score: {
          $round: [
            {
              $add: [
                { $multiply: ["$passPercent", 0.35] },
                { $multiply: [{ $multiply: ["$averageCgpa", 10] }, 0.35] },
                { $multiply: ["$placementRate", 0.3] }
              ]
            },
            2
          ]
        }
      }
    },
    { $sort: { score: -1 } },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        allRows: { $push: "$$ROOT" }
      }
    },
    {
      $project: {
        totalCount: 1,
        data: { $slice: ["$allRows", skip, limit] }
      }
    }
  ];

  const result = await Student.aggregate(pipeline).allowDiskUse(true);
  const { totalCount = 0, data = [] } = result[0] || {};

  // Add rank
  const ranked = data.map((row, idx) => ({
    rank: skip + idx + 1,
    ...row,
    _id: undefined
  }));

  return res.status(200).json(paginatedResponse(ranked, totalCount, page, limit));
};

// ─────────────────────────────────────────────────────────────
//  3. RISK STUDENTS  (GET /analytics/risk-students)
//     Filters: risk, department, academicYear, semester
//     Pagination + Sorting
// ─────────────────────────────────────────────────────────────
export const riskStudents = async (req, res) => {
  const { risk = "HIGH" } = req.query;
  const match = buildAnalyticsMatch(req.query, ["department"]);
  match.riskLevel = risk;

  // acadmic year / semester via $elemMatch if provided
  if (req.query.academicYear || req.query.semester) {
    const elemMatch = {};
    if (req.query.academicYear) elemMatch.academicYear = req.query.academicYear;
    if (req.query.semester) elemMatch.semester = Number(req.query.semester);
    match.metrics = { $elemMatch: elemMatch };
  }

  const { page, limit, skip } = parsePagination(req.query);

  const [data, totalCount] = await Promise.all([
    Student.find(match)
      .populate("department", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Student.countDocuments(match)
  ]);

  return res.status(200).json(paginatedResponse(data, totalCount, page, limit));
};

// ─────────────────────────────────────────────────────────────
//  4. STUDENT COMPARISON  (GET /analytics/student-comparison)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
//  5. SECTION COMPARISON  (GET /analytics/section-comparison)
//     Filters: department, academicYear
//     Pagination
// ─────────────────────────────────────────────────────────────
export const sectionComparison = async (req, res) => {
  const sectionMatch = buildAnalyticsMatch(req.query, ["department"]);
  const { page, limit, skip } = parsePagination(req.query);

  // Build student match with academic year
  const studentMatch = buildAnalyticsMatch(req.query, ["department"]);
  const metricsMatch = {};
  if (req.query.academicYear) metricsMatch["metrics.academicYear"] = req.query.academicYear;

  // Get sections
  const sectionFilter = {};
  if (sectionMatch.department) sectionFilter.department = sectionMatch.department;
  const [sections, totalCount] = await Promise.all([
    Section.find(sectionFilter).populate("department", "name code").skip(skip).limit(limit),
    Section.countDocuments(sectionFilter)
  ]);

  // Get student aggregation by section
  const studentPipeline = [
    { $match: studentMatch },
    ...(Object.keys(metricsMatch).length
      ? [{ $unwind: "$metrics" }, { $match: metricsMatch }]
      : [{ $addFields: { metrics: { $ifNull: [{ $last: "$metrics" }, null] } } }]
    ),
    {
      $group: {
        _id: "$section",
        avgCgpa: { $avg: "$metrics.cgpa" },
        studentCount: { $addToSet: "$_id" },
        highRisk: { $sum: { $cond: [{ $eq: ["$riskLevel", "HIGH"] }, 1, 0] } },
        mediumRisk: { $sum: { $cond: [{ $eq: ["$riskLevel", "MEDIUM"] }, 1, 0] } },
        lowRisk: { $sum: { $cond: [{ $eq: ["$riskLevel", "LOW"] }, 1, 0] } }
      }
    }
  ];

  const sectionStats = await Student.aggregate(studentPipeline).allowDiskUse(true);
  const statsMap = {};
  for (const s of sectionStats) statsMap[String(s._id)] = s;

  // Mark pass rate by section
  const markPipeline = [
    ...(sectionMatch.department
      ? [{
        $lookup: {
          from: "students", localField: "student", foreignField: "_id", as: "stu"
        }
      }, { $unwind: "$stu" }, { $match: { "stu.department": sectionMatch.department } }]
      : []),
    { $group: { _id: "$section", total: { $sum: 1 }, passed: { $sum: { $cond: ["$passed", 1, 0] } } } }
  ];

  const markStats = await Mark.aggregate(markPipeline).allowDiskUse(true);
  const markMap = {};
  for (const m of markStats) markMap[String(m._id)] = m;

  const rows = sections.map((section) => {
    const ss = statsMap[String(section._id)] || {};
    const ms = markMap[String(section._id)] || { total: 0, passed: 0 };
    return {
      sectionId: section._id,
      section: section.code,
      department: section.department?.code || "-",
      passPercent: ms.total ? Number(((ms.passed / ms.total) * 100).toFixed(2)) : 0,
      averageCgpa: Number((ss.avgCgpa || 0).toFixed(2)),
      riskDistribution: {
        high: ss.highRisk || 0,
        medium: ss.mediumRisk || 0,
        low: ss.lowRisk || 0
      }
    };
  });

  return res.status(200).json(paginatedResponse(rows, totalCount, page, limit));
};

// ─────────────────────────────────────────────────────────────
//  6. EXTENDED DEPARTMENT COMPARISON
//     (GET /analytics/department-comparison-extended)
//     Filters: department, academicYear
//     Pagination
// ─────────────────────────────────────────────────────────────
export const extendedDepartmentComparison = async (req, res) => {
  const studentMatch = buildAnalyticsMatch(req.query, ["department"]);
  const metricsMatch = {};
  if (req.query.academicYear) metricsMatch["metrics.academicYear"] = req.query.academicYear;
  const { page, limit, skip } = parsePagination(req.query);

  const pipeline = [
    { $match: studentMatch },
    { $unwind: "$metrics" },
    ...(Object.keys(metricsMatch).length ? [{ $match: metricsMatch }] : []),
    {
      $group: {
        _id: "$department",
        avgCgpa: { $avg: "$metrics.cgpa" },
        studentIds: { $addToSet: "$_id" },
        highRisk: { $sum: { $cond: [{ $eq: ["$riskLevel", "HIGH"] }, 1, 0] } },
        mediumRisk: { $sum: { $cond: [{ $eq: ["$riskLevel", "MEDIUM"] }, 1, 0] } },
        lowRisk: { $sum: { $cond: [{ $eq: ["$riskLevel", "LOW"] }, 1, 0] } }
      }
    },
    {
      $lookup: {
        from: "departments",
        localField: "_id",
        foreignField: "_id",
        as: "dept"
      }
    },
    { $unwind: "$dept" },
    {
      $lookup: {
        from: "facultyachievements",
        localField: "_id",
        foreignField: "department",
        as: "facAch"
      }
    },
    {
      $project: {
        departmentId: "$_id",
        department: "$dept.name",
        averageCgpa: { $round: ["$avgCgpa", 2] },
        facultyContribution: { $size: "$facAch" },
        riskDistribution: {
          high: "$highRisk",
          medium: "$mediumRisk",
          low: "$lowRisk"
        }
      }
    },
    { $sort: { averageCgpa: -1 } },
    {
      $facet: {
        metadata: [{ $count: "totalCount" }],
        data: [{ $skip: skip }, { $limit: limit }]
      }
    }
  ];

  const result = await Student.aggregate(pipeline).allowDiskUse(true);
  const totalCount = result[0]?.metadata[0]?.totalCount || 0;
  const data = result[0]?.data || [];

  return res.status(200).json(paginatedResponse(data, totalCount, page, limit));
};

// ─────────────────────────────────────────────────────────────
//  7. SUBJECT PASS ANALYTICS  (GET /analytics/subject-pass)
//     Filters: department, semester, academicYear
//     Pagination + Sorting
// ─────────────────────────────────────────────────────────────
export const subjectPassAnalytics = async (req, res) => {
  const { department, semester, academicYear } = req.query;
  const { page, limit, skip, sortStage } = parsePagination(
    req.query, "passPercent",
    ["passPercent", "averageMarks", "subjectCode", "totalAppeared"]
  );

  const markMatch = {};
  if (semester) markMatch.semester = Number(semester);
  if (academicYear) markMatch.academicYear = academicYear;

  const pipeline = [
    { $match: markMatch },
    // Join student if department filter is needed
    ...(department
      ? [
        {
          $lookup: {
            from: "students",
            localField: "student",
            foreignField: "_id",
            as: "stu"
          }
        },
        { $unwind: "$stu" },
        { $match: { "stu.department": new mongoose.Types.ObjectId(department) } }
      ]
      : []),
    {
      $group: {
        _id: "$subjectCode",
        subjectName: { $first: "$subjectName" },
        totalAppeared: { $sum: 1 },
        totalPassed: { $sum: { $cond: ["$passed", 1, 0] } },
        totalMarks: { $sum: { $ifNull: ["$total", 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        subjectCode: "$_id",
        subjectName: 1,
        totalAppeared: 1,
        totalPassed: 1,
        passPercent: {
          $round: [
            { $multiply: [{ $divide: ["$totalPassed", { $max: ["$totalAppeared", 1] }] }, 100] },
            2
          ]
        },
        averageMarks: {
          $round: [
            { $divide: ["$totalMarks", { $max: ["$totalAppeared", 1] }] },
            2
          ]
        }
      }
    },
    { $sort: sortStage },
    {
      $facet: {
        metadata: [{ $count: "totalCount" }],
        data: [{ $skip: skip }, { $limit: limit }]
      }
    }
  ];

  const result = await Mark.aggregate(pipeline).allowDiskUse(true);
  const totalCount = result[0]?.metadata[0]?.totalCount || 0;
  const data = result[0]?.data || [];

  return res.status(200).json(paginatedResponse(data, totalCount, page, limit));
};

// ─────────────────────────────────────────────────────────────
//  8. ACHIEVEMENT ANALYTICS  (GET /analytics/achievements)
//     Filters: department, category, level, accreditationCriteria
//     Pagination
// ─────────────────────────────────────────────────────────────
export const achievementAnalytics = async (req, res) => {
  const match = buildAnalyticsMatch(
    req.query,
    ["department", "category", "level", "accreditationCriteria"]
  );
  const { page, limit, skip } = parsePagination(req.query);

  const pipeline = [
    { $match: match },
    {
      $facet: {
        byCategory: [{ $group: { _id: "$category", count: { $sum: 1 } } }],
        byLevel: [{ $group: { _id: "$level", count: { $sum: 1 } } }],
        total: [{ $count: "count" }],
        data: [
          { $sort: { date: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: "departments",
              localField: "department",
              foreignField: "_id",
              as: "dept"
            }
          },
          {
            $addFields: {
              department: { $arrayElemAt: ["$dept", 0] }
            }
          },
          { $project: { dept: 0 } }
        ]
      }
    }
  ];

  const result = await Achievement.aggregate(pipeline).allowDiskUse(true);
  const facets = result[0] || {};
  const totalCount = facets.total?.[0]?.count || 0;
  const data = facets.data || [];

  const byCategory = {};
  for (const c of (facets.byCategory || [])) byCategory[c._id] = c.count;
  const byLevel = {};
  for (const l of (facets.byLevel || [])) byLevel[l._id] = l.count;

  return res.status(200).json({
    ...paginatedResponse(data, totalCount, page, limit),
    summary: { total: totalCount, byCategory, byLevel }
  });
};

// ─────────────────────────────────────────────────────────────
//  9. STUDENT PARTICIPATION  (GET /analytics/student-participation)
//     Filters: department, academicYear, eventType
//     Pagination
// ─────────────────────────────────────────────────────────────
export const studentParticipationAnalytics = async (req, res) => {
  const match = buildAnalyticsMatch(
    req.query,
    ["department", "academicYear", "eventType"]
  );
  const { page, limit, skip } = parsePagination(req.query);

  const pipeline = [
    { $match: match },
    {
      $facet: {
        byType: [{ $group: { _id: "$eventType", count: { $sum: 1 } } }],
        byLevel: [{ $group: { _id: "$level", count: { $sum: 1 } } }],
        byDept: [{ $group: { _id: "$department", count: { $sum: 1 } } }],
        total: [{ $count: "count" }],
        data: [
          { $sort: { date: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: "departments",
              localField: "department",
              foreignField: "_id",
              as: "dept"
            }
          },
          {
            $lookup: {
              from: "students",
              localField: "student",
              foreignField: "_id",
              as: "stu"
            }
          },
          {
            $addFields: {
              department: {
                $let: {
                  vars: { d: { $arrayElemAt: ["$dept", 0] } },
                  in: { _id: "$$d._id", name: "$$d.name", code: "$$d.code" }
                }
              },
              student: {
                $let: {
                  vars: { s: { $arrayElemAt: ["$stu", 0] } },
                  in: { _id: "$$s._id", name: "$$s.name", rollNo: "$$s.rollNo" }
                }
              }
            }
          },
          { $project: { dept: 0, stu: 0 } }
        ]
      }
    }
  ];

  const result = await StudentEvent.aggregate(pipeline).allowDiskUse(true);
  const facets = result[0] || {};
  const totalCount = facets.total?.[0]?.count || 0;
  const data = facets.data || [];

  const byType = {};
  for (const t of (facets.byType || [])) byType[t._id] = t.count;
  const byLevel = {};
  for (const l of (facets.byLevel || [])) byLevel[l._id] = l.count;
  const byDept = {};
  for (const d of (facets.byDept || [])) byDept[String(d._id)] = d.count;

  return res.status(200).json({
    ...paginatedResponse(data, totalCount, page, limit),
    summary: { total: totalCount, byType, byLevel, byDept }
  });
};

// ─────────────────────────────────────────────────────────────
//  PUBLIC STATS  (GET /analytics/public-stats) — no auth
// ─────────────────────────────────────────────────────────────
export const publicStats = async (_, res) => {
  const [students, departments, research] = await Promise.all([
    Student.countDocuments(),
    Department.countDocuments(),
    Research.countDocuments()
  ]);
  return res.status(200).json({
    success: true,
    data: { totalStudents: students, totalDepartments: departments, researchPublications: research }
  });
};
