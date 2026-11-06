'use strict';
const pool = require('../config/db');
const { assertSchema } = require('../utils/schemaSafety');
const { normalizeServicePayment, serviceReferenceFromKey, manilaDateBounds, METHODS, SERVICE_TYPES } = require('../utils/servicePaymentRules');
const { recordServicePayment, listServicePayments, listSubscriberTechnicianRequests } = require('../models/servicePaymentModel');

async function ensureServiceSchema() { await assertSchema(pool, 'service_payments'); }

async function resolveSubscriber(accountNumber) {
  const [rows] = await pool.query(
    `SELECT id, accountName, accountNumber, status FROM users
      WHERE accountNumber = ? AND role = 'user' LIMIT 1`, [accountNumber]
  );
  return rows[0] || null;
}

async function createServicePayment(req, res) {
  const parsed = normalizeServicePayment(req.body);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const referenceNo = serviceReferenceFromKey(req.headers['idempotency-key']);
  if (!referenceNo) return res.status(400).json({ error: 'A valid Idempotency-Key UUID header is required.' });
  if (req.body?.paymentConfirmed !== true || req.body?.serviceCompleted !== true) {
    return res.status(400).json({ error: 'Staff must confirm both service completion and payment receipt.' });
  }
  try {
    await ensureServiceSchema();
    const customer = await resolveSubscriber(parsed.value.accountNumber);
    if (!customer || customer.status !== 'active') return res.status(404).json({ error: 'Active subscriber account not found.' });
    const result = await recordServicePayment({
      customer, payment: parsed.value, referenceNo, processedBy: req.user?.accountName || 'Admin',
    });
    return res.status(result.replayed ? 200 : 201).json({
      message: result.replayed ? 'Existing service payment confirmed.' : 'Service payment recorded.',
      replayed: result.replayed,
      referenceNo,
      payment: result.payment,
    });
  } catch (error) {
    if (error.code === 'SERVICE_BAD_REQUEST') return res.status(400).json({ error: error.message });
    if (error.code === 'SERVICE_IDEMPOTENCY_CONFLICT') return res.status(409).json({ error: error.message });
    if (error.code === 'SCHEMA_NOT_READY') return res.status(503).json({ error: 'Service payments require the database migration. Contact the administrator.' });
    console.error('SERVICE PAYMENT SAVE ERROR:', error?.message);
    return res.status(500).json({ error: 'Unable to record service payment.' });
  }
}

async function getServicePayments(req, res) {
  const from = String(req.query.from || '').trim(), to = String(req.query.to || '').trim();
  const bounds = manilaDateBounds(from, to);
  if (!bounds) return res.status(400).json({ error: 'Invalid date range.' });
  const accountNumber = String(req.query.accountNumber || '').trim();
  const accountSearch = String(req.query.accountSearch || '').trim();
  const paymentMethod = String(req.query.paymentMethod || 'All').trim();
  const serviceType = String(req.query.serviceType || 'All').trim();
  if ((accountNumber && !/^\d{1,9}$/.test(accountNumber)) ||
      (accountSearch && !/^\d{1,9}$/.test(accountSearch)) ||
      (accountNumber && accountSearch) ||
      (paymentMethod !== 'All' && !METHODS.includes(paymentMethod)) ||
      (serviceType !== 'All' && !SERVICE_TYPES.includes(serviceType))) {
    return res.status(400).json({ error: 'Invalid service sales filter.' });
  }
  const rawPage = req.query.page == null ? '1' : String(req.query.page);
  const rawSize = req.query.pageSize == null ? '25' : String(req.query.pageSize);
  if (!/^\d{1,6}$/.test(rawPage) || !/^\d{1,3}$/.test(rawSize) || Number(rawSize) > 100 || Number(rawSize) < 1 || Number(rawPage) < 1 || Number(rawPage) > 1000000) {
    return res.status(400).json({ error: 'Invalid pagination.' });
  }
  const page = Number(rawPage), pageSize = Number(rawSize);
  try {
    await ensureServiceSchema();
    return res.json(await listServicePayments({
      from: bounds.startDate, to: bounds.endDate,
      accountNumber, accountSearch, paymentMethod, serviceType, page, pageSize,
    }));
  } catch (error) {
    console.error('SERVICE PAYMENT LIST ERROR:', error?.message);
    return res.status(error.code === 'SCHEMA_NOT_READY' ? 503 : 500).json({ error: 'Service sales history unavailable. Verify database migration.' });
  }
}

async function getServiceSubscriberRequests(req, res) {
  const accountNumber = String(req.query.accountNumber || '').trim();
  if (!/^\d{1,9}$/.test(accountNumber)) return res.status(400).json({ error: 'Valid account number required.' });
  try {
    await ensureServiceSchema();
    const customer = await resolveSubscriber(accountNumber);
    if (!customer) return res.status(404).json({ error: 'Subscriber not found.' });
    return res.json({ requests: await listSubscriberTechnicianRequests(customer.id) });
  } catch (error) {
    console.error('SERVICE LINKED REQUESTS ERROR:', error?.message);
    return res.status(503).json({ error: 'Technician request lookup unavailable.' });
  }
}
module.exports = { createServicePayment, getServicePayments, getServiceSubscriberRequests };
