import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import Department from "../models/Department.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Mark from "../models/Mark.js";
import StudentActivity from "../models/StudentActivity.js";
import Announcement from "../models/Announcement.js";
import TeachingAssignment from "../models/TeachingAssignment.js";
import Section from "../models/Section.js";
import DepartmentStat from "../models/DepartmentStat.js";
import StudentAchievement from "../models/StudentAchievement.js";
import FacultyAchievement from "../models/FacultyAchievement.js";

dotenv.config();

const run = async () => {
  await connectDB();

  await Promise.all([
    Department.deleteMany({}),
    Student.deleteMany({}),
    User.deleteMany({}),
    Attendance.deleteMany({}),
    Mark.deleteMany({}),
    StudentActivity.deleteMany({}),
    Announcement.deleteMany({}),
    TeachingAssignment.deleteMany({}),
    Section.deleteMany({}),
    DepartmentStat.deleteMany({}),
    StudentAchievement.deleteMany({}),
    FacultyAchievement.deleteMany({})
  ]);

  const [cse, ece] = await Department.create([
    { name: "Computer Science and Engineering", code: "CSE" },
    { name: "Electronics and Communication Engineering", code: "ECE" }
  ]);

  const students = await Student.create([
    {
      rollNo: "CSE001",
      name: "Ravi Kumar",
      email: "ravi@student.iqac.edu",
      department: cse._id,
      section: "A",
      currentSemester: 4,
      batch: "2023-2027",
      phone: "9876543210",
      address: "Block A, Hyderabad",
      feeDetails: {
        totalFee: 120000,
        paidAmount: 90000,
        pendingAmount: 30000,
        paymentStatus: "PARTIAL"
      },
      riskLevel: "HIGH",
      metrics: [
        { semester: 3, academicYear: "2024-25", sgpa: 6.8, cgpa: 6.9, backlogCount: 2, attendancePercent: 58 },
        { semester: 4, academicYear: "2024-25", sgpa: 6.3, cgpa: 6.7, backlogCount: 3, attendancePercent: 55 }
      ]
    },
    {
      rollNo: "ECE001",
      name: "Arjun Singh",
      email: "arjun@student.iqac.edu",
      department: ece._id,
      section: "A",
      currentSemester: 4,
      batch: "2023-2027",
      phone: "9123456780",
      address: "Block B, Hyderabad",
      feeDetails: {
        totalFee: 120000,
        paidAmount: 120000,
        pendingAmount: 0,
        paymentStatus: "PAID"
      },
      riskLevel: "LOW",
      metrics: [
        { semester: 3, academicYear: "2024-25", sgpa: 8.1, cgpa: 7.9, backlogCount: 0, attendancePercent: 85 },
        { semester: 4, academicYear: "2024-25", sgpa: 8.2, cgpa: 8.0, backlogCount: 0, attendancePercent: 87 }
      ]
    },
    {
      rollNo: "CSE002",
      name: "Meena R",
      email: "meena@student.iqac.edu",
      department: cse._id,
      section: "B",
      currentSemester: 4,
      batch: "2023-2027",
      phone: "9012345678",
      address: "Block C, Hyderabad",
      feeDetails: { totalFee: 120000, paidAmount: 110000, pendingAmount: 10000, paymentStatus: "PARTIAL" },
      riskLevel: "MEDIUM",
      metrics: [
        { semester: 3, academicYear: "2024-25", sgpa: 7.4, cgpa: 7.2, backlogCount: 1, attendancePercent: 72 },
        { semester: 4, academicYear: "2024-25", sgpa: 7.1, cgpa: 7.15, backlogCount: 1, attendancePercent: 70 }
      ]
    },
    {
      rollNo: "CSE003",
      name: "Rahul V",
      email: "rahul@student.iqac.edu",
      department: cse._id,
      section: "C",
      currentSemester: 4,
      batch: "2023-2027",
      phone: "9988776655",
      address: "Block D, Hyderabad",
      feeDetails: { totalFee: 120000, paidAmount: 120000, pendingAmount: 0, paymentStatus: "PAID" },
      riskLevel: "LOW",
      metrics: [
        { semester: 3, academicYear: "2024-25", sgpa: 8.6, cgpa: 8.5, backlogCount: 0, attendancePercent: 90 },
        { semester: 4, academicYear: "2024-25", sgpa: 8.4, cgpa: 8.45, backlogCount: 0, attendancePercent: 88 }
      ]
    }
  ]);

  const admin = await User.create({
    name: "IQAC Admin",
    email: "admin@iqac.edu",
    password: "Admin@123",
    role: "admin"
  });

  const hod = await User.create({
    name: "HOD CSE",
    email: "hod.cse@iqac.edu",
    password: "Admin@123",
    role: "hod",
    department: cse._id
  });

  const faculty = await User.create({
    name: "Faculty CSE",
    email: "faculty.cse@iqac.edu",
    password: "Admin@123",
    role: "faculty",
    department: cse._id,
    facultyId: "FAC001",
    facultyProfile: {
      designation: "Assistant Professor",
      qualification: "PhD",
      experienceYears: 8,
      phd: true,
      bio: "Focus on distributed systems and quality education.",
      scholars: ["Anita M", "Rohit K"],
      recentPapers: ["QoS in Edge Networks", "Outcome Based Education Metrics"],
      expertise: ["Networks", "Distributed Systems"]
    }
  });

  const faculty2 = await User.create({
    name: "Faculty Priya",
    email: "priya.faculty@iqac.edu",
    password: "Admin@123",
    role: "faculty",
    department: cse._id,
    facultyId: "FAC002",
    facultyProfile: {
      designation: "Associate Professor",
      qualification: "M.Tech",
      experienceYears: 12,
      phd: false,
      bio: "Works in software engineering and academic process improvement.",
      scholars: ["Suman T"],
      recentPapers: ["Assessment Rubrics Automation"],
      expertise: ["Software Engineering", "Academic Audits"]
    }
  });

  await User.create({
    name: students[0].name,
    email: students[0].email,
    password: "Admin@123",
    role: "student",
    department: cse._id,
    studentProfile: students[0]._id
  });

  await User.create({
    name: students[2].name,
    email: students[2].email,
    password: "Admin@123",
    role: "student",
    department: cse._id,
    studentProfile: students[2]._id,
    registrationNumber: students[2].rollNo
  });

  await User.create({
    name: students[3].name,
    email: students[3].email,
    password: "Admin@123",
    role: "student",
    department: cse._id,
    studentProfile: students[3]._id,
    registrationNumber: students[3].rollNo
  });

  await Attendance.create({
    student: students[0]._id,
    semester: 4,
    academicYear: "2024-25",
    totalClasses: 230,
    attendedClasses: 146,
    percentage: 63.48,
    subjects: [
      { subjectCode: "SE", subjectName: "Software Engineering", classesConducted: 48, classesAttended: 31, percentage: 64.58 },
      { subjectCode: "CNS", subjectName: "Computer Networks", classesConducted: 45, classesAttended: 29, percentage: 64.44 },
      { subjectCode: "IIC", subjectName: "Industry Interaction", classesConducted: 38, classesAttended: 22, percentage: 57.89 },
      { subjectCode: "ADS", subjectName: "Advanced Data Structures", classesConducted: 52, classesAttended: 36, percentage: 69.23 },
      { subjectCode: "IDP2", subjectName: "IDP-II", classesConducted: 47, classesAttended: 28, percentage: 59.57 }
    ]
  });

  await Mark.create([
    { student: students[0]._id, subjectCode: "SE", subjectName: "Software Engineering", semester: 4, academicYear: "2024-25", internal: 19, external: 34, total: 53, grade: "B", credits: 3, passed: true },
    { student: students[0]._id, subjectCode: "CNS", subjectName: "Computer Networks", semester: 4, academicYear: "2024-25", internal: 17, external: 30, total: 47, grade: "C", credits: 3, passed: true },
    { student: students[0]._id, subjectCode: "IIC", subjectName: "Industry Interaction", semester: 4, academicYear: "2024-25", internal: 15, external: 22, total: 37, grade: "F", credits: 2, passed: false },
    { student: students[0]._id, subjectCode: "ADS", subjectName: "Advanced Data Structures", semester: 4, academicYear: "2024-25", internal: 20, external: 35, total: 55, grade: "B", credits: 4, passed: true },
    { student: students[0]._id, subjectCode: "IDP2", subjectName: "IDP-II", semester: 4, academicYear: "2024-25", internal: 18, external: 29, total: 47, grade: "C", credits: 2, passed: true },
    { student: students[2]._id, subjectCode: "CNS", subjectName: "Computer Networks", semester: 4, academicYear: "2024-25", internal: 22, external: 40, total: 62, grade: "B+", credits: 3, passed: true },
    { student: students[3]._id, subjectCode: "SE", subjectName: "Software Engineering", semester: 4, academicYear: "2024-25", internal: 25, external: 47, total: 72, grade: "A", credits: 3, passed: true }
  ]);

  await Attendance.create([
    {
      student: students[2]._id,
      semester: 4,
      academicYear: "2024-25",
      totalClasses: 200,
      attendedClasses: 140,
      percentage: 70,
      subjects: [{ subjectCode: "CNS", subjectName: "Computer Networks", classesConducted: 50, classesAttended: 35, percentage: 70 }]
    },
    {
      student: students[3]._id,
      semester: 4,
      academicYear: "2024-25",
      totalClasses: 200,
      attendedClasses: 176,
      percentage: 88,
      subjects: [{ subjectCode: "SE", subjectName: "Software Engineering", classesConducted: 50, classesAttended: 44, percentage: 88 }]
    }
  ]);

  await StudentActivity.create([
    { student: students[0]._id, semester: 4, category: "Hackathon", title: "Smart India Hackathon Internal Round", description: "Built campus issue tracking prototype", date: "2025-01-20" },
    { student: students[0]._id, semester: 4, category: "Workshop", title: "Cloud Native Workshop", description: "Completed Kubernetes fundamentals workshop", date: "2025-02-04" },
    { student: students[0]._id, semester: 4, category: "Technical Event", title: "CodeSprint 2.0", description: "Secured top-15 rank", date: "2025-02-26" },
    { student: students[0]._id, semester: 4, category: "Club Participation", title: "AI Club Coordinator", description: "Organized weekly problem-solving sessions", date: "2025-03-02" }
  ]);

  await Announcement.create([
    { title: "Mid-Sem Exam Timetable Published", body: "Check the ERP portal for detailed timetable.", category: "Exam", audienceRoles: ["student"], department: cse._id, active: true },
    { title: "Placement Drive - Infosys", body: "Eligible final-year students register before Friday.", category: "Placement", audienceRoles: ["student"], active: true },
    { title: "Tech Fest Registration Open", body: "Register for coding and robotics events.", category: "Event", audienceRoles: ["student"], active: true }
  ]);

  await TeachingAssignment.create([
    { faculty: faculty._id, department: cse._id, semester: 4, academicYear: "2024-25", section: "A", subjectCode: "ADS", subjectName: "Advanced Data Structures" },
    { faculty: faculty._id, department: cse._id, semester: 4, academicYear: "2024-25", section: "B", subjectCode: "CNS", subjectName: "Computer Networks" },
    { faculty: faculty._id, department: cse._id, semester: 4, academicYear: "2024-25", section: "C", subjectCode: "SE", subjectName: "Software Engineering" },
    { faculty: faculty._id, department: cse._id, semester: 4, academicYear: "2024-25", section: "A", subjectCode: "IIC", subjectName: "Industry Interaction" }
  ]);

  await Section.create([
    { department: cse._id, name: "A", semester: 4, academicYear: "2024-25", totalStudents: 1 },
    { department: cse._id, name: "B", semester: 4, academicYear: "2024-25", totalStudents: 1 },
    { department: cse._id, name: "C", semester: 4, academicYear: "2024-25", totalStudents: 1 }
  ]);

  await DepartmentStat.create([
    { department: cse._id, semester: 3, academicYear: "2024-25", averageCgpa: 7.53, backlogRate: 33.3, internshipParticipationPercent: 62, placementRate: 72 },
    { department: cse._id, semester: 4, academicYear: "2024-25", averageCgpa: 7.43, backlogRate: 33.3, internshipParticipationPercent: 68, placementRate: 78 }
  ]);

  await FacultyAchievement.create([
    { faculty: faculty._id, department: cse._id, title: "Published paper in IEEE ACCESS", category: "Publication", level: "International", date: "2025-02-11" },
    { faculty: faculty2._id, department: cse._id, title: "Conducted 5-day AI Workshop", category: "Workshop", level: "National", date: "2025-01-21" },
    { faculty: faculty._id, department: cse._id, title: "Best Faculty Research Award", category: "Award", level: "State", date: "2024-12-13" }
  ]);

  await StudentAchievement.create([
    { student: students[0]._id, department: cse._id, eventName: "HackFest 2025", title: "Winner", category: "Hackathon", level: "National", date: "2025-02-02" },
    { student: students[2]._id, department: cse._id, eventName: "Project Expo", title: "Best Innovation", category: "Project Competition", level: "College", date: "2025-01-30" },
    { student: students[3]._id, department: cse._id, eventName: "Cultural Meet", title: "Dance Runner-up", category: "Cultural", level: "State", date: "2024-11-20" }
  ]);

  cse.hod = hod._id;
  await cse.save();

  console.log("Seed complete");
  console.log({
    admin: admin.email,
    hod: hod.email,
    faculty: faculty.email,
    faculty2: faculty2.email,
    student: students[0].email,
    password: "Admin@123"
  });

  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
