# Visual Redesign Rollback & Checkpoint Runbook

## Document Overview
This runbook defines the authoritative Git checkpoint, rollback, and recovery procedures for the portfolio's visual redesign. It ensures that the functionally verified production MVP can be restored at any point without data loss or downtime.

---

## A. Baseline Tag and Commit

The baseline marks the completed, verified 3-day MVP (R1 Authentication, R2 Projects CRUD, R3 Public Portfolio, and R4 Production Deployment):

- **Baseline Annotated Tag:** `v1.0.0-mvp`
- **Baseline Commit SHA:** `6facad69dee5e0095fa18d72f2690d8ae965783c`
- **Target Remote Branch:** `origin/main` (currently points to `6facad69dee5e0095fa18d72f2690d8ae965783c`)
- **Live Production Domain:** `https://asm-khalid.vercel.app`
- **Hosted Supabase Project Reference:** `zvmjdssztebhzpplkcrn`

### Verification of Baseline
To verify that the local baseline tag points to the exact MVP commit:
```powershell
git rev-parse "v1.0.0-mvp^{commit}"
# Expected output: 6facad69dee5e0095fa18d72f2690d8ae965783c
```

---

## B. Design Branch Workflow

All visual redesign experimentation, styling modifications, Hallmark tooling, and aesthetic adjustments MUST occur on dedicated design branches, completely isolated from `main`.

1. **Active Design Branch:**
   ```powershell
   git switch design/visual-overhaul
   ```
2. **Protection of Main:**
   - `main` triggers automatic Vercel production deployments upon push.
   - Never commit experimental CSS or redesign work directly to `main`.
   - Never push `design/visual-overhaul` to `origin` unless explicitly authorized by the project owner.

---

## C. Creating Design Checkpoints

When reaching a satisfactory visual milestone (e.g., typography overhaul, project grid polish, navigation re-layout), create an isolated, annotated checkpoint tag before moving to the next visual section.

```powershell
# 1. Ensure working tree is clean
git status

# 2. Create an annotated lightweight checkpoint tag
git tag -a checkpoint-design-typography -m "Checkpoint: Completed typography and token refactoring"

# 3. View existing checkpoint tags
git tag -l "checkpoint-design-*"
```

---

## D. Discarding Uncommitted Edits Safely

> [!CAUTION]
> Never run `git reset --hard` or `git clean -fd`. These commands immediately and permanently destroy uncommitted work and untracked files without recovery.

Always preserve uncommitted work in an isolated stash before discarding.

### Preconditions
- The working tree contains dirty changes or unwanted experimental edits.
- Explicit approval to abandon the edits is obtained.

### Safe Preservation and Reset Sequence
```powershell
# 1. Review exact changes
git status
git diff

# 2. Preserve EVERYTHING (including untracked files) to a labeled stash entry
# Note: Ordinary 'git stash' EXCLUDES untracked files. The '-u' (--include-untracked) flag is required.
git stash push -u -m "backup-before-discard-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# 3. Verify the working tree is now clean
git status

# 4. If the discarded work is truly no longer needed after verification, list and drop:
git stash list
# git stash drop stash@{0}  # ONLY after confirming backup is unneeded
```

---

## E. Restoring an Earlier Checkpoint Using a New Branch

If a visual experiment fails or reaches a dead end, DO NOT rewrite history or force-reset the existing branch. Branch off from the verified checkpoint to continue work cleanly.

### Preconditions
- A known good commit or tag exists (e.g., `v1.0.0-mvp` or `checkpoint-design-typography`).

### Safe Branching Sequence
```powershell
# 1. Verify working tree is clean (stash if needed using Section D)
git status

# 2. Branch directly from the target checkpoint or baseline tag
git switch -c design/visual-overhaul-v2 v1.0.0-mvp

# 3. Verify HEAD matches the target commit
git rev-parse HEAD
# Expected: 6facad69dee5e0095fa18d72f2690d8ae965783c
```

---

## F. Reverting Ordinary Commits

When one or more specific bad commits were already committed to the design branch, use `git revert` to append safe, forward-rolling inverse commits.

### Preconditions
- The commit to revert is an ordinary commit (NOT a merge commit).
- Working tree is clean.

### Command Syntax
```powershell
# Revert a single ordinary commit without opening interactive editor
git revert <COMMIT_SHA> --no-edit

# Example: Revert commit 4a2b1c3
git revert 4a2b1c3 --no-edit
```

> [!NOTE]
> Do NOT pass `--mainline` or `-m` when reverting an ordinary commit. The `--mainline` option is strictly reserved for merge commits.

---

## G. Reverting Merge Commits

If a feature branch was merged with a merge commit (non-fast-forward) and must be undone, `git revert` requires specifying which parent branch to keep as the mainline.

### Preconditions
- The commit is a merge commit with 2 parents (`Parent 1` = target branch, `Parent 2` = merged feature branch).
- Working tree is clean.

### Command Syntax
```powershell
# Revert the merge commit preserving Parent 1 (mainline)
git revert --mainline 1 <MERGE_COMMIT_SHA> --no-edit

# Alternative shorthand syntax (DO NOT duplicate -m):
# git revert -m 1 <MERGE_COMMIT_SHA> --no-edit
```

> [!WARNING]
> Never use duplicate flags (such as `-m "message" -m 1`). In `git revert`, `-m <parent-number>` specifies the mainline parent number. Use `--no-edit` or `-m 1` cleanly.

---

## H. Recovering from Fast-Forward Merges

When Git performs a fast-forward merge (e.g., `git merge --ff-only`), **no merge commit is created**. Instead, the branch ref simply advances across a linear series of individual commits.

Because no merge commit exists, running `git revert -m 1 <SHA>` will fail with:
`fatal: commit <SHA> is a merge but no -m option was given` or `fatal: commit <SHA> is not a merge but -m option was given`.

### Recovery Options

#### Option 1: Revert the Range of Commits (Forward-Rolling, Safe for Pushed Branches)
```powershell
# 1. Identify the range: <COMMIT_BEFORE_MERGE>..<LATEST_MERGED_COMMIT>
# 2. Revert without committing each individually, then create a single rollback commit:
git revert --no-commit <OLD_BASE_SHA>..<LATEST_SHA>
git commit -m "revert: rollback fast-forward merge of design changes"
```

#### Option 2: Repoint Local Branch (Only If Unpushed & Approved)
```powershell
# 1. Verify working tree is clean
git status

# 2. Reset branch reference to prior known baseline without destroying files
# (Only permissible on local, unpushed design branches with explicit confirmation)
git reset --soft v1.0.0-mvp
```

---

## I. Handling Git Revert Conflicts

When reverting a commit that touches lines modified by subsequent commits, Git pauses with a conflict.

### Resolution Sequence
```powershell
# 1. Check conflicted files
git status

# 2. Open conflicted files and resolve conflict markers:
# <<<<<<< HEAD (current branch code)
# =======
# >>>>>>> parent of <COMMIT_SHA> (reverted code)

# 3. Stage the resolved files
git add <path/to/resolved-file>

# 4. Continue the revert process
git revert --continue

# 5. If resolution cannot be safely determined, abort cleanly:
git revert --abort
```

---

## J. Vercel Production Recovery

### Critical Architectural Distinction
Git source-code rollback and Vercel hosting rollback are two separate layers:
- Reverting a local Git commit does not affect the live website until deployed.
- Reverting a deployment in Vercel does not touch local Git history.

### Vercel Hobby Plan Limitations
- Vercel's "Instant Rollback" button in the dashboard is typically restricted to the immediately preceding deployment on the Hobby tier.
- Rollback to arbitrary older deployments via the Vercel dashboard/API may be unavailable or restricted.

### Production Recovery Runbook
If an erroneous commit is accidentally deployed to production:

1. **Primary Recovery (Git-Based Fast-Forward Redeployment):**
   ```powershell
   # On main: revert the bad commit or reset to the verified baseline tag
   git switch main
   git reset --hard v1.0.0-mvp   # (Only if main was unpushed or with owner authorization)
   # Or revert the commit:
   git revert <BAD_SHA> --no-edit
   
   # Push verified state to trigger automatic Vercel production rebuild
   git push origin main
   ```
2. **Alternative Recovery (Vercel CLI Instant Redeploy):**
   ```powershell
   # Redeploy a known good deployment ID directly to production without rebuilding
   npx vercel redeploy <KNOWN_GOOD_DEPLOYMENT_ID> --prod --yes
   ```
3. **Verify Live Production Domain:**
   - Inspect `https://asm-khalid.vercel.app`
   - Confirm status code `200`
   - Verify that the functional MVP (hero, project showcase, admin login link) renders correctly.

---

## K. Supabase Data Safety

The portfolio application connects to a hosted Supabase PostgreSQL instance:
- **Project Ref:** `zvmjdssztebhzpplkcrn`
- **Tables:** `projects`, `profiles`
- **Storage Buckets:** `project-images`

### Crucial Safety Rules During Design Phase
1. **Shared Database Awareness:**
   - Both local development (`localhost:3000`) and Vercel production point to the same Supabase instance if `.env.local` uses the live production credentials.
   - Any database mutations (deletions, inserts) performed locally affect production data.
2. **Zero Schema Migrations:**
   - The visual redesign requires CSS, layout, and component updates ONLY.
   - Do NOT run database migrations, table drops, or column alterations during design rollbacks.
3. **Admin Actions Isolation:**
   - Do NOT delete existing projects via `/admin/projects` during testing.
   - Design testing should use existing published projects (e.g., `distributed-task-orchestrator`, `real-time-collaborative-whiteboard`, `edge-cache-service`).

---

## L. Verification Commands

Run these standard verification checks in Windows PowerShell before and after any rollback or branch switch:

```powershell
# 1. Typecheck: Verify TypeScript strict compilation
npm run typecheck

# 2. Lint: Verify Next.js and ESLint code standards
npm run lint

# 3. Unit & Integration Tests: Verify Vitest test suite
npm run test

# 4. Production Build: Verify Next.js build and static generation
npm run build
```

All 4 commands must exit with code `0`. If any verification fails, consult `docs/ERRORS.md` before proceeding.
