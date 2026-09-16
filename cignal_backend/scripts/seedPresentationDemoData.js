const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/db');
const { hashRecoveryCode } = require('../utils/subscriberAccount');
const { getCurrentTermsVersion } = require('../utils/termsConfig');

const DEMO_MARKER = 'CIGNALCARE_DEMO_SEED_2026';
const LOCAL_DEMO_PASSWORD = 'CignalDemo#2026';
const TERMS_VERSION = getCurrentTermsVersion();
const ACCOUNT_START = 50000001;
const CCA_START = 78000000001;
const USER_COUNT = 100;
const PRODUCTION_CONFIRMATION = 'CIGNALCARE_PRESENTATION_DEMO_2026';


function isHighRiskDatabase() {
  return (
    pool.driver === 'postgres' ||
    String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production'
  );
}

function getDemoPassword() {
  const configured = String(process.env.PRESENTATION_DEMO_PASSWORD || '').trim();
  if (!isHighRiskDatabase()) return configured || LOCAL_DEMO_PASSWORD;

  if (configured.length < 12 || configured === LOCAL_DEMO_PASSWORD) {
    throw new Error(
      'Production/PostgreSQL presentation seeding requires a private PRESENTATION_DEMO_PASSWORD ' +
      'of at least 12 characters that is different from the public local demo password.'
    );
  }
  return configured;
}

function getRecoveryCodePrefix() {
  const configured = String(process.env.PRESENTATION_DEMO_RECOVERY_PREFIX || '').trim();
  if (!isHighRiskDatabase()) return configured || 'DEMO';

  const normalized = configured.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (normalized.length < 8 || normalized === 'DEMO') {
    throw new Error(
      'Production/PostgreSQL presentation seeding requires a private ' +
      'PRESENTATION_DEMO_RECOVERY_PREFIX of at least 8 letters/numbers.'
    );
  }
  return normalized;
}

function envEnabled(name) {
  return String(process.env[name] || '').trim().toLowerCase() === 'true';
}

function assertDemoExecutionAllowed() {
  if (!isHighRiskDatabase()) return;

  const explicitlyAllowed = envEnabled('ALLOW_PRESENTATION_DEMO_DATA');
  const confirmation =
    String(process.env.DEMO_DATA_CONFIRMATION || '').trim() === PRODUCTION_CONFIRMATION;

  if (!explicitlyAllowed || !confirmation) {
    throw new Error(
      'Presentation demo seeding is blocked on PostgreSQL/production. ' +
      'Only enable it intentionally by setting ALLOW_PRESENTATION_DEMO_DATA=true ' +
      `and DEMO_DATA_CONFIRMATION=${PRODUCTION_CONFIRMATION}.`
    );
  }
}

async function ensureDemoRegistry(conn) {
  await q(conn, `CREATE TABLE IF NOT EXISTS presentation_demo_registry (
    seed_tag VARCHAR(80) NOT NULL,
    user_id INTEGER NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (seed_tag, user_id)
  )`);
}

const names = [
  'Marites Santos','Boyet Reyes','Junjun Bautista','Bebang Mendoza','Inday Flores','Dodong Ramos','Totoy Garcia','Kulas Navarro','Nene Dela Cruz','Tonton Villanueva',
  'Maria Lourdes Aquino','Jose Miguel Castillo','Ana Marie Torres','Carlo Mendoza','Jennylyn Cruz','Ramon Bautista','Liza Mae Garcia','Mark Anthony Reyes','Sheila Santos','Paolo Navarro',
  'Rosalie Villamor','Christian Lopez','Mary Grace Domingo','Jayson Hernandez','Angelica Ramos','Renato Flores','Cherry Mae Dizon','Francis Mercado','Joana Salazar','Dennis Manalo',
  'Myrna Castillo','Alvin Macaraig','Cristina Perez','Jerome Mendoza','Rhea Bautista','Noel Garcia','Janine Dela Cruz','Victor Ramos','Aileen Santos','Rodel Navarro',
  'Mercy Villanueva','Arnel Torres','Donna Aquino','Gilbert Reyes','Mylene Flores','Eduardo Cruz','Karen Bautista','Ronald Garcia','Michelle Santos','Edgar Mendoza',
  'Jocelyn Ramos','Rommel Dela Cruz','Melanie Navarro','Dennis Bautista','Rosanna Garcia','Allan Santos','Mae Ann Reyes','Rogelio Flores','Catherine Mendoza','Joel Aquino',
  'Lorna Castillo','Erwin Torres','Bernadette Cruz','Michael Ramos','Evelyn Navarro','Richard Bautista','Grace Garcia','Nelson Santos','Arlene Reyes','Samuel Mendoza',
  'Fe Villanueva','Jun Mercado','Gina Salazar','Rico Manalo','Daisy Perez','Nestor Domingo','Ruby Dizon','Arnold Lopez','Maribel Hernandez','Rene Macaraig',
  'Aling Nena Santos','Mang Bert Reyes','Jhemerlyn Bautista','Bongbong Mendoza','Tisay Flores','Junjun Ramos Jr.','Bebot Garcia','Kikay Navarro','Kuya Jun Dela Cruz','Ate Maring Villanueva',
  'Clarissa Aquino','Anthony Castillo','Precious Torres','Ryan Mendoza','Lovely Cruz','Joshua Bautista','Kristine Garcia','Patrick Reyes','Camille Santos','Nathaniel Navarro'
];

const balayanAddress = [
  'Brgy. Poblacion, Balayan, Batangas',
  'Brgy. Caloocan, Balayan, Batangas',
  'Brgy. Dalig, Balayan, Batangas',
  'Brgy. Sampaga, Balayan, Batangas',
  'Brgy. Duhatan, Balayan, Batangas'
];
const lianAddress = [
  'Brgy. Poblacion, Lian, Batangas',
  'Brgy. Matabungkay, Lian, Batangas',
  'Brgy. Binubusan, Lian, Batangas',
  'Brgy. Kapito, Lian, Batangas',
  'Brgy. Lumaniag, Lian, Batangas'
];

const issues = [
  { id: 'weak_signal', label: 'Weak / Pixelated Signal', category: 'Connection Issue', subject: 'Weak Signal / Pixelated picture', model: 'Arion HD Cardless Zapper' },
  { id: 'no_signal', label: 'No Signal', category: 'Technical Problem', subject: 'No Signal on TV screen', model: 'Changhong Silver HD' },
  { id: 'missing_channels', label: 'Missing / No Channels', category: 'Channel Concern', subject: 'Missing channels after restart', model: 'Pace HD' },
  { id: 'black_screen', label: 'Black Screen', category: 'Technical Problem', subject: 'Black Screen on receiver output', model: 'Humax HD' },
  { id: 'remote_issue', label: 'Remote Control Issue', category: 'Device Concern', subject: 'Remote control not responding', model: 'Samsung HD' },
  { id: 'receiver_error', label: 'Receiver Error', category: 'Technical Problem', subject: 'Receiver Error E1 / E2 / E11', model: 'GIEC HD' },
];

function makeRng(seed = 20260914) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
const rng = makeRng();
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const pad = (n, size = 3) => String(n).padStart(size, '0');
const accountFor = (i) => String(ACCOUNT_START + i);
const ccaFor = (i) => String(CCA_START + i);
const phoneFor = (i) => `0991${String(1000000 + i).slice(-7)}`;
const recoveryCodeFor = (i, prefix = 'DEMO') =>
  prefix === 'DEMO' ? `DEMO-${pad(i + 1, 4)}-2026-TEST` : `${prefix}-${pad(i + 1, 4)}`;

function ago({ days = 0, hours = 0, minutes = 0 }) {
  return new Date(Date.now() - (((days * 24 + hours) * 60 + minutes) * 60 * 1000));
}
function plusDays(date, days) {
  return new Date(new Date(date).getTime() + days * 86400000);
}
function randomRecent(daysMax, minHours = 0) {
  const days = Math.floor(rng() * Math.max(1, daysMax));
  const hours = minHours + Math.floor(rng() * Math.max(1, 24 - minHours));
  const minutes = Math.floor(rng() * 60);
  return ago({ days, hours, minutes });
}
function demoUuid(prefix, i) {
  const hash = crypto.createHash('md5').update(`${prefix}-${i}`).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}

async function q(conn, sql, params = []) {
  return conn.query(sql, params);
}

async function assertClean(conn) {
  const [existing] = await q(conn,
    `SELECT id, accountNumber, ccaNumber
     FROM users
     WHERE (accountNumber >= ? AND accountNumber <= ?)
        OR (ccaNumber >= ? AND ccaNumber <= ?)
     LIMIT 1`,
    [
      String(ACCOUNT_START),
      String(ACCOUNT_START + USER_COUNT - 1),
      String(CCA_START),
      String(CCA_START + USER_COUNT - 1),
    ]
  );
  if (existing.length) {
    throw new Error(
      `Demo Account/CCA range collides with an existing subscriber ` +
      `(Account: ${existing[0].accountNumber || 'n/a'}, CCA: ${existing[0].ccaNumber || 'n/a'}). ` +
      'Run cleanup only if these are registered demo records; otherwise choose a different reserved demo range.'
    );
  }
}

async function seed() {
  assertDemoExecutionAllowed();
  const conn = await pool.getConnection();
  const demoPassword = getDemoPassword();
  const recoveryPrefix = getRecoveryCodePrefix();
  const passwordHash = await bcrypt.hash(demoPassword, 10);
  const summary = {
    users: 0, transactions: 0, posTransactions: 0, paymongoTransactions: 0,
    loadRequests: 0, troubleshootSessions: 0, tickets: 0, ticketMessages: 0,
    technicianRequests: 0, notifications: 0, incidents: 0,
  };

  try {
    await conn.beginTransaction();
    await ensureDemoRegistry(conn);
    await assertClean(conn);

    const [planRows] = await q(conn,
      `SELECT id, plan_name, amount, validity_days FROM prepaid_plans
       WHERE status='active' AND amount IN (200,300,450,500,600,800,1000)
       ORDER BY amount ASC`
    );
    if (planRows.length < 5) throw new Error('Not enough standard active prepaid plans. Expected Load 200–1000 plans.');

    const [adminRows] = await q(conn, `SELECT id FROM users WHERE role='admin' ORDER BY id ASC LIMIT 1`);
    const adminId = adminRows[0]?.id || null;

    const users = [];
    for (let i = 0; i < USER_COUNT; i += 1) {
      const location = i < 50 ? 'Balayan' : 'Lian';
      const addressPool = location === 'Balayan' ? balayanAddress : lianAddress;
      const createdAt = ago({ days: 45 + Math.floor(rng() * 120), hours: Math.floor(rng() * 20) });
      const accountNumber = accountFor(i);
      const ccaNumber = ccaFor(i);
      const recoveryCode = recoveryCodeFor(i, recoveryPrefix);

      const [result] = await q(conn,
        `INSERT INTO users
         (accountName,accountNumber,ccaNumber,address,phone,location,email,password_hash,must_change_password,
          recovery_code_hash,recovery_code_issued_at,auth_session_version,terms_version,terms_accepted_at,
          role,status,created_at)
         VALUES (?,?,?,?,?,?,NULL,?,0,?,?,1,?,?,'user','active',?)`,
        [names[i], accountNumber, ccaNumber, addressPool[i % addressPool.length], phoneFor(i), location,
         passwordHash, hashRecoveryCode(recoveryCode), createdAt, TERMS_VERSION, createdAt, createdAt]
      );
      users.push({ id: result.insertId, index: i, name: names[i], accountNumber, ccaNumber, location, phone: phoneFor(i), address: addressPool[i % addressPool.length], recoveryCode });
      await q(
        conn,
        `INSERT INTO presentation_demo_registry (seed_tag,user_id,account_number)
         VALUES (?,?,?)`,
        [DEMO_MARKER, result.insertId, accountNumber]
      );
      summary.users += 1;

      await q(conn,
        `INSERT INTO notifications (user_id,account_number,type,message,is_read,created_at)
         VALUES (?,?, 'welcome', ?, ?, ?)`,
        [result.insertId, accountNumber, `Welcome to CignalCare+, ${names[i]}. Your demo subscriber account is ready.`, i % 3 === 0 ? 0 : 1, createdAt]
      );
      summary.notifications += 1;
    }

    // 80 users have completed prepaid activity; the remaining 20 are intentionally inactive.
    const latestSale = new Map();
    let txCounter = 0;
    for (let i = 0; i < 80; i += 1) {
      const user = users[i];
      const saleCount = i < 25 ? 2 : 1;
      for (let j = 0; j < saleCount; j += 1) {
        const plan = planRows[(i + j * 2) % planRows.length];
        let txDate;
        if (txCounter < 10) txDate = ago({ hours: 1 + txCounter, minutes: (txCounter * 7) % 60 });
        else if (i < 60) txDate = randomRecent(27);
        else txDate = ago({ days: 32 + ((i + j) % 14), hours: 2 + (i % 10) });

        const isPos = txCounter % 5 < 3;
        const ref = isPos
          ? `POS-DEMO-${user.accountNumber}-${pad(j + 1, 2)}-${pad(txCounter + 1, 3)}`
          : `PM-DEMO-${user.accountNumber}-${pad(j + 1, 2)}-${pad(txCounter + 1, 3)}`;
        const paymentMethod = isPos ? ['Cash','GCash','Maya','Bank Transfer'][txCounter % 4] : 'PayMongo';
        const expiry = plusDays(txDate, Number(plan.validity_days || 30));

        await q(conn,
          `INSERT INTO prepaid_transactions
           (reference_no,user_id,account_number,account_name,plan_id,amount,payment_method,processed_by,
            transaction_date,validity_days,expiry_date,status,created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,'completed',?)`,
          [ref,user.id,user.accountNumber,user.name,plan.id,plan.amount,paymentMethod,isPos ? 'Admin POS' : 'admin',txDate,Number(plan.validity_days || 30),expiry,txDate]
        );
        summary.transactions += 1;
        if (isPos) summary.posTransactions += 1; else summary.paymongoTransactions += 1;

        await q(conn,
          `INSERT INTO load_history (user_id,accountNumber,loadAmount,description,status,created_at)
           VALUES (?,?,?,?, 'completed', ?)`,
          [user.id,user.accountNumber,plan.amount,`${isPos ? 'POS' : 'PayMongo'} ${plan.plan_name} demo transaction`,txDate]
        );

        if (!isPos) {
          const fee = Number((Number(plan.amount) * 0.015).toFixed(2));
          await q(conn,
            `INSERT INTO load_requests
             (user_id,plan_id,account_number,account_name,plan_name,amount,payment_method,payment_status,reference_no,
              paymongo_checkout_session_id,paymongo_payment_intent_id,paymongo_payment_id,paymongo_payment_method,
              paymongo_fee,paymongo_net_amount,payment_completed_at,fulfilled_at,diagnostic_result,status,location,admin_note,created_at,updated_at)
             VALUES (?,?,?,?,?,?,'PayMongo','paid',?,?,?,?, 'qrph',?,?,?,?,'channel_1_ok','Completed',?, ?, ?, ?)`,
            [user.id,plan.id,user.accountNumber,user.name,plan.plan_name,plan.amount,ref,
             `cs_demo_${user.accountNumber}_${txCounter}`,`pi_demo_${user.accountNumber}_${txCounter}`,`pay_demo_${user.accountNumber}_${txCounter}`,
             fee,Number(plan.amount)-fee,txDate,new Date(txDate.getTime()+60000),user.location,`${DEMO_MARKER}: completed online load`,txDate,new Date(txDate.getTime()+60000)]
          );
          summary.loadRequests += 1;
        }

        const prev = latestSale.get(user.id);
        if (!prev || txDate > prev.txDate) latestSale.set(user.id, { txDate, expiry, plan });
        txCounter += 1;
      }
    }

    // Every demo subscriber gets a prepaid account record so Quick Prepaid Inquiry has a meaningful result.
    for (const user of users) {
      const latest = latestSale.get(user.id);
      if (latest) {
        const status = latest.expiry > new Date() ? 'active' : 'expired';
        await q(conn,
          `INSERT INTO prepaid_accounts
           (user_id,account_number,account_name,current_plan_id,last_load_amount,last_load_date,expiry_date,status,created_at)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [user.id,user.accountNumber,user.name,latest.plan.id,latest.plan.amount,latest.txDate,latest.expiry,status,latest.txDate]
        );
        await q(conn,
          `INSERT INTO notifications (user_id,account_number,type,message,is_read,created_at)
           VALUES (?,?, 'load_completed', ?, ?, ?)`,
          [user.id,user.accountNumber,`${latest.plan.plan_name} was successfully loaded to your demo account.`,user.index % 4 === 0 ? 0 : 1,latest.txDate]
        );
        summary.notifications += 1;
      } else {
        await q(conn,
          `INSERT INTO prepaid_accounts
           (user_id,account_number,account_name,current_plan_id,last_load_amount,last_load_date,expiry_date,status,created_at)
           VALUES (?,?,?,NULL,0,NULL,NULL,'inactive',?)`,
          [user.id,user.accountNumber,user.name,ago({ days: 60 })]
        );
      }
    }

    // 55 troubleshooting sessions; 40 resolved, 15 unresolved.
    const modes = ['full','quick_restart','factory_reset','video'];
    for (let s = 0; s < 55; s += 1) {
      const user = users[45 + s];
      const issue = user.location === 'Balayan' && s % 3 === 0 ? issues[0] : issues[(s + 1) % issues.length];
      const sessionId = `DEMO-TS-${pad(s + 1, 3)}`;
      const supportMode = modes[s % modes.length];
      const terminalAt = s < 4 ? ago({ hours: 4 + s }) : randomRecent(21);
      const startedAt = new Date(terminalAt.getTime() - (8 + (s % 22)) * 60000);
      const resolved = s < 40;

      await q(conn,
        `INSERT INTO troubleshoot_outcomes
         (id,user_id,account_number,location,model_id,model_name,issue_id,issue_label,outcome,session_id,support_mode,is_final,video_watched,steps_completed,total_steps,last_step_id,created_at)
         VALUES (?,?,?,?,?,?,?,?, 'started',?,?,0,0,0,4,NULL,?)`,
        [demoUuid('start',s),user.id,user.accountNumber,user.location,`model_${(s%8)+1}`,issue.model,issue.id,issue.label,sessionId,supportMode,startedAt]
      );
      if (supportMode === 'video') {
        await q(conn,
          `INSERT INTO troubleshoot_outcomes
           (id,user_id,account_number,location,model_id,model_name,issue_id,issue_label,outcome,session_id,support_mode,is_final,video_watched,steps_completed,total_steps,last_step_id,created_at)
           VALUES (?,?,?,?,?,?,?,?, 'viewed',?,?,0,1,1,4,'video',?)`,
          [demoUuid('viewed',s),user.id,user.accountNumber,user.location,`model_${(s%8)+1}`,issue.model,issue.id,issue.label,sessionId,supportMode,new Date(startedAt.getTime()+3*60000)]
        );
      }
      await q(conn,
        `INSERT INTO troubleshoot_outcomes
         (id,user_id,account_number,location,model_id,model_name,issue_id,issue_label,outcome,session_id,support_mode,is_final,video_watched,steps_completed,total_steps,last_step_id,created_at)
         VALUES (?,?,?,?,?,?,?,?, ?,?,?,1,?,?,4,'final',?)`,
        [demoUuid('final',s),user.id,user.accountNumber,user.location,`model_${(s%8)+1}`,issue.model,issue.id,issue.label,resolved ? 'resolved':'unresolved',sessionId,supportMode,supportMode==='video'?1:0,resolved?4:3,terminalAt]
      );
      if (!resolved && s % 3 !== 0) {
        await q(conn,
          `INSERT INTO troubleshoot_outcomes
           (id,user_id,account_number,location,model_id,model_name,issue_id,issue_label,outcome,session_id,support_mode,is_final,video_watched,steps_completed,total_steps,last_step_id,created_at)
           VALUES (?,?,?,?,?,?,?,?, 'ticket',?,?,0,0,3,4,'escalated',?)`,
          [demoUuid('ticketout',s),user.id,user.accountNumber,user.location,`model_${(s%8)+1}`,issue.model,issue.id,issue.label,sessionId,supportMode,new Date(terminalAt.getTime()+2*60000)]
        );
      }
      if (!resolved && s % 4 === 0) {
        await q(conn,
          `INSERT INTO troubleshoot_outcomes
           (id,user_id,account_number,location,model_id,model_name,issue_id,issue_label,outcome,session_id,support_mode,is_final,video_watched,steps_completed,total_steps,last_step_id,created_at)
           VALUES (?,?,?,?,?,?,?,?, 'technician',?,?,0,0,3,4,'technician',?)`,
          [demoUuid('techout',s),user.id,user.accountNumber,user.location,`model_${(s%8)+1}`,issue.model,issue.id,issue.label,sessionId,supportMode,new Date(terminalAt.getTime()+3*60000)]
        );
      }
      summary.troubleshootSessions += 1;
    }

    // 30 support tickets. Four recent Balayan weak-signal reports intentionally demonstrate incident detection.
    const ticketIds = [];
    const candidateUsers = [10,11,12,13];
    for (let t = 0; t < 30; t += 1) {
      let user;
      let issue;
      let createdAt;
      let status;
      if (t < 4) {
        user = users[candidateUsers[t]];
        issue = issues[0];
        createdAt = ago({ minutes: 20 + t * 25 });
        status = t % 2 === 0 ? 'Under Review' : 'Submitted';
      } else if (t < 20) {
        user = users[18 + t];
        issue = issues[t % issues.length];
        createdAt = randomRecent(26);
        status = t % 3 === 0 ? 'Under Review' : (t % 4 === 0 ? 'Job Order Assigned' : 'Resolved');
      } else {
        user = users[50 + (t - 20) * 2];
        issue = issues[(t + 2) % issues.length];
        createdAt = randomRecent(26);
        status = t % 3 === 0 ? 'Submitted' : 'Resolved';
      }
      const updatedAt = status === 'Resolved' ? new Date(createdAt.getTime() + (2 + (t % 18)) * 3600000) : createdAt;
      const subject = `${issue.subject}${t < 4 ? ' - same area report' : ''}`;
      const priority = t < 4 ? 'High' : (t % 7 === 0 ? 'Urgent' : t % 3 === 0 ? 'High' : 'Normal');
      const [result] = await q(conn,
        `INSERT INTO tickets (user_id,category,subject,priority,status,incident_id,created_at,updated_at)
         VALUES (?,?,?,?,?,NULL,?,?)`,
        [user.id,issue.category,subject,priority,status,createdAt,updatedAt]
      );
      ticketIds.push(result.insertId);
      summary.tickets += 1;

      await q(conn,
        `INSERT INTO ticket_messages (ticket_id,sender_id,sender_role,message,attachment,attachment_type,created_at)
         VALUES (?,?, 'user', ?,NULL,NULL,?)`,
        [result.insertId,user.id,`Demo report: ${subject}. Please assist when available.`,createdAt]
      );
      summary.ticketMessages += 1;
      if (adminId && status !== 'Submitted') {
        await q(conn,
          `INSERT INTO ticket_messages (ticket_id,sender_id,sender_role,message,attachment,attachment_type,created_at)
           VALUES (?,?, 'admin', ?,NULL,NULL,?)`,
          [result.insertId,adminId,status === 'Resolved' ? 'Demo support response: concern reviewed and resolved.' : 'Demo support response: concern is being reviewed.',new Date(createdAt.getTime()+45*60000)]
        );
        summary.ticketMessages += 1;
      }

      await q(conn,
        `INSERT INTO notifications (user_id,account_number,type,message,is_read,created_at)
         VALUES (?,?, 'ticket', ?, ?, ?)`,
        [user.id,user.accountNumber,`Your demo ticket #${result.insertId} is ${status}.`,status==='Resolved'?1:0,updatedAt]
      );
      summary.notifications += 1;
    }

    const incidentId = 'demo-incident-balayan-weak-signal';
    await q(conn,
      `INSERT INTO support_incidents
       (id,issue_key,issue_label,location,status,report_count,distinct_subscribers,first_reported_at,last_reported_at,notes,created_at,updated_at)
       VALUES (?,?,?,'Balayan','candidate',4,4,?,?,?,NOW(),NOW())`,
      [incidentId,'weak_signal','Weak / Pixelated Signal',ago({ minutes: 95 }),ago({ minutes: 20 }),`${DEMO_MARKER}: generated from four recent demo subscribers`]
    );
    summary.incidents += 1;

    // 18 technician requests with mixed statuses and synthetic service pins.
    const techStatuses = ['Completed','Completed','Scheduled','Scheduled','Under Review','Submitted'];
    for (let r = 0; r < 18; r += 1) {
      const user = r < 10 ? users[30 + r] : users[65 + (r - 10)];
      const issue = issues[(r + 1) % 4];
      const createdAt = randomRecent(24);
      const status = techStatuses[r % techStatuses.length];
      const baseLat = user.location === 'Balayan' ? 13.94 : 14.04;
      const baseLng = user.location === 'Balayan' ? 120.73 : 120.65;
      const latitude = Number((baseLat + ((r % 5) - 2) * 0.0021).toFixed(6));
      const longitude = Number((baseLng + ((r % 4) - 1.5) * 0.0023).toFixed(6));
      const preferred = plusDays(new Date(), 1 + (r % 7));
      await q(conn,
        `INSERT INTO technician_requests
         (user_id,accountNumber,contactName,contactPhone,issueDescription,preferred_date,preferred_time,source,screen_issue,
          screen_photo_url,service_address,latitude,longitude,incident_id,technician_name,admin_note,status,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,NULL,?,?,?,NULL,?,?,?, ?, ?)`,
        [user.id,user.accountNumber,user.name,user.phone,
         `[${issue.label}] Demo technician request. Customer completed basic troubleshooting but still needs assistance.`,
         preferred,'10:00:00','demo_seed',issue.label,user.address,latitude,longitude,
         status==='Completed' ? 'Demo Technician A' : (status==='Scheduled' ? 'Demo Technician B' : null),
         `${DEMO_MARKER}: synthetic service request`,status,createdAt,status==='Completed'?new Date(createdAt.getTime()+8*3600000):createdAt]
      );
      summary.technicianRequests += 1;
    }

    await conn.commit();

    console.log('\nCignalCare+ presentation demo data seeded successfully.');
    console.log(JSON.stringify(summary, null, 2));
    console.log('\nDemo login pattern:');
    console.log(`  Account Numbers: ${ACCOUNT_START} to ${ACCOUNT_START + USER_COUNT - 1}`);
    console.log(
      isHighRiskDatabase()
        ? '  Shared password: configured privately through PRESENTATION_DEMO_PASSWORD'
        : `  Shared password: ${demoPassword}`
    );
    console.log(`  CCA Numbers: ${CCA_START} to ${CCA_START + USER_COUNT - 1}`);
    console.log(
      recoveryPrefix === 'DEMO'
        ? '  Recovery code pattern: DEMO-0001-2026-TEST through DEMO-0100-2026-TEST'
        : `  Recovery code pattern: ${recoveryPrefix}-0001 through ${recoveryPrefix}-0100`
    );
    console.log('\nAll records are synthetic and should be described as demo/test data during presentation.');
  } catch (error) {
    await conn.rollback();
    console.error('\nDEMO SEED FAILED:', error);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

seed();
