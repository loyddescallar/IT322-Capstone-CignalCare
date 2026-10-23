# CignalCare+ — safe local database setup (Batch 1)

`CignalCare_Schema.sql` is converted by `Batch1_Apply_Local.py` to a **MySQL/MariaDB schema-only** installation file: table definitions, indexes, relationships, and constraints are preserved, and the old `INSERT INTO` records are removed. No actual customer or payment data is shipped in the patch.

**For a fresh test machine only:** create a new, empty database named `cignal_system` in a local MySQL or MariaDB instance, then import `cignal_backend/sql/CignalCare_Schema.sql` using your database administration tool. Set the application's local database environment variables to that new test database. The schema file does not include an admin login or production data; initialize accounts using the project's approved setup procedure, not real customer exports. Test those procedures separately.

Do not import this file into an existing or live CignalCare+ database; it is a **fresh install** schema, not an upgrade migration. Production currently uses PostgreSQL; this MySQL-oriented file does **not** create a PostgreSQL installation. Do not assume that the two database engines use identical DDL.

After applying Batch 1, existing historical prepaid transactions and plan records remain unchanged. All **new** successfully fulfilled loads use 30 days. The POS idempotency mechanism relies on `prepaid_transactions.reference_no` already having a unique constraint (verify in the target database before deployment).

## Important privacy note

The historical populated SQL dump has already been committed publicly. Replacing its current tracked version prevents further casual exposure, but does not erase Git history or copies. Review whether consent, incident response, and repository-history remediation are required. Do not force-push or rewrite history without explicit approval and coordination. Never put actual customer data in a public testing seed.
