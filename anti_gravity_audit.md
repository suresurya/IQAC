# 🔻 ANTI-GRAVITY AUDIT REPORT — IQAC System

---

## BUG #1
| Field | Value |
|---|---|
| **FILE** | [seedRealData.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/seedRealData.js) / [seedComplete.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/seedComplete.js) → [Attendance.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/seedAttendance.js) (model) |
| **CATEGORY** | Schema Conflict |
| **SEVERITY** | **CRITICAL** |
| **DESCRIPTION** | The seed scripts write `totalClasses`, `attendedClasses`, `percentage` as flat fields on the Attendance document, **but the Attendance schema requires [subjects](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/generate_data.py#44-46) (an array of `subjectAttendanceSchema`)** with `classesConducted`, `classesAttended`, `percentage`. The seed script never populates `subjects[]`, so the Student Dashboard `attendanceBySubject` view is **always an empty array**. |
| **EVIDENCE** | `Attendance.js:6-13` defines `subjectAttendanceSchema` with `classesConducted` / `classesAttended`. [seedRealData.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/seedRealData.js) writes `totalClasses` / `attendedClasses` (flat). `studentController.js:149`: `attendanceBySubject: semesterAttendance?.subjects \|\| []` — always `[]`. |
| **IMPACT** | The Student Dashboard "Attendance by Subject" table is permanently empty for all seeded students. |
| **FIX** | Seed scripts must populate `subjects[]` with per-subject attendance rows using the correct field names (`classesConducted`, `classesAttended`, `percentage`). |

---

## BUG #2
| Field | Value |
|---|---|
| **FILE** | `facultyController.js:306` vs `reportController.js:62` vs [seedRealData.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/seedRealData.js) |
| **CATEGORY** | Report Logic |
| **SEVERITY** | **CRITICAL** |
| **DESCRIPTION** | **Pass threshold is contradictory across the codebase.** `facultyController.js:306` uses `total >= 40` as pass. `reportController.js:42-43` uses `backlogCount === 0` as pass. [seedRealData.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/seedRealData.js) uses `total >= 50 && external >= 24`. [analyticsController.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/analyticsController.js) (subjectPassAnalytics) reads `mark.passed` which was set by whichever code path created it. |
| **EVIDENCE** | `facultyController.js:306`: `passed: total >= 40`. `seedRealData.js:119`: `total >= 50 && external >= 24`. |
| **IMPACT** | A student who scores 42 total is simultaneously marked PASS by the faculty upload but FAIL by the seed logic. Reports become unreliable. |
| **FIX** | Standardize the pass threshold to a single source of truth: `total >= 50 && external >= 24` across all files. |

---

## BUG #3
| Field | Value |
|---|---|
| **FILE** | [Student.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/models/Student.js) / [studentController.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/studentController.js) / [analyticsController.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/analyticsController.js) |
| **CATEGORY** | Report Logic |
| **SEVERITY** | **HIGH** |
| **DESCRIPTION** | `riskLevel` in [Student.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/models/Student.js) is a **stale stored field**. It is only re-evaluated when [addSemesterMetric](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/studentController.js#55-79) is called via API. The seed scripts set it at creation time and never update it when marks/attendance change. Any external data change (faculty uploads, bulk marks) leaves `riskLevel` permanently stale. |
| **EVIDENCE** | `studentController.js:74`: `student.riskLevel = riskLevel` — only in [addSemesterMetric](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/studentController.js#55-79). `facultyController.js:291-321` ([uploadMarks](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/facultyController.js#291-322)) — never updates `riskLevel`. |
| **IMPACT** | Risk distribution charts, risk student lists, and analytics all show stale data after any faculty data entry. |
| **FIX** | Re-evaluate `riskLevel` via [evaluateRisk()](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/riskEngine.js#1-21) after every marks or attendance upload in [facultyController.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/facultyController.js). |

---

## BUG #4
| Field | Value |
|---|---|
| **FILE** | [Student.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/models/Student.js) / `studentController.js:108` |
| **CATEGORY** | Report Logic |
| **SEVERITY** | **HIGH** |
| **DESCRIPTION** | Credits in `studentController.js:108` are computed as `marks.reduce((sum, m) => sum + Number(m.credits \|\| 0), 0)`. However, [seedRealData.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/seedRealData.js) never sets `credits` on Mark documents (defaults to `0`). The `credits` field on [Student.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/models/Student.js) (152) is never read by the dashboard — it reads from Mark aggregation instead. |
| **EVIDENCE** | [seedRealData.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/seedRealData.js): `Mark.create({...})` — no `credits` field. `Mark.js:17`: `credits: { type: Number, default: 0 }`. `studentController.js:108`: `totalCredits = marks.reduce(...)`. |
| **IMPACT** | Student Dashboard "Credit Details" always shows 0/0/160 even though Student.credits = 152. |
| **FIX** | Either: (a) seed `credits` on each Mark document (e.g., 3-4 per subject), OR (b) read `student.credits` directly in the dashboard controller response. |

---

## BUG #5
| Field | Value |
|---|---|
| **FILE** | [Student.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/models/Student.js) / `studentController.js:111` |
| **CATEGORY** | Report Logic |
| **SEVERITY** | **HIGH** |
| **DESCRIPTION** | `semesterGpa` is computed from [gradePointFromGrade(m.grade)](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/studentController.js#15-19), but the seed scripts never set [grade](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/facultyController.js#35-44) on marks (defaults to `""`). [gradePointFromGrade("")](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/studentController.js#15-19) returns `0`. So `semesterGpa` is always **0**. |
| **EVIDENCE** | `seedRealData.js:Mark.create({...})` — no [grade](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/facultyController.js#35-44) field. `Mark.js:16`: `grade: { type: String, default: "" }`. `studentController.js:15-18`: [gradePointFromGrade](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/studentController.js#15-19) maps `""` → `0`. |
| **IMPACT** | Student Dashboard "Semester GPA" is always 0.00 regardless of actual marks. |
| **FIX** | Compute grade from total in the seed script using [gradeFromTotal()](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/facultyController.js#35-44) logic from `facultyController.js:35-43`, or compute GPA from marks directly. |

---

## BUG #6
| Field | Value |
|---|---|
| **FILE** | [reportController.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/reportController.js) |
| **CATEGORY** | Dead Feature |
| **SEVERITY** | **HIGH** |
| **DESCRIPTION** | [reportController.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/reportController.js) has NO handler for `CGPA_DISTRIBUTION`, `BACKLOG_ANALYSIS`, or `DEPARTMENT_PERFORMANCE` report types. When frontend requests these, it falls through to the generic handler (lines 77-87) which just returns basic student data. The dropdown offers 6 report types but only 4 have real logic. |
| **EVIDENCE** | [reportController.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/reportController.js) — search for "CGPA_DISTRIBUTION": not found. "BACKLOG_ANALYSIS": not found. "DEPARTMENT_PERFORMANCE": not found. The `ReportLog.js:8-16` enum lists all 7 types. |
| **IMPACT** | Downloading a "CGPA Distribution Report" or "Backlog Analysis Report" produces a generic student list instead of the correct analysis. |
| **FIX** | Add dedicated [getReportRows](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/reportController.js#7-89) branches for `CGPA_DISTRIBUTION`, `BACKLOG_ANALYSIS`, and `DEPARTMENT_PERFORMANCE`. |

---

## BUG #7
| Field | Value |
|---|---|
| **FILE** | [jwt.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/jwt.js) / [authMiddleware.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/middleware/authMiddleware.js) |
| **CATEGORY** | Auth Hole |
| **SEVERITY** | **HIGH** |
| **DESCRIPTION** | `jwt.js:4` uses `process.env.JWT_SECRET` with no fallback. If `JWT_SECRET` is undefined in [.env](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/.env), `jwt.sign()` throws `"secretOrPrivateKey must have a value"` and crashes the server. `authMiddleware.js:13` also uses it without validation. |
| **EVIDENCE** | `jwt.js:4`: `jwt.sign(payload, process.env.JWT_SECRET, ...)`. No guard. |
| **IMPACT** | Server crash on startup if [.env](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/.env) is misconfigured. |
| **FIX** | Add `if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET must be set")` at module load. |

---

## BUG #8
| Field | Value |
|---|---|
| **FILE** | `authController.js:79` |
| **CATEGORY** | Auth Hole |
| **SEVERITY** | **HIGH** |
| **DESCRIPTION** | The "legacy password" compatibility block compares plaintext password directly: `user.password === password`. This means any user whose password was stored unhashed can be exploited. Worse: `user.password = password; await user.save()` re-hashes it, but the comparison `user.password === password` exposes timing information. |
| **EVIDENCE** | `authController.js:79`: `!user.password.startsWith("$2") && user.password === password`. |
| **IMPACT** | Plaintext passwords stored by faulty seed scripts are accepted without hashing validation. |
| **FIX** | Remove the plaintext fallback entirely, or at minimum add rate limiting and log warnings. |

---

## BUG #9
| Field | Value |
|---|---|
| **FILE** | [Faculty.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/scrapeFaculty.js) + [User.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/models/User.js) |
| **CATEGORY** | Schema Conflict |
| **SEVERITY** | **HIGH** |
| **DESCRIPTION** | Faculty data is duplicated across TWO separate models: [User.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/models/User.js) (with `facultyProfile` subdoc) and [Faculty.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/scrapeFaculty.js) (full standalone schema). [addFaculty](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/facultyController.js#45-185) creates BOTH a User and Faculty record with overlapping fields (name, email, designation, etc.). Updates must keep both in sync — and [updateFaculty](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/facultyController.js#212-290) does try, but creates a fragile dual-write pattern. |
| **EVIDENCE** | `facultyController.js:115-133` creates User. `facultyController.js:135-162` creates Faculty. Both store [name](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/generate_data.py#40-42), `email`, `designation`, `qualification`. |
| **IMPACT** | Data inconsistency if one record is updated without the other. |
| **FIX** | Consolidate to single source of truth. Use Faculty.js as the canonical store and remove `facultyProfile` from User.js, or vice versa. |

---

## BUG #10
| Field | Value |
|---|---|
| **FILE** | `Faculty.js:12` |
| **CATEGORY** | Schema Conflict |
| **SEVERITY** | **MEDIUM** |
| **DESCRIPTION** | [Faculty.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/scrapeFaculty.js) stores `passwordHash` as a plain field: `passwordHash: { type: String, required: true }`. In [addFaculty](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/facultyController.js#45-185), this is set to `user.password` (bcrypt hash). But this creates a password copy outside the User model's control — it's never validated, never compared, and drifts on password change. |
| **EVIDENCE** | `facultyController.js:142`: `passwordHash: user.password`. `facultyController.js:284`: `row.passwordHash = updatedUser.password` — manual re-sync. |
| **IMPACT** | Security liability — password hash stored in a second collection without access controls. |
| **FIX** | Remove `passwordHash` from [Faculty.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/scrapeFaculty.js). Auth should only use [User.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/models/User.js). |

---

## BUG #11
| Field | Value |
|---|---|
| **FILE** | `analyticsController.js:155` |
| **CATEGORY** | Report Logic |
| **SEVERITY** | **HIGH** |
| **DESCRIPTION** | [sectionComparison](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/analyticsController.js#147-185) compares `String(s.section) === String(section._id)`. But `Student.section` stores a **string** (e.g., `"A"`), while `Section._id` is an **ObjectId**. These will **never** match. The section comparison analytics always returns empty arrays. |
| **EVIDENCE** | `Student.js:22`: `section: { type: String, ... uppercase: true, default: "A" }`. `analyticsController.js:155`: `String(s.section) === String(section._id)`. |
| **IMPACT** | Section comparison endpoint returns all-zero analytics regardless of data. |
| **FIX** | Compare `s.section === section.code` instead of `section._id`. |

---

## BUG #12
| Field | Value |
|---|---|
| **FILE** | `aiController.js:82` |
| **CATEGORY** | Report Logic |
| **SEVERITY** | **MEDIUM** |
| **DESCRIPTION** | `topDepartment` and `bottomDepartment` are hardcoded as `"CSE"` and `"MECH"` respectively, not computed from data. |
| **EVIDENCE** | `aiController.js:82`: `topDepartment: "CSE", bottomDepartment: "MECH"`. |
| **IMPACT** | AI-generated student progress reports always claim CSE is top and MECH is bottom regardless of actual data. |
| **FIX** | Compute dynamically from the department aggregation. |

---

## BUG #13
| Field | Value |
|---|---|
| **FILE** | `aiController.js:465-569` ([streamingSearch](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/aiController.js#463-571)) |
| **CATEGORY** | LLM Bug |
| **SEVERITY** | **HIGH** |
| **DESCRIPTION** | [streamingSearch](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/aiController.js#463-571) directly calls Ollama without using the hybrid fallback in [llmService.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/services/llmService.js). If Ollama is down, it writes `{ error: "AI unavailable" }` to the SSE stream but the Groq fallback is never attempted. |
| **EVIDENCE** | `aiController.js:532`: `fetch("http://localhost:11434/api/generate", ...)` — direct Ollama call, not [callMistral()](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/services/llmService.js#129-156). |
| **IMPACT** | In deployment or when Ollama is offline, the streaming search endpoint is completely broken. |
| **FIX** | Use the hybrid [callMistral()](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/services/llmService.js#129-156) from [llmService.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/services/llmService.js) or implement the same Ollama→Groq fallback pattern for streaming. |

---

## BUG #14
| Field | Value |
|---|---|
| **FILE** | [llmService.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/services/llmService.js) |
| **CATEGORY** | LLM Bug |
| **SEVERITY** | **MEDIUM** |
| **DESCRIPTION** | The LLM cache (`llmCache`) is never invalidated when database data changes. [clearCache()](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/services/llmService.js#14-15) is exported but never called anywhere except the cache module itself. Stale cached AI responses persist for 5 minutes. |
| **EVIDENCE** | `llmService.js:14`: `export const clearCache = () => llmCache.clear()`. grep for [clearCache](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/services/llmService.js#14-15) usage — only the export definition. |
| **IMPACT** | AI responses may not reflect recent data changes for up to 5 minutes. |
| **FIX** | Call [clearCache()](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/services/llmService.js#14-15) after seed scripts, after faculty data uploads, or after any data mutation endpoint. |

---

## BUG #15
| Field | Value |
|---|---|
| **FILE** | [FacultyAchievement.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/models/FacultyAchievement.js) |
| **CATEGORY** | Dead Feature |
| **SEVERITY** | **MEDIUM** |
| **DESCRIPTION** | `FacultyAchievement` model has no `accreditationCriteria` field, unlike [Achievement.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/models/Achievement.js) (which has `accreditationCriteria: "NAAC-C5"`) and [Research.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/models/Research.js) (which has `accreditationCriteria: "NAAC-C3"`). Faculty achievements cannot be linked to accreditation criteria. |
| **EVIDENCE** | `FacultyAchievement.js:4-18` — no `accreditationCriteria` field. |
| **IMPACT** | Faculty achievements are invisible to accreditation readiness assessments. |
| **FIX** | Add `accreditationCriteria: { type: String, default: "NAAC-C3" }` to [FacultyAchievement.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/models/FacultyAchievement.js). |

---

## BUG #16
| Field | Value |
|---|---|
| **FILE** | `server.js:18` vs [db.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/config/db.js) |
| **CATEGORY** | Schema Conflict |
| **SEVERITY** | **MEDIUM** |
| **DESCRIPTION** | `dotenv.config()` is called AFTER [db.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/config/db.js) is imported. But [db.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/config/db.js) itself calls `dotenv.config()` at line 4 AND reads `process.env.MONGO_URI` at module scope. The import order is: `dotenv` in db.js runs first (from import), then `dotenv.config()` in server.js runs again redundantly. This works by accident because [db.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/config/db.js) has its own `dotenv.config()` call, but creates fragile initialization ordering. |
| **EVIDENCE** | `server.js:1`: `import dotenv from "dotenv"` — `server.js:18`: `dotenv.config()`. `db.js:2-4`: `import dotenv... dotenv.config()`. |
| **IMPACT** | Works by accident. If [db.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/config/db.js) removes its `dotenv.config()`, all DB connections break silently. |
| **FIX** | Call `dotenv.config()` BEFORE any imports in [server.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/server.js), or rely solely on [db.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/config/db.js)'s call. |

---

## BUG #17
| Field | Value |
|---|---|
| **FILE** | `authController.js:8` ([publicRegister](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/authController.js#115-206)) |
| **CATEGORY** | Auth Hole |
| **SEVERITY** | **HIGH** |
| **DESCRIPTION** | [publicRegister](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/authController.js#115-206) allows **any visitor** to register as `admin` or `hod`. The allowed roles list includes `"admin"` and `"hod"`: `const allowedRoles = ["student", "hod", "admin", "faculty"]`. There is no additional verification for these privileged roles. |
| **EVIDENCE** | `authController.js:118`: `const allowedRoles = ["student", "hod", "admin", "faculty"]`. |
| **IMPACT** | Any unauthenticated user can create an admin account and gain full system access. |
| **FIX** | Remove `"admin"` and `"hod"` from [publicRegister](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/authController.js#115-206) allowed roles. Only permit `"student"` and `"faculty"` for public signup. |

---

## BUG #18
| Field | Value |
|---|---|
| **FILE** | `db.js:28-29` |
| **CATEGORY** | Null Safety |
| **SEVERITY** | **MEDIUM** |
| **DESCRIPTION** | If `MONGO_URI` is missing, `mongoose.createConnection()` is called with NO arguments as a fallback. This creates a connection object that resolves to `disconnected` state. Any model operation will throw `"buffering timed out"` after 10 seconds instead of failing fast. |
| **EVIDENCE** | `db.js:29`: `mongoose.createConnection()` — empty argument fallback. |
| **IMPACT** | Silent 10-second timeout on every DB operation instead of immediate startup failure. |
| **FIX** | Throw immediately if `MONGO_URI` is missing: `if (!mainUri) throw new Error("MONGO_URI required")`. |

---

## BUG #19
| Field | Value |
|---|---|
| **FILE** | `analyticsController.js:19` / `reportController.js:15-79` |
| **CATEGORY** | Null Safety |
| **SEVERITY** | **MEDIUM** |
| **DESCRIPTION** | `metrics.at(-1)` on an empty array returns `undefined`. Multiple call sites use `s.metrics.at(-1)` without checking if `metrics` is empty first. The `\|\| {}` fallback prevents crashes but silently produces `cgpa: 0`, `backlogCount: 0` — making students with NO data appear as low-risk 0.0 CGPA students instead of being excluded. |
| **EVIDENCE** | `analyticsController.js:19`: `students.map(s => s.metrics.at(-1)).filter(Boolean)` — correctly filters. But `reportController.js:15`: `const latest = s.metrics.at(-1) \|\| {}` — includes students with no data as zeros. |
| **IMPACT** | Reports inflate pass percentages and deflate average CGPAs by including phantom zero-CGPA students. |
| **FIX** | Filter out students with empty `metrics` arrays before aggregation in [getReportRows](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/reportController.js#7-89). |

---

## BUG #20
| Field | Value |
|---|---|
| **FILE** | [seedRealData.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/seedRealData.js) / [seedComplete.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/seedComplete.js) |
| **CATEGORY** | Seed Bug |
| **SEVERITY** | **HIGH** |
| **DESCRIPTION** | Seed scripts create User records with `password: "Admin@123"`, which triggers the `pre("save")` hook to hash it. But [seedComplete.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/seedComplete.js) and [seedRealData.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/seedRealData.js) set `studentId` on User instead of `studentProfile`. The User schema uses `studentProfile`, not `studentId`. |
| **EVIDENCE** | `User.js:41`: `studentProfile: { type: mongoose.Schema.Types.ObjectId, ref: "Student" }`. [seedRealData.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/seedRealData.js): `studentId: specialStudent._id` — wrong field name. |
| **IMPACT** | Student login works (by email fallback in [resolveStudentFromUser](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/studentController.js#187-241)) but the `studentProfile` field on User is `undefined`, forcing expensive DB lookups on every dashboard load. |
| **FIX** | Change `studentId` to `studentProfile` in all seed scripts. |

---

## BUG #21
| Field | Value |
|---|---|
| **FILE** | `aiController.js:138` |
| **CATEGORY** | Report Logic |
| **SEVERITY** | **LOW** |
| **DESCRIPTION** | `achievementCount` in [departmentPerformanceReport](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/aiController.js#109-160) is hardcoded to `0` instead of being queried from the Achievement collection. |
| **EVIDENCE** | `aiController.js:138`: `achievementCount: 0`. |
| **IMPACT** | Department performance reports always show 0 achievements. |
| **FIX** | Query `Achievement.find()` and count per department. |

---

## BUG #22
| Field | Value |
|---|---|
| **FILE** | `facultyController.js:436` |
| **CATEGORY** | Null Safety |
| **SEVERITY** | **MEDIUM** |
| **DESCRIPTION** | `r.publishedOn.toISOString()` is called without null-checking. If `publishedOn` is null/undefined (possible since [addResearch](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/facultyController.js#379-387) spreads `req.body` which may omit it), this crashes with `Cannot read properties of null`. |
| **EVIDENCE** | `facultyController.js:436`: `date: r.publishedOn.toISOString().slice(0, 10)`. |
| **IMPACT** | Faculty portal crashes if any research record has no `publishedOn` date. |
| **FIX** | `date: r.publishedOn ? r.publishedOn.toISOString().slice(0, 10) : "N/A"`. |

---

## BUG #23
| Field | Value |
|---|---|
| **FILE** | `StudentDashboard.jsx:55-56` |
| **CATEGORY** | Null Safety |
| **SEVERITY** | **MEDIUM** |
| **DESCRIPTION** | `data.attendance.at(-1)?.percentage` and `data.backlogBySemester.at(-1)?.backlogCount` use `.at(-1)` on arrays that could be empty. While optional chaining prevents crashes, the values silently become `0`, hiding "no data available" states. |
| **EVIDENCE** | `StudentDashboard.jsx:55-56`. |
| **IMPACT** | Dashboard shows misleading 0% attendance instead of "No data". |
| **FIX** | Display "N/A" or "No data" when arrays are empty. |

---

## BUG #24
| Field | Value |
|---|---|
| **FILE** | `analyticsController.js:568-569` ([researchAnalytics](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/analyticsController.js#562-615)) |
| **CATEGORY** | Report Logic |
| **SEVERITY** | **MEDIUM** |
| **DESCRIPTION** | [researchAnalytics](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/analyticsController.js#562-615) parses `academicYear` as `"2023-24"` and creates a date range: `new Date("2023-06-01")` to `new Date("24-05-31")`. The [split("-")[1]](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/facultyController.js#11-18) returns `"24"` which becomes `new Date("24-05-31")` — a **year 24 AD** date, not 2024. |
| **EVIDENCE** | `analyticsController.js:569`: `new Date(\`${academicYear.split("-")[1]}-05-31\`)`. |
| **IMPACT** | Research analytics with `academicYear` filter returns zero results because no publication dates are in 24 AD. |
| **FIX** | Construct full year: `const endYear = academicYear.split("-")[1]; const fullEnd = endYear.length === 2 ? "20" + endYear : endYear;`. |

---

## BUG #25
| Field | Value |
|---|---|
| **FILE** | `server.js:42` |
| **CATEGORY** | Null Safety |
| **SEVERITY** | **LOW** |
| **DESCRIPTION** | The global error handler signature [(err, _, res, __)](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/authController.js#110-114) uses unnamed parameters, but Express requires **exactly 4 parameters** to identify it as an error handler. This works, but the second underscore shadows the first. |
| **EVIDENCE** | `server.js:42`: `app.use((err, _, res, __) => {`. |
| **IMPACT** | Functional but poor practice — lint warnings and potential confusion. |
| **FIX** | Use [(_req, res, _next)](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/authController.js#110-114) naming convention. |

---

## BUG #26
| Field | Value |
|---|---|
| **FILE** | `StudentDashboard.jsx:47` |
| **CATEGORY** | Frontend Bug |
| **SEVERITY** | **LOW** |
| **DESCRIPTION** | `useEffect` depends on `studentId` but [loadDashboard](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/frontend/src/pages/StudentDashboard.jsx#30-44) is not in the dependency array and is redefined on every render. React strict mode may cause stale closure issues. |
| **EVIDENCE** | `StudentDashboard.jsx:45-47`: `useEffect(() => { loadDashboard(); }, [studentId])`. |
| **IMPACT** | Potential stale data on re-renders. |
| **FIX** | Wrap [loadDashboard](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/frontend/src/pages/StudentDashboard.jsx#30-44) in `useCallback` or move the fetch logic inside the effect. |

---

## BUG #27
| Field | Value |
|---|---|
| **FILE** | [accreditationController.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/accreditationController.js) |
| **CATEGORY** | Dead Feature |
| **SEVERITY** | **MEDIUM** |
| **DESCRIPTION** | Achievement `accreditationCriteria` field exists (`Achievement.js:15`: `default: "NAAC-C5"`) but is **never used** in [readinessScore](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/accreditationController.js#22-50) computation or any accreditation controller logic. The readiness score is purely based on `AccreditationItem.completed` boolean, ignoring criteria correlation. |
| **EVIDENCE** | `accreditationController.js:22-49` — no reference to `accreditationCriteria`. |
| **IMPACT** | The accreditation system cannot distinguish which achievements satisfy which criteria. |
| **FIX** | Cross-reference [Achievement](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/frontend/src/pages/FacultyDashboard.jsx#421-450) and [Research](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/facultyController.js#379-387) accreditation criteria with [AccreditationItem](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/accreditationController.js#3-7) criteria in readiness computation. |

---

## BUG #28
| Field | Value |
|---|---|
| **FILE** | [Attendance.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/seedAttendance.js) schema |
| **CATEGORY** | Schema Conflict |
| **SEVERITY** | **MEDIUM** |
| **DESCRIPTION** | The [Attendance](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/frontend/src/pages/FacultyDashboard.jsx#269-282) model has a `unique` compound index on `{student, semester, academicYear}`, meaning ONE attendance record per student per semester. But [seedRealData.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/seedRealData.js) creates one Attendance per semester WITHOUT subjects, while [uploadAttendance](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/facultyController.js#323-378) in [facultyController.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/facultyController.js) properly manages per-subject entries in the `subjects[]` array. These two approaches conflict. |
| **EVIDENCE** | `Attendance.js:29`: `unique: true` index. `facultyController.js:338-376`: per-subject upsert pattern. `seedRealData.js:145-153`: flat single record per semester. |
| **IMPACT** | Seeded data has no subject-level attendance; faculty uploads create proper subject-level data. Mixed data quality. |
| **FIX** | Seed scripts must use the `subjects[]` sub-document pattern matching the [uploadAttendance](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/facultyController.js#323-378) controller logic. |

---

## BUG #29
| Field | Value |
|---|---|
| **FILE** | [analyticsController.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/analyticsController.js) / [analyticsRoutes.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/routes/analyticsRoutes.js) |
| **CATEGORY** | Dead Feature |
| **SEVERITY** | **MEDIUM** |
| **DESCRIPTION** | [attendancePatterns](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/analyticsController.js#439-500) reads attendance from `student.metrics.attendancePercent` (which is a stale cached number) instead of querying actual [Attendance](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/frontend/src/pages/FacultyDashboard.jsx#269-282) collection records. Historical attendance pattern tracking uses cached numbers, not real attendance data. The [Attendance](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/frontend/src/pages/FacultyDashboard.jsx#269-282) import at line 9 is unused in [attendancePatterns](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/controllers/analyticsController.js#439-500). |
| **EVIDENCE** | `analyticsController.js:439-498`: Only reads `student.metrics`, never queries `Attendance.find()`. |
| **IMPACT** | Attendance pattern analytics don't reflect actual recorded attendance, only the cached metric. |
| **FIX** | Query [Attendance](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/frontend/src/pages/FacultyDashboard.jsx#269-282) collection directly for historical trends. |

---

## BUG #30
| Field | Value |
|---|---|
| **FILE** | [seedRealData.js](file:///d:/AI%20SYSTEM%20HACKTHON%2014-3-26/IQAC/backend/src/utils/seedRealData.js) |
| **CATEGORY** | Seed Bug |
| **SEVERITY** | **MEDIUM** |
| **DESCRIPTION** | The seed script distributes 40 subjects across 8 semesters (5 per semester). But `REAL_SUBJECTS.slice(subjIndex, subjIndex + 5)` will return empty arrays for semesters 7 and 8 because only 40 subjects exist (40/5 = 8, indices 35-39 are the last 5). The last two semesters get the last subjects correctly, but the loop creates Attendance records even when there are no subjects for that semester. |
| **EVIDENCE** | `REAL_SUBJECTS` has 40 entries. 8 semesters × 5 = 40. Technically correct, but semester 8 gets Deep Learning + Machine Learning as subjects, which are electives, not core. No marks get generated if `semSubjects` is accidentally empty due to bounds. |
| **IMPACT** | Minor — the distribution works but unrealistically assigns fundamental math courses to semester 1 and DL/ML to semester 8. |
| **FIX** | Acceptable for demo data, but map subjects to semesters based on real curriculum sequence. |

---

> **Total Bugs Found: 30**
> **CRITICAL: 2 | HIGH: 10 | MEDIUM: 14 | LOW: 4**