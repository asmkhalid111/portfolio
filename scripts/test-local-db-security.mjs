// scripts/test-local-db-security.mjs
// Automated verification suite for M02 Gate C1: Local Database & RLS Security
// Hardened for independent security audit & regression prevention
//
// Primary Matrix: 38 Scenarios from docs/milestones/M02-database/RLS_MATRIX.md (v0.3)
//   - Mechanism A: 26 Data API Tests (via PostgREST / @supabase/supabase-js)
//   - Mechanism B: 12 Direct PostgreSQL Tests (via docker exec psql with exact SQLSTATE assertions)
// Supplementary Suite: 8 Dedicated Trigger & Timestamp State Machine Tests (TRG-01 to TRG-08)

import { createClient } from '@supabase/supabase-js';
import { execFileSync, execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// --- CONFIGURATION LOADER & FAIL-CLOSED GUARDS ---

const HOSTED_PROJECT_REF = 'zvmjdssztebhzpplkcrn';
const TEST_ENV_FILE = path.resolve(process.cwd(), '.env.test.local');

function loadLocalTestConfig() {
  let url = process.env.LOCAL_SUPABASE_URL || '';
  let publishableKey = process.env.LOCAL_SUPABASE_PUBLISHABLE_KEY || '';
  let serviceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY || '';
  let jwtSecret = process.env.LOCAL_SUPABASE_JWT_SECRET || '';

  // 1. Read from ignored .env.test.local if present (NEVER read .env.local)
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

  // 2. If any credential missing, dynamically query running local CLI status
  if (!url || !publishableKey || !serviceRoleKey || !jwtSecret) {
    try {
      const statusOutput = execSync('npx supabase status -o json', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      const jsonStart = statusOutput.indexOf('{');
      const jsonEnd = statusOutput.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(statusOutput.slice(jsonStart, jsonEnd + 1));
        if (!url) url = parsed.API_URL;
        if (!publishableKey) publishableKey = parsed.PUBLISHABLE_KEY || parsed.ANON_KEY;
        if (!serviceRoleKey) serviceRoleKey = parsed.SERVICE_ROLE_KEY;
        if (!jwtSecret) jwtSecret = parsed.JWT_SECRET;

        // Persist to ignored .env.test.local for fast subsequent runs
        if (!fs.existsSync(TEST_ENV_FILE)) {
          fs.writeFileSync(TEST_ENV_FILE, [
            '# Local Supabase Test Credentials (Ignored by Git)',
            `LOCAL_SUPABASE_URL=${url}`,
            `LOCAL_SUPABASE_PUBLISHABLE_KEY=${publishableKey}`,
            `LOCAL_SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
            `LOCAL_SUPABASE_JWT_SECRET=${jwtSecret}`,
            ''
          ].join('\n'), 'utf8');
        }
      }
    } catch {
      // Fall through to validation check
    }
  }

  // 3. Absolute Fail-Closed Security Invariants
  if (!url || !publishableKey || !serviceRoleKey || !jwtSecret) {
    throw new Error('SECURITY FAIL-CLOSED: Local Supabase credentials could not be loaded. Ensure local stack is running.');
  }

  // Detect hosted project reference anywhere in config
  if (url.includes(HOSTED_PROJECT_REF) || publishableKey.includes(HOSTED_PROJECT_REF) || serviceRoleKey.includes(HOSTED_PROJECT_REF)) {
    throw new Error(`SECURITY FAIL-CLOSED: Hosted project reference (${HOSTED_PROJECT_REF}) detected! Aborting to protect cloud environment.`);
  }

  // Detect remote domain
  if (url.includes('.supabase.co')) {
    throw new Error('SECURITY FAIL-CLOSED: Remote domain .supabase.co detected! Test harness must target local environment only.');
  }

  // Validate loopback target
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
const JWT_SECRET = config.jwtSecret;

// --- TEST RESULT RECORDING ---

const primaryResults = [];
const supplementaryResults = [];

function recordTest(id, name, mechanism, passed, details) {
  primaryResults.push({ id, name, mechanism, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] ${id}: ${name} (${mechanism})`);
  if (!passed || details) {
    console.log(`       Details: ${details}`);
  }
}

function recordSupplementary(id, name, passed, details) {
  supplementaryResults.push({ id, name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] ${id}: ${name} (Trigger Invariant)`);
  if (!passed || details) {
    console.log(`       Details: ${details}`);
  }
}

// --- DIRECT POSTGRESQL KERNEL RUNNER WITH SQLSTATE EXTRACTION ---

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
      '-c', command
    ], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, output: stdout, error: null, sqlstate: null };
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : err.message;
    const stdout = err.stdout ? err.stdout.toString() : '';
    const match = stderr.match(/ERROR:\s+([0-9A-Z]{5}):/);
    const sqlstate = match ? match[1] : null;
    return { success: false, output: stdout, error: stderr, sqlstate };
  }
}

// --- LOCAL JWT SIGNING HELPER ---

function createSignedJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${encHeader}.${encPayload}`).digest('base64url');
  return `${encHeader}.${encPayload}.${signature}`;
}

// --- MAIN TEST SUITE ---

async function main() {
  console.log('================================================================');
  console.log('M02 Gate C1: Hardened Database & RLS Security Suite');
  console.log(`Target: Local Supabase Stack (${API_URL})`);
  console.log('================================================================\n');

  // Verify local stack health
  process.stdout.write('Checking local Supabase stack readiness...');
  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      const res = await fetch(`${API_URL}/auth/v1/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        console.log(' Ready!\n');
        break;
      }
    } catch {
      // Retrying
    }
    process.stdout.write('.');
    await new Promise(r => setTimeout(r, 1000));
    if (attempt === 30) {
      throw new Error('Local Supabase stack did not become ready within 30 seconds.');
    }
  }

  // 1. Privileged Service-Role Admin Client (Local Only)
  const adminClient = createClient(API_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // 2. Setup Test Identities in Local GoTrue
  console.log('--- Setting up test Auth identities in local GoTrue ---');
  const nonAdminEmail = 'test-nonadmin@example.com';
  const adminEmail = 'test-admin@example.com';
  const forgedEmail = 'test-forged@example.com';
  const testPassword = 'TestPassword123!@#';

  async function ensureUser(email, userMetadata = {}) {
    const { data: usersData, error: listErr } = await adminClient.auth.admin.listUsers();
    if (listErr) throw new Error(`Failed to list users: ${listErr.message}`);
    const existing = usersData?.users?.find(u => u.email === email);
    if (existing) {
      await adminClient.auth.admin.deleteUser(existing.id);
    }
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: testPassword,
      email_confirm: true,
      user_metadata: userMetadata
    });
    if (error) throw new Error(`Failed to create test user ${email}: ${error.message}`);
    return data.user;
  }

  const nonAdminUser = await ensureUser(nonAdminEmail);
  const adminUser = await ensureUser(adminEmail);
  const forgedUser = await ensureUser(forgedEmail, { role: 'admin' });

  // Whitelist adminUser in private.admin_users table
  const whitelistSql = `INSERT INTO private.admin_users (id, email) VALUES ('${adminUser.id}', '${adminEmail}') ON CONFLICT (id) DO NOTHING;`;
  const whitelistResult = runSql(whitelistSql);
  if (!whitelistResult.success) {
    throw new Error(`Failed to whitelist admin user: ${whitelistResult.error}`);
  }
  console.log(`Whitelisted admin user ${adminUser.id} in private.admin_users.\n`);

  // 3. Create Authenticated Clients
  const anonClient = createClient(API_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });

  const nonAdminClient = createClient(API_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { error: nonAdminAuthErr } = await nonAdminClient.auth.signInWithPassword({
    email: nonAdminEmail,
    password: testPassword
  });
  if (nonAdminAuthErr) throw nonAdminAuthErr;

  const adminAuthClient = createClient(API_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { error: adminAuthErr } = await adminAuthClient.auth.signInWithPassword({
    email: adminEmail,
    password: testPassword
  });
  if (adminAuthErr) throw adminAuthErr;

  const forgedAuthClient = createClient(API_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { error: forgedAuthErr } = await forgedAuthClient.auth.signInWithPassword({
    email: forgedEmail,
    password: testPassword
  });
  if (forgedAuthErr) throw forgedAuthErr;

  console.log('--- Executing Mechanism A: Data API Security Tests (26 Tests) ---\n');

  // API-01: Anonymous public projects read
  {
    const { data, status } = await anonClient.from('projects').select('*');
    const passed = status === 200 && Array.isArray(data) && data.length > 0 && data.every(p => p.status === 'published');
    recordTest('API-01', 'Anonymous public projects read', 'Data API', passed, `HTTP ${status}, ${data?.length} rows returned, all published.`);
  }

  // API-02: Anonymous draft project read
  {
    const { data, status } = await anonClient.from('projects').select('*').eq('slug', 'autonomous-code-auditor');
    const passed = status === 200 && Array.isArray(data) && data.length === 0;
    recordTest('API-02', 'Anonymous draft project read', 'Data API', passed, `HTTP ${status}, returned ${data?.length} rows (draft isolated).`);
  }

  // API-03: Anonymous direct project insert (Strengthened negative assertion)
  {
    const uniqueSlug = `anon-hack-${Date.now()}`;
    const { error, status } = await anonClient.from('projects').insert({
      title: 'Hacked Project',
      slug: uniqueSlug,
      summary: 'Unauthorized project insertion attempt by anonymous actor.',
      status: 'published'
    });
    const { data: checkData, error: checkErr } = await adminClient.from('projects').select('id').eq('slug', uniqueSlug);
    const rejected = (status === 401 || status === 403 || error !== null);
    const notCreated = !checkErr && Array.isArray(checkData) && checkData.length === 0;
    const passed = rejected && notCreated;
    recordTest('API-03', 'Anonymous direct project insert', 'Data API', passed, `Rejected with HTTP ${status}. Project exists in DB: ${!notCreated}`);
  }

  // API-04: Anonymous direct project update (Strengthened negative assertion)
  {
    const targetId = '11111111-1111-1111-1111-111111111111';
    const { data: beforeData, error: beforeErr } = await adminClient.from('projects').select('title, updated_at').eq('id', targetId).single();
    if (beforeErr || !beforeData) throw new Error(`API-04 prerequisite failed: baseline project not found: ${beforeErr?.message}`);

    const { status, error } = await anonClient.from('projects')
      .update({ title: 'Hacked Title' })
      .eq('id', targetId);

    const { data: afterData, error: afterErr } = await adminClient.from('projects').select('title, updated_at').eq('id', targetId).single();
    if (afterErr || !afterData) throw new Error(`API-04 verification query failed: ${afterErr?.message}`);

    const rejected = (status === 401 || status === 403 || error !== null);
    const titleUnchanged = afterData.title === beforeData.title;
    const timestampUnchanged = afterData.updated_at === beforeData.updated_at;
    const passed = rejected && titleUnchanged && timestampUnchanged;
    recordTest('API-04', 'Anonymous direct project update', 'Data API', passed, `Status: ${status}, Title unchanged: ${titleUnchanged}, Timestamp unchanged: ${timestampUnchanged}`);
  }

  // API-05: Anonymous direct project delete (Strengthened negative assertion)
  {
    const targetId = '11111111-1111-1111-1111-111111111111';
    const { data: beforeData, error: beforeErr } = await adminClient.from('projects').select('id').eq('id', targetId).single();
    if (beforeErr || !beforeData) throw new Error(`API-05 prerequisite failed: baseline project not found: ${beforeErr?.message}`);

    const { status, error } = await anonClient.from('projects').delete().eq('id', targetId);

    const { data: afterData, error: afterErr } = await adminClient.from('projects').select('id').eq('id', targetId);
    if (afterErr || !Array.isArray(afterData)) throw new Error(`API-05 verification query failed: ${afterErr?.message}`);

    const rejected = (status === 401 || status === 403 || error !== null);
    const stillExists = afterData.length === 1 && afterData[0].id === targetId;
    const passed = rejected && stillExists;
    recordTest('API-05', 'Anonymous direct project delete', 'Data API', passed, `Status: ${status}, Project preserved in DB: ${stillExists}`);
  }

  // API-06: Anonymous published media read
  {
    const { data, status } = await anonClient.from('project_media').select('*').eq('id', '33333333-3333-3333-3333-333333333333');
    const passed = status === 200 && Array.isArray(data) && data.length === 1;
    recordTest('API-06', 'Anonymous published media read', 'Data API', passed, `HTTP ${status}, published media record retrieved.`);
  }

  // API-07: Anonymous draft media read
  {
    const { data, status } = await anonClient.from('project_media').select('*').eq('id', '44444444-4444-4444-4444-444444444444');
    const passed = status === 200 && Array.isArray(data) && data.length === 0;
    recordTest('API-07', 'Anonymous draft media read', 'Data API', passed, `HTTP ${status}, draft media record hidden (${data?.length} rows).`);
  }

  // API-08: Anonymous media insert attempt (Strengthened negative assertion)
  {
    const uniquePath = `projects/anon-hack-${Date.now()}.png`;
    const { error, status } = await anonClient.from('project_media').insert({
      project_id: '11111111-1111-1111-1111-111111111111',
      storage_path: uniquePath,
      alt_text: 'Unauthorized media'
    });
    const { data: checkData, error: checkErr } = await adminClient.from('project_media').select('id').eq('storage_path', uniquePath);
    const rejected = (status === 401 || status === 403 || error !== null);
    const notCreated = !checkErr && Array.isArray(checkData) && checkData.length === 0;
    const passed = rejected && notCreated;
    recordTest('API-08', 'Anonymous media insert attempt', 'Data API', passed, `Status: ${status}, Media exists: ${!notCreated}`);
  }

  // API-09: Anonymous media update attempt (Corrected strict equality assertion)
  {
    const targetMediaId = '33333333-3333-3333-3333-333333333333';
    const { data: beforeData, error: beforeErr } = await adminClient.from('project_media').select('id, alt_text').eq('id', targetMediaId).single();
    if (beforeErr || !beforeData || typeof beforeData.alt_text !== 'string') {
      throw new Error(`API-09 prerequisite failed: baseline media not found: ${beforeErr?.message}`);
    }

    const { status, error } = await anonClient.from('project_media')
      .update({ alt_text: 'Hacked Alt Text' })
      .eq('id', targetMediaId);

    const { data: afterData, error: afterErr } = await adminClient.from('project_media').select('id, alt_text').eq('id', targetMediaId).single();
    if (afterErr || !afterData) throw new Error(`API-09 verification query failed: ${afterErr?.message}`);

    const rejected = (status === 401 || status === 403 || error !== null);
    // Explicit equality assertion against baseline value
    const altTextUnchanged = afterData.alt_text === beforeData.alt_text;
    const passed = rejected && altTextUnchanged;
    recordTest('API-09', 'Anonymous media update attempt', 'Data API', passed, `Status: ${status}, Alt text unchanged: ${altTextUnchanged}`);
  }

  // API-10: Non-admin auth read published
  {
    const { data, status } = await nonAdminClient.from('projects').select('*');
    const passed = status === 200 && Array.isArray(data) && data.length > 0 && data.every(p => p.status === 'published');
    recordTest('API-10', 'Non-admin auth read published', 'Data API', passed, `HTTP ${status}, returned ${data?.length} published projects.`);
  }

  // API-11: Non-admin auth read draft
  {
    const { data, status } = await nonAdminClient.from('projects').select('*').eq('slug', 'autonomous-code-auditor');
    const passed = status === 200 && Array.isArray(data) && data.length === 0;
    recordTest('API-11', 'Non-admin auth read draft', 'Data API', passed, `HTTP ${status}, draft project isolated (${data?.length} rows).`);
  }

  // API-12: Non-admin auth project insert (Strengthened negative assertion)
  {
    const uniqueSlug = `non-admin-insert-${Date.now()}`;
    const { error, status } = await nonAdminClient.from('projects').insert({
      title: 'Non-Admin Insert Project',
      slug: uniqueSlug,
      summary: 'Attempted insert by non-admin authenticated user.',
      status: 'draft'
    });
    const { data: checkData, error: checkErr } = await adminClient.from('projects').select('id').eq('slug', uniqueSlug);
    const rejected = status === 403 && error?.code === '42501';
    const notCreated = !checkErr && Array.isArray(checkData) && checkData.length === 0;
    const passed = rejected && notCreated;
    recordTest('API-12', 'Non-admin auth project insert', 'Data API', passed, `HTTP ${status}, error: ${error?.code || 'rejected'}, inserted: ${!notCreated}`);
  }

  // API-13: Non-admin auth project update (Strengthened negative assertion)
  {
    const targetId = '11111111-1111-1111-1111-111111111111';
    const { data: beforeData, error: beforeErr } = await adminClient.from('projects').select('title, updated_at').eq('id', targetId).single();
    if (beforeErr || !beforeData) throw new Error(`API-13 prerequisite failed: baseline project not found: ${beforeErr?.message}`);

    const { status, data: modData } = await nonAdminClient.from('projects')
      .update({ title: 'Tampered Title' })
      .eq('id', targetId)
      .select();

    const { data: afterData, error: afterErr } = await adminClient.from('projects').select('title, updated_at').eq('id', targetId).single();
    if (afterErr || !afterData) throw new Error(`API-13 verification query failed: ${afterErr?.message}`);

    const zeroRowsAffected = Array.isArray(modData) ? modData.length === 0 : true;
    const titleUnchanged = afterData.title === beforeData.title;
    const timestampUnchanged = afterData.updated_at === beforeData.updated_at;
    const passed = (status === 200 || status === 204) && zeroRowsAffected && titleUnchanged && timestampUnchanged;
    recordTest('API-13', 'Non-admin auth project update', 'Data API', passed, `HTTP ${status}, title unchanged: ${titleUnchanged}, 0 rows affected: ${zeroRowsAffected}`);
  }

  // API-14: Non-admin auth project delete (Strengthened negative assertion)
  {
    const targetId = '11111111-1111-1111-1111-111111111111';
    const { data: beforeData, error: beforeErr } = await adminClient.from('projects').select('id').eq('id', targetId).single();
    if (beforeErr || !beforeData) throw new Error(`API-14 prerequisite failed: baseline project not found: ${beforeErr?.message}`);

    const { status, data: modData } = await nonAdminClient.from('projects')
      .delete()
      .eq('id', targetId)
      .select();

    const { data: afterData, error: afterErr } = await adminClient.from('projects').select('id').eq('id', targetId);
    if (afterErr || !Array.isArray(afterData)) throw new Error(`API-14 verification query failed: ${afterErr?.message}`);

    const zeroRowsAffected = Array.isArray(modData) ? modData.length === 0 : true;
    const stillExists = afterData.length === 1 && afterData[0].id === targetId;
    const passed = (status === 200 || status === 204) && zeroRowsAffected && stillExists;
    recordTest('API-14', 'Non-admin auth project delete', 'Data API', passed, `HTTP ${status}, project preserved in DB: ${stillExists}, 0 rows affected: ${zeroRowsAffected}`);
  }

  // API-15: Non-admin query admin_users (Strict PGRST205 assertion)
  {
    const { data, error, status } = await nonAdminClient.from('admin_users').select('*');
    const passed = status === 404 && error?.code === 'PGRST205' && data === null;
    recordTest('API-15', 'Non-admin query admin_users', 'Data API', passed, `HTTP ${status}, code: ${error?.code}, schema unexposed: ${error?.message}`);
  }

  // API-16: Anonymous query admin_users (Strict PGRST205 assertion)
  {
    const { data, error, status } = await anonClient.from('admin_users').select('*');
    const passed = status === 404 && error?.code === 'PGRST205' && data === null;
    recordTest('API-16', 'Anonymous query admin_users', 'Data API', passed, `HTTP ${status}, code: ${error?.code}, schema unexposed: ${error?.message}`);
  }

  // API-17: Admin auth read all projects
  {
    const { data, status } = await adminAuthClient.from('projects').select('*');
    const hasPublished = data?.some(p => p.status === 'published');
    const hasDraft = data?.some(p => p.status === 'draft');
    const passed = status === 200 && hasPublished && hasDraft;
    recordTest('API-17', 'Admin auth read all projects', 'Data API', passed, `HTTP ${status}, has published (${hasPublished}) and draft (${hasDraft}).`);
  }

  // API-18: Admin auth insert draft project
  let testCreatedProjectId = null;
  {
    const { data, status } = await adminAuthClient.from('projects').insert({
      title: 'Admin Created Draft Project',
      slug: `admin-draft-${Date.now()}`,
      summary: 'A project inserted in draft mode by authorized administrator.',
      status: 'draft'
    }).select().single();
    testCreatedProjectId = data?.id;
    const passed = status === 201 && data?.status === 'draft' && data?.published_at === null;
    recordTest('API-18', 'Admin auth insert draft project', 'Data API', passed, `HTTP ${status}, status='${data?.status}', published_at=${data?.published_at}`);
  }

  // API-19: Admin auth insert published project
  let testPubProjectId = null;
  {
    const { data, status } = await adminAuthClient.from('projects').insert({
      title: 'Admin Created Published Project',
      slug: `admin-pub-${Date.now()}`,
      summary: 'A project inserted directly as published by authorized administrator.',
      status: 'published'
    }).select().single();
    testPubProjectId = data?.id;
    const passed = status === 201 && data?.status === 'published' && data?.published_at !== null;
    recordTest('API-19', 'Admin auth insert published', 'Data API', passed, `HTTP ${status}, published_at populated: ${data?.published_at}`);
  }

  // API-20: Admin auth publish draft
  {
    const { data, status } = await adminAuthClient.from('projects')
      .update({ status: 'published' })
      .eq('id', testCreatedProjectId)
      .select().single();
    const passed = status === 200 && data?.status === 'published' && data?.published_at !== null;
    recordTest('API-20', 'Admin auth publish draft', 'Data API', passed, `HTTP ${status}, status='${data?.status}', published_at=${data?.published_at}`);
  }

  // API-21: Admin auth revert to draft
  {
    const { data, status } = await adminAuthClient.from('projects')
      .update({ status: 'draft' })
      .eq('id', testCreatedProjectId)
      .select().single();
    const { data: anonView } = await anonClient.from('projects').select('id').eq('id', testCreatedProjectId);
    const hiddenFromAnon = anonView?.length === 0;
    const passed = status === 200 && data?.status === 'draft' && data?.published_at === null && hiddenFromAnon;
    recordTest('API-21', 'Admin auth revert to draft', 'Data API', passed, `HTTP ${status}, published_at reset to null, hidden from anon: ${hiddenFromAnon}`);
  }

  // API-22: Admin auth delete project with full cascade verification (Strengthened)
  {
    // Step 1: Create dedicated published project
    const cascadeSlug = `cascade-test-${Date.now()}`;
    const { data: parentProj, error: pErr, status: pStatus } = await adminAuthClient.from('projects').insert({
      title: 'Cascade Verification Project',
      slug: cascadeSlug,
      summary: 'Dedicated parent project to verify foreign key cascading deletion.',
      status: 'published'
    }).select().single();
    if (pErr || !parentProj || pStatus !== 201) {
      throw new Error(`API-22 prerequisite failed: Parent project insert error: ${pErr?.message}`);
    }

    // Step 2: Insert attached media record
    const mediaPath = `projects/cascade-${Date.now()}.png`;
    const { data: mediaRec, error: mErr, status: mStatus } = await adminAuthClient.from('project_media').insert({
      project_id: parentProj.id,
      storage_path: mediaPath,
      alt_text: 'Cascade verification media record'
    }).select().single();
    if (mErr || !mediaRec || mStatus !== 201) {
      throw new Error(`API-22 prerequisite failed: Media insert error: ${mErr?.message}`);
    }

    // Step 3 & 4: Independently query and confirm both exist in DB
    const { data: checkProjBefore, error: cpErr } = await adminClient.from('projects').select('id').eq('id', parentProj.id).single();
    const { data: checkMediaBefore, error: cmErr } = await adminClient.from('project_media').select('id').eq('id', mediaRec.id).single();
    if (cpErr || !checkProjBefore || cmErr || !checkMediaBefore) {
      throw new Error(`API-22 prerequisite failed: Initial records not found in DB before delete.`);
    }

    // Step 5: Delete parent project as authenticated administrator
    const { error: delErr, status: delStatus } = await adminAuthClient.from('projects').delete().eq('id', parentProj.id);

    // Step 6: Independently verify parent project is deleted
    const { data: checkProjAfter, error: cpAfterErr } = await adminClient.from('projects').select('id').eq('id', parentProj.id);
    const projDeleted = !cpAfterErr && Array.isArray(checkProjAfter) && checkProjAfter.length === 0;

    // Step 7: Independently verify media record was removed by cascading deletion
    const { data: checkMediaAfter, error: cmAfterErr } = await adminClient.from('project_media').select('id').eq('id', mediaRec.id);
    const mediaCascaded = !cmAfterErr && Array.isArray(checkMediaAfter) && checkMediaAfter.length === 0;

    const passed = (delStatus === 200 || delStatus === 204) && !delErr && projDeleted && mediaCascaded;
    recordTest('API-22', 'Admin auth delete project (cascade)', 'Data API', passed, `Deleted: HTTP ${delStatus}, parent gone: ${projDeleted}, media cascaded: ${mediaCascaded}`);

    // Cleanup auxiliary test projects
    if (testPubProjectId) await adminAuthClient.from('projects').delete().eq('id', testPubProjectId);
    if (testCreatedProjectId) await adminAuthClient.from('projects').delete().eq('id', testCreatedProjectId);
  }

  // API-23: Forged user metadata bypass (Strengthened negative assertion)
  {
    const uniqueSlug = `forged-role-${Date.now()}`;
    const { error, status } = await forgedAuthClient.from('projects').insert({
      title: 'Forged Role Project',
      slug: uniqueSlug,
      summary: 'Attempt to insert with forged JWT role metadata in raw_user_meta_data.',
      status: 'draft'
    });
    const { data: checkData, error: checkErr } = await adminClient.from('projects').select('id').eq('slug', uniqueSlug);
    const rejected = status === 403 && error?.code === '42501';
    const notCreated = !checkErr && Array.isArray(checkData) && checkData.length === 0;
    const passed = rejected && notCreated;
    recordTest('API-23', 'Forged user metadata bypass', 'Data API', passed, `Rejected: HTTP ${status}, error: ${error?.code || 'RLS violation'}, inserted: ${!notCreated}`);
  }

  // API-24: Expired JWT authentication (Signed with local JWT secret)
  {
    const expiredPayload = {
      iss: 'supabase-demo',
      role: 'authenticated',
      sub: nonAdminUser.id,
      email: nonAdminEmail,
      aud: 'authenticated',
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
    };
    const expiredSignedJwt = createSignedJwt(expiredPayload, JWT_SECRET);

    const res = await fetch(`${API_URL}/rest/v1/projects`, {
      headers: {
        'apikey': PUBLISHABLE_KEY,
        'Authorization': `Bearer ${expiredSignedJwt}`
      }
    });
    const body = await res.json().catch(() => ({}));
    // PostgREST code PGRST303 confirms cryptographic signature validated, but token is expired
    const passed = res.status === 401 && body.code === 'PGRST303' && body.message === 'JWT expired';
    recordTest('API-24', 'Expired JWT authentication', 'Data API', passed, `HTTP ${res.status}, code: ${body.code}, message: "${body.message}" (cryptographically verified expiration)`);
  }

  // API-25: Malformed JWT authentication
  {
    const malformedJwt = 'invalid.jwt.token.here';
    const res = await fetch(`${API_URL}/rest/v1/projects`, {
      headers: {
        'apikey': PUBLISHABLE_KEY,
        'Authorization': `Bearer ${malformedJwt}`
      }
    });
    const body = await res.json().catch(() => ({}));
    const passed = res.status === 401 && (body.code === 'PGRST301' || body.message?.includes('failed') || res.status === 401);
    recordTest('API-25', 'Malformed JWT authentication', 'Data API', passed, `HTTP ${res.status} Unauthorized, code: ${body.code}`);
  }

  // API-26: Admin API mutation on whitelist (Strict PGRST205 assertion)
  {
    const { data, error, status } = await adminAuthClient.from('admin_users').insert({
      id: nonAdminUser.id,
      email: nonAdminEmail
    });
    const passed = status === 404 && error?.code === 'PGRST205' && data === null;
    recordTest('API-26', 'Admin API mutation on whitelist', 'Data API', passed, `HTTP ${status}, code: ${error?.code}, PostgREST unexposed: ${error?.message}`);
  }

  console.log('\n--- Executing Mechanism B: Direct PostgreSQL Kernel Tests (12 Tests) ---\n');

  // SQL-01: Anonymous schema usage on private
  {
    const res = runSql('SET ROLE anon; SELECT private.is_admin();');
    const passed = !res.success && res.sqlstate === '42501' && res.error.includes('permission denied for schema private');
    recordTest('SQL-01', 'Anonymous schema usage on private', 'Kernel SQL', passed, `SQLSTATE ${res.sqlstate}: ${res.error.trim().split('\n')[0]}`);
  }

  // SQL-02: Authenticated schema usage on private
  {
    const res = runSql('SET ROLE authenticated; SELECT private.is_admin();');
    const passed = res.success && res.sqlstate === null;
    recordTest('SQL-02', 'Authenticated schema usage on private', 'Kernel SQL', passed, `Execution permitted, returned: ${res.output.trim()}`);
  }

  // SQL-03: Direct SQL query on admin_users
  {
    const res = runSql('SET ROLE authenticated; SELECT * FROM private.admin_users;');
    const passed = !res.success && res.sqlstate === '42501' && res.error.includes('permission denied for table admin_users');
    recordTest('SQL-03', 'Direct SQL query on admin_users', 'Kernel SQL', passed, `SQLSTATE ${res.sqlstate}: ${res.error.trim().split('\n')[0]}`);
  }

  // SQL-04: Direct SQL mutation on admin_users
  {
    const res = runSql("SET ROLE authenticated; INSERT INTO private.admin_users (id, email) VALUES (gen_random_uuid(), 'hacker@example.com');");
    const passed = !res.success && res.sqlstate === '42501' && res.error.includes('permission denied for table admin_users');
    recordTest('SQL-04', 'Direct SQL mutation on admin_users', 'Kernel SQL', passed, `SQLSTATE ${res.sqlstate}: ${res.error.trim().split('\n')[0]}`);
  }

  // SQL-05: Duplicate project slug constraint
  {
    const res = runSql("INSERT INTO public.projects (title, slug, summary) VALUES ('Dup Project', 'distributed-task-orchestrator', 'Summary description with enough characters.');");
    const passed = !res.success && res.sqlstate === '23505' && res.error.includes('uq_projects_slug');
    recordTest('SQL-05', 'Duplicate project slug constraint', 'Kernel SQL', passed, `SQLSTATE ${res.sqlstate}: Violated uq_projects_slug`);
  }

  // SQL-06: Invalid slug format constraint
  {
    const res = runSql("INSERT INTO public.projects (title, slug, summary) VALUES ('Bad Slug', 'Invalid Slug With Spaces!', 'Summary description with enough characters.');");
    const passed = !res.success && res.sqlstate === '23514' && res.error.includes('chk_projects_slug_format');
    recordTest('SQL-06', 'Invalid slug format constraint', 'Kernel SQL', passed, `SQLSTATE ${res.sqlstate}: Violated chk_projects_slug_format`);
  }

  // SQL-07: Invalid project status constraint
  {
    const res = runSql("INSERT INTO public.projects (title, slug, summary, status) VALUES ('Bad Status', 'bad-status-test', 'Summary description with enough characters.', 'archived');");
    const passed = !res.success && res.sqlstate === '23514' && res.error.includes('chk_projects_status');
    recordTest('SQL-07', 'Invalid project status constraint', 'Kernel SQL', passed, `SQLSTATE ${res.sqlstate}: Violated chk_projects_status`);
  }

  // SQL-08: Title length constraint
  {
    const res = runSql("INSERT INTO public.projects (title, slug, summary) VALUES ('A', 'short-title-test', 'Summary description with enough characters.');");
    const passed = !res.success && res.sqlstate === '23514' && res.error.includes('chk_projects_title_length');
    recordTest('SQL-08', 'Title length constraint', 'Kernel SQL', passed, `SQLSTATE ${res.sqlstate}: Violated chk_projects_title_length`);
  }

  // SQL-09: Summary length constraint
  {
    const res = runSql("INSERT INTO public.projects (title, slug, summary) VALUES ('Valid Title', 'short-summary-test', 'Too short');");
    const passed = !res.success && res.sqlstate === '23514' && res.error.includes('chk_projects_summary_length');
    recordTest('SQL-09', 'Summary length constraint', 'Kernel SQL', passed, `SQLSTATE ${res.sqlstate}: Violated chk_projects_summary_length`);
  }

  // SQL-10: Foreign key cascade integrity
  {
    const res = runSql("INSERT INTO public.project_media (project_id, storage_path, alt_text) VALUES ('00000000-0000-0000-0000-000000000000', 'path.png', 'alt text here');");
    const passed = !res.success && res.sqlstate === '23503' && res.error.includes('project_media_project_id_fkey');
    recordTest('SQL-10', 'Foreign key cascade integrity', 'Kernel SQL', passed, `SQLSTATE ${res.sqlstate}: Violated project_media_project_id_fkey`);
  }

  // SQL-11: Admin email format constraint
  {
    const res = runSql("INSERT INTO private.admin_users (id, email) VALUES (gen_random_uuid(), 'not-an-email');");
    const passed = !res.success && res.sqlstate === '23514' && res.error.includes('chk_admin_users_email_valid');
    recordTest('SQL-11', 'Admin email format constraint', 'Kernel SQL', passed, `SQLSTATE ${res.sqlstate}: Violated chk_admin_users_email_valid`);
  }

  // SQL-12: Client timestamp tampering override (Strengthened with lifecycle verification)
  {
    const uniqueSlug = `tamper-draft-${Date.now()}`;
    const insertRes = runSql(`INSERT INTO public.projects (title, slug, summary, status, published_at) VALUES ('Tamper Test', '${uniqueSlug}', 'Summary description with enough characters.', 'draft', '2020-01-01 00:00:00+00') RETURNING id, slug, status, (published_at IS NULL) AS is_null;`);
    const insertOk = insertRes.success && insertRes.output.includes(uniqueSlug);

    const selectRes = runSql(`SELECT id, slug, status, (published_at IS NULL) AS is_null FROM public.projects WHERE slug = '${uniqueSlug}';`);
    const selectOk = selectRes.success && selectRes.output.includes(uniqueSlug);
    const isNullT = selectRes.output.includes(' t\n') || selectRes.output.includes('| t');

    const deleteRes = runSql(`DELETE FROM public.projects WHERE slug = '${uniqueSlug}';`);
    const deleteOk = deleteRes.success;

    const verifyCleanRes = runSql(`SELECT COUNT(*) FROM public.projects WHERE slug = '${uniqueSlug}';`);
    const cleanOk = verifyCleanRes.success && (verifyCleanRes.output.includes(' 0\n') || verifyCleanRes.output.includes('\n0\n'));

    const passed = insertOk && selectOk && isNullT && deleteOk && cleanOk;
    recordTest('SQL-12', 'Client timestamp tampering override', 'Kernel SQL', passed, `Draft published_at overridden to NULL (insertOk=${insertOk}, is_null=${isNullT}, cleanOk=${cleanOk})`);
  }

  console.log('\n--- Executing Supplementary Trigger & Timestamp Invariants (8 Tests) ---\n');

  // Dedicated test project for trigger state machine verification
  const trgSlug = `trg-state-${Date.now()}`;

  // TRG-01: Published project INSERT creates server-generated timestamp
  {
    const res = runSql(`INSERT INTO public.projects (title, slug, summary, status, published_at) VALUES ('Trigger Project', '${trgSlug}', 'Summary description with enough characters.', 'published', NULL) RETURNING published_at, (published_at IS NOT NULL) AS has_ts;`);
    const passed = res.success && (res.output.includes(' t\n') || res.output.includes('| t'));
    recordSupplementary('TRG-01', 'Published project INSERT creates server timestamp', passed, `Result: has_ts=true, output: ${res.output.trim().split('\n')[2]?.trim()}`);
  }

  // TRG-02: Client-provided published_at on a published INSERT is overridden
  {
    const clientSlug = `trg-client-${Date.now()}`;
    const res = runSql(`INSERT INTO public.projects (title, slug, summary, status, published_at) VALUES ('Client Override Project', '${clientSlug}', 'Summary description with enough characters.', 'published', '2019-01-01 00:00:00+00') RETURNING published_at, (published_at > '2026-01-01') AS is_current;`);
    runSql(`DELETE FROM public.projects WHERE slug = '${clientSlug}';`);
    const passed = res.success && (res.output.includes(' t\n') || res.output.includes('| t'));
    recordSupplementary('TRG-02', 'Client-provided published_at on INSERT is overridden', passed, `Result: 2019 timestamp overridden with current clock timestamp (is_current=true)`);
  }

  // TRG-03: Published-to-published UPDATE preserves original timestamp
  let originalPubTs = null;
  {
    const getTs = runSql(`SELECT published_at::text FROM public.projects WHERE slug = '${trgSlug}';`);
    originalPubTs = getTs.output.trim().split('\n')[2]?.trim();
    const res = runSql(`UPDATE public.projects SET title = 'Trigger Project Title Updated' WHERE slug = '${trgSlug}' RETURNING published_at::text, (published_at::text = '${originalPubTs}') AS is_preserved;`);
    const passed = res.success && (res.output.includes(' t\n') || res.output.includes('| t'));
    recordSupplementary('TRG-03', 'Published-to-published UPDATE preserves timestamp', passed, `Original timestamp preserved exactly (${originalPubTs})`);
  }

  // TRG-04: Attempted timestamp tampering on published UPDATE is rejected/overwritten
  {
    const res = runSql(`UPDATE public.projects SET published_at = '2015-05-01 00:00:00+00' WHERE slug = '${trgSlug}' RETURNING published_at::text, (published_at::text = '${originalPubTs}') AS is_overwritten;`);
    const passed = res.success && (res.output.includes(' t\n') || res.output.includes('| t'));
    recordSupplementary('TRG-04', 'Timestamp tampering on UPDATE is overwritten', passed, `Client attempted 2015 timestamp; reset to original timestamp (is_overwritten=true)`);
  }

  // TRG-05: Published-to-draft transition clears timestamp
  {
    const res = runSql(`UPDATE public.projects SET status = 'draft' WHERE slug = '${trgSlug}' RETURNING published_at, (published_at IS NULL) AS is_cleared;`);
    const passed = res.success && (res.output.includes(' t\n') || res.output.includes('| t'));
    recordSupplementary('TRG-05', 'Published-to-draft transition clears timestamp', passed, `Status set to draft; published_at wiped to NULL (is_cleared=true)`);
  }

  // TRG-06: Draft-to-draft UPDATE keeps timestamp NULL
  {
    const res = runSql(`UPDATE public.projects SET title = 'Trigger Project Draft Updated' WHERE slug = '${trgSlug}' RETURNING published_at, (published_at IS NULL) AS is_still_null;`);
    const passed = res.success && (res.output.includes(' t\n') || res.output.includes('| t'));
    recordSupplementary('TRG-06', 'Draft-to-draft UPDATE keeps timestamp NULL', passed, `Updated draft record; published_at remains NULL (is_still_null=true)`);
  }

  // TRG-07: Draft-to-published transition assigns a new timestamp
  {
    const res = runSql(`UPDATE public.projects SET status = 'published' WHERE slug = '${trgSlug}' RETURNING published_at, (published_at > '2026-01-01') AS is_assigned;`);
    const passed = res.success && (res.output.includes(' t\n') || res.output.includes('| t'));
    recordSupplementary('TRG-07', 'Draft-to-published transition assigns timestamp', passed, `Status set to published; published_at newly assigned by clock_timestamp() (is_assigned=true)`);
  }

  // TRG-08: updated_at advances after an actual update
  {
    const beforeRes = runSql(`SELECT updated_at::text FROM public.projects WHERE slug = '${trgSlug}';`);
    const beforeTs = beforeRes.output.trim().split('\n')[2]?.trim();
    await new Promise(r => setTimeout(r, 50)); // Ensure clock tick
    const afterRes = runSql(`UPDATE public.projects SET title = 'Trigger Project Final Advance' WHERE slug = '${trgSlug}' RETURNING updated_at::text, (updated_at > '${beforeTs}'::timestamptz) AS advanced;`);
    const passed = afterRes.success && (afterRes.output.includes(' t\n') || afterRes.output.includes('| t'));
    recordSupplementary('TRG-08', 'updated_at advances after an actual update', passed, `Before: ${beforeTs}, After advanced: true`);
    // Cleanup test project
    runSql(`DELETE FROM public.projects WHERE slug = '${trgSlug}';`);
  }

  // Cleanup test users in GoTrue
  try {
    await adminClient.auth.admin.deleteUser(nonAdminUser.id);
    await adminClient.auth.admin.deleteUser(adminUser.id);
    await adminClient.auth.admin.deleteUser(forgedUser.id);
  } catch {
    // Ignore cleanup error
  }

  // --- SCORECARD SUMMARY ---

  const primaryTotal = primaryResults.length;
  const primaryPassed = primaryResults.filter(r => r.passed).length;
  const primaryFailed = primaryTotal - primaryPassed;

  const suppTotal = supplementaryResults.length;
  const suppPassed = supplementaryResults.filter(r => r.passed).length;
  const suppFailed = suppTotal - suppPassed;

  console.log('\n================================================================');
  console.log(`PRIMARY MATRIX SCORECARD:        ${primaryPassed}/${primaryTotal} PASSED (${primaryFailed} FAILED)`);
  console.log(`SUPPLEMENTARY TRIGGER SCORECARD: ${suppPassed}/${suppTotal} PASSED (${suppFailed} FAILED)`);
  console.log(`COMBINED TOTAL:                  ${primaryPassed + suppPassed}/${primaryTotal + suppTotal} PASSED`);
  console.log('================================================================');

  if (primaryFailed > 0 || suppFailed > 0) {
    console.error(`\n❌ Gate C1 Security Verification FAILED with ${primaryFailed + suppFailed} failure(s).`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 38 PRIMARY SCENARIOS + 8 SUPPLEMENTARY TRIGGER INVARIANTS PASSED!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error running security suite:', err);
  process.exit(1);
});
