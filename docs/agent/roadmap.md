# Roadmap

This roadmap breaks the product into execution phases that future agents can implement incrementally.

## Phase 0: Stabilize Root App

Goal:

- Keep the current root-level Next.js app reliable and deployable

Tasks:

- Keep Google Login working
- Keep the single main chart working
- Preserve overall and segmental chart views
- Keep manual add-record flow available
- Keep docs aligned with actual product intent

Definition of done:

- The prototype loads without JS errors
- The root app loads without JS errors
- Login works
- Main chart renders both overall and segmental views

## Phase 1: Real Record Management

Goal:

- Move from mock data to real user-owned records

Tasks:

- Create database schema in Supabase
- Add persistent record storage
- Load records by authenticated user
- Add edit record flow
- Add delete record flow
- Add include/exclude record flow for charts

Definition of done:

- Records survive refresh and redeploy
- Each user only sees their own records
- Charts only use included records

## Phase 2: Operational Hardening

Goal:

- Make the existing single-service deployment easier to operate and validate

Tasks:

- Improve local setup guidance
- Add stronger smoke-test checklists
- Refine deployment docs and secret handling
- Keep package/toolchain versions explicit
- Reduce config drift between local and Fly environments

Definition of done:

- A new maintainer can boot the app locally without guesswork
- Deploy steps match the actual repository layout
- Auth flow works consistently in local and production

## Phase 3: Fly.io Deployment

Goal:

- Keep the single service deployment production-ready on Fly.io

Tasks:

- Maintain Docker and Fly configuration
- Configure environment variables and secrets
- Set up production domains
- Verify login redirect configuration

Definition of done:

- The app is deployed on Fly
- Auth flow works in production
- Record CRUD and charts work in production

## Phase 4: Better Record UX

Goal:

- Make data management practical for daily use

Tasks:

- Add record list view
- Add filtering and sorting
- Show include/exclude status clearly
- Add record-level edit actions
- Add safe delete confirmation
- Improve chart labels and dataset clarity

Definition of done:

- A user can confidently manage records without touching raw JSON

## Phase 5: Photo Scan Input

Goal:

- Support adding InBody records from images

Tasks:

- Add image upload UI
- Store scan image in durable storage
- Run extraction pipeline
- Show extracted values in review form
- Require user confirmation before save
- Mark source type as `photo_scan`

Definition of done:

- A user can upload an InBody sheet image
- Extracted values can be reviewed and corrected
- Confirmed records are saved normally

## Phase 6: Scan Quality and Trust Controls

Goal:

- Make scan-based records trustworthy enough for analysis

Tasks:

- Store extraction confidence
- Flag low-confidence fields
- Add review status
- Allow scan-origin records to stay excluded from charts by default if needed
- Keep raw extraction metadata for debugging

Definition of done:

- Users can tell which records need review
- Suspicious scan records do not silently pollute charts

## Phase 7: Product Refinement

Goal:

- Turn the product from a functional tool into a polished workflow

Tasks:

- Improve empty states
- Improve mobile layout
- Add onboarding hints
- Add summary cards
- Add chart annotations for unusual records
- Add undo or archive flow where appropriate

Definition of done:

- The core workflow feels coherent and production-ready

## Suggested Build Order For Agents

If an agent needs a clear implementation order, use this:

1. Persistent schema
2. Record CRUD
3. Chart inclusion flag
4. Operational hardening
5. Fly deployment structure
6. Record management UX
7. Photo scan
8. Scan review and quality handling

## Non-Goals For Early Phases

Do not prioritize these before persistence and CRUD are stable:

- advanced analytics
- social features
- broad design refactors
- multiple chart pages
- over-complicated OCR automation without review
