import uvicorn
import time
import json
from fastapi import FastAPI
from pydantic import BaseModel
from langchain.callbacks.base import BaseCallbackHandler
from core.agent_factory import create_agent_executor 

class GroundingException(Exception):
    pass

try:
    executors = create_agent_executor()
    print("✅ AI Agent Executors created successfully and are ready.")
except Exception as e:
    print(f"❌ CRITICAL ERROR: Failed to create AI Agent Executors. {e}")
    executors = None

app = FastAPI(
    title="Campus Copilot AI Agent",
    description="The AI brain service that connects to the Node.js backend.",
)

class Query(BaseModel):
    query: str
    user_identity: dict 

class TimingCallbackHandler(BaseCallbackHandler):
    def __init__(self, user_identity=None):
        self.request_start = time.time()
        self.start_time = 0
        self.first_token_time = 0
        self.end_time = 0
        self.model_load_time = 0
        self.token_count = 0
        self.input_tokens_estimated = 0
        self.user_identity = user_identity or {}
        self.logic_trace_steps = []
        self.tool_execution_count = 0

    def on_llm_start(self, serialized, prompts, **kwargs):
        self.start_time = time.time()
        if self.model_load_time == 0:
            self.model_load_time = self.start_time - self.request_start
        self.input_tokens_estimated += sum(len(p) for p in prompts) / 3.5

    def on_tool_start(self, serialized, input_str, **kwargs):
        self.tool_execution_count += 1
        tool_name = serialized.get('name', 'unknown')
        inputs = kwargs.get('inputs', {})
        if isinstance(input_str, str):
            try:
                inputs = json.loads(input_str)
            except:
                pass
        elif isinstance(input_str, dict):
            inputs = input_str
            
        student_id = inputs.get('student_id')
        prof_id = inputs.get('professor_id')
        
        user_student_id = self.user_identity.get('studentId')
        user_prof_id = self.user_identity.get('professorId')
        
        id_verified = False
        if student_id is not None:
            if str(student_id) != str(user_student_id):
                raise GroundingException(f"Unauthorized student_id access: {student_id}")
            id_verified = True
        if prof_id is not None:
            if str(prof_id) != str(user_prof_id):
                raise GroundingException(f"Unauthorized professor_id access: {prof_id}")
            id_verified = True
            
        if id_verified:
            self.logic_trace_steps.append(f"[ID Verified] -> [Tool: {tool_name}]")
        else:
            self.logic_trace_steps.append(f"[Tool: {tool_name}]")

    def on_llm_new_token(self, token: str, **kwargs):
        if self.first_token_time == 0:
            self.first_token_time = time.time()
        self.token_count += 1

    def on_llm_end(self, response, **kwargs):
        self.end_time = time.time()

def complexity_router(query_text: str):
    """
    Returns (tier, routing_confidence)
    Score > 0.7 or length > 100 routes to Cloud.
    """
    complexity_keywords = {
        'compare': 0.5, 'clash': 0.4, 'conflict': 0.4,
        'enrollment': 0.3, 'analytics': 0.4, 'schedule': 0.3, 
        'all': 0.2, 'options': 0.2, 'different': 0.3, 'complex': 0.4
    }
    score = 0.0
    query_lower = query_text.lower()
    for word, weight in complexity_keywords.items():
        if word in query_lower:
            score += weight
            
    routing_confidence = min(score, 1.0)
    
    if score > 0.7 or len(query_text) > 100:
        return "cloud", routing_confidence
    return "local", routing_confidence

@app.post("/ask")
async def ask_agent(query: Query):
    if not executors:
        return {"response": "Sorry, the AI Agent is not initialized. Please check the server logs."}

    print(f"AI Agent received question: '{query.query}' for user: {query.user_identity.get('userId')}")
    
    name = query.user_identity.get('name', 'Unknown')
    role_id = query.user_identity.get('roleId')
    role_name = query.user_identity.get('role', 'Student' if role_id == 1 else 'Professor' if role_id == 2 else 'Unknown')
    
    user_context = f"User Name: {name}, Role: {role_name}"
    if query.user_identity.get('studentId'):
        user_context += f", student_id: {query.user_identity.get('studentId')}"
        if query.user_identity.get('entryDate'):
            user_context += f", entry_date: {query.user_identity.get('entryDate')}"
    if query.user_identity.get('professorId'):
        user_context += f", professor_id: {query.user_identity.get('professorId')}"

    tier, confidence = complexity_router(query.query)
    escalated = False

    def invoke_with_tier(target_tier):
        if target_tier == "local" and "SIMULATE_FAILOVER" in query.query:
            raise Exception("Simulated VRAM Overflow on RTX 4060")
        
        cb = TimingCallbackHandler(user_identity=query.user_identity)
        agent = executors.get(target_tier)
        
        current_input = query.query
        res = agent.invoke({
            "input": current_input,
            "context": user_context,
            "name": name
        }, config={"callbacks": [cb]})
        
        # Recursive Tool Execution Loop
        max_turns = 3
        turns = 0
        
        while turns < max_turns:
            output_text = res.get("output", "")
            try:
                parsed = json.loads(output_text)
                if "name" in parsed and "arguments" in parsed:
                    tool_name = parsed["name"]
                    tool_args = parsed["arguments"]
                    
                    print(f"🔄 Recursive Execution: Triggering '{tool_name}' with args: {tool_args}")
                    
                    # Dynamically find the tool
                    import tools.student_tools as st
                    import tools.general_tools as gt
                    import tools.professor_tools as pt
                    
                    target_tool = None
                    for t in [st.get_student_schedule, st.get_student_enrollments, 
                              st.get_student_placements, st.get_student_performance, 
                              st.check_job_eligibility, pt.get_professor_classes, 
                              pt.get_professor_schedule, pt.get_students_in_class, 
                              gt.search_courses, gt.get_course_details, 
                              gt.get_class_schedule, gt.get_current_semester]:
                        if t.name == tool_name:
                            target_tool = t
                            break
                    
                    if target_tool:
                        cb.tool_execution_count += 1
                        # Security-Aware Identity Binding Interceptor
                        original_student_id = tool_args.get("student_id")
                        jwt_student_id = query.user_identity.get('studentId')
                        
                        original_prof_id = tool_args.get("professor_id")
                        jwt_prof_id = query.user_identity.get('professorId')

                        id_mismatch_attempted = False

                        if original_student_id is not None:
                            if str(original_student_id) != str(jwt_student_id):
                                id_mismatch_attempted = True
                            tool_args["student_id"] = int(jwt_student_id) if jwt_student_id else None

                        if original_prof_id is not None:
                            if str(original_prof_id) != str(jwt_prof_id):
                                id_mismatch_attempted = True
                            tool_args["professor_id"] = int(jwt_prof_id) if jwt_prof_id else None

                        if id_mismatch_attempted:
                            cb.logic_trace_steps.insert(0, "[SEC_ALERT: ID_MISMATCH_ATTEMPTED]")
                            cb.logic_trace_steps.append(f"[ID Overwritten] -> [Tool: {tool_name}]")
                        else:
                            cb.logic_trace_steps.append(f"[ID Verified] -> [Tool: {tool_name}]")

                        tool_result = target_tool.invoke(tool_args)
                            
                        # Second Turn
                        current_input = f"{current_input}\n\n[Thought]: {output_text}\n[Observation]: {tool_result}\n\nNow synthesize the final natural language response based on this."
                        print("🔄 Second Turn: Re-invoking LLM with tool output.")
                        
                        res = agent.invoke({
                            "input": current_input,
                            "context": user_context,
                            "name": name
                        }, config={"callbacks": [cb]})
                        
                        turns += 1
                        continue
            except json.JSONDecodeError:
                pass # Natural language output reached
            except Exception as e:
                print(f"❌ Tool Execution Error: {e}")
            break
            
        return res, cb

    grounding_status = "verified"
    try:
        response, cb = invoke_with_tier(tier)
    except GroundingException as ge:
        print(f"🛑 Security Intercept: {ge}")
        grounding_status = "blocked"
        return {
            "response": "I am not authorized to access information for other users.",
            "metadata": {
                "tier": tier,
                "ttft_sec": 0,
                "total_latency_sec": 0,
                "model_load_time": 0,
                "routing_confidence": confidence,
                "token_usage_estimated": 0,
                "escalated": escalated,
                "estimated_cost_usd": 0.0,
                "savings_usd": 0.0,
                "grounding_status": "blocked",
                "logic_trace": "Reasoning: [Security Blocked]"
            }
        }
    except Exception as e:
        print(f"⚠️ Error with '{tier}' executor: {e}. Attempting failover...")
        if tier == "local":
            tier = "cloud"
            escalated = True
            try:
                response, cb = invoke_with_tier(tier)
            except GroundingException as ge:
                print(f"🛑 Security Intercept on Failover: {ge}")
                grounding_status = "blocked"
                return {
                    "response": "I am not authorized to access information for other users.",
            "metadata": {
                        "tier": tier,
                        "ttft_sec": 0,
                        "total_latency_sec": 0,
                        "model_load_time": 0,
                        "routing_confidence": confidence,
                        "token_usage_estimated": 0,
                        "escalated": escalated,
                        "estimated_cost_usd": 0.0,
                        "savings_usd": 0.0,
                        "grounding_status": "blocked",
                        "logic_trace": "Reasoning: [Security Blocked]"
                    }
                }
            except Exception as e2:
                print(f"❌ Error during failover cloud invocation: {e2}")
                return {"response": "Sorry, I encountered an error while processing your request even after failover."}
        else:
            print(f"❌ Error during cloud invocation: {e}")
            return {"response": "Sorry, I encountered an error while processing your request."}

    total_latency_sec = time.time() - cb.request_start
    ttft_sec = cb.first_token_time - cb.start_time if cb.first_token_time and cb.start_time else 0
    # Provide simple heuristic if token_count didn't tick properly
    estimated_output_tokens = cb.token_count if cb.token_count > 0 else int(len(response.get('output', '')) / 3.5)
    estimated_input_tokens = int(cb.input_tokens_estimated) if cb.input_tokens_estimated > 0 else int(len(query.query) / 3.5)
    
    total_estimated_tokens = estimated_input_tokens + estimated_output_tokens

    # Inference Economics Constants
    AZURE_GPT4_INPUT_COST_PER_1K = 0.03
    AZURE_GPT4_OUTPUT_COST_PER_1K = 0.06
    
    potential_cloud_cost = (estimated_input_tokens / 1000.0 * AZURE_GPT4_INPUT_COST_PER_1K) + \
                           (estimated_output_tokens / 1000.0 * AZURE_GPT4_OUTPUT_COST_PER_1K)
                           
    if tier == 'local':
        estimated_cost_usd = 0.000
        savings_usd = round(potential_cloud_cost, 4)
    else:
        estimated_cost_usd = round(potential_cloud_cost, 4)
        savings_usd = 0.000

    trace_str = " -> ".join(cb.logic_trace_steps)
    if not trace_str:
        # Check if the final output still has raw JSON (fallback if loop exhausted)
        try:
            parsed = json.loads(response['output'])
            if 'name' in parsed:
                tool_name = parsed['name']
                trace_str = f"[Tool: {tool_name}]"
        except Exception:
            pass

    if trace_str:
        logic_trace = f"Reasoning: {trace_str} -> [Action: Summary Generated]"
    else:
        logic_trace = "Reasoning: [Action: Answered Directly]"

    return {
        "response": response['output'],
        "metadata": {
            "tier": tier,
            "ttft_sec": round(ttft_sec, 3),
            "total_latency_sec": round(total_latency_sec, 3),
            "model_load_time": round(cb.model_load_time, 3),
            "routing_confidence": round(confidence, 3),
            "token_usage_estimated": total_estimated_tokens,
            "escalated": escalated,
            "estimated_cost_usd": estimated_cost_usd,
            "savings_usd": savings_usd,
            "grounding_status": grounding_status,
            "logic_trace": logic_trace,
            "recursive_steps": getattr(cb, 'tool_execution_count', 0)
        }
    }

@app.get("/")
def read_root():
    return {"message": "Campus Copilot AI Agent is running."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

