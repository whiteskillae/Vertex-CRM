const { GoogleGenerativeAI } = require('@google/generative-ai');

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
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Initialize aiUsage if missing
    if (!user.aiUsage) {
      user.aiUsage = { count: 0, lastReset: new Date() };
    }

    const now = new Date();
    const lastReset = user.aiUsage.lastReset ? new Date(user.aiUsage.lastReset) : new Date(0);
    const isNewDay = now.toDateString() !== lastReset.toDateString();

    if (isNewDay) {
      user.aiUsage.count = 0;
      user.aiUsage.lastReset = now;
      await user.save();
    }

    if (user.role !== 'admin' && user.aiUsage.count >= 20) {
      return res.status(429).json({ 
        message: 'DAILY QUOTA EXCEEDED: Operational limit reached (20/20). System reset in 24h.',
        limitReached: true
      });
    }

    // ── Call Gemini API ────────────────────────────────────────────────────
    const currentApiKey = process.env.GEMINI_API_KEY;
    if (!currentApiKey) {
      console.error('❌ AI ERROR: GEMINI_API_KEY is missing');
      return res.status(500).json({ message: 'NEURAL LINK OFFLINE: AI configuration error. Contact Admin.' });
    }

    const genAI = new GoogleGenerativeAI(currentApiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt 
    });

    // Filter and format history to ensure it alternates correctly and starts with 'user'
    let formattedHistory = [];
    let lastRole = null;

    if (history && Array.isArray(history)) {
      for (const h of history) {
        if (!h.content || !h.role) continue;
        
        const role = h.role === 'user' ? 'user' : 'model';
        
        // Gemini history MUST start with 'user'
        if (formattedHistory.length === 0 && role !== 'user') continue;
        
        // Gemini history MUST alternate roles
        if (role === lastRole) continue;
        
        formattedHistory.push({
          role: role,
          parts: [{ text: h.content }]
        });
        lastRole = role;
      }
    }

    // If history ended with a user message, the next sendMessage(message) would be User-User.
    // So we must ensure history ends with a model message if we are about to send a user message.
    if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
      // If the user's current message is about to be sent, we should probably remove the last user message from history
      // or the API will complain about consecutive user messages.
      formattedHistory.pop();
    }

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    // ── Update Usage ──────────────────────────────────────────────────────
    user.aiUsage.count += 1;
    await user.save();

    res.json({ 
      reply: text, 
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

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: systemPrompt
        });
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Filter and format history to ensure it alternates correctly and starts with 'user'
        let formattedHistory = [];
        let lastRole = null;

        if (history && Array.isArray(history)) {
          for (const h of history) {
            if (!h.content || !h.role) continue;
            
            const role = h.role === 'user' ? 'user' : 'model';
            
            // Gemini history MUST start with 'user'
            if (formattedHistory.length === 0 && role !== 'user') continue;
            
            // Gemini history MUST alternate roles
            if (role === lastRole) continue;
            
            formattedHistory.push({
              role: role,
              parts: [{ text: h.content }]
            });
            lastRole = role;
          }
        }

        // Ensure history ends with a model message so next message is 'user'
        if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === 'user') {
          formattedHistory.pop();
        }

        const chat = model.startChat({
            history: formattedHistory,
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
