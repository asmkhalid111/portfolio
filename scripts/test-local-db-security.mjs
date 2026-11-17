// scripts/test-local-db-security.mjs
// Automated verification suite for M02 Gate C1: Local Database & RLS Security
// Executes all 38 test scenarios from docs/milestones/M02-database/RLS_MATRIX.md (v0.3)
// Mechanism A: 26 Data API Tests (over HTTP/REST via @supabase/supabase-js)
// Mechanism B: 12 Direct PostgreSQL Tests (via docker exec psql with controlled role contexts)

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

const API_URL = 'http://127.0.0.1:54321';
const PUBLISHABLE_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const results = [];

function recordTest(id, name, mechanism, passed, details) {
  results.push({ id, name, mechanism, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] ${id}: ${name} (${mechanism})`);
  if (!passed || details) {
    console.log(`       Details: ${details}`);
  }
}

function runSql(command) {
  try {
    const cmd = `docker exec supabase_db_Portfolio psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "${command.replace(/"/g, '\\"')}"`;
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { success: true, output, error: null };
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : err.message;
    return { success: false, output: err.stdout ? err.stdout.toString() : '', error: stderr };
  }
}

async function main() {
  console.log('================================================================');
  console.log('M02 Gate C1: 38-Test Local Database & RLS Security Suite');
  console.log('Target: Local Supabase Stack (127.0.0.1:54321 / 54322)');
  console.log('================================================================\n');

  // Wait for local Kong & GoTrue endpoints to be ready
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

  // 1. Initialize Service-Role Admin Client
  const adminClient = createClient(API_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // 2. Prepare test Auth users
  console.log('--- Setting up test Auth identities in local GoTrue ---');
  const nonAdminEmail = 'test-nonadmin@example.com';
  const adminEmail = 'test-admin@example.com';
  const forgedEmail = 'test-forged@example.com';
  const testPassword = 'TestPassword123!@#';

  // Helper to get or create test user
  async function ensureUser(email, userMetadata = {}) {
    const { data: usersData } = await adminClient.auth.admin.listUsers();
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

  // API-03: Anonymous direct project insert
  {
    const { error, status } = await anonClient.from('projects').insert({
      title: 'Hacked Project',
      slug: 'hacked-project',
      summary: 'Unauthorized project insertion attempt by anonymous actor.',
      status: 'published'
    });
    const { data: checkData } = await adminClient.from('projects').select('id').eq('slug', 'hacked-project');
    const notCreated = checkData?.length === 0;
    const passed = (status === 401 || status === 403 || error !== null) && notCreated;
    recordTest('API-03', 'Anonymous direct project insert', 'Data API', passed, `Rejected with HTTP ${status}. Project exists in DB: ${!notCreated}`);
  }

  // API-04: Anonymous direct project update
  {
    const { status } = await anonClient.from('projects')
      .update({ title: 'Hacked Title' })
      .eq('id', '11111111-1111-1111-1111-111111111111');
    const { data: checkData } = await adminClient.from('projects').select('title').eq('id', '11111111-1111-1111-1111-111111111111').single();
    const unchanged = checkData?.title === 'Distributed Task Orchestrator';
    const passed = unchanged;
    recordTest('API-04', 'Anonymous direct project update', 'Data API', passed, `Status: ${status}, Title unchanged: ${unchanged}`);
  }

  // API-05: Anonymous direct project delete
  {
    const { status } = await anonClient.from('projects')
      .delete()
      .eq('id', '11111111-1111-1111-1111-111111111111');
    const { data: checkData } = await adminClient.from('projects').select('id').eq('id', '11111111-1111-1111-1111-111111111111');
    const stillExists = checkData?.length === 1;
    const passed = stillExists;
    recordTest('API-05', 'Anonymous direct project delete', 'Data API', passed, `Status: ${status}, Project preserved in DB: ${stillExists}`);
  }

  // API-06: Anonymous published media read
  {
    const { data, status } = await anonClient.from('project_media').select('*').eq('id', '33333333-3333-3333-3333-333333333333');
    const passed = status === 200 && data?.length === 1;
    recordTest('API-06', 'Anonymous published media read', 'Data API', passed, `HTTP ${status}, published media record retrieved.`);
  }

  // API-07: Anonymous draft media read
  {
    const { data, status } = await anonClient.from('project_media').select('*').eq('id', '44444444-4444-4444-4444-444444444444');
    const passed = status === 200 && data?.length === 0;
    recordTest('API-07', 'Anonymous draft media read', 'Data API', passed, `HTTP ${status}, draft media record hidden (${data?.length} rows).`);
  }

  // API-08: Anonymous media insert attempt
  {
    const { error, status } = await anonClient.from('project_media').insert({
      project_id: '11111111-1111-1111-1111-111111111111',
      storage_path: 'projects/hacked.png',
      alt_text: 'Unauthorized media'
    });
    const { data: checkData } = await adminClient.from('project_media').select('id').eq('storage_path', 'projects/hacked.png');
    const notCreated = checkData?.length === 0;
    const passed = (status === 401 || status === 403 || error !== null) && notCreated;
    recordTest('API-08', 'Anonymous media insert attempt', 'Data API', passed, `Status: ${status}, Media exists: ${!notCreated}`);
  }

  // API-09: Anonymous media update attempt
  {
    const { status } = await anonClient.from('project_media')
      .update({ alt_text: 'Hacked Alt Text' })
      .eq('id', '33333333-3333-3333-3333-333333333333');
    const { data: checkData } = await adminClient.from('project_media').select('alt_text').eq('id', '33333333-3333-3333-3333-333333333333').single();
    const unchanged = checkData?.alt_text !== 'Hacked Alt Text';
    const passed = unchanged;
    recordTest('API-09', 'Anonymous media update attempt', 'Data API', passed, `Status: ${status}, Alt text unchanged: ${unchanged}`);
  }

  // API-10: Non-admin auth read published
  {
    const { data, status } = await nonAdminClient.from('projects').select('*');
    const passed = status === 200 && data?.length > 0 && data.every(p => p.status === 'published');
    recordTest('API-10', 'Non-admin auth read published', 'Data API', passed, `HTTP ${status}, returned ${data?.length} published projects.`);
  }

  // API-11: Non-admin auth read draft
  {
    const { data, status } = await nonAdminClient.from('projects').select('*').eq('slug', 'autonomous-code-auditor');
    const passed = status === 200 && data?.length === 0;
    recordTest('API-11', 'Non-admin auth read draft', 'Data API', passed, `HTTP ${status}, draft project isolated (${data?.length} rows).`);
  }

  // API-12: Non-admin auth project insert
  {
    const { error, status } = await nonAdminClient.from('projects').insert({
      title: 'Non-Admin Insert Project',
      slug: 'non-admin-insert',
      summary: 'Attempted insert by non-admin authenticated user.',
      status: 'draft'
    });
    const { data: checkData } = await adminClient.from('projects').select('id').eq('slug', 'non-admin-insert');
    const notCreated = checkData?.length === 0;
    const passed = (status === 403 || error !== null) && notCreated;
    recordTest('API-12', 'Non-admin auth project insert', 'Data API', passed, `HTTP ${status}, error: ${error?.code || 'rejected'}, inserted: ${!notCreated}`);
  }

  // API-13: Non-admin auth project update
  {
    const { status } = await nonAdminClient.from('projects')
      .update({ title: 'Tampered Title' })
      .eq('id', '11111111-1111-1111-1111-111111111111');
    const { data: checkData } = await adminClient.from('projects').select('title').eq('id', '11111111-1111-1111-1111-111111111111').single();
    const unchanged = checkData?.title === 'Distributed Task Orchestrator';
    const passed = unchanged;
    recordTest('API-13', 'Non-admin auth project update', 'Data API', passed, `HTTP ${status}, original title unchanged: ${unchanged}`);
  }

  // API-14: Non-admin auth project delete
  {
    const { status } = await nonAdminClient.from('projects')
      .delete()
      .eq('id', '11111111-1111-1111-1111-111111111111');
    const { data: checkData } = await adminClient.from('projects').select('id').eq('id', '11111111-1111-1111-1111-111111111111');
    const stillExists = checkData?.length === 1;
    const passed = stillExists;
    recordTest('API-14', 'Non-admin auth project delete', 'Data API', passed, `HTTP ${status}, project preserved in DB: ${stillExists}`);
  }

  // API-15: Non-admin query admin_users
  {
    const { data, error, status } = await nonAdminClient.from('admin_users').select('*');
    const passed = status === 404 && error?.code === 'PGRST205' && data === null;
    recordTest('API-15', 'Non-admin query admin_users', 'Data API', passed, `HTTP ${status}, code: ${error?.code}, schema unexposed: ${error?.message}`);
  }

  // API-16: Anonymous query admin_users
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
      slug: 'admin-created-draft',
      summary: 'A project inserted in draft mode by authorized administrator.',
      status: 'draft'
    }).select().single();
    testCreatedProjectId = data?.id;
    const passed = status === 201 && data?.status === 'draft' && data?.published_at === null;
    recordTest('API-18', 'Admin auth insert draft project', 'Data API', passed, `HTTP ${status}, status='${data?.status}', published_at=${data?.published_at}`);
  }

  // API-19: Admin auth insert published
  let testPubProjectId = null;
  {
    const { data, status } = await adminAuthClient.from('projects').insert({
      title: 'Admin Created Published Project',
      slug: 'admin-created-published',
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

  // API-22: Admin auth delete project (with cascade media check)
  {
    await adminAuthClient.from('project_media').insert({
      project_id: testPubProjectId,
      storage_path: 'projects/test-cascade.png',
      alt_text: 'Cascade media test'
    });
    const { status } = await adminAuthClient.from('projects').delete().eq('id', testPubProjectId);
    const { data: projCheck } = await adminClient.from('projects').select('id').eq('id', testPubProjectId);
    const { data: mediaCheck } = await adminClient.from('project_media').select('id').eq('storage_path', 'projects/test-cascade.png');
    const passed = (status === 200 || status === 204) && projCheck?.length === 0 && mediaCheck?.length === 0;
    recordTest('API-22', 'Admin auth delete project', 'Data API', passed, `HTTP ${status}, project and cascaded media deleted.`);
    if (testCreatedProjectId) {
      await adminAuthClient.from('projects').delete().eq('id', testCreatedProjectId);
    }
  }

  // API-23: Forged user metadata bypass
  {
    const { error, status } = await forgedAuthClient.from('projects').insert({
      title: 'Forged Role Project',
      slug: 'forged-role-project',
      summary: 'Attempt to insert with forged JWT role metadata in raw_user_meta_data.',
      status: 'draft'
    });
    const { data: checkData } = await adminClient.from('projects').select('id').eq('slug', 'forged-role-project');
    const notCreated = checkData?.length === 0;
    const passed = (status === 403 || error !== null) && notCreated;
    recordTest('API-23', 'Forged user metadata bypass', 'Data API', passed, `Rejected: HTTP ${status}, error: ${error?.code || 'RLS violation'}, inserted: ${!notCreated}`);
  }

  // API-24: Expired JWT authentication
  {
    const expiredJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjEwMDB9.x';
    const res = await fetch(`${API_URL}/rest/v1/projects`, {
      headers: {
        'apikey': PUBLISHABLE_KEY,
        'Authorization': `Bearer ${expiredJwt}`
      }
    });
    const passed = res.status === 401;
    recordTest('API-24', 'Expired JWT authentication', 'Data API', passed, `HTTP ${res.status} Unauthorized.`);
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
    const passed = res.status === 401;
    recordTest('API-25', 'Malformed JWT authentication', 'Data API', passed, `HTTP ${res.status} Unauthorized.`);
  }

  // API-26: Admin API mutation on whitelist
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
    const passed = !res.success && res.error.includes('permission denied for schema private');
    recordTest('SQL-01', 'Anonymous schema usage on private', 'Kernel SQL', passed, `Denied as expected: ${res.error.trim().split('\n')[0]}`);
  }

  // SQL-02: Authenticated schema usage on private
  {
    const res = runSql('SET ROLE authenticated; SELECT private.is_admin();');
    const passed = res.success;
    recordTest('SQL-02', 'Authenticated schema usage on private', 'Kernel SQL', passed, `Execution permitted, returned: ${res.output.trim()}`);
  }

  // SQL-03: Direct SQL query on admin_users
  {
    const res = runSql('SET ROLE authenticated; SELECT * FROM private.admin_users;');
    const passed = !res.success && res.error.includes('permission denied for table admin_users');
    recordTest('SQL-03', 'Direct SQL query on admin_users', 'Kernel SQL', passed, `Denied as expected: ${res.error.trim().split('\n')[0]}`);
  }

  // SQL-04: Direct SQL mutation on admin_users
  {
    const res = runSql("SET ROLE authenticated; INSERT INTO private.admin_users (id, email) VALUES (gen_random_uuid(), 'hacker@example.com');");
    const passed = !res.success && res.error.includes('permission denied for table admin_users');
    recordTest('SQL-04', 'Direct SQL mutation on admin_users', 'Kernel SQL', passed, `Denied as expected: ${res.error.trim().split('\n')[0]}`);
  }

  // SQL-05: Duplicate project slug constraint
  {
    const res = runSql("INSERT INTO public.projects (title, slug, summary) VALUES ('Dup Project', 'distributed-task-orchestrator', 'Summary description with enough characters.');");
    const passed = !res.success && (res.error.includes('uq_projects_slug') || res.error.includes('23505'));
    recordTest('SQL-05', 'Duplicate project slug constraint', 'Kernel SQL', passed, `Violated uq_projects_slug: ${res.error.trim().split('\n')[0]}`);
  }

  // SQL-06: Invalid slug format constraint
  {
    const res = runSql("INSERT INTO public.projects (title, slug, summary) VALUES ('Bad Slug', 'Invalid Slug With Spaces!', 'Summary description with enough characters.');");
    const passed = !res.success && (res.error.includes('chk_projects_slug_format') || res.error.includes('23514'));
    recordTest('SQL-06', 'Invalid slug format constraint', 'Kernel SQL', passed, `Violated chk_projects_slug_format: ${res.error.trim().split('\n')[0]}`);
  }

  // SQL-07: Invalid project status constraint
  {
    const res = runSql("INSERT INTO public.projects (title, slug, summary, status) VALUES ('Bad Status', 'bad-status-test', 'Summary description with enough characters.', 'archived');");
    const passed = !res.success && (res.error.includes('chk_projects_status') || res.error.includes('23514'));
    recordTest('SQL-07', 'Invalid project status constraint', 'Kernel SQL', passed, `Violated chk_projects_status: ${res.error.trim().split('\n')[0]}`);
  }

  // SQL-08: Title length constraint
  {
    const res = runSql("INSERT INTO public.projects (title, slug, summary) VALUES ('A', 'short-title-test', 'Summary description with enough characters.');");
    const passed = !res.success && (res.error.includes('chk_projects_title_length') || res.error.includes('23514'));
    recordTest('SQL-08', 'Title length constraint', 'Kernel SQL', passed, `Violated chk_projects_title_length: ${res.error.trim().split('\n')[0]}`);
  }

  // SQL-09: Summary length constraint
  {
    const res = runSql("INSERT INTO public.projects (title, slug, summary) VALUES ('Valid Title', 'short-summary-test', 'Too short');");
    const passed = !res.success && (res.error.includes('chk_projects_summary_length') || res.error.includes('23514'));
    recordTest('SQL-09', 'Summary length constraint', 'Kernel SQL', passed, `Violated chk_projects_summary_length: ${res.error.trim().split('\n')[0]}`);
  }

  // SQL-10: Foreign key cascade integrity
  {
    const res = runSql("INSERT INTO public.project_media (project_id, storage_path, alt_text) VALUES ('00000000-0000-0000-0000-000000000000', 'path.png', 'alt text here');");
    const passed = !res.success && (res.error.includes('foreign_key') || res.error.includes('23503') || res.error.includes('project_media_project_id_fkey'));
    recordTest('SQL-10', 'Foreign key cascade integrity', 'Kernel SQL', passed, `Violated foreign key: ${res.error.trim().split('\n')[0]}`);
  }

  // SQL-11: Admin email format constraint
  {
    const res = runSql("INSERT INTO private.admin_users (id, email) VALUES (gen_random_uuid(), 'not-an-email');");
    const passed = !res.success && (res.error.includes('chk_admin_users_email_valid') || res.error.includes('23514'));
    recordTest('SQL-11', 'Admin email format constraint', 'Kernel SQL', passed, `Violated chk_admin_users_email_valid: ${res.error.trim().split('\n')[0]}`);
  }

  // SQL-12: Client timestamp tampering override
  {
    runSql("INSERT INTO public.projects (title, slug, summary, status, published_at) VALUES ('Tamper Test', 'tamper-test', 'Summary description with enough characters.', 'draft', '2020-01-01 00:00:00Z');");
    const selectRes = runSql("SELECT (published_at IS NULL) AS is_null FROM public.projects WHERE slug = 'tamper-test';");
    runSql("DELETE FROM public.projects WHERE slug = 'tamper-test';");
    const passed = selectRes.success && selectRes.output.includes(' t\n');
    recordTest('SQL-12', 'Client timestamp tampering override', 'Kernel SQL', passed, `Draft published_at successfully overridden to NULL by trigger (is_null = t).`);
  }

  // Clean up test users
  try {
    await adminClient.auth.admin.deleteUser(nonAdminUser.id);
    await adminClient.auth.admin.deleteUser(adminUser.id);
    await adminClient.auth.admin.deleteUser(forgedUser.id);
  } catch {
    // Ignore cleanup error
  }

  // Scorecard
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log('\n================================================================');
  console.log(`TEST RESULTS SCORECARD: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('================================================================');

  if (failed > 0) {
    console.error(`\n❌ Gate C1 Security Verification FAILED with ${failed} failure(s).`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 38 M02 GATE C1 SECURITY & INTEGRITY TESTS PASSED!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error running security suite:', err);
  process.exit(1);
});
