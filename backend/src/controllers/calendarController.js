const CalendarNote = require('../models/CalendarNote');

exports.createNote = async (req, res) => {
  try {
    const { title, description, date, type } = req.body;

    if (!title || !date) {
      return res.status(400).json({ message: 'Title and date are required' });
    }

    const note = await CalendarNote.create({
      title,
      description,
      date,
      type: type || 'note',
      isPersonal: req.body.isPersonal || false,
      createdBy: req.user.id
    });
    res.status(201).json(note);
  } catch (error) {
    console.error('createNote error:', error.message);
    res.status(500).json({ message: 'Failed to create calendar note' });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const { start, end } = req.query;

    // ── Step 1: Initialize filter with a safe default ────────────────────────
    let filter = {};

    // ── Step 2: Apply optional date-range filter when both params are present ─
    if (start && end) {
      const startDate = new Date(start);
      const endDate   = new Date(end);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        filter.date = { $gte: startDate, $lte: endDate };
      }
    }

    // ── Step 3: Visibility — own personal notes OR shared org notes ───────────
    filter.$or = [
      { isPersonal: false },
      { createdBy: req.user.id, isPersonal: true }
    ];

    const notes = await CalendarNote.find(filter).sort({ date: 1 });
    res.json(notes);
  } catch (error) {
    console.error('getNotes error:', error.message);
    res.status(500).json({ message: 'Failed to fetch calendar notes' });
  }
};
