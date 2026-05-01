const Lead = require('../models/Lead');

exports.createLead = async (req, res) => {
  try {
    const { name, email, phone, company, status, source, assignedTo } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Lead name and email are required' });
    }

    const lead = await Lead.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone,
      company,
      status,
      source,
      assignedTo: assignedTo || req.user.id
    });
    res.status(201).json(lead);
  } catch (error) {
    console.error('createLead error:', error.message);
    res.status(500).json({ message: 'Failed to create lead' });
  }
};

exports.getLeads = async (req, res) => {
  try {
    // ── Pagination ───────────────────────────────────────────────────────────
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = req.user.role === 'admin' ? {} : { assignedTo: req.user.id };

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'name email'),
      Lead.countDocuments(filter)
    ]);

    res.json({
      leads,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('getLeads error:', error.message);
    res.status(500).json({ message: 'Failed to fetch leads' });
  }
};

exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('assignedTo', 'name email');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // ── Authorization: admin sees all, others see only their own ─────────────
    if (req.user.role !== 'admin' && lead.assignedTo?._id?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this lead' });
    }

    res.json(lead);
  } catch (error) {
    console.error('getLeadById error:', error.message);
    res.status(500).json({ message: 'Failed to fetch lead' });
  }
};

// ── FIX: Authorization — only the assigned user or admin can update ──────────
exports.updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const isAssignee = lead.assignedTo?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isAssignee && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this lead' });
    }

    // ── FIX: Field Whitelisting & Input Sanitization ─────────────────────────
    const allowedFields = ['name', 'email', 'phone', 'company', 'status', 'source'];
    
    // Only admins can re-assign leads
    if (isAdmin) {
      allowedFields.push('assignedTo');
    }

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] === 'string') {
          updates[field] = req.body[field].trim();
        } else {
          updates[field] = req.body[field];
        }
      }
    }
    
    if (updates.email) {
      updates.email = updates.email.toLowerCase();
    }

    updates.updatedAt = Date.now();
    const updated = await Lead.findByIdAndUpdate(
      req.params.id, 
      { $set: updates }, 
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');
    
    res.json(updated);
  } catch (error) {
    console.error('updateLead error:', error.message);
    res.status(500).json({ message: 'Failed to update lead' });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    await Lead.findByIdAndDelete(req.params.id);
    res.json({ message: 'Lead removed' });
  } catch (error) {
    console.error('deleteLead error:', error.message);
    res.status(500).json({ message: 'Failed to delete lead' });
  }
};

// ── Lead Import via XLSX ─────────────────────────────────────────────────────
exports.importLeads = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const xlsx = require('xlsx');
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return res.status(400).json({ message: 'Sheet is empty or invalid format' });
    }

    const leadsToCreate = data.map(item => ({
      name: item.Name || item.name,
      email: (item.Email || item.email)?.toLowerCase().trim(),
      phone: item.Phone || item.phone,
      company: item.Company || item.company,
      source: item.Source || item.source || 'Bulk Import',
      assignedTo: req.user.id
    })).filter(l => l.name && l.email);

    if (leadsToCreate.length === 0) {
      return res.status(400).json({ message: 'No valid lead data found (Name and Email are required)' });
    }

    const result = await Lead.insertMany(leadsToCreate);
    res.json({ message: `${result.length} leads imported successfully`, count: result.length });
  } catch (error) {
    console.error('importLeads error:', error.message);
    res.status(500).json({ message: 'Failed to parse Excel file' });
  }
};
