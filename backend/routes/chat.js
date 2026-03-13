const express = require("express");
const router = express.Router();
const axios = require("axios");
require("dotenv").config();

// Handle chat requests
router.post("/", async (req, res) => {
  const user = req.user;
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "A message is required." });
  }
  if (!process.env.AI_AGENT_URL) {
    console.error("AI_AGENT_URL missing in .env");
    return res.status(500).send("AI Agent config error.");
  }

  try {
    // Build data for Python agent
    const agentPayload = {
      query: message,
      user_identity: {
        userId: user.userId,
        role: user.role,
        studentId: user.studentId,
        professorId: user.professorId,
        name: user.name,
        email: user.email,
        entryDate: user.entryDate,
      },
    };

    console.log(
      `Forwarding message to AI Agent at ${process.env.AI_AGENT_URL}/ask for user: ${user.userId}`
    );
    console.log("Payload:", JSON.stringify(agentPayload, null, 2));

    // Send request to AI agent
    const aiAgentResponse = await axios.post(
      `${process.env.AI_AGENT_URL}/ask`,
      agentPayload
    );

    // Get reply
    const finalAnswer = aiAgentResponse.data.response;

    // Send back to frontend
    res.json({ 
      reply: finalAnswer,
      metadata: aiAgentResponse.data.metadata 
    });
  } catch (err) {
    console.error(
      "Error communicating with AI Agent:",
      err.response ? err.response.data : err.message
    );
    res.status(500).send("Error processing your request via AI Agent.");
  }
});

module.exports = router;
