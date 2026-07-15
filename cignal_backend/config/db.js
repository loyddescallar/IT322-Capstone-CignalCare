const { Pool } = require("pg");
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. Add your Supabase PostgreSQL connection string to .env."
  );
}

const rawPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

rawPool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

const MIXED_CASE_IDENTIFIERS = new Set([
  "accountName",
  "accountNumber",
  "ccaNumber",
  "loadAmount",
  "contactName",
  "contactPhone",
  "issueDescription",
  "lastLoadDate",
  "allCustomers",
  "archivedCount",
  "thisMonth",
  "activeCount",
  "atRiskCount",
  "inactiveCount",
]);

const TABLES_WITH_ID = new Set([
  "users",
  "load_history",
  "load_requests",
  "notifications",
  "prepaid_accounts",
  "prepaid_plans",
  "prepaid_transactions",
  "technician_requests",
  "tickets",
  "ticket_messages",
  "troubleshoot_models",
  "troubleshoot_issues",
  "troubleshoot_steps",
]);

function expandBulkValues(sql, params = []) {
  if (
    params.length === 1 &&
    Array.isArray(params[0]) &&
    params[0].length > 0 &&
    params[0].every((row) => Array.isArray(row)) &&
    /\bVALUES\s+\?/i.test(sql)
  ) {
    const rows = params[0];
    const width = rows[0].length;

    if (!rows.every((row) => row.length === width)) {
      throw new Error("Bulk insert rows must have the same number of values.");
    }

    const placeholders = rows
      .map(() => `(${Array(width).fill("?").join(", ")})`)
      .join(", ");

    return {
      sql: sql.replace(/\bVALUES\s+\?/i, `VALUES ${placeholders}`),
      params: rows.flat(),
    };
  }

  return { sql, params };
}

function rewriteMySqlFunctions(sql) {
  let text = sql;

  // PostgreSQL string equality is already case-sensitive.
  text = text.replace(/\bBINARY\s+/gi, "");

  // DATE_ADD(NOW(), INTERVAL ? DAY)
  text = text.replace(
    /DATE_ADD\s*\(\s*NOW\(\)\s*,\s*INTERVAL\s+\?\s+DAY\s*\)/gi,
    "(NOW() + (? * INTERVAL '1 day'))"
  );

  // DATE_SUB(NOW(), INTERVAL 30 DAY)
  text = text.replace(
    /DATE_SUB\s*\(\s*NOW\(\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi,
    (_, days) => `(NOW() - INTERVAL '${days} days')`
  );

  // DATE_FORMAT(column, '%Y-%m')
  text = text.replace(
    /DATE_FORMAT\s*\(\s*([^,]+?)\s*,\s*'%Y-%m'\s*\)/gi,
    (_, expression) => `TO_CHAR(${expression.trim()}, 'YYYY-MM')`
  );

  return text;
}

function transformOutsideQuotedText(sql, transformToken) {
  let output = "";
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];

    if (char === "'" || char === '"') {
      const quote = char;
      output += char;
      i += 1;

      while (i < sql.length) {
        output += sql[i];

        if (sql[i] === quote) {
          if (sql[i + 1] === quote) {
            output += sql[i + 1];
            i += 2;
            continue;
          }

          i += 1;
          break;
        }

        i += 1;
      }

      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let token = "";

      while (i < sql.length && /[A-Za-z0-9_$]/.test(sql[i])) {
        token += sql[i];
        i += 1;
      }

      output += transformToken(token);
      continue;
    }

    output += char;
    i += 1;
  }

  return output;
}

function quoteMixedCaseIdentifiers(sql) {
  return transformOutsideQuotedText(sql, (token) =>
    MIXED_CASE_IDENTIFIERS.has(token) ? `"${token}"` : token
  );
}

function convertQuestionPlaceholders(sql) {
  let parameterIndex = 1;
  let output = "";
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];

    if (char === "'" || char === '"') {
      const quote = char;
      output += char;
      i += 1;

      while (i < sql.length) {
        output += sql[i];

        if (sql[i] === quote) {
          if (sql[i + 1] === quote) {
            output += sql[i + 1];
            i += 2;
            continue;
          }

          i += 1;
          break;
        }

        i += 1;
      }

      continue;
    }

    if (char === "?") {
      output += `$${parameterIndex}`;
      parameterIndex += 1;
    } else {
      output += char;
    }

    i += 1;
  }

  return output;
}

function addReturningId(sql) {
  let text = sql.trim().replace(/;$/, "");

  if (/\bRETURNING\b/i.test(text)) {
    return text;
  }

  const match = text.match(
    /^\s*INSERT\s+INTO\s+"?([a-zA-Z0-9_]+)"?/i
  );

  if (!match) {
    return text;
  }

  const tableName = match[1].toLowerCase();

  if (!TABLES_WITH_ID.has(tableName)) {
    return text;
  }

  return `${text} RETURNING id`;
}

function prepareQuery(sql, params = []) {
  const expanded = expandBulkValues(sql, params);

  let text = expanded.sql;
  text = rewriteMySqlFunctions(text);
  text = quoteMixedCaseIdentifiers(text);
  text = addReturningId(text);
  text = convertQuestionPlaceholders(text);

  return {
    text,
    values: expanded.params,
  };
}

function normalizeDatabaseError(error) {
  if (error.code === "23505") {
    error.pgCode = error.code;
    error.code = "ER_DUP_ENTRY";
  }

  if (error.code === "23503") {
    error.pgCode = error.code;
    error.code = "ER_ROW_IS_REFERENCED_2";
  }

  return error;
}

async function execute(executor, sql, params = []) {
  const { text, values } = prepareQuery(sql, params);

  try {
    const result = await executor.query(text, values);

    if (result.command === "SELECT") {
      return [result.rows];
    }

    return [
      {
        affectedRows: result.rowCount || 0,
        insertId: result.rows?.[0]?.id ?? null,
      },
    ];
  } catch (error) {
    throw normalizeDatabaseError(error);
  }
}

const pool = {
  async query(sql, params = []) {
    return execute(rawPool, sql, params);
  },

  async getConnection() {
    const client = await rawPool.connect();

    return {
      async query(sql, params = []) {
        return execute(client, sql, params);
      },

      async beginTransaction() {
        await client.query("BEGIN");
      },

      async commit() {
        await client.query("COMMIT");
      },

      async rollback() {
        await client.query("ROLLBACK");
      },

      release() {
        client.release();
      },
    };
  },

  async end() {
    await rawPool.end();
  },

  on(...args) {
    return rawPool.on(...args);
  },

  rawPool,
};

module.exports = pool;
