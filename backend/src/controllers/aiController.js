const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.AI_API_GOOGLE || process.env.GEMINI_API_KEY);

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

const User = require('../models/User');

exports.chatWithAI = async (req, res) => {
  try {
    const { message, history } = req.body;
    const userId = req.user.id;

    if (!message) return res.status(400).json({ message: 'Message is required' });

    // ── Check Daily Limit ──────────────────────────────────────────────────
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const now = new Date();
    const lastReset = new Date(user.aiUsage?.lastReset || 0);
    const isNewDay = now.toDateString() !== lastReset.toDateString();

    if (isNewDay) {
      user.aiUsage = { count: 0, lastReset: now };
    }

    if (user.role !== 'admin' && user.aiUsage.count >= 20) {
      return res.status(429).json({ 
        message: 'Daily AI limit reached (20/20). Please wait until tomorrow or contact an administrator.',
        limitReached: true
      });
    }

    // ── Call Gemini API ────────────────────────────────────────────────────
    if (!process.env.AI_API_GOOGLE && !process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'AI configuration error: AI_API_GOOGLE or GEMINI_API_KEY missing.' });
    }

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

    // ── Update Usage ──────────────────────────────────────────────────────
    user.aiUsage.count += 1;
    await user.save();

    res.json({ 
      response: text, 
      usage: {
        count: user.aiUsage.count,
        limit: 20,
        isAdmin: user.role === 'admin'
      }
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ message: 'AI processing failed. Please check network connection or API quota.' });
  }
};

exports.streamChatWithAI = async (req, res) => {
    try {
        const { message, history } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const now = new Date();
        const lastReset = new Date(user.aiUsage?.lastReset || 0);
        if (now.toDateString() !== lastReset.toDateString()) {
          user.aiUsage = { count: 0, lastReset: now };
        }

        if (user.role !== 'admin' && user.aiUsage.count >= 20) {
          return res.status(429).json({ message: 'Daily limit reached' });
        }

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

        user.aiUsage.count += 1;
        await user.save();

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error('AI Stream Error:', error);
        res.end();
    }
};
