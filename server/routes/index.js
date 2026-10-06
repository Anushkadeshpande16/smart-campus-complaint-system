const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const auth = require('../controllers/authController');
const cc = require('../controllers/complaintController');
const nc = require('../controllers/notificationController');
const ac = require('../controllers/adminController');
const an = require('../controllers/analyticsController');
const { meta } = require('../controllers/metaController');

const ADMIN = authorize('ADMIN'), STUDENT = authorize('STUDENT');

// Auth
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.get('/auth/me', authenticate, auth.me);
router.put('/auth/me', authenticate, auth.updateMe);
router.put('/auth/password', authenticate, auth.changePassword);

router.get('/meta', authenticate, meta);

// Complaints
router.get('/complaints', authenticate, cc.list);
router.post('/complaints', authenticate, STUDENT, uploadSingle('photo'), cc.create);
router.get('/complaints/duplicates', authenticate, STUDENT, cc.duplicates);
router.get('/complaints/:id', authenticate, cc.getOne);
router.put('/complaints/:id', authenticate, ADMIN, cc.update);
router.post('/complaints/:id/assign', authenticate, ADMIN, cc.assign);
router.post('/complaints/:id/status', authenticate, authorize('ADMIN', 'STAFF'), uploadSingle('proof'), cc.changeStatus);
router.post('/complaints/:id/escalate', authenticate, ADMIN, cc.escalate);
router.post('/complaints/:id/reopen', authenticate, STUDENT, cc.reopen);
router.post('/complaints/:id/confirm', authenticate, STUDENT, cc.confirm);
router.post('/complaints/:id/feedback', authenticate, STUDENT, cc.feedback);
router.post('/complaints/:id/support', authenticate, STUDENT, cc.support);

// Notifications
router.get('/notifications', authenticate, nc.list);
router.post('/notifications/read-all', authenticate, nc.markAllRead);
router.put('/notifications/:id/read', authenticate, nc.markRead);

// Analytics (admin)
['overview', 'categories', 'priorities', 'statuses', 'locations', 'timeline', 'overdue'].forEach((k) =>
  router.get(`/analytics/${k}`, authenticate, ADMIN, an[k]));

// Admin management
router.get('/admin/staff', authenticate, ADMIN, ac.listStaff);
router.post('/admin/staff', authenticate, ADMIN, ac.createStaff);
router.put('/admin/staff/:id', authenticate, ADMIN, ac.updateStaff);
router.post('/admin/categories', authenticate, ADMIN, ac.createCategory);
router.put('/admin/categories/:id', authenticate, ADMIN, ac.updateCategory);
router.delete('/admin/categories/:id', authenticate, ADMIN, ac.deleteCategory);
router.post('/admin/locations', authenticate, ADMIN, ac.createLocation);
router.put('/admin/locations/:id', authenticate, ADMIN, ac.updateLocation);
router.delete('/admin/locations/:id', authenticate, ADMIN, ac.deleteLocation);
router.put('/admin/sla', authenticate, ADMIN, ac.updateSla);

module.exports = router;
