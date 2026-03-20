---
name: secondme-dev-assistant
description: Use when working on this drift-bottle project's SecondMe developer workflow, including checking App Info, validating OAuth setup, preparing local and production callbacks, identifying missing review materials, and guiding external app or integration submission on develop.second.me.
user-invocable: true
---

# SecondMe Dev Assistant

This skill is the local entry point for SecondMe developer work in this repository.

Use it when the user wants to:

- validate this project's SecondMe OAuth setup
- prepare or verify App Info for develop.second.me
- complete local or production callback configuration
- check which app listing materials are still missing
- understand whether this repo is ready for external app submission
- understand whether this repo is ready for integration submission
- continue a SecondMe debugging or submission workflow without re-explaining the repo

## Repository-Aware Scan Order

When this skill is used for drift-bottle, inspect these files first:

1. `lib/secondme.ts`
2. `app/login/page.tsx`
3. `app/api/auth/callback/route.ts`
4. `docs/project-overview.md`
5. `.env.local.example`
6. `package.json`

Only inspect more files if the question cannot be answered from those files.

## Confirmed Facts For This Repo

- This is a Next.js App Router project.
- The project already implements SecondMe OAuth login.
- The OAuth authorize URL is `https://go.second.me/oauth/`.
- The OAuth token exchange endpoint is `https://api.mindverse.com/gate/lab/api/oauth/token/code`.
- Token exchange must use `application/x-www-form-urlencoded`.
- The current login page requests the `user.info` scope.
- The callback route is `/api/auth/callback` and validates `state` with a cookie.
- The repo also calls SecondMe user info and Plaza-related APIs after login.
- The repo currently has no confirmed MCP server, no confirmed MCP endpoint, and no confirmed integration manifest.

## Working Rules

Always report findings under these labels:

- `confirmed`
- `inferred`
- `missing`

Do not invent:

- extra scopes not proven by docs or user confirmation
- production callback URLs
- app IDs, integration IDs, endpoints, or secrets
- submission readiness for integration review when MCP is still missing

## Guidance Rules For This Repo

### 1. OAuth / App Info

If the user asks whether this project can be connected to SecondMe, first verify:

- `NEXT_PUBLIC_SECONDME_CLIENT_ID`
- `SECONDME_CLIENT_SECRET`
- local callback URL consistency with `/api/auth/callback`
- whether a production domain exists

If production domain is missing, mark production callback as `missing` instead of guessing.

### 2. External App Submission

Treat external app submission as possible when the OAuth app metadata is complete.

Minimum information to collect or confirm:

- app name
- app description
- redirect URIs
- allowed scopes
- website URL
- support URL
- privacy policy URL
- icon URL
- screenshots

If optional listing assets are missing, say submission can proceed but review quality may be weaker.

### 3. Integration Submission

For this repository, do not claim it is ready for SecondMe integration submission unless all of the following are confirmed:

- an MCP server or MCP-compatible endpoint exists
- the endpoint is reachable from the internet
- actual tool names are defined
- auth mode is confirmed
- a release endpoint is confirmed

If those are absent, explain clearly that this repo is currently an OAuth web app, not yet a releasable SecondMe integration.

### 4. Local Debug Flow

When guiding local debugging for this repo, prefer this order:

1. confirm App Info in develop.second.me
2. confirm `.env.local` contains the right client ID and client secret
3. run the app locally
4. trigger login from `/login`
5. verify callback success
6. verify user profile sync
7. verify Plaza access

### 5. Submission Summary Output

When the user asks what to submit, produce a compact checklist with:

- current repo status
- app submission readiness
- integration submission readiness
- missing fields or assets
- next blocking action

## Response Style

- compact
- exact
- security-first
- repository-aware

Never repeat a raw client secret back to the user.