import Mark from "../models/Mark.js";
import Attendance from "../models/Attendance.js";
import Research from "../models/Research.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import TeachingAssignment from "../models/TeachingAssignment.js";

const gradeFromTotal = (total) => {
  if (total >= 90) return "O";
  if (total >= 80) return "A+";
  if (total >= 70) return "A";
  if (total >= 60) return "B+";
  if (total >= 50) return "B";
  if (total >= 40) return "C";
  return "F";
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
    .select("name email facultyId facultyProfile department")
    .populate("department", "name code");

  const assignments = await TeachingAssignment.find({ faculty: req.user._id }).sort({ createdAt: -1 });
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
      assignments,
      sectionAnalytics
    }
  });
};

export const updateFacultyProfile = async (req, res) => {
  const payload = {
    "facultyProfile.designation": req.body.designation || "",
    "facultyProfile.qualification": req.body.qualification || "",
    "facultyProfile.experienceYears": Number(req.body.experienceYears || 0),
    "facultyProfile.phd": !!req.body.phd,
    "facultyProfile.bio": req.body.bio || "",
    "facultyProfile.scholars": Array.isArray(req.body.scholars) ? req.body.scholars : [],
    "facultyProfile.recentPapers": Array.isArray(req.body.recentPapers) ? req.body.recentPapers : [],
    "facultyProfile.expertise": Array.isArray(req.body.expertise) ? req.body.expertise : []
  };

  const user = await User.findByIdAndUpdate(req.user._id, { $set: payload }, { new: true })
    .select("name email facultyId facultyProfile")
    .populate("department", "name code");

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

  return res.status(200).json({ success: true, data: assignment });
};

export const getSectionStudents = async (req, res) => {
  const { section } = req.params;
  const { semester } = req.query;

  const filter = {
    section: String(section).toUpperCase(),
    department: req.user.department
  };

  if (semester) filter.currentSemester = Number(semester);

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
