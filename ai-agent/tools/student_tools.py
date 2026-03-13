from langchain.tools import tool
from tools.api_service import get_data  # --- CORRECTED IMPORT ---

@tool
def get_student_schedule(student_id: int, day: str = None) -> str:
    """
    Use this tool to get a specific student's class schedule.
    You must provide the student_id.
    You can optionally filter by day_of_week (e.g., 'Monday').
    """
    print(f"--- Tool: get_student_schedule called for student_id: {student_id} ---")
    
    # 1. Define the endpoint to call (the public /:id route)
    endpoint = f"/api/students/{student_id}/schedule"
    
    # 2. Prepare the query parameters
    params = {}
    if day:
        params['day'] = day
        
    # 3. Call the API service to get the data
    return get_data(endpoint, params)

@tool
def get_student_enrollments(student_id: int, semester_id: int = None) -> str:
    """
    Gets a list of all courses a student is enrolled in, including semester name.
    You must provide the student_id.
    You can optionally filter by a specific semester_id.
    """
    print(f"--- Tool: get_student_enrollments called for student_id: {student_id} ---")
    
    endpoint = f"/api/students/{student_id}/enrollments"
    
    params = {}
    if semester_id:
        params['semester_id'] = semester_id
        
    return get_data(endpoint, params)

@tool
def get_student_placements(student_id: int) -> str:
    """
    Gets the job placement application status for a specific student.
    You must provide the student_id.
    """
    print(f"--- Tool: get_student_placements called for student_id: {student_id} ---")
    
    endpoint = f"/api/students/{student_id}/placements"
    
    return get_data(endpoint)

@tool
def get_student_performance(student_id: int) -> str:
    """
    Gets the student's performance including CGPA and completed enrollments.
    You must provide the student_id.
    """
    print(f"--- Tool: get_student_performance called for student_id: {student_id} ---")
    
    # 1. Hit Student Profile API for CGPA
    profile_endpoint = f"/api/students/{student_id}"
    profile_data = get_data(profile_endpoint)
    
    # 2. Hit Filtered Enrollments API (status='Completed') for past subjects
    enrollments_endpoint = f"/api/students/{student_id}/enrollments"
    enrollments_data = get_data(enrollments_endpoint, params={"status": "Completed"})
    
    import json
    try:
        prof = json.loads(profile_data)
        enrl = json.loads(enrollments_data)
        return json.dumps({
            "profile": prof,
            "completed_enrollments": enrl
        })
    except:
        return f"Profile: {profile_data}\nCompleted Enrollments: {enrollments_data}"

@tool
def check_job_eligibility(student_id: int) -> str:
    """
    Use this to determine which companies a student can apply for based on their academic record.
    You must provide the student_id.
    """
    print(f"--- Tool: check_job_eligibility called for student_id: {student_id} ---")
    
    endpoint = f"/api/placements/eligibility/{student_id}"
    
    return get_data(endpoint)