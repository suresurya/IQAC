import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    const normalizedRole = req.user.role === "department" ? "hod" : req.user.role;
    if (!roles.includes(normalizedRole)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    next();
  };
};
