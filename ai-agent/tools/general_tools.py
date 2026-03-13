from langchain.tools import tool
from .api_service import get_data  
from datetime import datetime


@tool
def search_courses(query: str) -> str:
    """
    Use this tool to search for courses by name or keyword.
    It will return a list of matching courses with their IDs and departments.
    """
    print(f"--- Tool: search_courses called with query: {query} ---")
   
    endpoint = "/api/courses/search"
    
    params = {'q': query}
        
    return get_data(endpoint, params)

@tool
def get_course_details(course_id: int) -> str:
    """
    Use this tool to get detailed information for a single, specific course.
    You must provide the course_id.
    This provides details like course name, credits, department, and the professor teaching it this semester.
    """
    print(f"--- Tool: get_course_details called for course_id: {course_id} ---")
    
    endpoint = f"/api/courses/{course_id}"
    
    return get_data(endpoint)

@tool
def get_class_schedule(class_id: int) -> str:
    """
    Use this tool to get the weekly schedule (day, time, room) for a specific class offering.
    You must provide the class_id (which you can get from other tools).
    """
    print(f"--- Tool: get_class_schedule called for class_id: {class_id} ---")
    
    endpoint = f"/api/classes/{class_id}/schedule"
    
    return get_data(endpoint)
    
@tool
def get_current_semester() -> str:
    """
    Use this tool to find out the current academic semester based on today's date.
    This tool takes no arguments.
    """
    print(f"--- Tool: get_current_semester called ---")
    endpoint = "/api/semesters/current"
    
    return get_data(endpoint)

