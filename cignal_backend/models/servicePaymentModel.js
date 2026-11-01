'use strict';
const pool = require('../config/db');
const { serviceFingerprint } = require('../utils/servicePaymentRules');

function idempotencyConflict() {
  const error = new Error('This service transaction request ID was already used with different details. Review sales history.');
  error.code = 'SERVICE_IDEMPOTENCY_CONFLICT';
  return error;
}

async function recordServicePayment({ customer, payment, referenceNo, processedBy }) {
  const connection = await pool.getConnection();
  const fingerprint = serviceFingerprint(payment, customer.id);
  try {
    await connection.beginTransaction();
    const [existing] = await connection.query(
      'SELECT * FROM service_payments WHERE reference_no = ? LIMIT 1 FOR UPDATE', [referenceNo]
    );
    if (existing[0]) {
      if (existing[0].request_hash !== fingerprint) throw idempotencyConflict();
      await connection.commit();
      return { payment: existing[0], replayed: true };
    }
    if (payment.paymentMethod === 'GCash') {
      const [duplicates] = await connection.query(
        'SELECT reference_no FROM service_payments WHERE payment_method = ? AND external_reference = ? LIMIT 1',
        ['GCash', payment.externalReference]
      );
      if (duplicates.length) {
        const err = new Error('This GCash reference has already been recorded. Check Completed Sales.');
        err.code = 'SERVICE_IDEMPOTENCY_CONFLICT';
        throw err;
      }
    }
    if (payment.technicianRequestId) {
      const [requests] = await connection.query(
        'SELECT id, status FROM technician_requests WHERE id = ? AND user_id = ? LIMIT 1',
        [payment.technicianRequestId, customer.id]
      );
      if (!requests[0]) {
        const error = new Error('Technician request does not belong to this subscriber.');
        error.code = 'SERVICE_BAD_REQUEST';
        throw error;
      }
    }
    const [insert] = await connection.query(
      `INSERT INTO service_payments
       (reference_no, request_hash, user_id, account_number, account_name, service_type,
        description, amount, payment_method, external_reference, technician_request_id, processed_by, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [referenceNo, fingerprint, customer.id, customer.accountNumber, customer.accountName,
       payment.serviceType, payment.description || null, payment.amount, payment.paymentMethod,
       payment.externalReference || null, payment.technicianRequestId, processedBy, payment.transactionDate]
    );
    await connection.commit();
    return { payment: { id: insert.insertId, reference_no: referenceNo, ...payment, account_number: customer.accountNumber, account_name: customer.accountName }, replayed: false };
  } catch (error) {
    await connection.rollback();
    // Another writer can win the same unique-reference race. Re-read after rollback.
    if (['ER_DUP_ENTRY', '23505'].includes(error.code) || error.pgCode === '23505') {
      const [existing] = await pool.query('SELECT * FROM service_payments WHERE reference_no = ? LIMIT 1', [referenceNo]);
      if (existing[0] && existing[0].request_hash === fingerprint) {
        return { payment: existing[0], replayed: true };
      }
      throw idempotencyConflict();
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function listServicePayments({ from, to, accountNumber, paymentMethod, serviceType, page, pageSize }) {
  const terms = [];
  const values = [];
  if (from) { terms.push('transaction_date >= ?'); values.push(from); }
  if (to) { terms.push('transaction_date <= ?'); values.push(to); }
  if (accountNumber) { terms.push('account_number = ?'); values.push(accountNumber); }
  if (paymentMethod && paymentMethod !== 'All') { terms.push('payment_method = ?'); values.push(paymentMethod); }
  if (serviceType && serviceType !== 'All') { terms.push('service_type = ?'); values.push(serviceType); }
  const where = terms.length ? 'WHERE ' + terms.join(' AND ') : '';
  const [totals] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS revenue FROM service_payments ${where}`, values
  );
  const [rows] = await pool.query(
    `SELECT id, reference_no, user_id, account_number, account_name, service_type, description,
            amount, payment_method, external_reference, technician_request_id, processed_by, transaction_date
     FROM service_payments ${where} ORDER BY transaction_date DESC, id DESC LIMIT ? OFFSET ?`,
    [...values, pageSize, (page - 1) * pageSize]
  );
  const total = Number(totals[0]?.total || 0);
  return {
    transactions: rows,
    summary: { transactions: total, revenue: Number(totals[0]?.revenue || 0) },
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

async function listSubscriberTechnicianRequests(userId) {
  const [rows] = await pool.query(
    `SELECT id, status, issueDescription, created_at
       FROM technician_requests WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 30`, [userId]
  );
  return rows;
}
module.exports = { recordServicePayment, listServicePayments, listSubscriberTechnicianRequests };
