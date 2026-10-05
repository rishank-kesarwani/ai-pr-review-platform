# AI PR Review Platform

> **Autonomous, multi-stage GitHub Pull Request code review platform combining sandboxed AST static analysis, AI code intelligence via centralized AI Platform, BullMQ distributed queues, MongoDB persistence, GitHub App checks, and a Manifest V3 Chrome Extension.**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Why This Project Exists](#3-why-this-project-exists)
4. [Features](#4-features)
5. [Architecture](#5-architecture)
6. [High-Level Design (HLD)](#6-high-level-design-hld)
7. [Component Responsibilities](#7-component-responsibilities)
8. [Request Flow](#8-request-flow)
9. [GitHub Webhook Flow](#9-github-webhook-flow)
10. [PR Review Pipeline](#10-pr-review-pipeline)
11. [AI Platform Integration](#11-ai-platform-integration)
12. [AI Model Regression Detection Platform Integration](#12-ai-model-regression-detection-platform-integration)
13. [Notification Service Integration](#13-notification-service-integration)
14. [Redis Architecture](#14-redis-architecture)
15. [BullMQ Distributed Queue Architecture](#15-bullmq-distributed-queue-architecture)
16. [MongoDB Schema & Index Design](#16-mongodb-schema--index-design)
17. [Authentication & Optional Auth Architecture](#17-authentication--optional-auth-architecture)
18. [GitHub App Architecture & Permissions](#18-github-app-architecture--permissions)
19. [Chrome Extension Architecture (Manifest V3)](#19-chrome-extension-architecture-manifest-v3)
20. [Security Model & Protection Controls](#20-security-model--protection-controls)
21. [AI Hallucination & Evidence Controls](#21-ai-hallucination--evidence-controls)
22. [Finding Deduplication & Arbitration Engine](#22-finding-deduplication--arbitration-engine)
23. [Idempotency & Replay Protection](#23-idempotency--replay-protection)
24. [Retry Strategy & Resilience](#24-retry-strategy--resilience)
25. [Rate Limiting & Throttling](#25-rate-limiting--throttling)
26. [AI Cost & Context Window Controls](#26-ai-cost--context-window-controls)
27. [Error Handling Strategy](#27-error-handling-strategy)
28. [Observability & Structured Telemetry](#28-observability--structured-telemetry)
29. [Deployment Architecture](#29-deployment-architecture)
30. [Render Deployment (Backend)](#30-render-deployment-backend)
31. [Vercel Deployment (Frontend)](#31-vercel-deployment-frontend)
32. [Environment Variables](#32-environment-variables)
33. [Local Development Setup](#33-local-development-setup)
34. [GitHub App Setup Guide](#34-github-app-setup-guide)
35. [Chrome Extension Setup Guide](#35-chrome-extension-setup-guide)
36. [Testing Strategy](#36-testing-strategy)
37. [CI/CD Pipeline](#37-cicd-pipeline)
38. [REST API Documentation](#38-rest-api-documentation)
39. [Known Limitations](#39-known-limitations)
40. [Future Improvements](#40-future-improvements)

---

## 1. Project Overview

The **AI PR Review Platform** is an enterprise-grade automated code review solution designed to accelerate software delivery without sacrificing engineering rigor. Rather than relying on simple prompt-wrapped LLM wrappers or noisy static linters, the platform executes a synchronized, multi-phase review pipeline combining AST-based static analysis with deep context-aware LLM inspection.

The system natively integrates with GitHub via GitHub App Webhooks and Check Runs, provides a Next.js web dashboard with interactive finding filtering, connects to the **AI Model Regression Detection Platform** for quality gate calibration, and ships with a Manifest V3 Chrome Extension allowing developers to trigger reviews directly from GitHub pull request pages.

---

## 2. Problem Statement

Manual peer review is a critical bottleneck in modern engineering organizations:
- **Reviewer Fatigue:** Senior engineers spend hours reviewing boilerplate, formatting, or missing error handlers instead of high-level system design.
- **Surface-Level Linters:** Standard static linters only catch syntax or trivial style violations and miss subtle race conditions, resource leaks, or SQL/NoSQL injection vulnerabilities.
- **LLM Hallucinations & Drift:** Naive LLM reviewers hallucinate non-existent files, suggest code that breaks surrounding abstractions, and silently regress in precision across prompt or model updates.
- **Synchronous Failures:** Synchronous webhooks frequently time out against GitHub's 10-second limit on large pull requests.

---

## 3. Why This Project Exists

This platform bridges the gap between deterministic static analysis and semantic reasoning. It provides:
1. **Zero-Wait Webhooks:** Immediate 200 OK webhook acknowledgements with asynchronous BullMQ background workers.
2. **Arbitrated Findings:** Deduplicates findings across ESLint, TypeScript compiler checks, and AI review, downgrading speculative style suggestions while highlighting corroborated security threats.
3. **Continuous AI Quality Assurance:** Evaluates candidate reviewer models/prompts against benchmark datasets via the Model Regression Detection Platform before promoting changes.
4. **Frictionless Public Access:** Permits guest developers to analyze public GitHub PRs instantly with zero mandatory login barriers.
5. **Seamless Workflow Integration:** Operates directly inside GitHub Pull Request checks and in-browser with our Chrome extension.

---

## 4. Features

- ⚡ **Multi-Trigger Ingestion:** Automated reviews via GitHub App Webhooks, manual dashboard submission, or 1-click Chrome Extension activation.
- 🛡️ **Sandboxed Static Analyzers:** Built-in `ESLintAnalyzer` and `TypeScriptAnalyzer` detecting dangerous `eval()`, unhandled floating promises, unsafe `any` casts, and XSS risks.
- 🧠 **Centralized AI Platform Review:** Connects directly to the Portfolio AI Platform service for deep semantic vulnerability and logic error discovery.
- 🎯 **Model Regression Detection Platform:** Independent quality gate verifying model precision, recall, latency, cost, and structured JSON output validity against calibrated baselines.
- ⚖️ **Finding Arbitration & Deduplication:** SHA256-based fingerprint deduplication and severity calibration preventing false-positive noise.
- 🚦 **Real-Time GitHub Checks & Annotations:** Automatically publishes GitHub Check Runs with pass/fail statuses, regression check badges, and exact line-level annotations.
- 📬 **Notification Service Integration:** Dispatches real-time alerts when critical vulnerabilities or model regressions are detected.
- 📊 **Rich Next.js Dashboard:** Interactive code review viewer, severity filtering, category filters, AI quality gate status cards, and 1-click actionable fix copying.
- 🔌 **Manifest V3 Chrome Extension:** Floating GitHub review action, real-time stage progress polling, and severity pill badges.

---

## 5. Architecture

The platform is structured as a modular TypeScript monorepo:

```
ai-pr-review-platform/
├── backend/          # NestJS 11 backend service, BullMQ worker & regression client
├── frontend/         # Next.js 14 dashboard, review explorer & quality gate UI
├── extension/        # Manifest V3 Chrome Extension
├── .github/          # GitHub Actions CI/CD workflows
└── README.md         # Comprehensive engineering reference
```

---

## 6. High-Level Design (HLD)

```mermaid
graph TD
    User([Developer / User])
    GH[GitHub PR / Webhook]
    Ext[Chrome Extension MV3]
    Frontend[Next.js Dashboard]
    Backend[NestJS Backend API]
    Redis[(Redis / BullMQ)]
    Worker[BullMQ PR Worker]
    Static[Static Analyzers ESLint/TS]
    AIPlatform[Shared AI Platform]
    Arbitrator[Arbitration & Deduplication]
    Regression[Model Regression Platform]
    MongoDB[(MongoDB)]
    NotifService[Notification Service]

    User -->|View / Submit PR| Frontend
    User -->|1-Click Review| Ext
    GH -->|Webhook X-Hub-Sig| Backend
    Ext -->|POST /api/v1/reviews| Backend
    Frontend -->|POST /api/v1/reviews| Backend
    Frontend -->|POST .../regression/trigger| Backend

    Backend -->|Enqueue Job| Redis
    Redis -->|Dispatch Job| Worker

    Worker -->|Fetch PR & Diff| GH
    Worker -->|Run AST Rules| Static
    Worker -->|Structured Review| AIPlatform
    Static --> Arbitrator
    AIPlatform --> Arbitrator

    Worker -.->|POST /api/v1/regression/check| Regression
    Arbitrator -->|Persist Findings| MongoDB
    Worker -->|Update Check Run / Annotations| GH
    Worker -->|Dispatch Alerts| NotifService
    Frontend -->|Poll / Stream Status| Backend
    Backend -->|Read State| MongoDB
``` Status| Backend
    Backend -->|Read State| MongoDB
```

---

## 7. Component Responsibilities

| Component | Technology | Primary Responsibilities |
|---|---|---|
| **Backend API** | NestJS, Express, Helmet, Swagger | Webhook HMAC verification, request validation, authentication, rate limiting, job enqueuing. |
| **Review Worker** | BullMQ, IORedis | Asynchronous pipeline execution, PR diff fetching, orchestrating analyzers, retry handling. |
| **Static Analyzers** | TypeScript, ESLint AST rules | Parsing unified git diffs, checking floating promises, dynamic eval, insecure innerHTML. |
| **AI Review Service** | Axios, AI Platform Client | Assembling prompt context, schema validation of structured JSON output, retry/repair fallback. |
| **Arbitration Engine** | SHA256 Fingerprinting | Deduplicating findings across analyzers, boosting confidence on corroborated issues, calibrating severity. |
| **Frontend Dashboard** | Next.js 14, Tailwind CSS, Lucide | Responsive UI, live review progress polling, severity metrics, finding explorer, policy config. |
| **Chrome Extension** | TypeScript, Manifest V3 | Detecting GitHub PR URLs, 1-click review trigger, status badge updates, popup finding preview. |
| **Persistence Layer** | MongoDB, Mongoose | Schema storage for Reviews, Findings, ReviewJobs, Configurations, WebhookEvents, and Usage. |

---

## 8. Request Flow

1. Developer enters a GitHub PR URL (e.g. `https://github.com/owner/repo/pull/123`) on Dashboard or Chrome Extension.
2. `POST /api/v1/reviews` validates URL structure and checks if an active review exists.
3. A `PullRequestReview` record and `ReviewJob` record are created with initial status `QUEUED`.
4. The job is placed on the BullMQ `pr-review` queue in Redis with exponential backoff configuration.
5. The API immediately returns `201 Created` with review metadata.
6. The client polls `GET /api/v1/reviews/:id` to receive real-time stage updates.

---

## 9. GitHub Webhook Flow

1. GitHub sends `pull_request` event (`opened`, `reopened`, `synchronize`, `ready_for_review`).
2. `GitHubWebhookGuard` validates `X-Hub-Signature-256` HMAC against `GITHUB_WEBHOOK_SECRET`.
3. `GitHubWebhookService` computes the idempotency key: `gh:{repoFullName}:{prNumber}:{commitSha}:{action}`.
4. If key exists in `WebhookEvent` collection, returns duplicate acknowledgement (`200 OK`) and exits.
5. If new, registers repository, creates `QUEUED` review, and enqueues job to BullMQ.

---

## 10. PR Review Pipeline

```
[QUEUED] ──► [FETCHING] ──► [ANALYZING] ──► [AI_REVIEW] ──► [AGGREGATING] ──► [PUBLISHING] ──► [COMPLETED]
                │                 │             │                │                │
            Fetch diff        ESLint & TS   AI Platform     Deduplicate &    GitHub Checks &
            via GitHub         AST rules      Review          Calibrate       Notifications
```

- **Cancellation Checks:** The pipeline checks `job.isCancelled` between every stage, halting immediately if cancelled.

---

## 11. AI Platform Integration

The platform connects to the existing shared **AI Platform** service:

- **Endpoint:** `POST {AI_PLATFORM_URL}/ai/chat`
- **Header:** `x-api-key: {AI_PLATFORM_PR_REVIEW_API_KEY}`
- **Payload:** Structured JSON prompt containing PR title, author, target/base branch, diff hunks, and pre-computed static analysis signals.
- **Output Schema:**
```json
{
  "summary": "High-level review summary",
  "findings": [
    {
      "file": "src/example.ts",
      "line": 42,
      "severity": "HIGH",
      "category": "BUG",
      "title": "Uncaught floating promise",
      "description": "Async call executed without await or catch handler",
      "recommendation": "Add await keyword or handle error explicitly",
      "evidence": "axios.post('/api/sync')",
      "confidence": 0.94
    }
  ]
}
```
- **Validation:** Strict validation via `class-validator` and `plainToInstance`. If malformed, auto-extracts JSON via regex or falls back gracefully without dropping the review.

---

## 12. AI Model Regression Detection Platform Integration

The AI PR Reviewer itself is an AI-powered system that depends on LLMs, system prompts, few-shot examples, and model parameters. To ensure high code review quality and prevent silent degradation, the platform integrates with the dedicated [AI Model Regression Detection Platform](https://github.com/rishank-kesarwani/ai-model-regression-detection).

### Why Model Regression is Needed

When changing review models (e.g. `gemini-1.5-pro` vs candidate models), updating system review prompts, or adjusting few-shot rubrics, subtle regressions can occur:
- **Accuracy / Precision drop:** Candidate model flags false positives on safe code patterns (e.g. false alarm on standard React hooks).
- **Recall drop:** Candidate model misses critical security vulnerabilities (e.g. SQL injection, unescaped XSS).
- **Latency inflation:** Review turnaround time increases past acceptable developer thresholds.
- **Cost escalation:** Token usage per review balloons due to verbose chain-of-thought outputs.
- **Structured output failure:** Output fails JSON schema parsing.

### Target Architecture & Separation of Concerns

```
GitHub PR
    ↓
AI PR Review Platform
    ↓
Code/Static Analysis
    ↓
AI Platform
    ↓
Review Findings
    ↓
Finding Arbitration
    ↓
Model Regression Detection  ◄─── Calls POST /api/v1/regression/check
    ↓
Regression Decision (PASS / WARN / FAIL)
    ↓
Review Result
    ↓
GitHub Check Run & Annotations
    ↓
Notification Service
```

The responsibility boundary remains clean:
- **PR Review Platform:** PR ingestion, git diff extraction, static analysis, prompt assembly, finding arbitration, and GitHub publishing.
- **Model Regression Detection Platform:** Owns evaluation datasets, rubric definitions, benchmark execution, ground-truth metric calculation, baseline comparison, and regression policies.

### PR Review Evaluation Datasets & Rubrics

The regression platform runs tests against curated PR review evaluation suites containing:
- **Security Vulnerabilities:** SQL injection, command execution, XSS, insecure deserialization, SSRF.
- **Concurrency & Async:** Race conditions, unhandled floating promises, deadlock patterns.
- **Framework & Runtime Misuse:** React re-render cycles, Node.js memory leaks, TypeScript unsafe type assertions.
- **Safe Code / False-Positive Tests:** High-quality idiomatic code intentionally designed to verify that the model does not trigger false warnings.

### Tracked Metrics

1. **Finding Precision:** % of reported findings that are verified, legitimate issues.
2. **Finding Recall:** % of total seeded code bugs that the AI successfully uncovered.
3. **Critical Finding Recall:** Recall specifically on `CRITICAL` severity security threats.
4. **False-Positive Rate:** % of harmless code patterns misflagged as defects.
5. **Structured Output Validity:** % of model outputs that conform to strict JSON schemas without repair.
6. **Average & p95 Review Latency:** Turnaround time for complete diff analysis.
7. **AI Cost per Review:** Total input/output token expenditure.
8. **Severity Agreement Rate:** Consistency of finding severity rankings against expert ground truth.

### Regression Check API Contract

- **Endpoint:** `POST {MODEL_REGRESSION_URL}/api/v1/regression/check`
- **Header:** `x-api-key: {MODEL_REGRESSION_API_KEY}`
- **Request Payload:**
```json
{
  "project": "ai-pr-review-platform",
  "version": "1.0.0",
  "datasetId": "pr-review-evaluation",
  "datasetVersion": "1.0.0",
  "model": "gemini-1.5-pro",
  "promptVersion": "v1.2.0",
  "baselineId": "baseline-v1.0.0",
  "metrics": [
    "quality",
    "latency",
    "cost",
    "structured_output_validity"
  ]
}
```
- **Response Payload:**
```json
{
  "status": "PASS",
  "runId": "reg_run_9f81a7b4",
  "summary": {
    "passed": 8,
    "warnings": 1,
    "failed": 0
  },
  "metrics": {
    "quality": { "baseline": 92.4, "candidate": 93.1, "delta": 0.7, "status": "PASS" },
    "latency": { "baseline": 2.1, "candidate": 2.3, "delta": 0.2, "status": "WARN" },
    "cost": { "baseline": 0.021, "candidate": 0.023, "delta": 0.002, "status": "PASS" },
    "structured_output_validity": { "baseline": 99.2, "candidate": 99.5, "delta": 0.3, "status": "PASS" }
  },
  "regressions": []
}
```

### Triggering Policies & Failure Resilience

To prevent unnecessary evaluation cost, regression checks are not run on every routine application PR. Instead, configurable policies are supported:
- **`REGRESSION_CHECK_MODE=manual` (Default):** On-demand execution from dashboard or API.
- **`REGRESSION_CHECK_MODE=ci`:** Triggered during model/prompt release pipelines.
- **`REGRESSION_CHECK_MODE=review`:** Run alongside PR reviews for high-security repositories.

**Failure Behavior:**
If the Model Regression service is temporarily unreachable or experiences an outage:
- When `REGRESSION_BLOCKING=false` (default): Review sets `regressionStatus=ERROR` and continues code review publication normally.
- When `REGRESSION_BLOCKING=true`: Fails the GitHub Check Run quality gate.

---

## 13. Notification Service Integration

The backend interacts with the dedicated **Notification Service** via `POST {NOTIFICATION_SERVICE_URL}/notifications/events`:
- `review.completed`
- `review.failed`
- `finding.critical_detected`
- `regression.failed` (dispatched when model regression quality gate fails)

Notification Service is completely independent from AI Platform and Model Regression Platform, ensuring decoupled infrastructure.

---

## 14. Redis Architecture

- **Primary URL:** `REDIS_URL` with automatic TLS detection (`rediss://`).
- **Fallback Config:** `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.
- **Responsibilities:**
  - BullMQ job queues and worker state.
  - Throttler rate limiting store.
  - Short-lived distributed locks for review deduplication.
  - Ephemeral cache for GitHub API responses.

---

## 14. BullMQ Distributed Queue Architecture

- **Queue Name:** `pr-review`
- **Concurrency:** Configurable worker concurrency (default 5).
- **Retry Strategy:** 3 attempts with exponential backoff (`delay: 3000ms`).
- **Timeout Protection:** Job timeout protection to prevent stalled worker threads.
- **Resilient Fallback:** If Redis is temporarily unreachable, `ReviewsService` falls back to asynchronous in-process queue execution.

---

## 15. MongoDB Schema & Index Design

### Primary Collections:

1. **`User`** (`email`, `passwordHash`, `roles`, `githubUsername`, `refreshTokenHash`)
   - Unique Index: `email`
2. **`PullRequestReview`** (`repositoryId`, `repoFullName`, `pullRequestNumber`, `commitSha`, `status`, `severityCounts`, `summary`)
   - Indexes: `{ repoFullName: 1, pullRequestNumber: 1, commitSha: 1 }`, `{ status: 1, createdAt: -1 }`
3. **`ReviewFinding`** (`reviewId`, `file`, `line`, `severity`, `category`, `confidence`, `source`, `fingerprint`)
   - Unique Index: `{ reviewId: 1, fingerprint: 1 }`
   - Index: `{ reviewId: 1, severity: 1 }`
4. **`ReviewJob`** (`jobId`, `reviewId`, `status`, `idempotencyKey`, `isCancelled`, `logs`)
   - Unique Index: `jobId`, `idempotencyKey`
5. **`WebhookEvent`** (`eventId`, `eventType`, `eventAction`, `repoFullName`, `pullRequestNumber`, `commitSha`)
   - Unique Index: `eventId`
6. **`ReviewConfiguration`** (`repositoryId`, `autoCommentEnabled`, `minCommentSeverity`, `customRules`, `ignoredFiles`)
7. **`UsageRecord`** (`userId`, `reviewId`, `tokensUsed`, `executionTimeMs`, `model`, `estimatedCostUsd`)

---

## 16. Authentication & Optional Auth Architecture

The platform supports **Optional Authentication**:
- **Anonymous Guests:** Can submit public GitHub PR URLs, inspect real-time review progress, and view all findings without logging in.
- **Authenticated Users:** Access review history, configure custom repository rules, link GitHub App installations, and receive notification digests.
- **JWT Rotation:** 15-minute Access JWT, 7-day Refresh JWT with automatic 1-retry refresh interceptor on the Next.js frontend.

---

## 17. GitHub App Architecture & Permissions

The backend integrates using Octokit App Authentication (`@octokit/auth-app`):
- **Permissions Required:**
  - `Pull requests`: Read & Write (fetch diffs, create review comments).
  - `Checks`: Read & Write (create check runs and line annotations).
  - `Contents`: Read-only (inspect file metadata).
  - `Metadata`: Read-only.
- **Token Handling:** Ephemeral installation access tokens generated dynamically per request; no long-lived tokens stored.

---

## 18. Chrome Extension Architecture (Manifest V3)

- **`content.js`:** Monitors GitHub SPA DOM mutations, injects "✨ Review PR with AI" button in PR header.
- **`background.js`:** Service worker forwarding review trigger requests to backend API with stored JWT tokens.
- **`popup.html / popup.js`:** Displays active PR status, live progress bar, severity metrics counter, top findings, and deep link to Web Dashboard.
- **`options.html`:** Allows configuring backend URL and custom auth tokens.

---

## 19. Security Model & Protection Controls

- **Webhook Signature Verification:** `crypto.timingSafeEqual` over HMAC-SHA256 digests.
- **No Repository Code Execution:** AST rules and diff analysis run strictly via static token analysis; never runs arbitrary `npm build` or shell scripts from PRs.
- **Secret Redaction:** Redacts API keys, JWT secrets, passwords, and sensitive headers from all application logs.
- **Helmet Security Headers:** Content-Security-Policy and cross-origin resource isolation.
- **CORS Allowlist:** Explicitly allows production domain `https://pr-review.rishankkesharwani.com`, `chrome-extension://*`, and localhost.

---

## 20. AI Hallucination & Evidence Controls

To eliminate speculative or fabricated review comments:
1. **Diff Evidencing:** Every finding must correlate to added/modified lines extracted by `parseDiffPatch`.
2. **Style Downgrade:** Pure style/formatting opinions are strictly prohibited from CRITICAL or HIGH severity.
3. **Confidence Scoring:** Findings must meet minimum confidence thresholds (>= 0.70) to trigger notifications or check failures.

---

## 21. Finding Deduplication & Arbitration Engine

When both static analyzers and AI flag the same issue:
1. Computes SHA256 fingerprint: `hash(repo + prNumber + file + line + category + normalizedTitle)`.
2. Merges duplicate findings into a single record.
3. Boosts confidence score (+15%) when corroborated across multiple analyzers.
4. Retains the highest-fidelity technical explanation and recommendation.

---

## 22. Idempotency & Replay Protection

- Webhook events generate a deterministic key: `gh:{repoFullName}:{prNumber}:{commitSha}:{action}`.
- If delivered twice by GitHub, the second request is recognized as duplicate and acknowledged with `200 OK` without creating extra jobs.

---

## 23. Retry Strategy & Resilience

- **BullMQ Workers:** 3 retry attempts with exponential backoff on transient network hiccups.
- **Fallback Review:** If the AI Platform service is temporarily unreachable, the review gracefully completes with static analysis findings rather than failing the entire pipeline.
- **Frontend API Client:** Automatic 1-time token refresh retry on 401 Unauthorized errors.

---

## 24. Rate Limiting & Throttling

- **API Throttling:** 30 requests per minute per IP via `@nestjs/throttler`.
- **GitHub Rate Limit Backoff:** Handles 403 / 429 GitHub API rate limit responses gracefully.

---

## 25. AI Cost & Context Window Controls

- Configurable limits: `REVIEW_MAX_FILES` (default 50), `REVIEW_MAX_DIFF_SIZE` (default 1MB), `REVIEW_MAX_TOKENS` (default 32,000).
- Large diffs are cleanly truncated per file to avoid context window overflows.
- Every review writes an audit entry in `UsageRecord` tracking tokens, latency, and estimated cost.

---

## 26. Error Handling Strategy

- Global `HttpExceptionFilter` formats all API errors into standard JSON:
```json
{
  "statusCode": 400,
  "message": "Invalid GitHub Pull Request URL",
  "error": "Bad Request",
  "timestamp": "2026-10-05T...",
  "path": "/api/v1/reviews"
}
```

---

## 27. Observability & Structured Telemetry

- Request correlation IDs (`x-request-id`) tracked across controllers, workers, and external calls.
- `LoggingInterceptor` logs method, URL, status code, and latency in milliseconds.
- Job stage execution logs persisted in `ReviewJob.logs` array for auditing.

---

## 28. Deployment Architecture

```
Internet
   │
   ├──► Vercel (Frontend Next.js) ──► https://pr-review.rishankkesharwani.com
   │
   └──► Render (Backend NestJS) ──► Port $PORT (0.0.0.0)
           │
           ├──► MongoDB Atlas / Managed Database
           ├──► Redis Managed Instance
           ├──► AI Platform (Internal / Service Key)
           └──► Notification Service (Internal / Service Key)
```

---

## 29. Render Deployment (Backend)

- **Root Directory:** `backend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start:prod`
- **Health Check Path:** `/health`
- **Environment:** Node.js (Render injects `$PORT` dynamically, application binds to `0.0.0.0`).

---

## 30. Vercel Deployment (Frontend)

- **Root Directory:** `frontend`
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Environment Variables:** `NEXT_PUBLIC_API_URL=https://<your-backend-render-url>`, `NEXT_PUBLIC_ACCESS_ENABLED=true`

---

## 32. Environment Variables

### Backend (`backend/.env`):

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | HTTP Port | `3000` |
| `NODE_ENV` | Environment mode | `production` / `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://pr-review.rishankkesharwani.com` |
| `PUBLIC_ACCESS_ENABLED` | Allow anonymous reviews | `true` |
| `MONGODB_URI` | MongoDB Connection URI | `mongodb+srv://...` |
| `REDIS_URL` | Redis Connection URL | `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` | Secret for Access JWT | `secret-32-chars-min` |
| `JWT_REFRESH_SECRET` | Secret for Refresh JWT | `secret-32-chars-min` |
| `AI_PLATFORM_URL` | AI Platform base URL | `http://localhost:4000` |
| `AI_PLATFORM_PR_REVIEW_API_KEY` | Dedicated AI API Key | `key-...` |
| `NOTIFICATION_SERVICE_URL` | Notification Service URL | `http://localhost:4001` |
| `NOTIFICATION_PR_REVIEW_API_KEY`| Dedicated Notif Key | `key-...` |
| `MODEL_REGRESSION_URL` | Model Regression Platform URL | `http://localhost:5000` |
| `MODEL_REGRESSION_API_KEY` | Dedicated Regression Key | `key-...` |
| `MODEL_REGRESSION_TIMEOUT_MS` | Request timeout ms | `10000` |
| `REGRESSION_CHECK_MODE` | Trigger mode (`manual`/`review`/`ci`) | `manual` |
| `REGRESSION_BLOCKING` | Block PR check on FAIL | `false` |
| `GITHUB_APP_ID` | GitHub App ID | `123456` |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App RSA Key | `"-----BEGIN RSA..."` |
| `GITHUB_WEBHOOK_SECRET` | Webhook HMAC Secret | `webhook_secret_here` |
| `AUTO_COMMENT_ENABLED` | Auto-post PR comments | `false` |

### Frontend (`frontend/.env`):

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of NestJS Backend (e.g. `https://backend.example.com`) |
| `NEXT_PUBLIC_ACCESS_ENABLED` | Enables guest submission on landing page (`true`) |

---

## 33. Local Development Setup

### Prerequisites:
- Node.js >= 20.x
- MongoDB (running on `localhost:27017`)
- Redis (running on `localhost:6379`)

### Step-by-Step:

1. **Clone repository:**
```bash
git clone https://github.com/rishank-kesarwani/ai-pr-review-platform.git
cd ai-pr-review-platform
```

2. **Setup Backend:**
```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

3. **Setup Frontend:**
```bash
cd ../frontend
cp .env.example .env.local
npm install
npm run dev
```

4. **Access Applications:**
- Frontend Dashboard: `http://localhost:3001`
- Backend API: `http://localhost:3000`
- Swagger Docs: `http://localhost:3000/api/docs`
- Health Endpoint: `http://localhost:3000/health`

---

## 34. GitHub App Setup Guide

1. Navigate to **GitHub Settings -> Developer Settings -> GitHub Apps -> New GitHub App**.
2. **Webhook URL:** `https://<your-backend-url>/api/v1/github/webhooks`.
3. **Webhook Secret:** Set a random secure string (save to `GITHUB_WEBHOOK_SECRET`).
4. **Permissions:**
   - Pull Requests: Read & Write
   - Checks: Read & Write
   - Contents: Read
   - Metadata: Read
5. **Subscribe to events:** `Pull request`, `Installation`, `Installation repositories`.
6. Generate a Private Key (`.pem`), copy its text into `GITHUB_APP_PRIVATE_KEY`.

---

## 35. Chrome Extension Setup Guide

1. Navigate to `extension/` directory:
```bash
cd extension
npm install
npm run build
```
2. Open Google Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** toggle.
4. Click **Load unpacked** and select `ai-pr-review-platform/extension/dist`.
5. Open any GitHub PR page (e.g. `github.com/facebook/react/pull/28000`) and click **✨ Review PR with AI**.

---

## 36. Testing Strategy

The repository includes a comprehensive Jest test suite verifying analyzers, guards, arbitration, and services:

```bash
cd backend
npm test
```

### Coverage Includes:
- `utils.spec.ts`: PR URL parsing, diff hunk extraction, SHA256 fingerprinting, URL normalization.
- `analyzers.spec.ts`: ESLint dynamic code execution detection, floating promise analysis, `any` type checks.
- `arbitration.spec.ts`: Multi-engine deduplication, corroboration confidence boosts, style downgrade rules.
- `model-regression.service.spec.ts`: Model regression detection client, PASS/WARN/FAIL classification, timeouts, retries, 401 unauthenticated errors.
- `github-webhook.guard.spec.ts`: HMAC-SHA256 signature verification and tamper rejection.
- `auth.service.spec.ts`: Password hashing, token generation, and credential checks.
- `reviews.service.spec.ts`: Public access review queuing and BullMQ dispatch.

---

## 37. CI/CD Pipeline

GitHub Actions CI (`.github/workflows/ci.yml`) runs on every push and pull request:
- **`backend-check`:** `npm ci`, `npm test`, `npm run build`
- **`frontend-check`:** `npm ci`, `npm run build`
- **`extension-check`:** `npm ci`, `npm run build`

---

## 38. REST API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/reviews` | Submit a GitHub PR URL for automated review |
| `GET` | `/api/v1/reviews` | List recent reviews (filterable by status/repo) |
| `GET` | `/api/v1/reviews/:id` | Get review status, summary, and severity counts |
| `GET` | `/api/v1/reviews/:id/findings` | Get detailed findings for a review |
| `GET` | `/api/v1/reviews/:id/regression` | Get normalized model regression evaluation status & metrics |
| `POST` | `/api/v1/reviews/:id/regression/trigger` | Trigger an on-demand model regression check |
| `POST` | `/api/v1/reviews/:id/cancel` | Cancel an active or queued review |
| `POST` | `/api/v1/reviews/:id/retry` | Retry a failed or partial review |
| `POST` | `/api/v1/github/webhooks` | GitHub App Webhook ingestion |
| `GET` | `/api/v1/repositories` | List connected repositories |
| `PATCH`| `/api/v1/repositories/:id/config`| Update repository review rules |
| `POST` | `/api/v1/auth/register` | Register new user account |
| `POST` | `/api/v1/auth/login` | Log in with email & password |
| `POST` | `/api/v1/auth/refresh` | Rotate access & refresh tokens |
| `GET` | `/api/v1/auth/me` | Get authenticated user profile |
| `GET` | `/health` | Unauthenticated service health check |

---

## 39. Known Limitations

1. **Context Window Limits on Massive Monorepo PRs:** Pull requests exceeding 50+ files or 1MB diffs are truncated to preserve token quotas.
2. **Private Repository Access:** Private repositories require GitHub App installation with authorized repo permissions.
3. **Execution Sandboxing:** Static analysis currently analyzes diff AST patterns; whole-program type graph resolution is limited to changed file context.

---

## 40. Future Improvements

- [ ] Support for Python (`ruff`/`flake8`), Go (`golangci-lint`), and Rust (`clippy`) static analyzers.
- [ ] Multi-Model AI arbitration (Gemini 1.5 Pro + Claude 3.5 Sonnet consensus voting).
- [ ] Interactive autofix GitHub Pull Request branch commit generation.
- [ ] Slack & Discord interactive review approval bots.
- [ ] PR semantic embeddings for historical review memory and repository consistency.

---

## License

MIT © [Rishank Kesarwani](https://github.com/rishank-kesarwani)
