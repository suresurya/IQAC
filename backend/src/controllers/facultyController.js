import Mark from "../models/Mark.js";
import Attendance from "../models/Attendance.js";
import Research from "../models/Research.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import TeachingAssignment from "../models/TeachingAssignment.js";
import Department from "../models/Department.js";
import Faculty from "../models/Faculty.js";
import SectionAllocation from "../models/SectionAllocation.js";
import StudentEvent from "../models/StudentEvent.js";
import mongoose from "mongoose";

const splitList = (value) => {
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);
  return String(value || "")
    .split(/\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);
};

const normalizeSections = (sections) => splitList(sections).map((x) => x.toUpperCase());

const resolveDepartment = async (departmentValue) => {
  if (!departmentValue) return null;
  const value = String(departmentValue).trim();

  if (mongoose.Types.ObjectId.isValid(value)) {
    const byId = await Department.findById(value);
    if (byId) return byId;
  }

  return Department.findOne({
    $or: [{ code: value.toUpperCase() }, { name: { $regex: `^${value}$`, $options: "i" } }]
  });
};

const gradeFromTotal = (total) => {
  if (total >= 90) return "O";
  if (total >= 80) return "A+";
  if (total >= 70) return "A";
  if (total >= 60) return "B+";
  if (total >= 50) return "B";
  if (total >= 40) return "C";
  return "F";
};

const getFacultyAllocations = async (user) => {
  const bySectionAllocation = await SectionAllocation.find({
    $or: [{ facultyId: String(user.facultyId || "").toUpperCase() }, { facultyUser: user._id }]
  }).sort({ section: 1, semester: 1, subject: 1 });

  if (bySectionAllocation.length) {
    return bySectionAllocation.map((row) => ({
      department: row.department,
      section: row.section,
      semester: row.semester,
      academicYear: row.academicYear,
      subjectName: row.subject,
      subjectCode: String(row.subject || "").replace(/\s+/g, "").slice(0, 8).toUpperCase()
    }));
  }

  const byTeachingAssignment = await TeachingAssignment.find({ faculty: user._id }).sort({ section: 1, semester: 1, subjectCode: 1 });
  if (byTeachingAssignment.length) {
    return byTeachingAssignment.map((row) => ({
      department: row.department,
      section: row.section,
      semester: row.semester,
      academicYear: row.academicYear,
      subjectName: row.subjectName,
      subjectCode: row.subjectCode
    }));
  }

  const facultyRecord = await Faculty.findOne({ user: user._id }).select("department sections subjects");
  if (facultyRecord?.subjects?.length && facultyRecord?.sections?.length) {
    const academicYear = `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, "0")}`;
    return facultyRecord.subjects.flatMap((subject) =>
      facultyRecord.sections.map((section) => ({
        department: facultyRecord.department,
        section: String(section).toUpperCase(),
        semester: Number(subject.semester || 0),
        academicYear,
        subjectName: subject.subjectName,
        subjectCode: String(subject.subjectName || "").replace(/\s+/g, "").slice(0, 8).toUpperCase()
      }))
    );
  }

  return byTeachingAssignment.map((row) => ({
    department: row.department,
    section: row.section,
    semester: row.semester,
    academicYear: row.academicYear,
    subjectName: row.subjectName,
    subjectCode: row.subjectCode
  }));
};

export const addFaculty = async (req, res) => {
  const {
    name,
    employeeId,
    email,
    phone,
    department,
    designation,
    qualification,
    experience,
    username,
    password,
    sections,
    subjects,
    researchArea,
    publications,
    googleScholarLink,
    orcidId,
    awards,
    patents,
    conferenceParticipation,
    achievements,
    officeLocation,
    joiningDate,
    profilePhoto
  } = req.body;

  if (!name || !employeeId || !email || !username || !password || !department) {
    return res.status(400).json({
      success: false,
      message: "name, employeeId, email, username, password, and department are required"
    });
  }

  const departmentDoc = await resolveDepartment(department);
  if (!departmentDoc) {
    return res.status(404).json({ success: false, message: "Department not found" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = String(username).trim().toLowerCase();
  const normalizedEmployeeId = String(employeeId).trim().toUpperCase();

  const [existingUserEmail, existingUserUsername, existingFaculty] = await Promise.all([
    User.findOne({ email: normalizedEmail }),
    User.findOne({ username: normalizedUsername }),
    Faculty.findOne({ $or: [{ employeeId: normalizedEmployeeId }, { email: normalizedEmail }, { username: normalizedUsername }] })
  ]);

  if (existingUserEmail || existingFaculty?.email === normalizedEmail) {
    return res.status(400).json({ success: false, message: "Email already exists" });
  }

  if (existingUserUsername || existingFaculty?.username === normalizedUsername) {
    return res.status(400).json({ success: false, message: "Username already exists" });
  }

  if (existingFaculty?.employeeId === normalizedEmployeeId) {
    return res.status(400).json({ success: false, message: "Employee ID already exists" });
  }

  const parsedSubjects = Array.isArray(subjects)
    ? subjects
        .map((subject) => ({
          subjectName: String(subject?.subjectName || "").trim(),
          semester: Number(subject?.semester || 0)
        }))
        .filter((subject) => subject.subjectName && subject.semester > 0)
    : [];

  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    username: normalizedUsername,
    password,
    role: "faculty",
    department: departmentDoc._id,
    facultyId: normalizedEmployeeId,
    facultyProfile: {
      designation: designation || "Assistant Professor",
      qualification: qualification || "",
      experienceYears: Number(experience || 0),
      phd: String(qualification || "").toUpperCase() === "PHD",
      bio: "",
      scholars: [],
      recentPapers: [],
      expertise: splitList(researchArea)
    }
  });

  const faculty = await Faculty.create({
    user: user._id,
    department: departmentDoc._id,
    name: String(name).trim(),
    employeeId: normalizedEmployeeId,
    email: normalizedEmail,
    username: normalizedUsername,
    passwordHash: user.password,
    phone: String(phone || "").trim(),
    designation: designation || "Assistant Professor",
    qualification: qualification || "",
    experience: Number(experience || 0),
    contactNumber: String(phone || "").trim(),
    officeLocation: String(officeLocation || "").trim(),
    joiningDate: joiningDate ? new Date(joiningDate) : undefined,
    profilePhoto: String(profilePhoto || "").trim(),
    sections: normalizeSections(sections),
    subjects: parsedSubjects,
    researchInterests: splitList(researchArea),
    researchArea: String(researchArea || "").trim(),
    publications: Number(publications || 0),
    googleScholarLink: String(googleScholarLink || "").trim(),
    orcidId: String(orcidId || "").trim(),
    achievements: splitList(achievements),
    awards: splitList(awards),
    patents: splitList(patents),
    conferenceParticipation: splitList(conferenceParticipation)
  });

  if (parsedSubjects.length) {
    const sectionList = normalizeSections(sections);
    const sectionTargets = sectionList.length ? sectionList : ["A"];
    const assignmentDocs = parsedSubjects.flatMap((subject) =>
      sectionTargets.map((section) => ({
        faculty: user._id,
        department: departmentDoc._id,
        semester: subject.semester,
        academicYear: `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, "0")}`,
        section,
        subjectCode: subject.subjectName.replace(/\s+/g, "").slice(0, 8).toUpperCase(),
        subjectName: subject.subjectName
      }))
    );

    await TeachingAssignment.insertMany(assignmentDocs, { ordered: false }).catch(() => null);

    if (normalizedEmployeeId) {
      const allocationDocs = assignmentDocs.map((doc) => ({
        department: doc.department,
        section: doc.section,
        semester: doc.semester,
        academicYear: doc.academicYear,
        subject: doc.subjectName,
        facultyId: normalizedEmployeeId,
        facultyUser: user._id
      }));

      await SectionAllocation.insertMany(allocationDocs, { ordered: false }).catch(() => null);
    }
  }

  const populated = await Faculty.findById(faculty._id).populate("department", "name code").populate("user", "name email username role facultyId");
  return res.status(201).json({ success: true, data: populated });
};

export const getAllFaculty = async (req, res) => {
  const filter = {};
  if (req.query.department) {
    const departmentDoc = await resolveDepartment(req.query.department);
    if (departmentDoc) filter.department = departmentDoc._id;
  }

  const rows = await Faculty.find(filter)
    .populate("department", "name code")
    .populate("user", "name email username role facultyId")
    .sort({ createdAt: -1 });

  return res.status(200).json({ success: true, data: rows });
};

export const getFacultyById = async (req, res) => {
  const { id } = req.params;

  const row = await Faculty.findById(id)
    .populate("department", "name code")
    .populate("user", "name email username role facultyId facultyProfile");

  if (!row) return res.status(404).json({ success: false, message: "Faculty not found" });
  return res.status(200).json({ success: true, data: row });
};

export const updateFaculty = async (req, res) => {
  const { id, ...payload } = req.body;
  if (!id) return res.status(400).json({ success: false, message: "Faculty id is required" });

  const row = await Faculty.findById(id);
  if (!row) return res.status(404).json({ success: false, message: "Faculty not found" });

  let departmentDoc = null;
  if (payload.department) {
    departmentDoc = await resolveDepartment(payload.department);
    if (!departmentDoc) return res.status(404).json({ success: false, message: "Department not found" });
    row.department = departmentDoc._id;
  }

  if (payload.name) row.name = String(payload.name).trim();
  if (payload.employeeId) row.employeeId = String(payload.employeeId).trim().toUpperCase();
  if (payload.email) row.email = String(payload.email).trim().toLowerCase();
  if (payload.username) row.username = String(payload.username).trim().toLowerCase();
  if (payload.phone !== undefined) {
    row.phone = String(payload.phone || "").trim();
    row.contactNumber = row.phone;
  }
  if (payload.designation !== undefined) row.designation = String(payload.designation || "").trim();
  if (payload.qualification !== undefined) row.qualification = String(payload.qualification || "").trim();
  if (payload.experience !== undefined) row.experience = Number(payload.experience || 0);
  if (payload.sections !== undefined) row.sections = normalizeSections(payload.sections);
  if (payload.subjects !== undefined) {
    row.subjects = Array.isArray(payload.subjects)
      ? payload.subjects
          .map((subject) => ({
            subjectName: String(subject?.subjectName || "").trim(),
            semester: Number(subject?.semester || 0)
          }))
          .filter((subject) => subject.subjectName && subject.semester > 0)
      : [];
  }
  if (payload.researchArea !== undefined) {
    row.researchArea = String(payload.researchArea || "").trim();
    row.researchInterests = splitList(payload.researchArea);
  }
  if (payload.publications !== undefined) row.publications = Number(payload.publications || 0);
  if (payload.googleScholarLink !== undefined) row.googleScholarLink = String(payload.googleScholarLink || "").trim();
  if (payload.orcidId !== undefined) row.orcidId = String(payload.orcidId || "").trim();
  if (payload.achievements !== undefined) row.achievements = splitList(payload.achievements);
  if (payload.awards !== undefined) row.awards = splitList(payload.awards);
  if (payload.patents !== undefined) row.patents = splitList(payload.patents);
  if (payload.conferenceParticipation !== undefined) row.conferenceParticipation = splitList(payload.conferenceParticipation);
  if (payload.profilePhoto !== undefined) row.profilePhoto = String(payload.profilePhoto || "").trim();
  if (payload.officeLocation !== undefined) row.officeLocation = String(payload.officeLocation || "").trim();
  if (payload.joiningDate !== undefined) row.joiningDate = payload.joiningDate ? new Date(payload.joiningDate) : undefined;

  await row.save();

  const userPatch = {};
  if (payload.name !== undefined) userPatch.name = String(payload.name).trim();
  if (payload.email !== undefined) userPatch.email = String(payload.email).trim().toLowerCase();
  if (payload.username !== undefined) userPatch.username = String(payload.username).trim().toLowerCase();
  if (payload.password) userPatch.password = payload.password;
  if (payload.employeeId !== undefined) userPatch.facultyId = String(payload.employeeId).trim().toUpperCase();
  if (departmentDoc) userPatch.department = departmentDoc._id;
  userPatch.facultyProfile = {
    designation: row.designation,
    qualification: row.qualification,
    experienceYears: row.experience,
    phd: String(row.qualification || "").toUpperCase() === "PHD",
    bio: "",
    scholars: [],
    recentPapers: [],
    expertise: row.researchInterests
  };

  const updatedUser = await User.findByIdAndUpdate(row.user, { $set: userPatch }, { new: true });
  row.passwordHash = updatedUser.password;
  await row.save();

  const populated = await Faculty.findById(row._id).populate("department", "name code").populate("user", "name email username role facultyId");
  return res.status(200).json({ success: true, data: populated });
};

export const uploadMarks = async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  const total = Number(req.body.total);
  const payload = {
    ...req.body,
    student: studentId,
    total,
    grade: req.body.grade || gradeFromTotal(total),
    credits: Number(req.body.credits || 3),
    passed: total >= 40,
    enteredBy: req.user._id
  };
  const mark = await Mark.findOneAndUpdate(
    {
      student: studentId,
      subjectCode: req.body.subjectCode,
      semester: req.body.semester,
      academicYear: req.body.academicYear
    },
    payload,
    { upsert: true, new: true }
  );

  return res.status(200).json({ success: true, data: mark });
};

export const uploadAttendance = async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);

  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  const semester = Number(req.body.semester);
  const academicYear = req.body.academicYear;

  const classesConducted = Number(req.body.classesConducted || req.body.totalClasses || 0);
  const classesAttended = Number(req.body.classesAttended || req.body.attendedClasses || 0);
  const subjectPercentage = classesConducted ? (classesAttended / classesConducted) * 100 : 0;

  const attendance = await Attendance.findOneAndUpdate(
    { student: studentId, semester, academicYear },
    {
      $setOnInsert: {
        student: studentId,
        semester,
        academicYear,
        totalClasses: 0,
        attendedClasses: 0,
        percentage: 0,
        subjects: []
      }
    },
    { upsert: true, new: true }
  );

  const subjectCode = String(req.body.subjectCode || "").toUpperCase();
  const subjectName = req.body.subjectName || subjectCode;
  const idx = attendance.subjects.findIndex((s) => s.subjectCode === subjectCode);
  const subjectRow = {
    subjectCode,
    subjectName,
    classesConducted,
    classesAttended,
    percentage: Number(subjectPercentage.toFixed(2))
  };

  if (idx >= 0) attendance.subjects[idx] = subjectRow;
  else attendance.subjects.push(subjectRow);

  attendance.totalClasses = attendance.subjects.reduce((sum, s) => sum + s.classesConducted, 0);
  attendance.attendedClasses = attendance.subjects.reduce((sum, s) => sum + s.classesAttended, 0);
  attendance.percentage = attendance.totalClasses
    ? Number(((attendance.attendedClasses / attendance.totalClasses) * 100).toFixed(2))
    : 0;
  attendance.enteredBy = req.user._id;
  await attendance.save();

  return res.status(200).json({ success: true, data: attendance });
};

export const addResearch = async (req, res) => {
  const research = await Research.create({ ...req.body, faculty: req.user._id });
  return res.status(201).json({ success: true, data: research });
};

export const getFacultyPortal = async (req, res) => {
  const faculty = await User.findById(req.user._id)
    .select("name email username facultyId facultyProfile department")
    .populate("department", "name code");

  const facultyRecord = await Faculty.findOne({ user: req.user._id })
    .populate("department", "name code")
    .select("name employeeId email username phone designation qualification experience sections subjects researchArea publications googleScholarLink orcidId achievements awards patents conferenceParticipation officeLocation joiningDate profilePhoto");

  let assignments = await TeachingAssignment.find({ faculty: req.user._id }).sort({ createdAt: -1 });
  if (!assignments.length && facultyRecord?.subjects?.length) {
    assignments = facultyRecord.subjects.map((subject) => ({
      _id: `${subject.subjectName}-${subject.semester}`,
      semester: subject.semester,
      academicYear: `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, "0")}`,
      section: facultyRecord.sections?.[0] || "A",
      subjectCode: subject.subjectName.replace(/\s+/g, "").slice(0, 8).toUpperCase(),
      subjectName: subject.subjectName
    }));
  }
  const uniqueSections = [...new Set(assignments.map((a) => a.section))];

  const sectionAnalytics = [];
  for (const section of uniqueSections) {
    const students = await Student.find({
      department: faculty.department?._id,
      section
    }).select("_id name rollNo");

    const studentIds = students.map((s) => s._id);
    const marks = studentIds.length ? await Mark.find({ student: { $in: studentIds } }) : [];

    const avgMarks = marks.length ? marks.reduce((sum, m) => sum + Number(m.total || 0), 0) / marks.length : 0;
    const passPercent = marks.length ? (marks.filter((m) => m.passed).length / marks.length) * 100 : 0;

    sectionAnalytics.push({
      section,
      students: students.length,
      averageMarks: Number(avgMarks.toFixed(2)),
      passPercent: Number(passPercent.toFixed(2))
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      faculty,
      facultyRecord,
      assignments,
      sectionAnalytics
    }
  });
};

export const getFacultyDashboardAnalytics = async (req, res) => {
  const allocations = await getFacultyAllocations(req.user);

  const allowedSections = [...new Set(allocations.map((row) => String(row.section || "").toUpperCase()).filter(Boolean))];
  const allowedSemesters = [...new Set(allocations.map((row) => Number(row.semester || 0)).filter((x) => x > 0))];

  const studentFilter = {
    department: req.user.department,
    section: { $in: allowedSections.length ? allowedSections : ["__NO_SECTION__"] }
  };

  if (allowedSemesters.length) {
    studentFilter.currentSemester = { $in: allowedSemesters };
  }

  const students = await Student.find(studentFilter).select("_id name rollNo section currentSemester metrics riskLevel");
  const studentIds = students.map((row) => row._id);

  const normalizedStudents = students.map((student) => {
    const latest = student.metrics?.at(-1) || {};
    return {
      _id: student._id,
      studentId: student._id,
      name: student.name,
      rollNo: student.rollNo,
      section: student.section,
      semester: student.currentSemester,
      cgpa: Number(latest.cgpa || 0),
      attendance: Number(latest.attendancePercent || 0),
      backlogs: Number(latest.backlogCount || 0),
      riskLevel: student.riskLevel
    };
  });

  const totalStudents = normalizedStudents.length;
  const averageCgpa = totalStudents
    ? normalizedStudents.reduce((sum, row) => sum + row.cgpa, 0) / totalStudents
    : 0;
  const passPercentage = totalStudents
    ? (normalizedStudents.filter((row) => row.backlogs === 0).length / totalStudents) * 100
    : 0;
  const studentsWithBacklogs = normalizedStudents.filter((row) => row.backlogs > 0).length;

  const riskDistribution = normalizedStudents.reduce(
    (acc, row) => {
      if (row.cgpa < 5) acc.high += 1;
      else if (row.cgpa <= 7) acc.medium += 1;
      else acc.low += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );

  const sectionBuckets = normalizedStudents.reduce((acc, row) => {
    if (!acc[row.section]) acc[row.section] = [];
    acc[row.section].push(row.cgpa);
    return acc;
  }, {});

  const sectionPerformance = Object.entries(sectionBuckets).map(([section, cgpas]) => ({
    section: `Section ${section}`,
    averageCgpa: Number((cgpas.reduce((sum, value) => sum + value, 0) / (cgpas.length || 1)).toFixed(2))
  }));

  const topStudents = [...normalizedStudents]
    .sort((a, b) => b.cgpa - a.cgpa)
    .slice(0, 10)
    .map((row) => ({
      studentId: row.studentId,
      name: row.name,
      rollNo: row.rollNo,
      section: row.section,
      cgpa: Number(row.cgpa.toFixed(2))
    }));

  const lowAttendanceStudents = normalizedStudents
    .filter((row) => row.attendance < 75)
    .map((row) => ({
      studentId: row.studentId,
      name: row.name,
      rollNo: row.rollNo,
      section: row.section,
      attendance: Number(row.attendance.toFixed(2))
    }));

  const marks = studentIds.length
    ? await Mark.find({ student: { $in: studentIds } }).select("student subjectCode subjectName semester passed")
    : [];

  const subjectMap = allocations.reduce((acc, row) => {
    const code = String(row.subjectCode || "").toUpperCase();
    if (!code) return acc;
    if (!acc[code]) {
      acc[code] = { subjectCode: code, subjectName: row.subjectName || code, total: 0, passed: 0 };
    }
    return acc;
  }, {});

  for (const mark of marks) {
    const code = String(mark.subjectCode || "").toUpperCase();
    if (!subjectMap[code]) continue;
    subjectMap[code].total += 1;
    if (mark.passed) subjectMap[code].passed += 1;
  }

  const subjectPassPercentage = Object.values(subjectMap).map((row) => ({
    subjectCode: row.subjectCode,
    subjectName: row.subjectName,
    passPercentage: row.total ? Number(((row.passed / row.total) * 100).toFixed(2)) : 0
  }));

  return res.status(200).json({
    success: true,
    data: {
      facultyId: req.user.facultyId,
      assignments: allocations.map((row) => ({
        section: row.section,
        semester: row.semester,
        subjectCode: row.subjectCode,
        subjectName: row.subjectName,
        academicYear: row.academicYear
      })),
      sectionOverview: {
        totalStudents,
        averageCgpa: Number(averageCgpa.toFixed(2)),
        passPercentage: Number(passPercentage.toFixed(2)),
        studentsWithBacklogs
      },
      riskDistribution,
      sectionPerformance,
      topStudents,
      lowAttendanceStudents,
      subjectPassPercentage,
      studentsScoped: normalizedStudents
    }
  });
};

export const updateFacultyProfile = async (req, res) => {
  const expertise = Array.isArray(req.body.expertise) ? req.body.expertise : [];
  const payload = {
    "facultyProfile.designation": req.body.designation || "",
    "facultyProfile.qualification": req.body.qualification || "",
    "facultyProfile.experienceYears": Number(req.body.experienceYears || 0),
    "facultyProfile.phd": !!req.body.phd,
    "facultyProfile.bio": req.body.bio || "",
    "facultyProfile.scholars": Array.isArray(req.body.scholars) ? req.body.scholars : [],
    "facultyProfile.recentPapers": Array.isArray(req.body.recentPapers) ? req.body.recentPapers : [],
    "facultyProfile.expertise": expertise
  };

  const user = await User.findByIdAndUpdate(req.user._id, { $set: payload }, { new: true })
    .select("name email facultyId facultyProfile")
    .populate("department", "name code");

  await Faculty.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        designation: req.body.designation || "",
        qualification: req.body.qualification || "",
        experience: Number(req.body.experienceYears || 0),
        phone: String(req.body.phone || "").trim(),
        contactNumber: String(req.body.phone || "").trim(),
        officeLocation: String(req.body.officeLocation || "").trim(),
        researchArea: expertise.join(", "),
        researchInterests: expertise
      }
    }
  );

  return res.status(200).json({ success: true, data: user });
};

export const addTeachingAssignment = async (req, res) => {
  const { semester, academicYear, section, subjectCode, subjectName } = req.body;

  const assignment = await TeachingAssignment.findOneAndUpdate(
    {
      faculty: req.user._id,
      semester: Number(semester),
      academicYear,
      section: String(section).toUpperCase(),
      subjectCode: String(subjectCode).toUpperCase()
    },
    {
      faculty: req.user._id,
      department: req.user.department,
      semester: Number(semester),
      academicYear,
      section: String(section).toUpperCase(),
      subjectCode: String(subjectCode).toUpperCase(),
      subjectName
    },
    { upsert: true, new: true }
  );

  if (req.user.facultyId) {
    await SectionAllocation.findOneAndUpdate(
      {
        department: req.user.department,
        section: String(section).toUpperCase(),
        semester: Number(semester),
        subject: subjectName,
        facultyId: String(req.user.facultyId).toUpperCase()
      },
      {
        department: req.user.department,
        section: String(section).toUpperCase(),
        semester: Number(semester),
        academicYear,
        subject: subjectName,
        facultyId: String(req.user.facultyId).toUpperCase(),
        facultyUser: req.user._id
      },
      { upsert: true, new: true }
    );
  }

  return res.status(200).json({ success: true, data: assignment });
};

export const upsertSectionAllocation = async (req, res) => {
  const { department, section, semester, subject, facultyId, academicYear } = req.body;

  if (!department || !section || !semester || !subject || !facultyId) {
    return res.status(400).json({
      success: false,
      message: "department, section, semester, subject, and facultyId are required"
    });
  }

  const departmentDoc = await resolveDepartment(department);
  if (!departmentDoc) {
    return res.status(404).json({ success: false, message: "Department not found" });
  }

  if (String(req.user?.role) === "hod") {
    const hodDepartment = req.user?.department ? String(req.user.department) : "";
    if (!hodDepartment || hodDepartment !== String(departmentDoc._id)) {
      return res.status(403).json({ success: false, message: "HOD can allocate only within own department" });
    }
  }

  const normalizedFacultyId = String(facultyId).trim().toUpperCase();
  let facultyUser = await User.findOne({ facultyId: normalizedFacultyId }).select("_id facultyId department role");

  if (!facultyUser) {
    const facultyRow = await Faculty.findOne({ employeeId: normalizedFacultyId }).select("user department");
    if (facultyRow?.user) {
      facultyUser = await User.findById(facultyRow.user).select("_id facultyId department role");
    }
  }

  if (!facultyUser || String(facultyUser.role) !== "faculty") {
    return res.status(404).json({ success: false, message: "Faculty not found for provided facultyId" });
  }

  const normalizedSection = String(section).trim().toUpperCase();
  const normalizedSemester = Number(semester);
  const normalizedSubject = String(subject).trim();
  const normalizedAcademicYear = String(academicYear || "").trim();

  const allocation = await SectionAllocation.findOneAndUpdate(
    {
      department: departmentDoc._id,
      section: normalizedSection,
      semester: normalizedSemester,
      subject: normalizedSubject,
      facultyId: normalizedFacultyId
    },
    {
      department: departmentDoc._id,
      section: normalizedSection,
      semester: normalizedSemester,
      subject: normalizedSubject,
      facultyId: normalizedFacultyId,
      facultyUser: facultyUser._id,
      academicYear: normalizedAcademicYear
    },
    { new: true, upsert: true }
  );

  await TeachingAssignment.findOneAndUpdate(
    {
      faculty: facultyUser._id,
      semester: normalizedSemester,
      academicYear: normalizedAcademicYear || `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, "0")}`,
      section: normalizedSection,
      subjectCode: normalizedSubject.replace(/\s+/g, "").slice(0, 8).toUpperCase()
    },
    {
      faculty: facultyUser._id,
      department: departmentDoc._id,
      semester: normalizedSemester,
      academicYear: normalizedAcademicYear || `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, "0")}`,
      section: normalizedSection,
      subjectCode: normalizedSubject.replace(/\s+/g, "").slice(0, 8).toUpperCase(),
      subjectName: normalizedSubject
    },
    { upsert: true, new: true }
  );

  return res.status(200).json({ success: true, data: allocation });
};

export const getSectionStudents = async (req, res) => {
  const { section } = req.params;
  const { semester } = req.query;

  const filter = {
    section: String(section).toUpperCase(),
    department: req.user.department
  };

  if (semester) filter.currentSemester = Number(semester);

  if (req.user.role === "faculty") {
    const allocations = await getFacultyAllocations(req.user);
    const allowedSections = new Set(allocations.map((row) => String(row.section || "").toUpperCase()));
    if (!allowedSections.has(String(section).toUpperCase())) {
      return res.status(403).json({ success: false, message: "Access denied for this section" });
    }
  }

  const students = await Student.find(filter).select("_id name rollNo currentSemester section");
  return res.status(200).json({ success: true, data: students });
};

export const bulkUploadSectionMarks = async (req, res) => {
  const { section } = req.params;
  const { semester, academicYear, subjectCode, subjectName, credits = 3, marks = [] } = req.body;

  const students = await Student.find({
    section: String(section).toUpperCase(),
    currentSemester: Number(semester),
    department: req.user.department
  }).select("_id");

  const studentIds = new Set(students.map((s) => String(s._id)));
  let upserted = 0;

  for (const row of marks) {
    if (!studentIds.has(String(row.studentId))) continue;

    const internal = Number(row.internal || 0);
    const external = Number(row.external || 0);
    const total = Number(row.total || internal + external);

    await Mark.findOneAndUpdate(
      {
        student: row.studentId,
        subjectCode: String(subjectCode).toUpperCase(),
        semester: Number(semester),
        academicYear
      },
      {
        student: row.studentId,
        subjectCode: String(subjectCode).toUpperCase(),
        subjectName,
        semester: Number(semester),
        academicYear,
        internal,
        external,
        total,
        grade: gradeFromTotal(total),
        credits: Number(credits),
        passed: total >= 40,
        enteredBy: req.user._id
      },
      { upsert: true, new: true }
    );

    upserted += 1;
  }

  return res.status(200).json({
    success: true,
    message: `Section ${String(section).toUpperCase()} marks uploaded`,
    data: { upserted }
  });
};

export const addStudentEvent = async (req, res) => {
  const { studentId } = req.params;
  const student = await Student.findById(studentId);
  if (!student) {
    return res.status(404).json({ success: false, message: "Student not found" });
  }

  const { eventName, eventType, level, participationType, date, academicYear } = req.body;
  if (!eventName || !eventType || !level || !participationType || !date || !academicYear) {
    return res.status(400).json({ success: false, message: "Missing required fields for event" });
  }

  const event = await StudentEvent.create({
    student: student._id,
    department: student.department,
    eventName: String(eventName).trim(),
    eventType,
    level,
    participationType,
    date: new Date(date),
    academicYear,
    enteredBy: req.user._id
  });

  return res.status(201).json({ success: true, data: event });
};
