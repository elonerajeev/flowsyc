# 🌿 Git Branching Strategy — FlowSync CRM

**Last Updated:** 2026-04-22  
**Strategy:** Modified GitFlow  
**Remote:** https://github.com/elonerajeev/flowsyc

---

## 📋 Table of Contents

1. [Branch Overview](#1-branch-overview)
2. [The Full Flow — Step by Step](#2-the-full-flow--step-by-step)
3. [Branch Naming Rules](#3-branch-naming-rules)
4. [Commit Message Rules](#4-commit-message-rules)
5. [Git Hooks — What Runs Automatically](#5-git-hooks--what-runs-automatically)
6. [CI/CD Pipeline — What GitHub Runs](#6-cicd-pipeline--what-github-runs)
7. [Branch Protection Rules](#7-branch-protection-rules)
8. [PR Process — Step by Step](#8-pr-process--step-by-step)
9. [Real Scenarios with Commands](#9-real-scenarios-with-commands)
10. [Fixing the Current Messy Branches](#10-fixing-the-current-messy-branches)
11. [Quick Reference Cheatsheet](#11-quick-reference-cheatsheet)

---

## 1. Branch Overview

```
main           ← PRODUCTION. Only receives merges from develop.
               ← Triggers auto-deploy to EC2.
               ← Protected: requires 1 PR approval + CI pass.

develop        ← INTEGRATION. All features merge here first.
               ← Protected: requires 1 PR approval + CI pass.
               ← Represents "what will go to prod next".

feature/*      ← New features. Branches off develop. → PR back to develop.
fix/*          ← Bug fixes. Branches off develop. → PR back to develop.
hotfix/*       ← Critical prod bugs. Branches off main. → PR to main AND develop.
release/*      ← Release prep (optional). Branches off develop. → PR to main.
chore/*        ← Non-feature work: deps, config, docs. → PR to develop.
```

### Visual Flow

```
main          ●─────────────────────────────────────────────●  (deploy)
               \                                            ↑
                ↓                                           │
develop        ●────●────●────●────●────●────●────●────────●  (integration)
                    ↑    ↑    ↑              ↑
                    │    │    │              │
feature/auth   ●────●    │    │              │
feature/tasks       ●────●    │              │
fix/invoice-bug          ●────●        ●────●
hotfix/crash                                  ●────────────────→ main + develop
```

---

## 2. The Full Flow — Step by Step

### Normal Feature Development

```
1. Start on develop (always up-to-date)
   git checkout develop
   git pull origin develop

2. Create your feature branch
   git checkout -b feature/add-automation-rules

3. Work on your feature — commit often
   git add .
   git commit -m "feat(automation): add rule builder UI"
   git commit -m "feat(automation): add backend rule CRUD endpoints"
   git commit -m "test(automation): add unit tests for rule evaluation"

4. Push branch to remote
   git push origin feature/add-automation-rules

5. Open Pull Request on GitHub:  feature/add-automation-rules → develop
   (PR template auto-fills)

6. CI runs automatically (lint + typecheck + tests)

7. Get 1 approval from teammate (or self-review for solo project)

8. Merge PR into develop
   (use "Squash and merge" or "Merge commit" — see Section 8)

9. Delete the feature branch (GitHub does it automatically if configured)

10. When develop is ready for production:
    Open PR: develop → main
    → CI runs again
    → 1 approval required
    → Merge → CD auto-deploys to EC2
```

### Hotfix (Critical Production Bug)

```
1. NEVER branch off develop for hotfixes — branch off main
   git checkout main
   git pull origin main
   git checkout -b hotfix/fix-login-crash

2. Fix the bug
   git commit -m "fix(auth): resolve null pointer crash on login with google"

3. Push + Open PR → main (get it deployed FAST)

4. Also merge into develop so develop doesn't lose the fix:
   git checkout develop
   git merge hotfix/fix-login-crash
   git push origin develop

5. Delete hotfix branch
```

---

## 3. Branch Naming Rules

### Format: `<type>/<short-description>`

| Type | When to Use | Examples |
|---|---|---|
| `feature/` | New functionality | `feature/add-payroll-export` |
| `fix/` | Bug fixes (non-urgent) | `fix/kanban-drag-on-mobile` |
| `hotfix/` | Critical prod fix | `hotfix/auth-token-expiry-crash` |
| `chore/` | Deps, configs, CI, docs | `chore/upgrade-prisma-6.19` |
| `release/` | Release stabilization | `release/v1.1.0` |
| `refactor/` | Code restructure, no new features | `refactor/split-crm-service` |

### Rules
- ✅ All **lowercase**
- ✅ Words separated by **hyphens** (`-`)
- ✅ **Max 40 chars** after the prefix
- ❌ No spaces, no capital letters, no underscores
- ❌ No vague names like `fix/bug`, `feature/update`, `test-branch`

### Examples — Good vs Bad

```
✅ feature/add-google-oauth-login
✅ fix/invoice-total-calculation
✅ hotfix/socket-disconnect-crash
✅ chore/upgrade-vite-to-8

❌ feature/update          (too vague)
❌ Fix/Bug                 (has capitals)
❌ workspace-enhancement   (no type prefix)
❌ devops                  (means nothing)
❌ security-fix            (no type prefix)
```

---

## 4. Commit Message Rules

### Format: Conventional Commits

```
<type>(<scope>): <subject>

[optional body]

[optional footer — e.g., "Closes #42"]
```

### Types

| Type | When to Use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no logic change) |
| `refactor` | Code change that is not a fix or feature |
| `test` | Adding/updating tests |
| `chore` | Build tools, deps, config changes |
| `perf` | Performance improvement |
| `ci` | CI/CD workflow changes |
| `revert` | Reverting a previous commit |

### Scopes (optional but recommended)

```
auth | clients | leads | deals | tasks | projects | invoices
payroll | attendance | hiring | candidates | teams | automation
dashboard | reports | frontend | backend | db | ci | docker | deps
```

### Subject Rules
- ✅ Lowercase
- ✅ Present tense ("add" not "added")
- ✅ No period at end
- ✅ Min 10 characters (enforced by commit-msg hook)
- ❌ No "WIP", "fix stuff", "updates"

### Examples

```bash
# Good commits
git commit -m "feat(auth): add google oauth login with token exchange"
git commit -m "fix(tasks): resolve kanban card drop on mobile safari"
git commit -m "docs: update api contract for payroll endpoints"
git commit -m "chore(deps): upgrade prisma to 6.19.2"
git commit -m "test(clients): add service unit tests for RBAC checks"
git commit -m "perf(dashboard): cache operating cadence query for 60s"
git commit -m "ci: add frontend typecheck step to ci workflow"
git commit -m "refactor(auth): extract token refresh logic to separate utility"

# Bad commits (commit-msg hook WILL reject these)
git commit -m "fix bug"           ← too short + vague
git commit -m "WIP"               ← not allowed
git commit -m "updates"           ← not allowed
git commit -m "Fixed the thing."  ← wrong format + has period
```

---

## 5. Git Hooks — What Runs Automatically

These hooks live in `.git/hooks/` and run on your local machine.

### Hook 1: `commit-msg` — Runs on every `git commit`

**What it does:**  
Validates your commit message format before saving the commit.

**When it runs:** Right after you type your commit message.

**What happens if it fails:**
```
❌ COMMIT REJECTED — Invalid commit message format!

   Expected format:  <type>(<scope>): <subject>
   Your message:     updated the auth thing

   Allowed types:    feat | fix | docs | style | refactor | test | chore | perf | ci | revert
   Subject:          min 10 chars, lowercase, no period at end
```
Your commit is blocked. Fix the message and try again.

---

### Hook 2: `pre-commit` — Runs on every `git commit` (before message)

**What it does:**  
Runs ESLint + TypeScript check ONLY on the files you're committing (staged files). Fast — only checks what changed.

**When it runs:** Before your commit message dialog appears.

**What happens:**
```
[pre-commit] Checking staged files...
[pre-commit] Running backend lint...
✅ Backend lint passed.
[pre-commit] Running TypeScript check...
✅ Backend TypeScript OK.
[pre-commit] All checks passed ✅
```

If linting fails:
```
❌ Backend lint failed. Fix errors before committing.
   Run: cd backend && npm run lint
```
Your commit is blocked. Fix lint errors first.

**Skip in emergencies (use sparingly!):**
```bash
git commit --no-verify -m "your message"
```

---

### Hook 3: `pre-push` — Runs on every `git push`

**What it does:**
1. Runs tests for the layer(s) that changed (backend or frontend)
2. Blocks pushing directly to `main` from a feature branch

**When it runs:** Before actually pushing to GitHub.

**What happens:**
```
[pre-push] Running tests before push to origin...
[pre-push] Backend files changed — running tests...
✅ Backend tests passed.
[pre-push] All pre-push checks passed ✅
```

If you try to push a feature branch directly to main:
```
❌ PUSH BLOCKED — You cannot push directly to 'main'.
   Create a PR from your branch → develop → main.
   Current branch: feature/add-automation
```

---

### Hook 4: `post-commit` — Runs after every `git commit`

**What it does:**  
Auto-updates `codebase-snapshot.xml` with the latest git log (changes section).

**When it runs:** After every successful commit.

**What happens:**
```
[git-hook] Updating codebase-snapshot.xml...
[update-snapshot] Starting codebase snapshot update...
✅ codebase-snapshot.xml updated successfully.
[git-hook] Snapshot updated.
```

This keeps your AI context file always in sync without any manual work.

---

## 6. CI/CD Pipeline — What GitHub Runs

### CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:** Every PR to `main` or `develop`, every push to `develop`

```
PR created/updated
        ↓
GitHub Actions starts CI
        ↓
┌─────────────────────────┐    ┌─────────────────────────────────────────┐
│  Backend Job             │    │  Frontend Job                           │
│  1. npm ci               │    │  1. npm ci                              │
│  2. prisma generate      │    │  2. eslint on changed files             │
│  3. prisma migrate deploy│    │  3. tsc --noEmit (typecheck)            │
│  4. eslint               │    │  4. vitest --run (unit tests)           │
│  5. tsc --noEmit         │    │  5. vite build (validate bundle builds) │
│  6. jest (with coverage) │    └─────────────────────────────────────────┘
└─────────────────────────┘
        ↓
CI Summary Job
(fails if either job fails)
        ↓
✅ CI Pass → PR can be merged (after 1 approval)
❌ CI Fail → PR blocked — must fix before merge
```

**Real PostgreSQL is used** — a PostgreSQL 15 service container spins up so DB migrations actually run.

---

### CD Pipeline (`.github/workflows/cd.yml`)

**Triggers:** Every push / merge to `main`

```
Merge to main
        ↓
GitHub Actions starts CD
        ↓
Validate Job:
  1. npx prisma validate       ← Schema is valid
  2. tsc --noEmit (backend)    ← No TypeScript errors
  3. vite build (frontend)     ← Bundle builds clean
        ↓
Deploy Job (SSH into EC2):
  1. git pull origin main
  2. npm ci (backend)
  3. npx prisma migrate deploy  ← Apply any new migrations
  4. npm run build (backend)
  5. npm ci + npm run build (frontend)
  6. docker-compose up -d --build
  7. Wait 10s
        ↓
Health Check:
  curl http://localhost:3000/api/health
        ↓
✅ Success → deploy complete
❌ Failure → team notified (check Actions log)
```

**Required GitHub Secrets** (add these in repo Settings → Secrets):
```
EC2_HOST          → IP or domain of your EC2 server
EC2_USER          → SSH user (e.g. ubuntu, ec2-user)
EC2_SSH_KEY       → Private SSH key for EC2 access
VITE_API_URL      → Production API URL
VITE_SOCKET_URL   → Production Socket.IO URL
```

---

## 7. Branch Protection Rules

These are enforced by GitHub (not local hooks). Set them up once with:

```bash
export GITHUB_TOKEN=ghp_your_personal_access_token
node scripts/setup-branch-protection.js
```

Or manually in GitHub: **Settings → Branches → Add branch protection rule**

### `main` Branch Rules
| Rule | Setting |
|---|---|
| Require PR before merge | ✅ Yes |
| Required approvals | 1 |
| Dismiss stale reviews on new commits | ✅ Yes |
| Require status checks to pass | ✅ Yes (CI must pass) |
| Require branch to be up to date | ✅ Yes |
| Enforce rules on admins | ✅ Yes |
| Allow force pushes | ❌ Never |
| Allow branch deletion | ❌ Never |

### `develop` Branch Rules
| Rule | Setting |
|---|---|
| Require PR before merge | ✅ Yes |
| Required approvals | 1 |
| Dismiss stale reviews | ✅ Yes |
| Require status checks to pass | ✅ Yes (CI must pass) |
| Require branch to be up to date | ❌ No (softer) |
| Enforce on admins | ❌ No (can bypass in emergencies) |
| Allow force pushes | ❌ Never |

---

## 8. PR Process — Step by Step

### Opening a PR

1. Push your branch: `git push origin feature/your-feature`
2. Go to GitHub → your repo → you'll see "Compare & pull request" banner
3. **Base branch:** `develop` (or `main` for hotfixes)
4. **PR Title:** Use Conventional Commits format: `feat(auth): add google oauth login`
5. The **PR template** auto-fills — complete every checklist item
6. Assign the PR to yourself
7. Request review from a teammate

### Merge Strategy

| When | Use |
|---|---|
| Feature/fix branches → develop | **Squash and merge** (cleans up messy WIP commits into 1 clean commit) |
| develop → main | **Merge commit** (preserves full develop history) |
| Hotfix → main | **Merge commit** |

### After Merge
- ✅ Delete the feature branch (GitHub can do this automatically)
- ✅ Pull develop locally: `git checkout develop && git pull origin develop`
- ✅ Delete local branch: `git branch -d feature/your-feature`

---

## 9. Real Scenarios with Commands

### Scenario A: Build a new feature

```bash
# 1. Always start from a fresh develop
git checkout develop
git pull origin develop

# 2. Create branch
git checkout -b feature/add-payroll-pdf-export

# 3. Code + commit
git add backend/src/services/payroll.service.ts
git commit -m "feat(payroll): add pdf generation for payroll slips"

git add frontend/src/pages/PayrollPage.tsx
git commit -m "feat(payroll): add download button for payroll pdf"

# 4. Push
git push origin feature/add-payroll-pdf-export

# 5. Open PR on GitHub: feature/add-payroll-pdf-export → develop
# 6. CI runs, get approval, merge
# 7. Clean up
git checkout develop
git pull origin develop
git branch -d feature/add-payroll-pdf-export
```

---

### Scenario B: Fix a bug in develop

```bash
git checkout develop && git pull origin develop
git checkout -b fix/invoice-tax-calculation-wrong

git commit -m "fix(invoices): correct tax calculation for multi-item invoices"
git push origin fix/invoice-tax-calculation-wrong
# → PR to develop → merge → done
```

---

### Scenario C: Critical production hotfix

```bash
# Branch from MAIN (not develop!)
git checkout main && git pull origin main
git checkout -b hotfix/auth-jwt-null-crash

git commit -m "fix(auth): handle null user object in jwt verification middleware"

# PR to main — gets deployed immediately after merge + CI passes

# ALSO merge into develop so develop doesn't lose this fix
git checkout develop && git pull origin develop
git merge hotfix/auth-jwt-null-crash
git push origin develop

# Clean up
git branch -d hotfix/auth-jwt-null-crash
```

---

### Scenario D: Release to production

```bash
# When develop is stable and ready to ship:
git checkout develop && git pull origin develop

# Open PR on GitHub: develop → main
# Title: "chore(release): release v1.2.0"
# CI runs → get approval → merge → CD auto-deploys!
```

---

### Scenario E: Update dependencies

```bash
git checkout develop && git pull origin develop
git checkout -b chore/upgrade-prisma-and-deps

cd backend && npm update prisma @prisma/client
npx prisma generate

git commit -m "chore(deps): upgrade prisma to 6.19.2 and run generate"
git push origin chore/upgrade-prisma-and-deps
# → PR to develop
```

---

## 10. Fixing the Current Messy Branches

Your repo currently has these leftover branches with no clear purpose:

```
main                 ✅ Keep — production branch
develop              ✅ Keep — integration branch
devops               ⚠️  Rename or delete — unclear purpose
security-fix         ⚠️  Delete if merged, or rename to fix/security-*
workspace-enhancement ⚠️  Delete if merged — currently checked out!
```

### Clean up steps (run in WSL terminal):

```bash
cd /home/elonerajeev/Desktop/CRM

# 1. First, make sure you're NOT on a branch you're about to delete
git checkout develop
git pull origin develop

# 2. Check if workspace-enhancement changes are merged
git log develop..workspace-enhancement --oneline
# If output is empty → all changes are already in develop → safe to delete

# 3. Delete merged local branches
git branch -d workspace-enhancement   # -d = safe delete (only if merged)
git branch -d security-fix
git branch -d devops

# If -d fails (unmerged), check the diff first:
# git diff develop...branch-name
# If you want to keep the work: merge it into develop first
# If it's garbage: force delete with -D

# 4. Delete from remote
git push origin --delete workspace-enhancement
git push origin --delete security-fix
git push origin --delete devops

# 5. Verify what's left
git branch -a
# Should show only: main, develop (and origin/main, origin/develop)
```

---

## 11. Quick Reference Cheatsheet

```bash
# ─── START NEW WORK ────────────────────────────────────────────────────────
git checkout develop && git pull origin develop
git checkout -b feature/your-feature-name

# ─── DAILY COMMIT LOOP ─────────────────────────────────────────────────────
git add <files>
git commit -m "feat(scope): describe what you did in 10+ chars"
# commit-msg hook validates format
# pre-commit hook runs lint + typecheck on staged files
# post-commit hook updates codebase-snapshot.xml

# ─── PUSH & PR ─────────────────────────────────────────────────────────────
git push origin feature/your-feature-name
# → Go to GitHub → Open PR to develop
# → pre-push hook runs tests before push
# → CI runs on PR (lint + typecheck + jest + vitest + build)
# → Get 1 approval → Merge (Squash)

# ─── SYNC AFTER MERGE ──────────────────────────────────────────────────────
git checkout develop && git pull origin develop
git branch -d feature/your-feature-name

# ─── RELEASE TO PROD ───────────────────────────────────────────────────────
# PR on GitHub: develop → main → Merge → CD auto-deploys

# ─── EMERGENCY HOTFIX ──────────────────────────────────────────────────────
git checkout main && git pull origin main
git checkout -b hotfix/describe-issue
git commit -m "fix(area): describe the fix"
# PR to main → merge → deployed
# Then: git checkout develop && git merge hotfix/describe-issue && git push

# ─── BRANCH NAMING ─────────────────────────────────────────────────────────
feature/add-google-oauth       # new features
fix/kanban-mobile-drop         # bug fixes
hotfix/login-crash-prod        # critical prod fixes
chore/upgrade-prisma-6.19      # dependencies, config
refactor/split-crm-service     # restructuring
docs/update-api-contract       # documentation

# ─── COMMIT TYPES ──────────────────────────────────────────────────────────
feat     # new feature
fix      # bug fix
docs     # documentation
style    # formatting only
refactor # code restructure
test     # tests
chore    # deps, config, build
perf     # performance
ci       # CI/CD changes
revert   # undo a commit

# ─── SKIP HOOKS (emergency only) ───────────────────────────────────────────
git commit --no-verify -m "message"   # skip pre-commit + commit-msg
git push --no-verify                  # skip pre-push

# ─── SETUP BRANCH PROTECTION (one-time) ────────────────────────────────────
export GITHUB_TOKEN=ghp_your_token
node scripts/setup-branch-protection.js
```

---

## Files Created / Modified by This Strategy

| File | Purpose |
|---|---|
| `.git/hooks/commit-msg` | Enforces Conventional Commits format |
| `.git/hooks/pre-commit` | Runs lint + typecheck on staged files |
| `.git/hooks/pre-push` | Runs tests + blocks direct push to main |
| `.git/hooks/post-commit` | Auto-updates codebase-snapshot.xml |
| `.github/workflows/ci.yml` | GitHub CI — lint, test, build on every PR |
| `.github/workflows/cd.yml` | GitHub CD — deploy to EC2 on merge to main |
| `.github/pull_request_template.md` | PR checklist template |
| `scripts/setup-branch-protection.js` | Applies GitHub branch protection via API |
| `GIT_BRANCHING_STRATEGY.md` | This file |

---

*FlowSync CRM — Git Branching Strategy*  
*Last Updated: 2026-04-22*
