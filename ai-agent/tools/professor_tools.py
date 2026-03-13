from langchain.tools import tool
from tools.api_service import get_data  # --- CORRECTED IMPORT ---

@tool
def get_professor_schedule(professor_id: int, day: str = None) -> str:
    """
    Use this tool to get a specific professor's teaching schedule.
    You must provide the professor_id.
    You can optionally filter by day_of_week (e.g., 'Monday').
    """
    print(f"--- Tool: get_professor_schedule called for professor_id: {professor_id} ---")
    endpoint = f"/api/professors/{professor_id}/schedule"
    params = {}
    if day:
        params['day'] = day
    return get_data(endpoint, params)

@tool
def get_professor_classes(professor_id: int, semester_id: int = None) -> str:
    """
    Gets a list of all classes a specific professor is teaching.
    You must provide the professor_id.
    You can optionally filter by a specific semester_id.
    """
    print(f"--- Tool: get_professor_classes called for professor_id: {professor_id} ---")
    endpoint = f"/api/professors/{professor_id}/classes"
    params = {}
    if semester_id:
        params['semester_id'] = semester_id
    return get_data(endpoint, params)

@tool
def get_students_in_class(class_id: int) -> str:
    """
    Gets a list of all students enrolled in a specific class.
    You must provide the class_id (which you can get from get_professor_classes).
    This tool is typically used by a professor.
    """
    print(f"--- Tool: get_students_in_class called for class_id: {class_id} ---")
    endpoint = f"/api/classes/{class_id}/students"
    return get_data(endpoint)