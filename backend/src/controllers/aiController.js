const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = `
You are the Vertex CRM AI Assistant, a powerful enterprise-grade intelligence integrated into the Vertex CRM system.
Your goal is to help employees and administrators navigate the CRM, understand company workflows, and manage projects/tasks efficiently.

CRM MODULES:
1. Dashboard: Overview of leads, tasks, and system stats.
2. Leads: Management of potential clients (Admin/Manager only).
3. Projects: End-to-end project lifecycle management, deadlines, and documentation.
4. Tasks: Assignment system with status tracking (Todo, In-Progress, Review, Completed).
5. Reports: Sharing progress and files between personnel.
6. Comms Hub: Real-time private and team chat.
7. Secure Vault: Admin-only encrypted storage for credentials and private notes.
8. Monitoring: Admin-only screen monitoring and activity logs.

WORKFLOW:
- Admins create projects and assign tasks to employees.
- Employees work on tasks and submit them for review.
- Admins approve or reassign tasks with feedback.
- Real-time notifications keep everyone updated.

ROLES:
- admin: Full system access, management of all nodes.
- manager: Access to leads and task management.
- employee: Task execution and reporting.

Always be professional, concise, and helpful. If you don't know something about the specific data, ask the user to check the relevant module.
`;

exports.chatWithAI = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) return res.status(400).json({ message: 'Message is required' });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Understood. I am ready to assist as the Vertex CRM AI Assistant." }] },
        ...(history || []).map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        }))
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    res.json({ response: text });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ message: 'AI processing failed. Please ensure GEMINI_API_KEY is configured.' });
  }
};

exports.streamChatWithAI = async (req, res) => {
    // Basic streaming implementation
    try {
        const { message, history } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Understood." }] },
                ...(history || []).map(h => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content }]
                }))
            ],
        });

        const result = await chat.sendMessageStream(message);

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error('AI Stream Error:', error);
        res.end();
    }
};
