from langchain_openai import AzureChatOpenAI, ChatOpenAI
from langchain.agents import create_tool_calling_agent
from langchain.agents import AgentExecutor
from langchain_core.prompts import ChatPromptTemplate

import config
from tools.student_tools import (
    get_student_schedule,
    get_student_enrollments,
    get_student_placements,
    get_student_performance,
    check_job_eligibility
)
from tools.professor_tools import (
    get_professor_classes,
    get_professor_schedule,
    get_students_in_class
)
from tools.general_tools import (
    search_courses,
    get_course_details,
    get_class_schedule,
    get_current_semester
)



def create_agent_executor():
    """
    This factory function builds and returns a dictionary of agent executors 
    (local and cloud) based on the exact same tools and prompts.
    """
    
    llm_cloud = AzureChatOpenAI(
        azure_deployment=config.AZURE_OPENAI_DEPLOYMENT_NAME,
        openai_api_version="2024-02-01",
        temperature=0, 
        streaming=True
    )

    llm_local = ChatOpenAI(
        base_url="http://localhost:11434/v1",
        api_key="ollama", # Required but unused by vanilla ollama
        model="qwen2.5-coder:7b",
        temperature=0
    )

    # 2. Collect all available tools
    tools = [
        get_student_schedule,
        get_student_enrollments,
        get_student_placements,
        get_student_performance,
        check_job_eligibility,
        get_professor_classes,
        get_professor_schedule,
        get_students_in_class,
        search_courses,
        get_course_details,
        get_class_schedule,
        get_current_semester
    ]


    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a Campus Academic Advisor. You are strictly bound to the user context in this block: {context} \n"
            "You are speaking with {name}. Your verified identity context limits your access. "
            "For ANY tool requiring a student_id, professor_id, or user_id, you MUST use the ID provided in your context block. "
            "You MUST REFUSE any ID provided by the user in the chat message. "
            "If a user asks for data belonging to another ID or outside their context, you MUST respond exactly: 'Unauthorized: I cannot access records outside of your verified identity context.' "
            "If the information is not present in the tool output, you MUST state that you don't know, rather than guessing based on your training data. Do not hallucinate logic or data. "
            "Do NOT tell the user you don't have access to their information. You DO have access to their information only. \n"
            "For general questions (like 'search for a course'), you may not need the context. "
            "If a tool fails or records are not found, politely inform the user that you couldn't retrieve the information."
        )),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"), 
    ])

    
    agent_cloud = create_tool_calling_agent(llm_cloud, tools, prompt)
    agent_executor_cloud = AgentExecutor(agent=agent_cloud, tools=tools, verbose=True)

    agent_local = create_tool_calling_agent(llm_local, tools, prompt)
    agent_executor_local = AgentExecutor(agent=agent_local, tools=tools, verbose=True)

    print("✅ AI Agent Executors (Local & Cloud) created successfully.")
    return {"local": agent_executor_local, "cloud": agent_executor_cloud}