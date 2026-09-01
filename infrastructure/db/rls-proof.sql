-- RLS tenant-isolation proof v2 — mirrors production pattern (withTenant:
-- BEGIN + set_config(is_local=true) + queries + COMMIT), and also proves the
-- session-scoped super bypass.
\set ON_ERROR_STOP on

SELECT '--- 1. School A context (transaction) ---';
BEGIN;
SET ROLE nexora_app;
SELECT set_config('app.school_id', (SELECT id::text FROM schools ORDER BY created_at LIMIT 1), true);
SELECT 'A sees RLS teachers (expect >=1): ' || COUNT(*) AS check_a FROM teachers WHERE employee_id LIKE 'RLS-%';
COMMIT;

SELECT '--- 2. School B context (transaction) ---';
BEGIN;
SET ROLE nexora_app;
SELECT set_config('app.school_id', (SELECT id::text FROM schools WHERE name = 'RLS Test School B'), true);
SELECT 'B sees RLS teachers (expect 1): ' || COUNT(*) AS check_b FROM teachers WHERE employee_id LIKE 'RLS-%';
SELECT 'A teacher visible under B context (expect 0): ' || COUNT(*) AS check_cross FROM teachers WHERE employee_id = 'RLS-A-001';
COMMIT;

SELECT '--- 3. Super-admin context (transaction) ---';
BEGIN;
SET ROLE nexora_app;
SELECT set_config('app.is_super', 'true', true);
SELECT 'super sees RLS teachers (expect 2): ' || COUNT(*) AS check_super FROM teachers WHERE employee_id LIKE 'RLS-%';
COMMIT;

SELECT '--- 4. No context (transaction; expect 0) ---';
BEGIN;
SET ROLE nexora_app;
SELECT set_config('app.school_id', '', true);
SELECT set_config('app.is_super', 'false', true);
SELECT 'no-context sees (expect 0): ' || COUNT(*) AS check_null FROM teachers WHERE employee_id LIKE 'RLS-%';
COMMIT;

SELECT '--- 5. Auth helper as app role ---';
BEGIN;
SET ROLE nexora_app;
SELECT 'find_user_for_auth works (expect 1): ' || COUNT(*) AS check_auth FROM app.find_user_for_auth('super@nexora.dev');
COMMIT;

SELECT '--- 6. Owner connection unaffected (expect 2) ---';
SELECT 'owner sees RLS teachers (expect 2): ' || COUNT(*) AS check_owner FROM teachers WHERE employee_id LIKE 'RLS-%';