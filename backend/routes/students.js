const express = require("express");
const router = express.Router();
const pool = require("../db");
const { DateTime } = require("luxon");

// Logged-in student profile
router.get("/me", async (req, res) => {
  const studentId = req.user.studentId;
  if (!studentId)
    return res.status(403).json({ error: "Access denied. Not a student." });

  try {
    const result = await pool.query(
      "SELECT student_id, name, department, entry_date FROM students WHERE student_id = $1 AND is_active = TRUE",
      [studentId]
    );
    if (result.rows.length === 0)
      return res
        .status(404)
        .json({ error: "Student profile not found or inactive." });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(
      `Error fetching profile for student ${studentId}:`,
      err.message
    );
    res.status(500).send("Server error fetching profile");
  }
});

// Logged-in student schedule
router.get("/me/schedule", async (req, res) => {
  const studentId = req.user.studentId;
  const { semester_id, day } = req.query;
  if (!studentId)
    return res.status(403).json({ error: "Access denied. Not a student." });

  try {
    let query = `
      SELECT crs.course_name, cs.day_of_week, cs.start_time, cs.end_time, cs.room, 
             p.name as professor_name, cl.class_id
      FROM ClassSchedule AS cs
      JOIN Classes AS cl ON cs.class_id = cl.class_id
      JOIN Courses AS crs ON cl.course_id = crs.course_id
      JOIN Enrollments AS e ON cl.class_id = e.class_id
      LEFT JOIN Professors AS p ON cl.professor_id = p.professor_id
      WHERE e.student_id = $1 AND cl.is_active = TRUE AND crs.is_active = TRUE
    `;
    const params = [studentId];
    let paramCount = 1;

    if (semester_id)
      (query += ` AND cl.semester_id = $${++paramCount}`),
        params.push(semester_id);
    if (day)
      (query += ` AND cs.day_of_week = $${++paramCount}`), params.push(day);

    query += ` ORDER BY cs.start_time;`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(`Error fetching schedule for ${studentId}:`, err.message);
    res.status(500).send("Server error fetching schedule");
  }
});

// Logged-in student enrollments
router.get("/me/enrollments", async (req, res) => {
  const studentId = req.user.studentId;
  const entryDate = req.user.entryDate;
  const { semester_id, relative_sem } = req.query;
  if (!studentId)
    return res.status(403).json({ error: "Access denied. Not a student." });

  let targetSemesterId = semester_id;

  try {
    if (relative_sem) {
      const offset = parseInt(relative_sem, 10) - 1;
      if (isNaN(offset) || offset < 0)
        return res.status(400).json({ error: "Invalid relative_sem value." });

      const semesterIdQuery = `
        SELECT semester_id FROM Semesters
        WHERE start_date >= $1 ORDER BY start_date OFFSET $2 LIMIT 1;
      `;
      const semRes = await pool.query(semesterIdQuery, [entryDate, offset]);
      if (semRes.rows.length === 0)
        return res.status(404).json({
          error: `No semester found for relative_sem ${relative_sem}.`,
        });

      targetSemesterId = semRes.rows[0].semester_id;
    }

    let query = `
      SELECT crs.course_name, s.name AS semester_name
      FROM Enrollments AS e
      JOIN Classes AS cl ON e.class_id = cl.class_id
      JOIN Courses AS crs ON cl.course_id = crs.course_id
      JOIN Semesters AS s ON cl.semester_id = s.semester_id
      WHERE e.student_id = $1 AND cl.is_active = TRUE AND crs.is_active = TRUE
    `;
    const params = [studentId];
    let paramCount = 1;

    if (targetSemesterId)
      (query += ` AND cl.semester_id = $${++paramCount}`),
        params.push(targetSemesterId);

    query += ` ORDER BY s.start_date DESC, crs.course_name;`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(`Error fetching enrollments for ${studentId}:`, err.message);
    res.status(500).send("Server error fetching enrollments");
  }
});

// Logged-in student placements
router.get("/me/placements", async (req, res) => {
  const studentId = req.user.studentId;
  if (!studentId)
    return res.status(403).json({ error: "Access denied. Not a student." });

  try {
    const query = `
      SELECT r.company_name, p.status, p.ctc_lpa
      FROM Placements AS p
      JOIN Recruiters AS r ON p.company_id = r.company_id
      WHERE p.student_id = $1 AND r.is_active = TRUE
      ORDER BY r.company_name;
    `;
    const result = await pool.query(query, [studentId]);
    res.json(result.rows);
  } catch (err) {
    console.error(`Error fetching placements for ${studentId}:`, err.message);
    res.status(500).send("Server error fetching placements");
  }
});

// Logged-in student's current semester
router.get("/me/current-semester", async (req, res) => {
  const studentId = req.user.studentId;
  const entryDateString = req.user.entryDate;
  if (!studentId || !entryDateString)
    return res
      .status(403)
      .json({ error: "Access denied or missing entry date." });

  try {
    const today = DateTime.now().toISODate();
    const semesterResult = await pool.query(
      `SELECT semester_id, name, start_date
       FROM Semesters WHERE $1 BETWEEN start_date AND end_date;`,
      [today]
    );

    if (semesterResult.rows.length === 0)
      return res.status(404).json({ error: "No current semester found." });

    const currentSemester = semesterResult.rows[0];
    const studentEntryDate = DateTime.fromISO(entryDateString);
    const semesterStartDate = DateTime.fromJSDate(currentSemester.start_date);
    const diffInMonths = semesterStartDate.diff(
      studentEntryDate,
      "months"
    ).months;
    const relativeSemesterNumber = Math.floor(diffInMonths / 6 + 0.1) + 1;

    res.json({
      current_semester_id: currentSemester.semester_id,
      current_semester_name: currentSemester.name,
      relative_semester_number: relativeSemesterNumber,
    });
  } catch (err) {
    console.error(
      `Error calculating current semester for ${studentId}:`,
      err.message
    );
    res.status(500).send("Server error calculating semester");
  }
});

// Public: student profile by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const studentRes = await pool.query(
      "SELECT student_id, name, department, entry_date FROM Students WHERE student_id = $1 AND is_active = TRUE",
      [id]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: "Active student not found." });
    }

    const cgpaRes = await pool.query(
      "SELECT ROUND(AVG(grade_point), 2) as cgpa FROM Enrollments WHERE student_id = $1",
      [id]
    );

    const student = studentRes.rows[0];
    student.cgpa = cgpaRes.rows[0].cgpa ? parseFloat(cgpaRes.rows[0].cgpa) : 0.0;

    res.json(student);
  } catch (err) {
    console.error(`Error fetching profile for student ${id}:`, err.message);
    res.status(500).send("Server error fetching profile");
  }
});

// Public: student schedule by ID
router.get("/:id/schedule", async (req, res) => {
  const { id } = req.params;
  const { semester_id, day } = req.query;
  try {
    const studentCheck = await pool.query(
      "SELECT 1 FROM Students WHERE student_id = $1 AND is_active = TRUE",
      [id]
    );
    if (studentCheck.rows.length === 0)
      return res.status(404).json({ error: "Active student not found." });

    let query = `
      SELECT crs.course_name, cs.day_of_week, cs.start_time, cs.end_time, cs.room, 
             p.name as professor_name, cl.class_id
      FROM ClassSchedule AS cs
      JOIN Classes AS cl ON cs.class_id = cl.class_id
      JOIN Courses AS crs ON cl.course_id = crs.course_id
      JOIN Enrollments AS e ON cl.class_id = e.class_id
      LEFT JOIN Professors AS p ON cl.professor_id = p.professor_id
      WHERE e.student_id = $1 AND cl.is_active = TRUE AND crs.is_active = TRUE
    `;
    const params = [id];
    let paramCount = 1;
    if (semester_id)
      (query += ` AND cl.semester_id = $${++paramCount}`),
        params.push(semester_id);
    if (day)
      (query += ` AND cs.day_of_week = $${++paramCount}`), params.push(day);

    query += ` ORDER BY cs.start_time;`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(`Error fetching schedule for ${id}:`, err.message);
    res.status(500).send("Server error fetching schedule");
  }
});

// Public: student enrollments by ID
router.get("/:id/enrollments", async (req, res) => {
  const { id } = req.params;
  const { semester_id, status } = req.query;
  try {
    const studentCheck = await pool.query(
      "SELECT 1 FROM Students WHERE student_id = $1 AND is_active = TRUE",
      [id]
    );
    if (studentCheck.rows.length === 0)
      return res.status(404).json({ error: "Active student not found." });

    let query = `
      SELECT crs.course_name, s.name AS semester_name, s.status AS semester_status, e.grade_point
      FROM Enrollments AS e
      JOIN Classes AS cl ON e.class_id = cl.class_id
      JOIN Courses AS crs ON cl.course_id = crs.course_id
      JOIN Semesters AS s ON cl.semester_id = s.semester_id
      WHERE e.student_id = $1 AND cl.is_active = TRUE AND crs.is_active = TRUE
    `;
    const params = [id];
    let paramCount = 1;
    if (semester_id) {
      query += ` AND cl.semester_id = $${++paramCount}`;
      params.push(semester_id);
    }
    if (status) {
      query += ` AND s.status = $${++paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY s.start_date DESC, crs.course_name;`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(`Error fetching enrollments for ${id}:`, err.message);
    res.status(500).send("Server error fetching enrollments");
  }
});

module.exports = router;
