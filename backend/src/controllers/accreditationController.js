import AccreditationItem from "../models/AccreditationItem.js";

export const addAccreditationItem = async (req, res) => {
  const item = await AccreditationItem.create({ ...req.body, uploadedBy: req.user._id });
  return res.status(201).json({ success: true, data: item });
};

export const listAccreditationItems = async (req, res) => {
  const { type, criterion, department, academicYear, completed, accreditationCriteria } = req.query;
  const filter = {};

  if (type) filter.type = type;
  if (criterion) filter.criterion = criterion;
  if (department) filter.department = department;
  if (academicYear) filter.academicYear = academicYear;
  if (accreditationCriteria) filter.criterion = accreditationCriteria;
  if (typeof completed !== "undefined") filter.completed = completed === "true";

  const items = await AccreditationItem.find(filter).populate("department", "name code").sort({ createdAt: -1 });
  return res.status(200).json({ success: true, data: items });
};

export const readinessScore = async (req, res) => {
  const { type = "NAAC", academicYear } = req.query;
  const filter = { type };
  if (academicYear) filter.academicYear = academicYear;

  const items = await AccreditationItem.find(filter);
  const total = items.length;
  const completed = items.filter((i) => i.completed).length;
  const score = total ? (completed / total) * 100 : 0;

  const missing = items.filter((i) => !i.completed).slice(0, 10).map((i) => ({
    title: i.title,
    criterion: i.criterion,
    academicYear: i.academicYear
  }));

  return res.status(200).json({
    success: true,
    data: {
      type,
      academicYear: academicYear || "all",
      totalItems: total,
      completedItems: completed,
      readinessScore: Number(score.toFixed(2)),
      missingItems: missing
    }
  });
};
