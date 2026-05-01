const express = require('express');
const {
  register, login, getMe, verifyOTP, createEmployee, deleteUser,
  employeeRegister, googleLogin, getContacts, getStats, updateProfile,
  bulkDeleteUsers, approveUser, rejectUser, blockUser, unblockUser,
  getPendingUsers, getBlockedUsers, getUserProfile, markRead, logout,
  restoreUser, permanentDeleteUser, getTrashedUsers, exportEmployee, guestLogin
} = require('../controllers/authController');
const { protect, optionalProtect, manager, admin } = require('../middleware/authMiddleware');
const router = express.Router();

// ── Public Routes ────────────────────────────────────────────────────────────
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/employee-register', employeeRegister);
router.post('/google-login', googleLogin);
router.post('/logout', logout);
router.post('/guest-login', guestLogin);

// Admin-only registration (used by admin to create employees directly)
router.post('/register', protect, admin, register);

// ── Protected Routes (any authenticated user) ─────────────────────────────────
router.get('/me', protect, getMe);
router.post('/mark-read', protect, markRead);
router.put('/update-profile', protect, updateProfile);
router.get('/contacts', protect, getContacts);
router.get('/stats', protect, getStats);
router.get('/profile/:id', protect, getUserProfile);

// Admin creates employee directly (no approval flow)
router.post('/create-employee', protect, admin, createEmployee);

// ── Admin/Manager: User Management ──────────────────────────────────────────
router.get('/pending', protect, manager, getPendingUsers);
router.get('/blocked', protect, manager, getBlockedUsers);
router.get('/trash', protect, admin, getTrashedUsers);

router.put('/:id/approve', protect, manager, approveUser);
router.put('/:id/reject', protect, manager, rejectUser);
router.put('/:id/block', protect, manager, blockUser);
router.put('/:id/unblock', protect, manager, unblockUser);
router.put('/:id/restore', protect, admin, restoreUser);
router.delete('/:id/permanent', protect, admin, permanentDeleteUser);
router.post('/bulk-delete', protect, manager, bulkDeleteUsers);

// ── Admin: Export employee data as structured JSON → frontend creates Excel ──
router.get('/:id/export', protect, admin, exportEmployee);

// Soft delete (move to trash)
router.delete('/:id', protect, manager, deleteUser);

module.exports = router;
