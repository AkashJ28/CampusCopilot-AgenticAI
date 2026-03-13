-- =========================================================================
-- TASK 1: ADD NEW RESEARCH COLUMNS
-- =========================================================================

ALTER TABLE Enrollments 
ADD COLUMN IF NOT EXISTS grade_point DECIMAL(3,2);

ALTER TABLE Semesters 
ADD COLUMN IF NOT EXISTS status VARCHAR(20);

ALTER TABLE Recruiters 
ADD COLUMN IF NOT EXISTS min_gpa_required DECIMAL(3,2);

-- =========================================================================
-- TASK 2: INTELLIGENT DATA POPULATION
-- =========================================================================

-- Semesters Update
-- Evaluates sequentially: Max end date becomes Active. If in the past, it's 
-- Completed. Any remaining fall into Upcoming.
UPDATE Semesters
SET status = CASE
    WHEN end_date = (SELECT MAX(end_date) FROM Semesters) THEN 'Active'
    WHEN end_date < CURRENT_DATE THEN 'Completed'
    ELSE 'Upcoming'
END;

-- Enrollments Update
-- Assign a random grade_point between 7.5 and 10.0 for existing rows
-- random() generates a float between 0.0 and 1.0. Mapped to 7.5 - 10.0.
UPDATE Enrollments
SET grade_point = ROUND(CAST(7.5 + random() * 2.5 AS numeric), 2)
WHERE grade_point IS NULL;

-- Recruiters Update
-- Assign a variety of values (6.5, 7.5, 8.5) based on modulo arithmetic for distribution
UPDATE Recruiters
SET min_gpa_required = CASE 
    WHEN company_id % 3 = 0 THEN 6.5
    WHEN company_id % 3 = 1 THEN 7.5
    ELSE 8.5 
END
WHERE min_gpa_required IS NULL;

-- =========================================================================
-- TASK 3: VERIFICATION QUERIES (Sample Output)
-- =========================================================================
-- Copy and run these SELECT statements to verify your data has been updated intelligently

/*
-- 1. Verify Semester Status
SELECT semester_id, name, end_date, status 
FROM Semesters 
ORDER BY end_date DESC;

-- 2. Verify randomized GPA assignment
SELECT e.enrollment_id, s.name as student_name, e.grade_point
FROM Enrollments e
JOIN Students s ON e.student_id = s.student_id
LIMIT 10;

-- 3. Verify Recruiter GPA restrictions
SELECT company_id, company_name, min_gpa_required
FROM Recruiters;
*/
