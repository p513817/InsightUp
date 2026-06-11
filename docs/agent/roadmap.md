# Roadmap

This roadmap reflects the current product state and the safest build order for future agents.

## Completed Foundation

These are no longer roadmap items; treat them as existing behavior to preserve.

- Single deployable Next.js App Router app
- Supabase Auth with Google OAuth
- Supabase SSR session propagation
- InBody record CRUD
- soft delete via `deleted_at`
- chart inclusion/exclusion separate from deletion
- overall and segmental chart views
- dashboard preferences
- AI trend summary with cached/latest fetch and explicit regeneration
- plan-driven LLM entitlement resolution
- AI scan draft input with review-first behavior
- friend codes, friend snapshots, and friend history
- personal goals with negative progress support
- competitions with invited members, member goals, and leaderboard progress
- Vercel production deployment target

## Phase 1: Product Hardening

Goal:

- Make the existing feature set harder to regress.

Tasks:

- Expand tests around personal goal edge cases, especially zero-change targets and negative progress.
- Add focused tests around competition member sorting and locked target dates.
- Add API-level tests or route-handler tests for scan entitlement and trend summary entitlement paths.
- Keep `messages/*.json` coverage aligned whenever UI copy changes.
- Add smoke-test notes for mobile viewport flows that use bottom docks and floating actions.

Definition of done:

- Core flows can be changed with clear focused tests.
- Future agents can find the correct file entry points without scanning the entire repo.

## Phase 2: Notifications And Realtime

Goal:

- Notify users about social and competition events without making clients responsible for fan-out.

Candidate events:

- competition invitation
- member accepted or declined
- friend added a new InBody record
- friend/competition member reached or regressed on a goal

Suggested build order:

1. Add `notifications` table and in-app notification list/badge.
2. Add server-side notification creation in existing route handlers/RPC-adjacent flows.
3. Add Supabase Realtime subscriptions for visible-page refreshes.
4. Add Web Push subscription storage and delivery.
5. Add transactional email fallback later if product value is clear.

Definition of done:

- Users can see durable in-app notifications.
- Competition detail pages update when membership or goals change.
- Push/email delivery is optional and never the only source of truth.

## Phase 3: AI Scan Storage And Review Depth

Goal:

- Make scan-origin records trustworthy and auditable.

Tasks:

- Store uploaded scan files in durable storage if product requires later review.
- Persist extraction metadata in `raw_extraction_json`.
- Improve field-level uncertainty display in the record form.
- Consider plan-specific scan model pools through entitlement config.
- Keep scan save as an explicit user-confirmed action.

Definition of done:

- Users can understand which scan fields were inferred confidently.
- Bad scans do not silently pollute charts.

## Phase 4: Social And Competition Refinement

Goal:

- Make friends and competitions useful without becoming noisy leaderboard gimmicks.

Tasks:

- Improve competition invitation lifecycle and notification states.
- Add clearer empty states for invited users without goals.
- Add friend record notification preferences.
- Consider competition archive/completed views.
- Improve owner controls while preserving member privacy.

Definition of done:

- Users understand what action is expected from invitations.
- Competition data remains scoped to members and RLS boundaries.

## Phase 5: Sharing And Reporting

Goal:

- Turn trend and goal progress into shareable artifacts.

Tasks:

- Stabilize share page output and screenshot/export behavior.
- Add report-style summaries for a selected date range.
- Consider privacy controls for shared metrics.
- Keep exports based on included chart records unless explicitly configured otherwise.

Definition of done:

- A user can produce a useful progress snapshot without exposing unrelated private data.

## Phase 6: Commercialization

Goal:

- Align plan entitlements, usage limits, and account UI with real product packaging.

Tasks:

- Move any remaining feature fallback logic into shared helpers or RPCs.
- Add billing-provider integration only after plan model is stable.
- Expand account page from plan display to plan management.
- Add admin/operator docs for entitlement changes.

Definition of done:

- Product limits are inspectable from the database.
- UI and backend enforce the same limits.

## Non-Goals Until Requested

- Splitting into separate web/API services.
- Direct AI scan auto-save without review.
- Hardcoding special users or developer bypasses.
- Replacing Supabase RLS with app-only authorization.
- Building push/email delivery before in-app notification history exists.
