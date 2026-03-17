// llmService.js — IQAC Academic Intelligence LLM Prompts
// Every prompt is grounded in live MongoDB data. No fabricated numbers.

const OLLAMA_URL = "http://localhost:11434/api/generate";

// ─── SYSTEM CONTEXT (prepended to every job prompt) ──────────────
const SYSTEM_CONTEXT = `You are an expert IQAC (Internal Quality Assurance Cell) academic analyst for an Indian engineering college. Every single number, name, percentage, count, and value you receive comes directly from a live MongoDB Atlas database. This is not sample data. This is not fake data. This is real institutional data.

You must treat every data point as factual and accurate.
You must never invent numbers, never guess values, never use generic examples.
Every sentence you write must reference the actual numbers provided to you.

You have expert knowledge of:
- NBA accreditation: pass percentage minimum 60%, average graduating CGPA minimum 6.5, placement rate minimum 60%, faculty publications benchmark 1 per 3 years
- NAAC accreditation: seven criteria covering curriculum, teaching, research, infrastructure, student support, governance, and institutional values
- Indian engineering college structure: semesters 1-8, CGPA scale 0-10, backlog subjects meaning failed subjects, batch format YYYY-YYYY
- Risk classification: HIGH risk means CGPA below 6 OR attendance below 60% OR 3 or more backlogs, MEDIUM means moderate concern, LOW means performing well

Output rules:
- Write in formal academic language only
- Include specific numbers from the data in every sentence
- Never use bullet points
- Never add information not present in the data given to you
- If a value is zero or missing say it clearly`;

// ─── IN-MEMORY CACHE (5 min TTL) ─────────────────────────────────
const llmCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export const getCached = (key) => {
  const hit = llmCache.get(key);
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit.v;
  return null;
};

export const setCache = (key, value) => llmCache.set(key, { v: value, t: Date.now() });
export const clearCache = () => llmCache.clear();

// ─── BASE FUNCTION ────────────────────────────────────────────────
export const callMistral = async (prompt, maxTokens = 300) => {
  try {
    // If the prompt is super simple (like "hello"), bypass the heavy context so it works directly.
    const isBasic = prompt.trim().toLowerCase() === "hello";
    const finalPrompt = isBasic ? prompt : `${SYSTEM_CONTEXT}\n\n${prompt}`;

    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral:latest",
        prompt: finalPrompt,
        stream: false,
        options: { num_predict: maxTokens, temperature: 0.3, num_ctx: 2048 }
      })
    });

    if (!res.ok) {
      console.error(`Ollama HTTP Error: ${res.status}`);
      return "AI connection failed. Ensure Ollama is running.";
    }

    const data = await res.json();
    if (!data.response) {
      console.error("Empty Mistral response.");
      return "AI analysis unavailable.";
    }

    return data.response.trim();
  } catch (err) {
    console.error("Ollama system failure:", err.message);
    if (err.message.includes("ECONNREFUSED")) {
      return "Ollama is completely offline (Connection Refused). Please start Ollama.";
    }
    return "AI analysis unavailable. Data shown is accurate.";
  }
};

// ─── JOB 1: Student Progress Analysis ─────────────────────────────
export async function generateStudentProgressAnalysis(data) {
  const highRiskPct = Math.round(data.highRisk / data.totalStudents * 100);
  const semCGPAs = data.semesterWise.map(s => `Sem${s.semester}:${s.averageCgpa}`).join(', ');
  const semPassPcts = data.semesterWise.map(s => `Sem${s.semester}:${s.passPercent}%`).join(', ');

  const prompt = `STUDENT PROGRESS ANALYSIS — MongoDB Data:
Total Students: ${data.totalStudents}
Risk Distribution: High=${data.highRisk} (${highRiskPct}%), Medium=${data.mediumRisk}, Low=${data.lowRisk}
Institution Average CGPA: ${data.averageCgpa}
Attendance Shortage (<75%): ${data.attendanceShortage} students
Total Backlogs: ${data.totalBacklogs}
Semester-wise CGPA: ${semCGPAs}
Semester-wise Pass %: ${semPassPcts}
Worst Semester: Semester ${data.worstSemester?.semester} (${data.worstSemester?.passPercent}% pass rate)
Top Department: ${data.topDepartment}
Bottom Department: ${data.bottomDepartment}

Write exactly 5 sentences:
Sentence 1: State the overall CGPA health using averageCgpa (${data.averageCgpa}) and compare it to NBA minimum threshold of 6.5. State whether institution MEETS or FAILS this threshold.
Sentence 2: Describe role risk distribution using exact counts (High: ${data.highRisk}, Medium: ${data.mediumRisk}, Low: ${data.lowRisk}) and percentages. High risk is ${highRiskPct}% — flag if this exceeds 15% as a critical concern.
Sentence 3: Identify worst performing semester (Semester ${data.worstSemester?.semester}) with its ${data.worstSemester?.passPercent}% pass rate. Compare it to adjacent semesters to identify if decline is progressive.
Sentence 4: Describe attendance situation using ${data.attendanceShortage} shortage count and ${data.totalBacklogs} total backlogs. State academic intervention urgency level.
Sentence 5: Name ${data.topDepartment} as exemplary and ${data.bottomDepartment} as requiring immediate academic support with one specific actionable recommendation.
No bullet points. No headers. Formal academic language only.`;

  return await callMistral(prompt, 250);
}

// ─── JOB 2: Department Performance Analysis ───────────────────────
export async function generateDepartmentPerformanceAnalysis(departments) {
  const sorted = [...departments].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const deptDetails = sorted.map(d =>
    `${d.code}: Score=${d.score?.toFixed?.(1)}, CGPA=${d.averageCgpa}, Pass=${d.passPercent}%, Placement=${d.placementRate}%, Research=${d.researchCount}, Achievements=${d.achievementCount}`
  ).join('\n');

  const prompt = `DEPARTMENT PERFORMANCE ANALYSIS — MongoDB Data:
${deptDetails}

NBA minimums: Pass % >= 60%, Placement >= 60%, CGPA >= 6.5

Write exactly 5 sentences:
Sentence 1: Name ${top?.name} (${top?.code}) as highest scoring with score ${top?.score?.toFixed?.(1)}. Identify the two strongest metrics that justify its top rank.
Sentence 2: Name ${bottom?.name} (${bottom?.code}) as lowest scoring. Identify its most critical weakness by comparing its worst metric against NBA minimum thresholds.
Sentence 3: Assess pass percentage across ALL departments. State explicitly whether any department falls below NBA minimum of 60% pass rate.
Sentence 4: Compare research output across departments. Name the most and least research-productive departments with exact counts.
Sentence 5: Write one specific actionable intervention for ${bottom?.name} that can be implemented within one semester.
No bullet points. No headers.`;

  return await callMistral(prompt, 220);
}

// ─── JOB 3: CGPA Distribution Analysis ────────────────────────────
export async function generateCGPADistributionAnalysis(d) {
  const cacheKey = `cgpa_dist_${Math.round(Date.now() / CACHE_TTL)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const belowThresholdPct = Math.round(d.belowNBAThreshold / d.totalStudents * 100);
  const bands = {
    'Below 6.0': d.below_6,
    '6.0-6.99': d.six_to_seven,
    '7.0-7.99': d.seven_to_eight,
    '8.0-8.99': d.eight_to_nine,
    '9.0+': d.above_nine
  };
  const largestBand = Object.entries(bands).sort((a, b) => b[1] - a[1])[0];
  const largestBandPct = Math.round(largestBand[1] / d.totalStudents * 100);

  const prompt = `CGPA DISTRIBUTION ANALYSIS — MongoDB Data:
Below 6.0: ${d.below_6} students | 6.0-6.99: ${d.six_to_seven} | 7.0-7.99: ${d.seven_to_eight} | 8.0-8.99: ${d.eight_to_nine} | 9.0+: ${d.above_nine}
Total Students: ${d.totalStudents}
Average CGPA: ${d.averageCgpa}, Median CGPA: ${d.medianCgpa}
Highest CGPA: ${d.highestCgpa}, Lowest CGPA: ${d.lowestCgpa}
Below NBA Threshold (6.5): ${d.belowNBAThreshold} students (${belowThresholdPct}%)
Largest band: ${largestBand[0]} with ${largestBand[1]} students (${largestBandPct}%)

Write exactly 4 sentences:
Sentence 1: Describe the distribution shape and concentration. The ${largestBand[0]} band contains ${largestBand[1]} students (${largestBandPct}% of total).
Sentence 2: State NBA compliance. NBA requires average CGPA >= 6.5. averageCgpa is ${d.averageCgpa}. State COMPLIANT or NON-COMPLIANT with exact difference.
Sentence 3: ${d.belowNBAThreshold} students (${belowThresholdPct}%) are below NBA threshold 6.5. If exceeds 20% write critical warning. If below 10% confirm healthy standing.
Sentence 4: Compare average (${d.averageCgpa}) vs median (${d.medianCgpa}). If median > average, a few low performers pull down the average. Give one recommendation based on the gap.
No bullet points.`;

  const result = await callMistral(prompt, 180);
  setCache(cacheKey, result);
  return result;
}

// ─── JOB 4: Backlog Analysis ──────────────────────────────────────
export async function generateBacklogAnalysis(backlogData) {
  const s = backlogData.summary || backlogData;
  const worstDept = [...(backlogData.byDepartment || [])].sort((a, b) => b.totalBacklogs - a.totalBacklogs)[0];
  const worstSem = [...(backlogData.bySemester || [])].sort((a, b) => b.studentsWithBacklogs - a.studentsWithBacklogs)[0];
  const cleanRate = Math.round((s.studentsWithNoBacklogs || 0) / backlogData.totalStudents * 100);
  const severity = cleanRate < 70 ? "CRITICAL" : cleanRate <= 85 ? "MODERATE" : "MANAGEABLE";
  const topOffender = (backlogData.topOffenders || [])[0];

  const prompt = `BACKLOG ANALYSIS — MongoDB Data:
Total Students: ${backlogData.totalStudents}
Clean Pass Rate: ${cleanRate}% (${s.studentsWithNoBacklogs}/${backlogData.totalStudents} with zero backlogs)
Severity Level: ${severity}
1 backlog: ${s.studentsWithOneBacklog}, 2 backlogs: ${s.studentsWithTwoBacklogs}, 3+ backlogs: ${s.studentsWithThreePlus}
Worst Department: ${worstDept?.department} — ${worstDept?.totalBacklogs} total backlogs, ${worstDept?.studentsAffected} students affected
Critical Semester: Semester ${worstSem?.semester} — ${worstSem?.studentsWithBacklogs} students with backlogs
Top Offender: ${topOffender?.name} (${topOffender?.rollNo}), ${topOffender?.department} — ${topOffender?.backlogCount} backlogs, CGPA ${topOffender?.cgpa}

Write exactly 4 sentences:
Sentence 1: Clean pass rate is ${cleanRate}%. Severity is ${severity}. Justify using exact percentage.
Sentence 2: ${worstDept?.department} has highest backlogs (${worstDept?.totalBacklogs}) affecting ${worstDept?.studentsAffected} students. Assess whether systemic curriculum issue or student effort issue based on volume.
Sentence 3: Semester ${worstSem?.semester} has most students with backlogs (${worstSem?.studentsWithBacklogs}). State this semester requires immediate curriculum or pedagogy review.
Sentence 4: Reference ${topOffender?.name} with ${topOffender?.backlogCount} backlogs. State urgency for students with 3+ backlogs (${s.studentsWithThreePlus} total need individual intervention).
No bullet points.`;

  return await callMistral(prompt, 200);
}

// ─── JOB 5: Placement Forecast ────────────────────────────────────
export async function generatePlacementForecast(placementData) {
  const summary = placementData.institutionSummary;
  const byDeptStr = (placementData.byDepartment || []).map(d =>
    `${d.department}: ${d.placementRate}% (${d.totalPlaced}/${d.totalEligible}), Top=${d.highestPackage}LPA, Median=${d.medianPackage}LPA, Year=${d.academicYear}`
  ).join('\n');
  const deptsSorted = [...(placementData.byDepartment || [])].sort((a, b) => b.placementRate - a.placementRate);
  const best = deptsSorted[0];
  const worst = deptsSorted[deptsSorted.length - 1];
  const recruiters = (placementData.topRecruiters || []).slice(0, 5).join(', ');

  const prompt = `PLACEMENT FORECAST — MongoDB Data:
Institution Summary: ${summary.totalPlaced}/${summary.totalEligible} placed, Overall Rate: ${summary.overallPlacementRate}%
Top Package: ${summary.topPackage} LPA, Average Median Package: ${summary.averageMedianPackage} LPA
Industry Benchmark: 70% placement rate

Department-wise:
${byDeptStr}

Best Department: ${best?.department} at ${best?.placementRate}%
Worst Department: ${worst?.department} at ${worst?.placementRate}%
Gap: ${((best?.placementRate || 0) - (worst?.placementRate || 0)).toFixed(1)}%
Top Recruiters: ${recruiters}

Write exactly 5 sentences:
Sentence 1: Overall rate is ${summary.overallPlacementRate}%. Compare to 70% benchmark. State above or below with exact difference.
Sentence 2: Name ${best?.department} (${best?.placementRate}%) as highest and ${worst?.department} (${worst?.placementRate}%) as lowest. State the gap.
Sentence 3: Top package is ${summary.topPackage} LPA, median is ${summary.averageMedianPackage} LPA. Assess package quality relative to Tier-2 engineering college benchmarks.
Sentence 4: Based on department trends, predict whether next year will improve or decline. State one specific factor driving the prediction.
Sentence 5: Name top recruiters: ${recruiters}. Recommend one new sector to target based on department specializations.
No bullet points.`;

  return await callMistral(prompt, 220);
}

// ─── JOB 6: Faculty Contribution ──────────────────────────────────
export async function generateFacultyContributionSummary(facultyData) {
  const ratio = (facultyData.totalPublications / Math.max(facultyData.totalFaculty, 1)).toFixed(2);
  const topFac = [...(facultyData.byFaculty || [])].sort((a, b) => b.count - a.count)[0];
  const topFacPct = topFac ? Math.round(topFac.count / Math.max(facultyData.totalPublications, 1) * 100) : 0;
  const journalCount = facultyData.byType?.Journal || 0;
  const journalPct = Math.round(journalCount / Math.max(facultyData.totalPublications, 1) * 100);

  const prompt = `FACULTY CONTRIBUTION REPORT — MongoDB Data:
Department: ${facultyData.department}
Total Faculty: ${facultyData.totalFaculty}, Total Publications: ${facultyData.totalPublications}
Publications per Faculty: ${ratio} (NBA benchmark: minimum 0.33 = 1 per 3 years)
Publication Types: Journal=${journalCount}, Conference=${facultyData.byType?.Conference||0}, Patent=${facultyData.byType?.Patent||0}, Book Chapter=${facultyData.byType?.['Book Chapter']||0}
Journal percentage: ${journalPct}%
Top Contributor: ${topFac?.faculty} with ${topFac?.count} publications (${topFacPct}% of total)

Recent Publications: ${(facultyData.publications || []).slice(0, 3).map(p => `"${p.title}" by ${p.faculty} in ${p.journalOrConference}`).join('; ')}

Write exactly 4 sentences:
Sentence 1: Calculate ${ratio} publications per faculty. NBA benchmark is 0.33 minimum. State COMPLIANT or NON-COMPLIANT explicitly with the ratio.
Sentence 2: Publication mix: ${journalPct}% are journal articles. Journals carry highest NBA weight. If journal count below 50% of total, flag as quality concern.
Sentence 3: ${topFac?.faculty} contributes ${topFac?.count} publications (${topFacPct}% of total). If above 40% flag concentration risk — department research depends too heavily on one person.
Sentence 4: Write a formal NBA Criterion 4 compliance statement. State FULLY COMPLIANT, PARTIALLY COMPLIANT, or NON-COMPLIANT with specific justification referencing ${ratio} ratio.
No bullet points.`;

  return await callMistral(prompt, 180);
}

// ─── JOB 7: Accreditation Readiness ──────────────────────────────
export async function generateAccreditationReadinessAssessment(readinessData) {
  const cacheKey = `accreditation_${Math.round(Date.now() / CACHE_TTL)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const nba = readinessData.nba;
  const naac = readinessData.naac;
  const avgScore = ((nba.readinessScore + naac.readinessScore) / 2).toFixed(1);
  const verdict = (nba.readinessScore > 80 && naac.readinessScore > 80) ? "READY FOR AUDIT"
    : (nba.readinessScore > 60 && naac.readinessScore > 60) ? "REQUIRES ATTENTION"
    : "CRITICAL — NOT READY";

  const nbaMissing = (nba.missingItems || []).slice(0, 3).map(i => `"${i.title}" (${i.criterion})`).join(', ');
  const naacMissing = (naac.missingItems || []).slice(0, 3).map(i => `"${i.title}" (${i.criterion})`).join(', ');
  const allMissing = [...(nba.missingItems || []).slice(0, 2), ...(naac.missingItems || []).slice(0, 2)].slice(0, 3);
  const urgentNeed = nba.readinessScore < naac.readinessScore ? "NBA" : "NAAC";

  const prompt = `ACCREDITATION READINESS ASSESSMENT — MongoDB Data:
NBA: ${nba.readinessScore}% ready (${nba.completedItems}/${nba.totalItems} items completed)
NBA Missing Items: ${nbaMissing || 'none'}
NAAC: ${naac.readinessScore}% ready (${naac.completedItems}/${naac.totalItems} items completed)
NAAC Missing Items: ${naacMissing || 'none'}
Average Readiness: ${avgScore}%
Overall Verdict: ${verdict}
More Urgent: ${urgentNeed}

Write exactly 5 sentences:
Sentence 1: State verdict "${verdict}" upfront. Average score is ${avgScore}%. NBA is ${nba.readinessScore}% and NAAC is ${naac.readinessScore}%.
Sentence 2: Interpret NBA readiness. Name the first missing NBA item. State the risk if not completed before audit visit.
Sentence 3: Interpret NAAC readiness. Name the first missing NAAC item. Compare scores — ${urgentNeed} requires more urgent attention.
Sentence 4: List top 3 pending items: ${allMissing.map(i => `"${i.title}"`).join(', ')}. Assign realistic timeline to each: 1 week, 2 weeks, or 1 month based on complexity.
Sentence 5: Formal recommendation to IQAC committee. State whether to proceed with audit scheduling or delay. Include one consequence of proceeding without completing pending items.
No bullet points.`;

  const result = await callMistral(prompt, 230);
  setCache(cacheKey, result);
  return result;
}

function buildNlqPrompt(question, databaseSummary) {
  const d = databaseSummary;
  const deptStr = (d.departments || []).slice(0, 10)
    .map(dept => `${dept.name} (${dept.code}): averageCgpa=${dept.averageCgpa}, passPercent=${dept.passPercent}%, backlogRate=${dept.backlogRate}%, placementRate=${dept.placementRate}%, researchCount=${dept.researchCount||0}, achievementCount=${dept.achievementCount||0}`)
    .join('\n');

  return `SYSTEM ARCHITECTURE CONTEXT
You are the Natural Language Analytics Engine for an IQAC Academic Intelligence System.
Your job is to answer user questions by retrieving real information from MongoDB and generating accurate natural-language responses.
You must behave like a database-grounded analytics assistant, not a generative chatbot.

STRICT DATA-GROUNDING RULES
1. Every answer must be based strictly on the provided MongoDB data below.
2. Never invent numbers.
3. Never estimate values.
4. Never generate statistics that are not present in the provided data.
5. If the requested information cannot be derived from the provided data, respond with EXACTLY: "The requested information is not available in the current IQAC analytics dataset."
6. Behave as a data interpreter, not a storyteller.
7. Always prefer exact values from MongoDB-derived data.

QUESTION PROCESSING PIPELINE
STEP 1: Identify Question Intent (Student, Department, Academic, Risk, Placement, Research, Accreditation).
STEP 2: Map the question to the correct fields in the data below.
STEP 3: Perform Logical Analysis (compare, rank, find min/max if needed).
STEP 4: Generate a clear, concise natural-language response referencing real numbers from the database.

DATA SOURCE (aggregatedDbSummary):
totalStudents: ${d.totalStudents}
highRiskCount: ${d.highRiskCount || d.highRisk}
mediumRiskCount: ${d.mediumRiskCount || d.mediumRisk}
lowRiskCount: ${d.lowRiskCount || d.lowRisk}
averageCgpa: ${d.averageCgpa}
attendanceShortageCount: ${d.attendanceShortageCount || d.attendanceShortage}
departments:
${deptStr}
accreditation: nbaReadiness=${d.accreditation?.nbaReadiness || d.nbaReadiness || 0}%, naacReadiness=${d.accreditation?.naacReadiness || d.naacReadiness || 0}%, pendingNBA=${d.accreditation?.pendingNBA||0}, pendingNAAC=${d.accreditation?.pendingNAAC||0}

FAILSAFE RULE
If the user asks about data that is not available in the provided MongoDB summary (like hostel occupancy, specific faculty names not listed, etc.), you MUST respond EXACTLY with:
"The requested information is not available in the current IQAC analytics dataset."

User Question: "${question}"

Generate the final natural language response based on the above rules:`;
}

// ─── JOB 8: Natural Language Query ────────────────────────────────
export async function answerNaturalLanguageQuery(question, databaseSummary) {
  const q = question.trim().toLowerCase();
  
  // Directly intercept simple greetings and conversational tests
  if (["hello", "hi", "hey", "who are you", "what are you", "test", "ok"].includes(q)) {
      return await callMistral(question, 150);
  }

  const prompt = buildNlqPrompt(question, databaseSummary);
  return await callMistral(prompt, 150);
}

// ─── JOB 9: Student Intervention Advice ───────────────────────────
export async function generateStudentInterventionAdvice(studentData) {
  const prompt = `STUDENT INTERVENTION — MongoDB Data for one student:
Name: ${studentData.name}
Roll Number: ${studentData.rollNo}
Department: ${studentData.department}
Current Semester: ${studentData.currentSemester}
Risk Level: ${studentData.riskLevel}
Latest CGPA: ${studentData.cgpa}
Latest Attendance: ${studentData.attendance}%
Current Backlogs: ${studentData.backlogs}
CGPA Trend: ${studentData.cgpaTrend}

Write exactly 3 sentences as a personalized intervention plan:
Sentence 1: Describe this student's academic situation using exact CGPA (${studentData.cgpa}), attendance (${studentData.attendance}%), and backlogs (${studentData.backlogs}). If CGPA trend shows decline across semesters, state the drop explicitly using first and latest values.
Sentence 2: Give one specific immediate action for the faculty advisor to take THIS WEEK. Make it concrete — not generic. Reference the student's specific weakness (${studentData.attendance < 60 ? 'low attendance' : studentData.backlogs >= 3 ? 'multiple backlogs' : 'low CGPA'}).
Sentence 3: Give one long-term recommendation for next semester. This must be different from the immediate action and address root cause.
Formal academic language throughout. No bullet points.`;

  return await callMistral(prompt, 150);
}

// ─── JOB 10: Department Ranking with Reasoning ───────────────────
export async function generateDepartmentRanking(departments) {
  const sorted = [...departments].sort((a, b) => b.score - a.score);
  const deptLines = sorted.map((d, i) => {
    const rank = i + 1;
    const isLast = rank === sorted.length;
    return `Rank ${rank}: ${d.name} (${d.code}) — Score=${d.score?.toFixed?.(1)}, Students=${d.studentCount}, CGPA=${d.averageCgpa}, Pass=${d.passPercent}%, Placement=${d.placementRate}%, Research=${d.researchCount}${isLast ? ' [LAST RANKED]' : ''}`;
  }).join('\n');

  const last = sorted[sorted.length - 1];

  const prompt = `DEPARTMENT RANKING — MongoDB Data:
${deptLines}

Write one sentence per department in ranking order.
Each sentence format: "[Department name] ranks [number] with a composite score of [score], driven by [strongest or weakest metric with exact value]."
For the LAST ranked department (${last?.name}) ONLY, add: "Immediate priority should be [specific action]."
Total sentences: ${sorted.length}.
No bullet points.`;

  return await callMistral(prompt, 200);
}

// ─── JOB 11: Streaming Search (same prompt as Job 8) ─────────────
// Tokens are streamed word-by-word via SSE from the controller.
export function buildStreamingSearchPrompt(question, databaseSummary) {
  return buildNlqPrompt(question, databaseSummary);
}
