# Campus Copilot - Technical Developer Documentation

**Document Version:** 1.0  
**Last Updated:** 2026-02-17  
**Target Audience:** Engineering Team, Backend/Frontend/AI Developers

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Data Flow Analysis](#2-data-flow-analysis)
3. [Frontend Technical Details](#3-frontend-technical-details)
4. [Backend API Specification](#4-backend-api-specification)
5. [AI Agent Architecture](#5-ai-agent-architecture)
6. [Database Schema](#6-database-schema)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Scalability & Maintenance](#8-scalability--maintenance)
9. [Development Workflows](#9-development-workflows)

---

## 1. System Architecture

### 1.1 High-Level Design (HLD)

Campus Copilot implements a **three-tier microservices architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│              React 19.2.0 Single-Page Application            │
│                    (Port 3000 - Dev)                         │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/REST + JWT Bearer Token
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                        │
│               Express 5.1.0 REST API Server                  │
│                    (Port 3001)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Routes  │  │Student Routes│  │Professor Rts │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Course Routes │  │ Chat Proxy   │  │Semester Rts  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────┬─────────────────────────────────────┘
                        │ PostgreSQL Protocol
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
│             PostgreSQL 16.x Database                         │
│   10 Tables: Users, Roles, Students, Professors, Courses,   │
│   Classes, Enrollments, ClassSchedule, Recruiters, Placements│
└─────────────────────────────────────────────────────────────┘
                        ▲
                        │ HTTP REST API Calls
                        │
┌─────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE LAYER                        │
│          FastAPI + LangChain AI Agent (Port 8000)            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  LangChain ReAct Agent Executor                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │Student     │  │Professor   │  │General     │     │  │
│  │  │Tools (3)   │  │Tools (3)   │  │Tools (4)   │     │  │
│  │  └────────────┘  └────────────┘  └────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│                  Azure OpenAI GPT-4                          │
│                  (Function Calling)                         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Responsibilities

| Component | Technology | Port | Primary Responsibility |
|-----------|-----------|------|----------------------|
| **React Frontend** | React 19.2.0, React Router 7.9.5, Axios | 3000 | User interface, session management, API consumption |
| **Express Backend** | Express 5.1.0, Node.js, JWT, bcrypt | 3001 | RESTful API, authentication, database queries |
| **FastAPI AI Agent** | FastAPI, LangChain 0.2.1, Python 3.x | 8000 | Natural language processing, tool orchestration |
| **PostgreSQL DB** | PostgreSQL 16.x, pg 8.16.3 | 5432 | Persistent data storage |
| **Azure OpenAI** | GPT-4, Function Calling API | Remote | Language understanding, reasoning, tool selection |

### 1.3 Technology Stack

**Frontend Dependencies:**
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-router-dom": "^7.9.5",
  "axios": "^1.13.1"
}
```

**Backend Dependencies:**
```json
{
  "express": "^5.1.0",
  "pg": "^8.16.3",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^3.0.2",
  "cors": "^2.8.5",
  "luxon": "^3.7.2"
}
```

**AI Agent Dependencies:**
```
langchain==0.2.1
langchain-core==0.2.3
langchain-openai==0.1.7
fastapi
uvicorn[standard]
```

---

## 2. Data Flow Analysis

### 2.1 Complete Request Lifecycle

```mermaid
sequenceDiagram
    participant U as User
    participant CP as ChatPage.js
    participant LS as localStorage
    participant BE as Express Backend
    participant AM as authMiddleware
    participant CR as chat.js Route
    participant FA as FastAPI Agent
    participant LC as LangChain Executor
    participant AO as Azure OpenAI
    participant T as LangChain Tools
    participant DB as PostgreSQL

    U->>CP: Types message & clicks Send
    CP->>LS: Get JWT token
    LS-->>CP: Returns token
    CP->>BE: POST /api/chat<br/>{message, Authorization: Bearer token}
    BE->>AM: Verify JWT token
    AM->>AM: jwt.verify(token, JWT_SECRET)
    AM-->>CR: req.user = decoded payload
    CR->>CR: Extract user context<br/>(userId, role, studentId, etc.)
    CR->>FA: POST /ask<br/>{query, user_identity}
    FA->>LC: agent_executor.invoke({input, context})
    LC->>AO: Chat completion with tools
    AO->>AO: Analyze query intent
    AO-->>LC: Tool selection decision
    LC->>T: Invoke selected tool(s)<br/>e.g., get_student_schedule()
    T->>BE: HTTP GET /api/students/{id}/schedule
    BE->>DB: SQL query for schedule
    DB-->>BE: Query results
    BE-->>T: JSON response
    T-->>LC: Tool result string
    LC->>AO: Tool results for synthesis
    AO-->>LC: Final answer text
    LC-->>FA: {response: "answer"}
    FA-->>CR: {response: "answer"}
    CR-->>BE: Forward response
    BE-->>CP: {reply: "answer"}
    CP->>CP: Update messages state
    CP->>U: Display AI response
```

### 2.2 Key Data Flow Stages

#### Stage 1: User Authentication (Login Flow)
```
LoginPage.js
  ↓ POST /api/auth/login {email, password}
backend/routes/auth.js
  ↓ bcrypt.compare(password, hash)
PostgreSQL (Users table)
  ↓ JWT payload creation
LoginPage.js
  ↓ localStorage.setItem('token', token)
  ↓ navigate('/chat')
ChatPage.js (Protected Route)
```

#### Stage 2: Chat Message Processing
```javascript
// ChatPage.js - handleSend function
const response = await axios.post(
  `${process.env.REACT_APP_API_URL}/api/chat`,
  { message: userInput },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

```javascript
// backend/routes/chat.js - POST / handler
const agentPayload = {
  query: message,
  user_identity: {
    userId: user.userId,
    role: user.role,
    studentId: user.studentId,
    professorId: user.professorId,
    name: user.name,
    email: user.email,
    entryDate: user.entryDate
  }
};

const aiAgentResponse = await axios.post(
  `${process.env.AI_AGENT_URL}/ask`,
  agentPayload
);
```

#### Stage 3: AI Agent Processing
```python
# ai-agent/main.py - /ask endpoint
@app.post("/ask")
async def ask_agent(query: Query):
    user_context = f"Role: {query.user_identity.get('role')}"
    if query.user_identity.get('role') == 'Student':
        user_context += f", student_id: {query.user_identity.get('studentId')}"
    
    response = agent_executor.invoke({
        "input": query.query,
        "context": user_context
    })
    
    return {"response": response['output']}
```

---

## 3. Frontend Technical Details

### 3.1 Application Structure

```
frontend/src/
├── index.js                 # React app entry point
├── App.js                   # Router configuration
├── App.css                  # Global styles
├── index.css                # Base styles
└── components/
    ├── LoginPage.js         # Authentication UI
    ├── ChatPage.js          # Main chat interface
    └── ChangePasswordModal.js  # Password change modal
```

### 3.2 State Management Strategy

**Technology:** localStorage + React Hooks (useState, useRef, useEffect)

**No Redux/Context API** - The application uses a simplified state management approach suitable for its scope.

#### Authentication State
```javascript
// Stored in localStorage after login
localStorage.setItem('token', jwtToken);          // JWT for API authentication
localStorage.setItem('user', JSON.stringify({     // User profile data
  userId, email, role, name, studentId, professorId, entryDate
}));
```

#### Chat State Management
```javascript
// ChatPage.js - Component-level state
const [messages, setMessages] = useState([]);    // Chat history array
const [input, setInput] = useState("");          // Current input text
const [isLoading, setIsLoading] = useState(false); // Loading indicator
const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility

const userRef = useRef(JSON.parse(localStorage.getItem("user"))); // Persistent user data
const messagesEndRef = useRef(null); // Scroll anchor reference
```

**No persistence** - Chat history is cleared on page refresh. This is intentional for privacy.

### 3.3 Component Architecture

#### 3.3.1 LoginPage.js

**Purpose:** User authentication interface

**State:**
- `email` (string) - User email input
- `password` (string) - User password input
- `error` (string) - Error message display
- `isLoading` (boolean) - Submit button state

**Key Functions:**
```javascript
const handleLogin = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  
  const response = await axios.post(`${API_URL}/api/auth/login`, {
    email, password
  });
  
  const { token, user } = response.data;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  navigate("/chat");
};
```

**Error Handling:**
- Network errors → "Could not connect to the server"
- 401 Unauthorized → "Invalid credentials"
- Server errors → Display `response.data.error`

#### 3.3.2 ChatPage.js

**Purpose:** Main conversational interface with AI agent

**State Management:**
```javascript
const [messages, setMessages] = useState([]);
// Structure: [{ from: 'user'|'copilot', text: string }]
```

**Lifecycle Hooks:**
```javascript
// On mount: Verify authentication & show welcome message
useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) navigate("/login");
  else setMessages([{
    from: "copilot",
    text: `Welcome, ${user.role} ${user.name}! How can I help you today?`
  }]);
}, [navigate]);

// Auto-scroll to latest message
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);
```

**API Integration:**
```javascript
const handleSend = async () => {
  const userMessage = { from: "user", text: input };
  setMessages(prev => [...prev, userMessage]);
  setInput("");
  setIsLoading(true);

  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_URL}/api/chat`,
      { message: input },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const copilotMessage = { from: "copilot", text: response.data.reply };
    setMessages(prev => [...prev, copilotMessage]);
  } catch (error) {
    if (error.response?.status === 401) {
      setMessages(prev => [...prev, {
        from: "copilot",
        text: "Your session has expired. Please log out and log in again."
      }]);
    }
  } finally {
    setIsLoading(false);
  }
};
```

#### 3.3.3 ChangePasswordModal.js

**Purpose:** Self-service password update functionality

**Props:**
- `onClose` (function) - Callback to close modal

**Key Features:**
- Password mismatch validation
- Minimum length validation (6 characters)
- Old password verification via backend

**API Call:**
```javascript
await axios.post(
  `${API_URL}/api/auth/change-password`,
  { oldPassword, newPassword, confirmNewPassword },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### 3.4 Routing Configuration

**File:** `App.js`

```javascript
<Router>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/chat" element={
      <ProtectedRoute>
        <ChatPage />
      </ProtectedRoute>
    } />
    <Route path="/" element={<Navigate to="/login" replace />} />
  </Routes>
</Router>
```

**ProtectedRoute Logic:**
```javascript
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
};
```

### 3.5 PWA & Caching Strategy

**Status:** NO PWA IMPLEMENTATION DETECTED

The project does NOT implement Progressive Web App features or Workbox caching strategies. The `workbox-*` folders seen in the file tree are from `node_modules` (React Scripts dependencies), not active project code.

**No service worker registration found in:**
- `index.js`
- `public/` directory
- Build configuration

**Recommendation for Future:** If offline support is needed, implement using:
```javascript
// Example for future implementation
import { Workbox } from 'workbox-window';

if ('serviceWorker' in navigator) {
  const wb = new Workbox('/service-worker.js');
  wb.register();
}
```

---

## 4. Backend API Specification

### 4.1 API Overview

**Base URL:** `http://localhost:3001`  
**Protocol:** HTTP/REST  
**Authentication:** JWT Bearer Token (except /auth endpoints)  
**Content-Type:** `application/json`

### 4.2 Authentication Endpoints

#### POST `/api/auth/register`

**Description:** Create a new user account

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)",
  "name": "string (required)",
  "role": "Student|Professor (required)",
  "department": "string (optional)",
  "entry_date": "YYYY-MM-DD (required for Students)"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully as a Student!"
}
```

**Error Codes:**
- `400` - Missing required fields or duplicate email
- `500` - Server error

**Implementation Notes:**
- Uses bcrypt with salt rounds = 10 for password hashing
- Creates records in both `Users` table and role-specific table (`Students` or `Professors`)
- Wrapped in database transaction for atomicity

#### POST `/api/auth/login`

**Description:** Authenticate user and receive JWT

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": 1,
    "role": "Student",
    "studentId": 5,
    "professorId": null,
    "name": "John Doe",
    "email": "john@university.edu",
    "entryDate": "2023-09-01"
  }
}
```

**JWT Payload Structure:**
```javascript
{
  userId: number,
  role: 'Student' | 'Professor' | 'Admin',
  studentId: number | null,
  professorId: number | null,
  name: string,
  email: string,
  entryDate: string | null
}
```

**Security:**
- Token expiry: 3 hours
- Password comparison using `bcrypt.compare()`
- Inactive accounts rejected (403 Forbidden)

#### POST `/api/auth/change-password`

**Description:** Update user password (authenticated)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "oldPassword": "string",
  "newPassword": "string (min 6 characters)",
  "confirmNewPassword": "string"
}
```

**Response (200 OK):**
```json
{
  "message": "Password updated successfully."
}
```

### 4.3 Chat Endpoint

#### POST `/api/chat`

**Description:** Send message to AI agent (proxy endpoint)

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "message": "What classes do I have tomorrow?"
}
```

**Response (200 OK):**
```json
{
  "reply": "Based on your schedule, you have Computer Networks at 10:00 AM in Room 301 and Database Systems at 2:00 PM in Room 205."
}
```

**Internal Process:**
1. Extract user context from JWT token (`req.user`)
2. Build payload with user identity
3. Forward to Python AI agent at `${AI_AGENT_URL}/ask`
4. Return agent response to frontend

**Error Handling:**
- `400` - Missing message
- `401` - Invalid/expired token
- `500` - AI agent communication failure

### 4.4 Student Endpoints

#### GET `/api/students/:id/schedule`

**Query Parameters:**
- `semester_id` (optional) - Filter by semester
- `day` (optional) - Filter by day of week (Monday, Tuesday, etc.)

**Response:**
```json
[
  {
    "course_name": "Computer Networks",
    "day_of_week": "Monday",
    "start_time": "10:00:00",
    "end_time": "11:30:00",
    "room": "301",
    "professor_name": "Dr. Smith",
    "class_id": 15
  }
]
```

**SQL Query (Simplified):**
```sql
SELECT crs.course_name, cs.day_of_week, cs.start_time, cs.end_time, 
       cs.room, p.name as professor_name, cl.class_id
FROM ClassSchedule cs
JOIN Classes cl ON cs.class_id = cl.class_id
JOIN Courses crs ON cl.course_id = crs.course_id
JOIN Enrollments e ON cl.class_id = e.class_id
LEFT JOIN Professors p ON cl.professor_id = p.professor_id
WHERE e.student_id = $1 AND cl.is_active = TRUE
ORDER BY cs.start_time;
```

#### GET `/api/students/:id/enrollments`

**Query Parameters:**
- `semester_id` (optional) - Filter by semester
- `relative_sem` (optional) - Relative semester number (e.g., 3 for 3rd semester)

**Response:**
```json
[
  {
    "course_name": "Data Structures",
    "semester_name": "Fall 2024"
  }
]
```

**Relative Semester Logic:**
```javascript
// Calculate semester based on student entry date
const offset = parseInt(relative_sem, 10) - 1;
const semesterIdQuery = `
  SELECT semester_id FROM Semesters
  WHERE start_date >= $1 ORDER BY start_date OFFSET $2 LIMIT 1;
`;
const semRes = await pool.query(semesterIdQuery, [entryDate, offset]);
```

#### GET `/api/students/:id/placements`

**Response:**
```json
[
  {
    "company_name": "Tech Corp",
    "status": "Selected",
    "ctc_lpa": 12.50
  }
]
```

**Status Values:**
- `Applied`
- `Interviewing`
- `Selected`
- `Rejected`

### 4.5 Professor Endpoints

#### GET `/api/professors/:id/classes`

**Query Parameters:**
- `semester_id` (optional)

**Response:**
```json
[
  {
    "course_name": "Operating Systems",
    "semester_name": "Fall 2024",
    "class_id": 20
  }
]
```

#### GET `/api/professors/:id/schedule`

**Query Parameters:**
- `semester_id` (optional)
- `day` (optional)

**Response:** Same structure as student schedule

### 4.6 Course Endpoints

#### GET `/api/courses/search`

**Query Parameters:**
- `query` (optional) - Search term for name or department

**Response:**
```json
[
  {
    "course_id": 1,
    "course_name": "Data Structures",
    "department": "Computer Science",
    "credits": 4,
    "is_active": true
  }
]
```

**Search Implementation:**
```sql
SELECT course_id, course_name, department, credits
FROM Courses
WHERE is_active = TRUE
  AND (course_name ILIKE $1 OR department ILIKE $1)
ORDER BY course_name;
```

#### GET `/api/courses/:id`

**Response:**
```json
{
  "course_id": 1,
  "course_name": "Data Structures",
  "department": "Computer Science",
  "credits": 4,
  "is_active": true,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

### 4.7 Semester Endpoints

#### GET `/api/semesters`

**Response:**
```json
[
  {
    "semester_id": 1,
    "name": "Fall 2024",
    "start_date": "2024-09-01",
    "end_date": "2024-12-20"
  }
]
```

---

## 5. AI Agent Architecture

### 5.1 Agent Pattern: ReAct (Reasoning + Acting)

**Implementation:** LangChain `create_tool_calling_agent` with Azure OpenAI

**Key Characteristics:**
- LLM reasons about user intent
- Selects appropriate tools dynamically
- Can chain multiple tool calls
- Synthesizes results into natural language

**NOT a simple router** - The agent handles ambiguous queries and multi-step reasoning.

### 5.2 Agent Initialization

**File:** `ai-agent/core/agent_factory.py`

```python
def create_agent_executor():
    # Initialize Azure OpenAI LLM
    llm = AzureChatOpenAI(
        azure_deployment=config.AZURE_OPENAI_DEPLOYMENT_NAME,
        openai_api_version="2024-02-01",
        temperature=0,  # Deterministic responses
    )
    
    # Register all tools
    tools = [
        # Student tools
        get_student_schedule,
        get_student_enrollments,
        get_student_placements,
        # Professor tools
        get_professor_classes,
        get_professor_schedule,
        get_students_in_class,
        # General tools
        search_courses,
        get_course_details,
        get_class_schedule,
        get_current_semester
    ]
    
    # Define system prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a helpful and professional Campus Copilot."
            "Your job is to answer the user's questions about the university."
            "You must use the available tools to find the information."
            "You have the following context about the user: {context}."
            "You MUST use this context (like student_id or professor_id) when the user asks about 'my' or 'I'."
        )),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])
    
    # Create agent with tool calling capability
    agent = create_tool_calling_agent(llm, tools, prompt)
    
    # Wrap in executor with verbosity
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
    
    return agent_executor
```

### 5.3 Tool Catalog

#### Student Tools (3)

**1. get_student_schedule**
```python
@tool
def get_student_schedule(student_id: int, day: str = None) -> str:
    """
    Use this tool to get a specific student's class schedule.
    You must provide the student_id.
    You can optionally filter by day_of_week (e.g., 'Monday').
    """
    endpoint = f"/api/students/{student_id}/schedule"
    params = {'day': day} if day else {}
    return get_data(endpoint, params)
```

**2. get_student_enrollments**
```python
@tool
def get_student_enrollments(student_id: int, semester_id: int = None) -> str:
    """
    Gets a list of all courses a student is enrolled in, including semester name.
    """
    endpoint = f"/api/students/{student_id}/enrollments"
    params = {'semester_id': semester_id} if semester_id else {}
    return get_data(endpoint, params)
```

**3. get_student_placements**
```python
@tool
def get_student_placements(student_id: int) -> str:
    """
    Gets the job placement application status for a specific student.
    """
    endpoint = f"/api/students/{student_id}/placements"
    return get_data(endpoint)
```

#### Professor Tools (3)

- `get_professor_classes(professor_id, semester_id?)` - List teaching assignments
- `get_professor_schedule(professor_id, day?)` - Teaching timetable
- `get_students_in_class(class_id)` - Class roster

#### General Tools (4)

- `search_courses(query?)` - Search course catalog
- `get_course_details(course_id)` - Course information
- `get_class_schedule(class_id)` - Class meeting times
- `get_current_semester()` - Active semester information

### 5.4 Tool Execution Pattern

**File:** `ai-agent/tools/api_service.py`

```python
import requests
import config

def get_data(endpoint: str, params: dict = None) -> str:
    """
    Makes HTTP GET request to backend API and returns JSON as string.
    """
    url = f"{config.NODE_API_BASE_URL}{endpoint}"
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if not data:
            return "No data found."
        
        return str(data)
    except requests.exceptions.RequestException as e:
        return f"Error calling API: {str(e)}"
```

### 5.5 Agent Execution Flow Example

**User Query:** "What's my schedule for Monday?"

```python
# 1. FastAPI receives request
user_context = "Role: Student, student_id: 5"

# 2. Agent invoked
response = agent_executor.invoke({
    "input": "What's my schedule for Monday?",
    "context": user_context
})

# 3. LLM reasoning (internal)
# "User is a student with ID 5. They want Monday schedule.
#  I should use get_student_schedule(student_id=5, day='Monday')"

# 4. Tool execution
result = get_student_schedule(student_id=5, day="Monday")
# Returns: "[{'course_name': 'Computer Networks', 'start_time': '10:00:00', ...}]"

# 5. LLM synthesis
# "Based on the results, synthesize a natural response"

# 6. Final response
{
  "response": "Your Monday schedule includes Computer Networks from 10:00-11:30 in Room 301 and Database Systems from 14:00-15:30 in Room 205."
}
```

---

## 6. Database Schema

### 6.1 Entity-Relationship Diagram

```
Users ──┬── Students ──┬── Enrollments ──── Classes ──┬── Courses
        │              │                              │
        │              └── Placements ──── Recruiters │
        │                                             │
        └── Professors ─────────────────────────────┘

Classes ──── ClassSchedule
Classes ──── Semesters
```

### 6.2 Core Tables

#### Users
```sql
CREATE TABLE Users (
    user_id       SERIAL         PRIMARY KEY,
    email         VARCHAR(255)   NOT NULL UNIQUE,
    password_hash TEXT           NOT NULL,
    role_id       INT            NOT NULL,
    is_active     BOOLEAN        DEFAULT TRUE,
    created_at    TIMESTAMPTZ    DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    DEFAULT NOW(),
    FOREIGN KEY (role_id) REFERENCES Roles(role_id)
);
```

#### Students
```sql
CREATE TABLE Students (
    student_id   SERIAL         PRIMARY KEY,
    user_id      INT            NOT NULL UNIQUE,
    name         VARCHAR(255)   NOT NULL,
    department   VARCHAR(255),
    entry_date   DATE           NOT NULL,
    is_active    BOOLEAN        DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
```

#### Enrollments
```sql
CREATE TABLE Enrollments (
    enrollment_id   SERIAL         PRIMARY KEY,
    student_id      INT            NOT NULL,
    class_id        INT            NOT NULL,
    created_at      TIMESTAMPTZ    DEFAULT NOW(),
    FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES Classes(class_id) ON DELETE CASCADE,
    UNIQUE (student_id, class_id)
);
```

#### ClassSchedule
```sql
CREATE TABLE ClassSchedule (
    schedule_id   SERIAL         PRIMARY KEY,
    class_id      INT            NOT NULL,
    day_of_week   VARCHAR(10)    NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
    start_time    TIME           NOT NULL,
    end_time      TIME           NOT NULL,
    room          VARCHAR(50)    NOT NULL,
    FOREIGN KEY (class_id) REFERENCES Classes(class_id) ON DELETE CASCADE
);
```

### 6.3 Performance Optimizations

**Indexes Created:**
```sql
CREATE INDEX idx_users_is_active ON Users(is_active);
CREATE INDEX idx_students_is_active ON Students(is_active);
CREATE INDEX idx_courses_department ON Courses(department);
CREATE INDEX idx_classes_course_id ON Classes(course_id);
CREATE INDEX idx_classes_professor_id ON Classes(professor_id);
CREATE INDEX idx_classes_semester_id ON Classes(semester_id);
CREATE INDEX idx_enrollments_student_id ON Enrollments(student_id);
CREATE INDEX idx_enrollments_class_id ON Enrollments(class_id);
CREATE INDEX idx_schedule_class_id ON ClassSchedule(class_id);
```

---

## 7. Authentication & Authorization

### 7.1 JWT Token Structure

**Algorithm:** HS256 (HMAC with SHA-256)  
**Secret:** Stored in `process.env.JWT_SECRET` (backend)  
**Expiry:** 3 hours

**Token Payload:**
```javascript
{
  userId: 1,
  role: "Student",
  studentId: 5,
  professorId: null,
  name: "John Doe",
  email: "john@university.edu",
  entryDate: "2023-09-01",
  iat: 1705478400,  // Issued At
  exp: 1705489200   // Expiration
}
```

### 7.2 Authentication Middleware

**File:** `backend/middleware/authMiddleware.js`

```javascript
module.exports = function (req, res, next) {
  const authHeader = req.header("Authorization");
  
  if (!authHeader) {
    return res.status(401).json({ msg: "No token, authorization denied." });
  }
  
  try {
    const token = authHeader.split(" ")[1];  // Extract Bearer token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // Attach user data to request
    next();
  } catch (err) {
    res.status(401).json({ msg: "Token is not valid." });
  }
};
```

### 7.3 Protected Routes

**Applied to:**
- `/api/chat` - Requires authentication
- `/api/auth/change-password` - Requires authentication

**Not protected:**
- `/api/auth/login`
- `/api/auth/register`
- Public student/professor/course endpoints (by design for transparency)

---

## 8. Scalability & Maintenance

### 8.1 Adding a New Tool to AI Agent

**Step 1: Create Tool Function**

Create a new file `ai-agent/tools/new_feature_tools.py`:

```python
from langchain.tools import tool
from tools.api_service import get_data

@tool
def get_student_attendance(student_id: int, course_id: int = None) -> str:
    """
    Retrieves attendance records for a specific student.
    You must provide the student_id.
    You can optionally filter by course_id.
    """
    endpoint = f"/api/students/{student_id}/attendance"
    params = {'course_id': course_id} if course_id else {}
    return get_data(endpoint, params)
```

**Step 2: Register Tool in Agent Factory**

Edit `ai-agent/core/agent_factory.py`:

```python
from tools.new_feature_tools import get_student_attendance

def create_agent_executor():
    tools = [
        # Existing tools...
        get_student_schedule,
        get_student_enrollments,
        # Add new tool
        get_student_attendance,
    ]
    # Rest of code unchanged
```

**Step 3: Create Backend API Route**

Add to `backend/routes/students.js`:

```javascript
router.get("/:id/attendance", async (req, res) => {
  const { id } = req.params;
  const { course_id } = req.query;
  
  try {
    let query = `
      SELECT c.course_name, a.date, a.status
      FROM Attendance a
      JOIN Classes cl ON a.class_id = cl.class_id
      JOIN Courses c ON cl.course_id = c.course_id
      WHERE a.student_id = $1
    `;
    const params = [id];
    
    if (course_id) {
      query += ` AND c.course_id = $2`;
      params.push(course_id);
    }
    
    query += ` ORDER BY a.date DESC`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(`Error fetching attendance for ${id}:`, err.message);
    res.status(500).send("Server error");
  }
});
```

**Step 4: Add Database Table**

```sql
CREATE TABLE Attendance (
    attendance_id SERIAL PRIMARY KEY,
    student_id    INT NOT NULL,
    class_id      INT NOT NULL,
    date          DATE NOT NULL,
    status        VARCHAR(20) CHECK (status IN ('Present', 'Absent', 'Late')),
    FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES Classes(class_id) ON DELETE CASCADE
);

CREATE INDEX idx_attendance_student_id ON Attendance(student_id);
CREATE INDEX idx_attendance_class_id ON Attendance(class_id);
```

**Step 5: Restart Services**

```bash
# Restart AI agent
cd ai-agent
python main.py

# Restart backend
cd backend
npm start
```

### 8.2 Adding a New API Endpoint

**Example: Add recruiter search endpoint**

**1. Create or edit route file** (`backend/routes/recruiters.js`):

```javascript
router.get("/search", async (req, res) => {
  const { query } = req.query;
  
  try {
    const result = await pool.query(
      `SELECT company_id, company_name, job_roles
       FROM Recruiters
       WHERE is_active = TRUE
         AND (company_name ILIKE $1 OR job_roles ILIKE $1)
       ORDER BY company_name`,
      [`%${query || ''}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error searching recruiters:", err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
```

**2. Register route in** `backend/index.js`:

```javascript
const recruiterRoutes = require("./routes/recruiters");
app.use("/api/recruiters", recruiterRoutes);
```

### 8.3 Database Migrations

**Current Approach:** SQL scripts executed manually

**Recommended for Production:** Use migration tool like `node-pg-migrate`

**Example Migration Workflow:**

```bash
# Install migration tool
npm install node-pg-migrate

# Create migration
npx node-pg-migrate create add-attendance-table

# Edit migration file
# migrations/1234567890_add-attendance-table.js
exports.up = (pgm) => {
  pgm.createTable('Attendance', {
    attendance_id: 'id',
    student_id: { type: 'integer', notNull: true },
    class_id: { type: 'integer', notNull: true },
    date: { type: 'date', notNull: true },
    status: { type: 'varchar(20)', notNull: true }
  });
};

exports.down = (pgm) => {
  pgm.dropTable('Attendance');
};

# Run migration
npx node-pg-migrate up
```

### 8.4 Testing Strategy

**Current State:** No automated tests implemented

**Recommended Testing Pyramid:**

**Unit Tests (Backend):**
```javascript
// tests/routes/auth.test.js
const request = require('supertest');
const app = require('../index');

describe('POST /api/auth/login', () => {
  it('should return JWT token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@university.edu', password: 'password123' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
  });
});
```

**Integration Tests (AI Agent):**
```python
# tests/test_agent.py
import pytest
from core.agent_factory import create_agent_executor

def test_student_schedule_query():
    agent = create_agent_executor()
    
    response = agent.invoke({
        "input": "What's my Monday schedule?",
        "context": "Role: Student, student_id: 5"
    })
    
    assert "Computer Networks" in response['output']
```

**E2E Tests (Frontend):**
```javascript
// cypress/e2e/login.cy.js
describe('Login Flow', () => {
  it('should login successfully and redirect to chat', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('student@university.edu');
    cy.get('input[type="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/chat');
  });
});
```

---

## 9. Development Workflows

### 9.1 Local Development Setup

**1. Prerequisites:**
```bash
# Check versions
node --version    # v18+
python --version  # 3.9+
psql --version    # 14+
```

**2. Database Setup:**
```bash
psql -U postgres
CREATE DATABASE campus_copilot;
\q

psql -U postgres -d campus_copilot -f backend/db.sql
psql -U postgres -d campus_copilot -f backend/populate_db.sql
```

**3. Backend Setup:**
```bash
cd backend
npm install

# Create .env
echo "PORT=3001" > .env
echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/campus_copilot" >> .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "AI_AGENT_URL=http://localhost:8000" >> .env

npm start
```

**4. AI Agent Setup:**
```bash
cd ai-agent
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

pip install -r requirements.txt

# Create .env
echo "AZURE_OPENAI_API_KEY=your_key" > .env
echo "AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/" >> .env
echo "AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4" >> .env
echo "NODE_API_BASE_URL=http://localhost:3001" >> .env

python main.py
```

**5. Frontend Setup:**
```bash
cd frontend
npm install

# Create .env
echo "REACT_APP_API_URL=http://localhost:3001" > .env

npm start
```

### 9.2 Debugging Tips

**Backend Debugging:**
```javascript
// Add to index.js for request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});
```

**AI Agent Debugging:**
```python
# Agent executor is set to verbose=True
# View tool calls in terminal output
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
```

**Frontend Debugging:**
```javascript
// ChatPage.js - Add console logs
console.log('Sending message:', input);
console.log('API Response:', response.data);
```

**Database Query Debugging:**
```sql
-- Enable query logging in PostgreSQL
ALTER DATABASE campus_copilot SET log_statement = 'all';
```

### 9.3 Common Issues & Solutions

**Issue:** "AI Agent config error"
- **Cause:** AI_AGENT_URL not set or agent not running
- **Fix:** Verify backend `.env` has `AI_AGENT_URL=http://localhost:8000` and Python agent is running

**Issue:** "Token is not valid"
- **Cause:** JWT secret mismatch or expired token
- **Fix:** Ensure `JWT_SECRET` matches between login and middleware, or logout and login again

**Issue:** "Database connection failed"
- **Cause:** PostgreSQL not running or wrong credentials
- **Fix:** Start PostgreSQL service, verify `DATABASE_URL` in `.env`

**Issue:** "Tool not found" in agent logs
- **Cause:** Tool not registered in agent factory
- **Fix:** Import and add tool to `tools` array in `agent_factory.py`

---

## 10. Appendix

### 10.1 Environment Variables Reference

**Backend (.env):**
```bash
PORT=3001
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://user:pass@localhost:5432/campus_copilot
JWT_SECRET=<32+ character secret>
AI_AGENT_URL=http://localhost:8000
```

**Frontend (.env):**
```bash
REACT_APP_API_URL=http://localhost:3001
```

**AI Agent (.env):**
```bash
AZURE_OPENAI_API_KEY=<your_key>
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
NODE_API_BASE_URL=http://localhost:3001
```

### 10.2 File Structure Summary

```
CC_Test/
├── backend/ (Node.js Express API)
│   ├── index.js (Server entry point)
│   ├── db.js (PostgreSQL connection pool)
│   ├── middleware/authMiddleware.js (JWT verification)
│   └── routes/ (8 route modules)
├── frontend/ (React SPA)
│   └── src/components/ (3 React components)
├── ai-agent/ (Python FastAPI LLM service)
│   ├── main.py (FastAPI entry point)
│   ├── core/agent_factory.py (LangChain agent)
│   └── tools/ (10 tool functions across 4 files)
└── .env files (3 separate configurations)
```

### 10.3 Technology Justifications

**Why Azure OpenAI instead of Ollama?**
- Function calling support required for tool use
- Production-grade reliability and scalability
- Better natural language understanding for conversational AI

**Why localStorage instead of Redux?**
- Small application scope (2 routes)
- No complex global state management needed
- Reduces bundle size and complexity

**Why separate AI agent service?**
- Decouples Python ML stack from Node.js backend
- Easier to scale AI processing independently
- Allows backend to handle synchronous CRUD while agent handles async LLM operations

---

**End of Technical Documentation**

For questions or clarifications, please contact the development team or refer to the codebase README.md.
