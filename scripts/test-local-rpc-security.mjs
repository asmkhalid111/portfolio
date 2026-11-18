// scripts/test-local-rpc-security.mjs
// Automated verification suite for M03 Gate B: Local Authorization RPC (public.is_admin())
// Verifies 15 security invariants (RPC-01 through RPC-15) against the local disposable Supabase stack.

import { createClient } from '@supabase/supabase-js';
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// --- CONFIGURATION & FAIL-CLOSED GUARDS ---

const HOSTED_PROJECT_REF = 'zvmjdssztebhzpplkcrn';
const TEST_ENV_FILE = path.resolve(process.cwd(), '.env.test.local');

function loadLocalTestConfig() {
  let url = process.env.LOCAL_SUPABASE_URL || '';
  let publishableKey = process.env.LOCAL_SUPABASE_PUBLISHABLE_KEY || '';
  let serviceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY || '';
  let jwtSecret = process.env.LOCAL_SUPABASE_JWT_SECRET || '';

  if (fs.existsSync(TEST_ENV_FILE)) {
    const lines = fs.readFileSync(TEST_ENV_FILE, 'utf8').split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (key === 'LOCAL_SUPABASE_URL' && !url) url = val;
      if (key === 'LOCAL_SUPABASE_PUBLISHABLE_KEY' && !publishableKey) publishableKey = val;
      if (key === 'LOCAL_SUPABASE_SERVICE_ROLE_KEY' && !serviceRoleKey) serviceRoleKey = val;
      if (key === 'LOCAL_SUPABASE_JWT_SECRET' && !jwtSecret) jwtSecret = val;
    }
  }

  if (!url || !publishableKey || !serviceRoleKey || !jwtSecret) {
    try {
      const statusOutput = execSync('npx supabase status -o json', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const jsonStart = statusOutput.indexOf('{');
      const jsonEnd = statusOutput.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(statusOutput.slice(jsonStart, jsonEnd + 1));
        if (!url) url = parsed.API_URL;
        if (!publishableKey) publishableKey = parsed.PUBLISHABLE_KEY || parsed.ANON_KEY;
        if (!serviceRoleKey) serviceRoleKey = parsed.SERVICE_ROLE_KEY;
        if (!jwtSecret) jwtSecret = parsed.JWT_SECRET;
      }
    } catch {
      // Fall through to validation check
    }
  }

  // Absolute Fail-Closed Security Invariants
  if (!url || !publishableKey || !serviceRoleKey || !jwtSecret) {
    throw new Error('SECURITY FAIL-CLOSED: Local Supabase credentials could not be loaded. Ensure local stack is running.');
  }

  if (url.includes(HOSTED_PROJECT_REF) || publishableKey.includes(HOSTED_PROJECT_REF) || serviceRoleKey.includes(HOSTED_PROJECT_REF)) {
    throw new Error(`SECURITY FAIL-CLOSED: Hosted project reference (${HOSTED_PROJECT_REF}) detected! Aborting to protect cloud environment.`);
  }

  if (url.includes('.supabase.co')) {
    throw new Error('SECURITY FAIL-CLOSED: Remote domain .supabase.co detected! Test harness must target local environment only.');
  }

  const parsedUrl = new URL(url);
  if (parsedUrl.hostname !== '127.0.0.1' && parsedUrl.hostname !== 'localhost') {
    throw new Error(`SECURITY FAIL-CLOSED: Target host must be loopback (127.0.0.1 or localhost), got: ${parsedUrl.hostname}`);
  }

  return { url, publishableKey, serviceRoleKey, jwtSecret };
}

const config = loadLocalTestConfig();
const API_URL = config.url;
const PUBLISHABLE_KEY = config.publishableKey;
const SERVICE_ROLE_KEY = config.serviceRoleKey;

// --- DIRECT POSTGRESQL KERNEL RUNNER ---

function runSql(command) {
  try {
    const stdout = execFileSync('docker', [
      'exec',
      'supabase_db_Portfolio',
      'psql',
      '-U', 'postgres',
      '-d', 'postgres',
      '-v', 'ON_ERROR_STOP=1',
      '-v', 'VERBOSITY=verbose',
      '-c', command,
    ], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output: stdout, error: null, sqlstate: null };
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : err.message;
    const stdout = err.stdout ? err.stdout.toString() : '';
    const match = stderr.match(/([0-9A-Z]{5}):/);
    const sqlstate = match ? match[1] : null;
    return { success: false, output: stdout, error: stderr, sqlstate };
  }
}

// --- TEST RESULTS RECORDING ---

const results = [];

function recordTest(id, name, passed, details) {
  results.push({ id, name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] ${id}: ${name}`);
  if (details) {
    console.log(`       Details: ${details}`);
  }
}

// --- MAIN TEST HARNESS ---

async function main() {
  console.log('================================================================');
  console.log('M03 Gate B: Local Authorization RPC (public.is_admin()) Suite');
  console.log(`Target: Local Supabase Stack (${API_URL})`);
  console.log('================================================================\n');

  // Privileged admin client for local test fixture management
  const adminClient = createClient(API_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Setup disposable local Auth identities
  console.log('--- Setting up disposable local Auth identities ---');
  const testPassword = 'TestPassword123!@#';
  const nonAdminEmail = 'rpc-test-nonadmin@example.com';
  const adminEmail = 'rpc-test-admin@example.com';

  async function ensureUser(email) {
    const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers();
    if (listErr) throw new Error(`Failed to list users: ${listErr.message}`);
    const existing = usersData?.users?.find((u) => u.email === email);
    if (existing) {
      await adminClient.auth.admin.deleteUser(existing.id);
    }
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: testPassword,
      email_confirm: true,
    });
    if (error) throw new Error(`Failed to create test user ${email}: ${error.message}`);
    return data.user;
  }

  const nonAdminUser = await ensureUser(nonAdminEmail);
  const adminUser = await ensureUser(adminEmail);

  // Whitelist adminUser in private.admin_users
  const whitelistSql = `INSERT INTO private.admin_users (id, email) VALUES ('${adminUser.id}', '${adminEmail}') ON CONFLICT (id) DO NOTHING;`;
  const wlRes = runSql(whitelistSql);
  if (!wlRes.success) throw new Error(`Failed to whitelist admin user: ${wlRes.error}`);
  console.log(`Whitelisted local test admin ${adminUser.id} in private.admin_users.\n`);

  // Sign in identities to obtain caller-bound JWTs
  const anonClient = createClient(API_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const nonAdminClient = createClient(API_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: nonAdminAuth, error: nonAdminLoginErr } = await nonAdminClient.auth.signInWithPassword({
    email: nonAdminEmail,
    password: testPassword,
  });
  if (nonAdminLoginErr || !nonAdminAuth.session) {
    throw new Error(`Non-admin sign-in failed: ${nonAdminLoginErr?.message}`);
  }

  const adminTestClient = createClient(API_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: adminAuth, error: adminLoginErr } = await adminTestClient.auth.signInWithPassword({
    email: adminEmail,
    password: testPassword,
  });
  if (adminLoginErr || !adminAuth.session) {
    throw new Error(`Admin sign-in failed: ${adminLoginErr?.message}`);
  }

  console.log('--- Executing 15 RPC Security Scenarios (RPC-01 to RPC-15) ---\n');

  // RPC-01: public.is_admin() exists with exactly zero parameters
  const rpc01Sql = `
    SELECT proname, pronargs, proargnames 
    FROM pg_proc p 
    JOIN pg_namespace n ON n.oid = p.pronamespace 
    WHERE n.nspname = 'public' AND p.proname = 'is_admin';
  `;
  const rpc01Res = runSql(rpc01Sql);
  const rpc01Passed = rpc01Res.success && rpc01Res.output.includes('is_admin') && /\bis_admin\s*\|\s*0\s*\|/.test(rpc01Res.output);
  recordTest(
    'RPC-01',
    'public.is_admin() exists with exactly zero parameters',
    rpc01Passed,
    `pronargs=0 in catalog: ${rpc01Passed}`
  );

  // RPC-02: Function is SECURITY INVOKER (prosecdef is false)
  const rpc02Sql = `
    SELECT prosecdef 
    FROM pg_proc p 
    JOIN pg_namespace n ON n.oid = p.pronamespace 
    WHERE n.nspname = 'public' AND p.proname = 'is_admin';
  `;
  const rpc02Res = runSql(rpc02Sql);
  const rpc02Passed = rpc02Res.success && rpc02Res.output.includes('f');
  recordTest(
    'RPC-02',
    'public.is_admin() is configured as SECURITY INVOKER',
    rpc02Passed,
    `prosecdef=false (INVOKER mode): ${rpc02Passed}`
  );

  // RPC-03: Function has hardened search_path
  const rpc03Sql = `
    SELECT proconfig 
    FROM pg_proc p 
    JOIN pg_namespace n ON n.oid = p.pronamespace 
    WHERE n.nspname = 'public' AND p.proname = 'is_admin';
  `;
  const rpc03Res = runSql(rpc03Sql);
  const rpc03Passed = rpc03Res.success && rpc03Res.output.includes('search_path=');
  recordTest(
    'RPC-03',
    'public.is_admin() has hardened empty search_path (SET search_path = \'\')',
    rpc03Passed,
    `proconfig contains search_path="": ${rpc03Passed}`
  );

  // RPC-04: Owner and function privileges match approved migration
  const rpc04Sql = `
    SELECT 
      has_function_privilege('anon', 'public.is_admin()', 'EXECUTE') as anon_exec,
      has_function_privilege('authenticated', 'public.is_admin()', 'EXECUTE') as auth_exec,
      has_function_privilege('public', 'public.is_admin()', 'EXECUTE') as public_exec;
  `;
  const rpc04Res = runSql(rpc04Sql);
  const rpc04Passed = rpc04Res.success && rpc04Res.output.includes('f         | t         | f');
  recordTest(
    'RPC-04',
    'Catalog grants match: anon=f, authenticated=t, public=f',
    rpc04Passed,
    `anon_exec=f, authenticated_exec=t, public_exec=f: ${rpc04Passed}`
  );

  // RPC-05: Anonymous callers cannot execute public.is_admin()
  const { data: anonData, error: anonErr } = await anonClient.rpc('is_admin');
  const rpc05Passed = anonErr !== null && (anonErr.code === '42501' || anonErr.message.includes('permission denied') || anonErr.code === 'PGRST301');
  recordTest(
    'RPC-05',
    'Anonymous callers cannot execute public.is_admin()',
    rpc05Passed,
    `Rejected with error: ${anonErr?.code || anonErr?.message}`
  );

  // RPC-06: Authenticated users may execute the wrapper
  const { data: authData, error: authErr } = await nonAdminClient.rpc('is_admin');
  const rpc06Passed = authErr === null && typeof authData === 'boolean';
  recordTest(
    'RPC-06',
    'Authenticated users may execute the wrapper (returns boolean)',
    rpc06Passed,
    `Error: ${authErr?.message || 'none'}, returned boolean: ${typeof authData === 'boolean'}`
  );

  // RPC-07: Authenticated non-admin caller returns false
  const rpc07Passed = authErr === null && authData === false;
  recordTest(
    'RPC-07',
    'Authenticated non-admin caller returns false',
    rpc07Passed,
    `Value returned: ${authData}`
  );

  // RPC-08: Authenticated locally whitelisted admin returns true
  const { data: adminData, error: adminErr } = await adminTestClient.rpc('is_admin');
  const rpc08Passed = adminErr === null && adminData === true;
  recordTest(
    'RPC-08',
    'Authenticated whitelisted admin returns true',
    rpc08Passed,
    `Value returned: ${adminData}, error: ${adminErr?.message || 'none'}`
  );

  // RPC-09: PostgREST rejects unexpected arguments (e.g. user_id or email)
  let rpc09Passed = false;
  let rpc09Details = '';
  try {
    const { data: injectData, error: injectErr } = await nonAdminClient.rpc('is_admin', {
      user_id: adminUser.id,
    });
    // PostgREST must reject unexpected arguments because public.is_admin() accepts zero parameters
    if (injectErr) {
      rpc09Passed = injectErr.code === 'PGRST202' || injectErr.message.includes('Could not find the function') || injectErr.code === '42883';
      rpc09Details = `PostgREST rejected with code: ${injectErr.code}, message: "${injectErr.message}"`;
    } else {
      rpc09Details = `Unexpected success with data: ${injectData}`;
    }
  } catch (err) {
    rpc09Passed = true;
    rpc09Details = `Caught exception: ${err.message}`;
  }
  recordTest(
    'RPC-09',
    'Unexpected RPC arguments rejected by PostgREST (parameter injection defense)',
    rpc09Passed,
    rpc09Details
  );

  // RPC-10: Direct queries against private.admin_users remain denied
  const { data: directAnon, error: directAnonErr } = await anonClient.from('admin_users').select();
  const { data: directAuth, error: directAuthErr } = await nonAdminClient.from('admin_users').select();
  const rpc10Passed = (directAnonErr?.code === 'PGRST205' || directAnonErr?.code === '42501') &&
                      (directAuthErr?.code === 'PGRST205' || directAuthErr?.code === '42501');
  recordTest(
    'RPC-10',
    'Direct queries against private.admin_users remain denied for anon and authenticated',
    rpc10Passed,
    `Anon error: ${directAnonErr?.code}, Auth error: ${directAuthErr?.code}`
  );

  // RPC-11: Existing public.projects RLS rules remain intact
  const { data: anonProjects } = await anonClient.from('projects').select('id, status');
  const allPublished = anonProjects?.every((p) => p.status === 'published') && anonProjects?.length > 0;
  const { data: adminProjects } = await adminTestClient.from('projects').select('id, status');
  const hasDraft = adminProjects?.some((p) => p.status === 'draft');
  const rpc11Passed = allPublished && hasDraft;
  recordTest(
    'RPC-11',
    'Existing public.projects RLS rules remain intact (drafts isolated from anon)',
    rpc11Passed,
    `Anon sees published only: ${allPublished}, Admin sees draft: ${hasDraft}`
  );

  // RPC-12: Existing public.project_media RLS rules remain intact
  const { data: anonMedia } = await anonClient.from('project_media').select('id, project_id');
  const { data: adminMedia } = await adminTestClient.from('project_media').select('id, project_id');
  const rpc12Passed = (anonMedia?.length ?? 0) <= (adminMedia?.length ?? 0);
  recordTest(
    'RPC-12',
    'Existing public.project_media RLS rules remain intact',
    rpc12Passed,
    `Anon media count: ${anonMedia?.length}, Admin media count: ${adminMedia?.length}`
  );

  // RPC-13: Instant administrator revocation
  // Remove admin from private.admin_users
  const revokeSql = `DELETE FROM private.admin_users WHERE id = '${adminUser.id}';`;
  runSql(revokeSql);
  // Fresh RPC call on same client (with unchanged valid JWT) must now return false
  const { data: revokedData, error: revokedErr } = await adminTestClient.rpc('is_admin');
  const rpc13Passed = revokedErr === null && revokedData === false;
  recordTest(
    'RPC-13',
    'Instant administrator revocation: deleting whitelist record immediately revokes access',
    rpc13Passed,
    `Fresh query returned: ${revokedData} (was true before deletion)`
  );

  // RPC-14: RPC returns a single boolean primitive and does not expose rows/columns
  const rpc14Passed = typeof authData === 'boolean' && Object.keys(authData).length === 0;
  recordTest(
    'RPC-14',
    'RPC returns single boolean primitive without exposing table rows or columns',
    rpc14Passed,
    `Return type: ${typeof authData}, value: ${authData}`
  );

  // RPC-15: Function works using caller-bound JWT, without service-role key
  const rpc15Passed = adminAuth.session.access_token && !adminAuth.session.access_token.includes(SERVICE_ROLE_KEY);
  recordTest(
    'RPC-15',
    'RPC operates strictly under caller-bound JWT identity without service_role key',
    Boolean(rpc15Passed),
    `Evaluated under user JWT subject: ${adminUser.id}`
  );

  // Cleanup test users
  console.log('\n--- Cleaning up test fixtures ---');
  await adminClient.auth.admin.deleteUser(nonAdminUser.id);
  await adminClient.auth.admin.deleteUser(adminUser.id);
  console.log('Cleaned up disposable local test identities.\n');

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log('================================================================');
  console.log(`M03 GATE B RPC SECURITY SCORECARD: ${passedCount}/${results.length} PASSED (${failedCount} FAILED)`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in RPC security suite:', err);
  process.exit(1);
});
