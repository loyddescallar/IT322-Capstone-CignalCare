require("dotenv").config();

const SUPPORTED_DRIVERS = new Set(["postgres", "mysql"]);

function resolveDriver() {
  const configured = String(process.env.DB_DRIVER || "")
    .trim()
    .toLowerCase();

  if (configured) {
    if (!SUPPORTED_DRIVERS.has(configured)) {
      throw new Error(
        `Unsupported DB_DRIVER "${configured}". Use "postgres" or "mysql".`
      );
    }

    return configured;
  }

  // Production remains PostgreSQL/Supabase automatically when DATABASE_URL exists.
  if (process.env.DATABASE_URL) return "postgres";

  // Local development can fall back to the original MySQL environment variables.
  if (process.env.DB_HOST || process.env.DB_NAME || process.env.DB_USER) {
    return "mysql";
  }

  throw new Error(
    "Database configuration is missing. Set DATABASE_URL for Supabase/PostgreSQL, or DB_DRIVER=mysql with DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME for local MySQL."
  );
}

const DB_DRIVER = resolveDriver();

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

// -----------------------------------------------------------------------------
// PostgreSQL compatibility layer
// The application historically used MySQL-style SQL. These transforms keep
// those existing model queries working against Supabase/PostgreSQL.
// -----------------------------------------------------------------------------

function rewriteMySqlFunctionsForPostgres(sql) {
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

  const match = text.match(/^\s*INSERT\s+INTO\s+"?([a-zA-Z0-9_]+)"?/i);

  if (!match) {
    return text;
  }

  const tableName = match[1].toLowerCase();

  if (!TABLES_WITH_ID.has(tableName)) {
    return text;
  }

  return `${text} RETURNING id`;
}

function preparePostgresQuery(sql, params = []) {
  const expanded = expandBulkValues(sql, params);

  let text = expanded.sql;
  text = rewriteMySqlFunctionsForPostgres(text);
  text = quoteMixedCaseIdentifiers(text);
  text = addReturningId(text);
  text = convertQuestionPlaceholders(text);

  return {
    text,
    values: expanded.params,
  };
}

function normalizePostgresError(error) {
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

async function executePostgres(executor, sql, params = []) {
  const { text, values } = preparePostgresQuery(sql, params);

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
    throw normalizePostgresError(error);
  }
}

// -----------------------------------------------------------------------------
// MySQL compatibility layer
// A few newer queries were written specifically for PostgreSQL. These rewrites
// allow the same application code to run against the original local MySQL DB.
// -----------------------------------------------------------------------------

function rewritePostgresFunctionsForMySql(sql) {
  let text = sql;

  text = text.replace(/\bTIMESTAMPTZ\b/gi, "TIMESTAMP");

  text = text.replace(
    /NOW\(\)\s*\+\s*\(\s*\?\s*\*\s*INTERVAL\s*'1 day'\s*\)/gi,
    "DATE_ADD(NOW(), INTERVAL ? DAY)"
  );

  text = text.replace(
    /NOW\(\)\s*-\s*INTERVAL\s*'(\d+)\s+(minute|minutes|hour|hours|day|days)'/gi,
    (_, amount, unit) => {
      const normalizedUnit = String(unit).replace(/s$/i, "").toUpperCase();
      return `DATE_SUB(NOW(), INTERVAL ${amount} ${normalizedUnit})`;
    }
  );

  text = text.replace(
    /table_schema\s*=\s*'public'/gi,
    "table_schema = DATABASE()"
  );

  // PostgreSQL ALTER COLUMN syntax -> MySQL MODIFY COLUMN syntax.
  text = text.replace(
    /ALTER\s+TABLE\s+([`"\w]+)\s+ALTER\s+COLUMN\s+([`"\w]+)\s+TYPE\s+([A-Z0-9(),\s]+)/gi,
    (_, tableName, columnName, dataType) =>
      `ALTER TABLE ${tableName} MODIFY COLUMN ${columnName} ${dataType.trim()}`
  );

  const hadReturningId = /\bRETURNING\s+id\b/i.test(text);
  text = text.replace(/\s+RETURNING\s+id\s*;?\s*$/i, "");

  // ON CONFLICT (...) DO NOTHING -> INSERT IGNORE.
  if (/\bON\s+CONFLICT\s*\([^)]*\)\s+DO\s+NOTHING\b/i.test(text)) {
    text = text.replace(/^\s*INSERT\s+INTO\b/i, "INSERT IGNORE INTO");
    text = text.replace(
      /\s+ON\s+CONFLICT\s*\([^)]*\)\s+DO\s+NOTHING\b/gi,
      ""
    );
  }

  // ON CONFLICT (...) DO UPDATE SET -> ON DUPLICATE KEY UPDATE.
  const conflictUpdate = text.match(
    /\s+ON\s+CONFLICT\s*\([^)]*\)\s+DO\s+UPDATE\s+SET\s+([\s\S]+)$/i
  );

  if (conflictUpdate) {
    let updateClause = conflictUpdate[1]
      .replace(/\bEXCLUDED\.([A-Za-z0-9_]+)/gi, "VALUES($1)")
      .trim();

    if (hadReturningId && !/\bLAST_INSERT_ID\s*\(/i.test(updateClause)) {
      updateClause = `id = LAST_INSERT_ID(id),\n${updateClause}`;
    }

    text = text.slice(0, conflictUpdate.index).trimEnd();
    text += `\nON DUPLICATE KEY UPDATE\n${updateClause}`;
  }

  return text;
}

function prepareMySqlQuery(sql, params = []) {
  const expanded = expandBulkValues(sql, params);

  return {
    text: rewritePostgresFunctionsForMySql(expanded.sql),
    values: expanded.params,
  };
}

function getAddColumnStatements(sql) {
  const match = String(sql).match(
    /^\s*ALTER\s+TABLE\s+([`"A-Za-z0-9_]+)\s+([\s\S]+?)\s*;?\s*$/i
  );

  if (!match || !/ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/i.test(match[2])) {
    return null;
  }

  const tableName = match[1];
  const clauses = match[2]
    .split(/,\s*(?=ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\b)/i)
    .map((clause) => clause.trim())
    .filter(Boolean);

  if (!clauses.length) return null;

  return clauses.map((clause) => {
    const cleaned = clause.replace(
      /^ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+/i,
      "ADD COLUMN "
    );

    return `ALTER TABLE ${tableName} ${cleaned}`;
  });
}

async function executeMySql(executor, sql, params = []) {
  const addColumnStatements = getAddColumnStatements(sql);

  if (addColumnStatements) {
    let affectedRows = 0;

    for (const statement of addColumnStatements) {
      try {
        const [result] = await executor.query(statement);
        affectedRows += Number(result?.affectedRows || 0);
      } catch (error) {
        // Existing columns are expected when schema guards run repeatedly.
        if (error?.code !== "ER_DUP_FIELDNAME") throw error;
      }
    }

    return [{ affectedRows, insertId: null }];
  }

  const { text, values } = prepareMySqlQuery(sql, params);

  try {
    const [result] = await executor.query(text, values);
    return [result];
  } catch (error) {
    // MySQL does not support CREATE INDEX IF NOT EXISTS in all versions.
    if (
      error?.code === "ER_PARSE_ERROR" &&
      /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/i.test(text)
    ) {
      const withoutIfNotExists = text.replace(
        /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/i,
        "CREATE INDEX"
      );

      try {
        const [result] = await executor.query(withoutIfNotExists, values);
        return [result];
      } catch (indexError) {
        if (indexError?.code === "ER_DUP_KEYNAME") {
          return [{ affectedRows: 0, insertId: null }];
        }
        throw indexError;
      }
    }

    if (error?.code === "ER_DUP_KEYNAME") {
      return [{ affectedRows: 0, insertId: null }];
    }

    throw error;
  }
}

function createPostgresAdapter() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is missing. Add your Supabase PostgreSQL connection string to .env, or set DB_DRIVER=mysql for local MySQL."
    );
  }

  const { Pool } = require("pg");

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

  return {
    driver: "postgres",

    async query(sql, params = []) {
      return executePostgres(rawPool, sql, params);
    },

    async getConnection() {
      const client = await rawPool.connect();

      return {
        async query(sql, params = []) {
          return executePostgres(client, sql, params);
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
}

function createMySqlAdapter() {
  const mysql = require("mysql2/promise");

  const database = String(process.env.DB_NAME || "").trim();
  const user = String(process.env.DB_USER || "").trim();

  if (!database || !user) {
    throw new Error(
      "Local MySQL configuration is incomplete. Set DB_NAME and DB_USER, plus DB_HOST/DB_PASSWORD when required."
    );
  }

  const rawPool = mysql.createPool({
    host: String(process.env.DB_HOST || "127.0.0.1").trim(),
    port: Number(process.env.DB_PORT || 3306),
    user,
    password: process.env.DB_PASSWORD || "",
    database,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    dateStrings: false,
  });

  return {
    driver: "mysql",

    async query(sql, params = []) {
      return executeMySql(rawPool, sql, params);
    },

    async getConnection() {
      const connection = await rawPool.getConnection();

      return {
        async query(sql, params = []) {
          return executeMySql(connection, sql, params);
        },

        async beginTransaction() {
          await connection.beginTransaction();
        },

        async commit() {
          await connection.commit();
        },

        async rollback() {
          await connection.rollback();
        },

        release() {
          connection.release();
        },
      };
    },

    async end() {
      await rawPool.end();
    },

    on() {
      // Kept for API compatibility with the PostgreSQL adapter.
      return rawPool;
    },

    rawPool,
  };
}

const pool =
  DB_DRIVER === "mysql" ? createMySqlAdapter() : createPostgresAdapter();

console.log(`[DB] Using ${pool.driver} database driver`);

module.exports = pool;
