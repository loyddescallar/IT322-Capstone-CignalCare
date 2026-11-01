const express=require('express');const router=express.Router();const {authRequired,requireRole}=require('../middleware/auth');const c=require('../controllers/incidentController');
router.get('/my',authRequired,requireRole('user'),c.getMyIncidents);
router.get('/admin',authRequired,requireRole('admin'),c.listAdminIncidents);
router.post('/admin/detect',authRequired,requireRole('admin'),c.detectAdminIncidentCandidates);
router.patch('/admin/:id/confirm',authRequired,requireRole('admin'),c.confirmAdminIncident);
router.patch('/admin/:id/dismiss',authRequired,requireRole('admin'),c.dismissAdminIncident);
router.patch('/admin/:id/resolve',authRequired,requireRole('admin'),c.resolveAdminIncident);
module.exports=router;
