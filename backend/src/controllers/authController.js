const User = require('../models/User');
const Task = require('../models/Task');
const Lead = require('../models/Lead');
const Report = require('../models/Report');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../config/emailService');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const sendTokenResponse = (user, statusCode, res, message = undefined) => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  const responsePayload = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.phone,
    jobType: user.jobType,
    bio: user.bio,
    isVerified: user.isVerified,
    token // Still sending in payload for backward compatibility with mobile apps
  };

  if (message) {
    responsePayload.message = message;
  }

  res.status(statusCode).cookie('token', token, options).json(responsePayload);
};

exports.logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// ── Registration ─────────────────────────────────────────────────────────────
// First user → admin (auto-active). After that → only admin can register.
// Admin-only User Creation
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Strict Admin check — Seeder handles the first admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Restricted access: Administrative privileges required' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'employee',
      status: 'active',
      isVerified: true
    });

    res.status(201).json({ message: 'User created successfully', user: { id: user._id, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Registration failed' });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Only managers or admins can create employees' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const employee = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'employee',
      status: 'active',  // Manager/admin-created employees are active
      managerId: req.user.id,
      isVerified: true
    });

    res.status(201).json(employee);
  } catch (error) {
    console.error('createEmployee error:', error.message);
    res.status(500).json({ message: 'Failed to create employee' });
  }
};

// ── Login: Admin/Manager = Direct JWT | Employee = OTP Flow ───────────────────
exports.login = async (req, res) => {
  try {
    const { email, password, role: requestedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 1. Block suspended accounts immediately
    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Account suspended. Contact administration.' });
    }

    // 2. Verify Password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3. ── ROLE VALIDATION (Admin Portal Check) ──
    // If the request comes from the Admin tab, verify user has admin/manager privileges
    if (requestedRole === 'admin') {
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ 
          message: 'Access denied. This portal is reserved for administrators. Please use the Employee login.' 
        });
      }
      // Authorized Admins/Managers login directly
      return sendTokenResponse(user, 200, res);
    }

    // 4. ── ADMIN/MANAGER BYPASS (General Login) ──
    // If an admin/manager uses any login tab, they bypass OTP for efficiency
    if (user.role === 'admin' || user.role === 'manager') {
      return sendTokenResponse(user, 200, res);
    }

    // 5. ── EMPLOYEE APPROVAL CHECK ──
    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Your account is pending admin approval' });
    }

    // 6. ── EMPLOYEE OTP FLOW ──
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 min expiry
    await user.save();

    const emailSent = await sendOTPEmail(user.email, otp);

    // Development fallback: log OTP to console if SMTP fails
    if (!emailSent && process.env.NODE_ENV !== 'production') {
      console.log(`\n[DEV] OTP for ${email}: ${otp}\n`);
      return res.json({
        message: 'DEV MODE: Check server console for OTP',
        email: user.email,
        devOtp: otp
      });
    }

    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send verification code. Contact support.' });
    }

    res.json({ message: 'Verification code sent to your email', email: user.email });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Login failed' });
  }
};

// OTP Verification Flow
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    
    // If this was a new registration, mark as verified
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
      return res.json({
        message: 'Email verified successfully. Your account is now pending admin approval.',
        status: user.status,
        email: user.email,
        pendingApproval: true
      });
    }

    await user.save();
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('verifyOTP error:', error.message);
    res.status(500).json({ message: 'OTP verification failed' });
  }
};

// ── Employee self-register → status: 'pending' ──────────────────────────────
exports.employeeRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: 'Email already registered. Please login.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    const employee = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'employee',
      status: 'pending',    // Requires admin approval
      isVerified: false,     // Must verify OTP first
      otp,
      otpExpires
    });

    const emailSent = await sendOTPEmail(employee.email, otp);

    if (!emailSent) {
      console.error(`[EMAIL ERROR] Failed to send signup OTP to ${email}`);
      // Even if email fails, we should return a 500 so the user knows it failed
      // and they need to try again later when SMTP is fixed.
      await User.findByIdAndDelete(employee._id); // Cleanup failed registration
      return res.status(500).json({ 
        message: 'Failed to send verification email. Registration aborted.' 
      });
    }

    res.status(201).json({
      message: 'OTP sent to your email. Please verify to complete registration.',
      email: employee.email
    });
  } catch (error) {
    console.error('employeeRegister error:', error.message);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already registered.' });
    }
    res.status(500).json({ message: 'Registration failed due to server error.' });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Google token is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload['email'];
    const name = payload['name'];

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        password: Math.random().toString(36).slice(-10) + 'A1!',
        role: 'employee',
        status: 'pending',    // Google signups also need approval
        isVerified: true
      });

      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        message: 'Account created. Waiting for admin approval.'
      });
    }

    // Existing user — check status
    if (user.status === 'blocked') {
      return res.status(403).json({ message: 'Your account has been blocked.' });
    }
    if (user.status === 'pending') {
      return res.status(403).json({ message: 'Your account is pending approval.' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Google login error:', error.message);
    res.status(500).json({ message: 'Failed to authenticate with Google' });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 500));
    const skip = (page - 1) * limit;
    const { trash } = req.query;

    // ── FIX: Only managers/admins can view trash ────────────────────────────
    const isTrashRequested = trash === 'true';
    if (isTrashRequested && req.user.role === 'employee') {
      return res.status(403).json({ message: 'Unauthorized access to decommissioned records' });
    }

    const filter = isTrashRequested 
      ? { isDeleted: true } 
      : { isDeleted: { $ne: true } };

    const [users, total] = await Promise.all([
      User.find(filter).select('-password -otp -otpExpires').skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter)
    ]);

    res.json(users);
  } catch (error) {
    console.error('getContacts error:', error.message);
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, pendingUsers, blockedUsers, totalLeads, totalTasks, completedTasks] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'pending' }),
      User.countDocuments({ status: 'blocked' }),
      Lead.countDocuments(),
      Task.countDocuments(),
      Task.countDocuments({ status: 'completed' }),
    ]);

    const pendingTasks = totalTasks - completedTasks;

    const taskDistribution = [
      { name: 'Completed', value: completedTasks },
      { name: 'Pending', value: pendingTasks },
    ];

    res.json({
      totalUsers,
      activeUsers,
      pendingUsers,
      blockedUsers,
      totalLeads,
      totalTasks,
      completedTasks,
      taskDistribution,
      revenue: totalLeads * 100
    });
  } catch (error) {
    console.error('getStats error:', error.message);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
};

// ── Profile Update — role is NEVER accepted ──────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, jobType, bio } = req.body;
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = name || user.name;
      user.phone = phone || user.phone;
      user.jobType = jobType || user.jobType;
      user.bio = bio || user.bio;

      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
        phone: updatedUser.phone,
        jobType: updatedUser.jobType,
        bio: updatedUser.bio,
        isVerified: updatedUser.isVerified
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('updateProfile error:', error.message);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) return res.status(404).json({ message: 'User not found' });

    if (userToDelete._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own administrative account' });
    }

    if (req.user.role !== 'admin') {
      if (req.user.role === 'manager' && userToDelete.managerId?.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
    }

    userToDelete.isDeleted = true;
    userToDelete.deletedAt = Date.now();
    await userToDelete.save();

    res.json({ message: 'User moved to trash' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

exports.restoreUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null });
    res.json({ message: 'User restored' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to restore user' });
  }
};

exports.permanentDeleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // ── FIX: Cloudinary Cleanup (if user has profile pic or something, 
    // but here I'll check for any linked files if I had them)
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User permanently purged' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to purge user' });
  }
};

exports.bulkDeleteUsers = async (req, res) => {
  try {
    const { ids, permanent } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ message: 'Invalid IDs' });

    if (permanent) {
      await User.deleteMany({ _id: { $in: ids } });
      return res.json({ message: 'Users permanently deleted' });
    }

    await User.updateMany({ _id: { $in: ids } }, { isDeleted: true, deletedAt: Date.now() });
    res.json({ message: 'Users moved to trash' });
  } catch (error) {
    res.status(500).json({ message: 'Bulk action failed' });
  }
};


// ── Admin: Approve User ──────────────────────────────────────────────────────
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.status = 'active';
    user.isVerified = true;
    await user.save();

    res.json({ message: `${user.name} has been approved`, user });
  } catch (error) {
    console.error('approveUser error:', error.message);
    res.status(500).json({ message: 'Failed to approve user' });
  }
};

// ── Admin: Reject User (delete pending) ──────────────────────────────────────
exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.status !== 'pending') {
      return res.status(400).json({ message: 'Can only reject pending users' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: `${user.name} has been rejected and removed` });
  } catch (error) {
    console.error('rejectUser error:', error.message);
    res.status(500).json({ message: 'Failed to reject user' });
  }
};

// ── Admin: Block User ────────────────────────────────────────────────────────
exports.blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot block your own account' });
    }

    user.status = 'blocked';
    await user.save();

    res.json({ message: `${user.name} has been blocked` });
  } catch (error) {
    console.error('blockUser error:', error.message);
    res.status(500).json({ message: 'Failed to block user' });
  }
};

// ── Admin: Unblock User ─────────────────────────────────────────────────────
exports.unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.status = 'active';
    await user.save();

    res.json({ message: `${user.name} has been unblocked` });
  } catch (error) {
    console.error('unblockUser error:', error.message);
    res.status(500).json({ message: 'Failed to unblock user' });
  }
};

// ── Admin: Get Pending Users ─────────────────────────────────────────────────
exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'pending' }).select('-password -otp -otpExpires').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('getPendingUsers error:', error.message);
    res.status(500).json({ message: 'Failed to fetch pending users' });
  }
};

// ── Admin: Get Blocked Users ─────────────────────────────────────────────────
exports.getBlockedUsers = async (req, res) => {
  try {
    const users = await User.find({ status: 'blocked' }).select('-password -otp -otpExpires').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('getBlockedUsers error:', error.message);
    res.status(500).json({ message: 'Failed to fetch blocked users' });
  }
};

// ── Get User Profile with Honor Score & Task Stats ───────────────────────────
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -otp -otpExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Fetch task/report stats for this user
    const [totalTasks, completedTasks, onTimeTasks, reports] = await Promise.all([
      Task.countDocuments({ assignedTo: user._id }),
      Task.countDocuments({ assignedTo: user._id, status: 'completed' }),
      Task.countDocuments({
        assignedTo: user._id,
        status: 'completed',
        $expr: { $lte: ['$submissionDate', '$dueDate'] }
      }),
      Report.countDocuments({ employeeId: user._id })
    ]);

    // Compute honor score dynamically
    let score = 50;
    if (totalTasks > 0) {
      const completionRate = completedTasks / totalTasks;
      const onTimeRate = completedTasks > 0 ? onTimeTasks / completedTasks : 0;
      score = Math.round((completionRate * 60) + (onTimeRate * 30) + (Math.min(reports, 10) * 1));
      score = Math.min(100, Math.max(0, score));
    }

    // Update honor score in DB
    await User.updateOne({ _id: user._id }, {
      $set: {
        'honorScore.score': score,
        'honorScore.tasksCompleted': completedTasks,
        'honorScore.tasksOnTime': onTimeTasks,
        'honorScore.tasksLate': completedTasks - onTimeTasks,
        'honorScore.reportsSubmitted': reports,
        'honorScore.lastUpdated': Date.now()
      }
    });

    // Get recent tasks for this user
    const recentTasks = await Task.find({ assignedTo: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('createdBy', 'name');

    res.json({
      ...user.toObject(),
      honorScore: { score, tasksCompleted: completedTasks, tasksOnTime: onTimeTasks, tasksLate: completedTasks - onTimeTasks, reportsSubmitted: reports },
      totalTasks,
      recentTasks
    });
  } catch (error) {
    console.error('getUserProfile error:', error.message);
    res.status(500).json({ message: 'Failed to fetch user profile' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -otp -otpExpires');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for new notifications
    const Announcement = require('../models/Announcement');
    const Task = require('../models/Task');
    const [hasNewAnnouncements, hasNewTasks] = await Promise.all([
      Announcement.exists({ createdAt: { $gt: user.lastReadAnnouncementsAt || 0 } }),
      Task.exists({ assignedTo: user._id, createdAt: { $gt: user.lastReadTasksAt || 0 } })
    ]);

    res.json({
      ...user.toObject(),
      hasNewAnnouncements: !!hasNewAnnouncements,
      hasNewTasks: !!hasNewTasks
    });
  } catch (error) {
    console.error('getMe error:', error.message);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { type, field, mode: bodyMode } = req.body;
    const mode = type || field || bodyMode;
    const update = {};
    if (mode === 'tasks') update.lastReadTasksAt = Date.now();
    else if (mode === 'announcements') update.lastReadAnnouncementsAt = Date.now();
    else return res.status(400).json({ message: 'Invalid type/field' });

    await User.findByIdAndUpdate(req.user.id, update);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('markRead error:', error.message);
    res.status(500).json({ message: 'Failed to mark as read' });
  }
};

// ── Admin: Get Trashed Users ─────────────────────────────────────────────────
exports.getTrashedUsers = async (req, res) => {
  try {
    const users = await User.find({ isDeleted: true })
      .select('-password -otp -otpExpires')
      .sort({ deletedAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('getTrashedUsers error:', error.message);
    res.status(500).json({ message: 'Failed to fetch trashed users' });
  }
};

// ── Admin: Export Employee Data (JSON → frontend converts to Excel) ───────────
exports.exportEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await User.findById(id).select('-password -otp -otpExpires');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Fetch all tasks for this employee
    const tasks = await Task.find({ assignedTo: id })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name');

    const reports = await Report.find({ employeeId: id })
      .sort({ date: -1 })
      .limit(50);

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    const onTimeTasks = completedTasks.filter(t =>
      t.submissionDate && t.dueDate && new Date(t.submissionDate) <= new Date(t.dueDate)
    );

    const score = tasks.length > 0
      ? Math.round(
          (completedTasks.length / tasks.length) * 60 +
          (completedTasks.length > 0 ? onTimeTasks.length / completedTasks.length : 0) * 30 +
          Math.min(reports.length, 10) * 1
        )
      : 0;

    res.json({
      profile: {
        name: employee.name,
        email: employee.email,
        phone: employee.phone || 'N/A',
        role: employee.role,
        status: employee.status,
        joinedAt: employee.createdAt,
        bio: employee.bio || 'N/A',
      },
      stats: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
        onTimeTasks: onTimeTasks.length,
        reportsSubmitted: reports.length,
        honorScore: score,
      },
      completedTasks: completedTasks.map(t => ({
        title: t.title,
        description: t.description || '',
        priority: t.priority,
        dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A',
        submittedAt: t.submissionDate ? new Date(t.submissionDate).toLocaleDateString() : 'N/A',
        status: t.status,
        submission: t.submission || '',
      })),
      pendingTasks: pendingTasks.map(t => ({
        title: t.title,
        description: t.description || '',
        priority: t.priority,
        dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A',
        status: t.status,
      })),
      reports: reports.map(r => ({
        title: r.title,
        content: r.content,
        submittedAt: r.date ? new Date(r.date).toLocaleDateString() : 'N/A',
      })),
    });
  } catch (error) {
    console.error('exportEmployee error:', error.message);
    res.status(500).json({ message: 'Failed to export employee data' });
  }
};
