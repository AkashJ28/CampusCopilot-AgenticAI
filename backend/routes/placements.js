const express = require("express");
const router = express.Router();
const pool = require("../db");

// Placement Eligibility Route
router.get("/eligibility/:studentId", async (req, res) => {
  const { studentId } = req.params;
  try {
    // 1. Calculate the student's CGPA
    const cgpaRes = await pool.query(
      "SELECT ROUND(AVG(grade_point), 2) as cgpa FROM Enrollments WHERE student_id = $1",
      [studentId]
    );

    let student_cgpa = 0.00;
    if (cgpaRes.rows.length > 0 && cgpaRes.rows[0].cgpa !== null) {
      student_cgpa = parseFloat(cgpaRes.rows[0].cgpa);
    }

    // 2. Fetch eligible recruiters
    const recruitersRes = await pool.query(
      "SELECT company_id, company_name, job_roles, min_gpa_required FROM Recruiters WHERE is_active = TRUE AND min_gpa_required <= $1 ORDER BY company_name",
      [student_cgpa]
    );

    res.json({
      student_id: Number(studentId),
      student_cgpa: student_cgpa,
      eligible_companies: recruitersRes.rows
    });
  } catch (err) {
    console.error(`Error fetching eligibility for student ${studentId}:`, err.message);
    res.status(500).send("Server error calculating eligibility");
  }
});

module.exports = router;
