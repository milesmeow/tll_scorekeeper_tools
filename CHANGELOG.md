# Changelog

All notable changes to the Baseball Team Management App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Bulk add users from a CSV list in User Management (`/users`, super_admin only)
  - New "⬆ Bulk Add" button opens `BulkAddUsersModal.jsx`; paste `Full Name, email` (one per line)
  - All users are created with the `coach` role; each gets an auto-generated 12-char temporary password
  - New `src/lib/userCsvUtils.js` is the single source of truth: `parseUserCsv()`, `generateTempPassword()` (now also reused by `AddUserModal.jsx`), and `usersToResultCsv()`
  - Users are created sequentially via the existing `create-user` edge function; the batch continues on error and reports results per row
  - Results screen shows a successes table (Full Name · email · temp password) with Copy CSV / Download .csv, plus a failures list (line, email, reason)
  - In-paste duplicate emails and invalid formats are rejected before any account is created
  - New tests: `userCsvUtils.test.js` (17)
- Change a user's role between Coach and Admin from User Management (`/users`, super_admin only)
  - New `ChangeRoleModal.jsx` confirmation dialog with a Coach/Admin `<select>`
  - `handleChangeRole()` in `UserManagement.jsx` performs a direct `user_profiles.role` update (no edge function needed), permitted by the existing "Super admins can update profiles" RLS policy
  - `super_admin` accounts are excluded (mirrors the Delete restriction); the select never offers Super Admin
  - Existing `team_coaches` assignments are left untouched on role change
  - New tests: `ChangeRoleModal.test.jsx` (5) and role-change coverage in `UserManagement.test.jsx`

## [1.22.0] - 2026-03-26

### Added

- Rule 7: No pitching 3 consecutive calendar days (cross-game validation)
  - `pitchedThreeConsecutiveDays()` in `src/lib/violationRules.js`
  - Checks the two most recent pitching dates per player from `pitching_logs`
  - Warning shown in game entry confirmation step and game detail modal
  - `calculateGameHasViolations()` updated with new `playerConsecutivePitchDates` parameter
  - 11 new tests; total test count 77 → 88
- `previousSecondLastPitchDate` threaded through eligibility maps in `GameEntry.jsx` and `GameDetailModal.jsx`

### Changed

- Eligibility fetch queries now return all pitching logs (removed `next_eligible_pitch_date IS NOT NULL` filter) so Rule 7 can detect pitching dates regardless of rest requirement
- Playing time rules renumbered: No Consecutive Sitting → Rule 8, Minimum Infield → Rule 9
- Updated `RULES.md` to v2.4 with full Rule 7 documentation and renumbered playing time rules

## [1.21.0] - 2026-02-16

### Added

- Printable Lineup Summary view in the Lineup & Positions Builder (`/lineup`)
  - "View Summary" button toggles from interactive builder to clean, print-ready lineup card
  - Table shows batting order #, jersey number, player name, and field position per inning (1-6)
  - "Print Lineup" button triggers browser print dialog with optimized single-page layout
  - "Back to Builder" button returns to editing mode with all data intact
- Playing time rule reminders displayed on Lineup Summary:
  - Rule 7: No player will sit out 2 consecutive innings
  - Rule 8: All players must play at least 1 inning of defense in the infield each game
- Print CSS (`@media print`) rules in `src/index.css` for lineup card formatting
- Documented Rules 7 & 8 in RULES.md (playing time rules)

## [1.20.3] - 2026-02-02

### Added
- Dynamic extra innings support in Game Entry (up to 12 innings)
  - Starts at 6 innings by default; "+ Add Inning" button increments one at a time
  - Edit mode auto-detects and loads existing max innings
  - Hard cap at 12 innings for youth baseball safety
- 39 new test cases for extra innings scenarios (Rules 1–4, complex/edge cases, realistic scenarios); total test count 37 → 76

### Fixed
- Rule 4 logic corrected to count innings caught *before* pitching started, not total catching innings
  - Prevents false negatives when a player catches 4+ total innings but only 1–3 were before pitching

## [1.20.2] - 2026-01-19

### Changed

- Major documentation consolidation: reduced from 21 to 12 markdown files (43% reduction)
  - Merged SETUP.md, CHECKLIST.md into QUICKSTART.md
  - Added setup progress checklist to QUICKSTART.md
  - Updated cross-references in README.md and database docs

### Removed

- Deleted 9 redundant/outdated documentation files:
  - DELIVERY.md (Phase 1 delivery summary - outdated)
  - PROJECT_SUMMARY.md (overlapped with README)
  - HANDOFF-TO-CLAUDE-CODE.md (superseded by CLAUDE.md)
  - INDEX.md (navigation index - README serves this purpose)
  - START_HERE.md (just linked to other docs)
  - SETUP.md (merged into QUICKSTART.md)
  - CHECKLIST.md (merged into QUICKSTART.md)
  - database/PERFORMANCE_OPTIMIZATION_COMPLETE.md (one-time completion report)
  - database/FUTURE_REACT_MONITORING.md (speculative/deferred feature)

## [1.20.1] - 2026-01-19

### Changed

- Updated ARCHITECTURE.md documentation accuracy audit
  - Corrected table count from 9 to 10 (added `app_config` table)
  - Removed outdated "(NO RLS)" annotation from `user_profiles` (now has RLS via three-layer architecture)
  - Verified `reset-password` edge function exists and is documented correctly
  - Corrected foreign key documentation: mixed CASCADE/RESTRICT strategy (not CASCADE-only)

### Fixed

- Documentation inconsistencies in ARCHITECTURE.md that accumulated during feature evolution

## [1.20.0] - 2026-01-09

### Added

- Comprehensive testing framework using Vitest
  - 101 tests covering validation rules and utility functions
  - Test coverage for `violationRules.js`, `pitchSmartRules.js`, and `pitchCountUtils.js`
  - Visual test dashboard (`npm run test:ui`)
  - Coverage reporting (`npm run test:coverage`)
- CLAUDE.md development guide for AI-assisted development
- TESTING.md comprehensive testing documentation

### Changed

- Refactored date formatting to use centralized `formatDate()` function
  - Consolidated 8 instances across `SeasonManagement.jsx` and `exportUtils.js`
  - Ensures consistent date formatting and better maintainability
- Refactored date handling functions to eliminate code duplication
  - Extracted shared date utilities to `pitchCountUtils.js`

### Fixed

- Player absence date display (timezone correction)
- Season page date display (timezone correction)
- Multiple date handling issues across the application

## [1.1.14] - 2026-01-08

### Added

- Coach names now displayed on Teams page
- Database RLS policy updates for `team_coaches` table to allow broader read access

### Changed

- Refactored functions to eliminate side effects (functional programming improvements)
- Moved date column position in CSV exports for player pitch/catch log
- Code quality improvements through multiple refactoring passes

### Fixed

- Function purity issues (eliminated side effects)

## [1.1.13] - 2025-12-XX

### Added

- Vercel configuration file for deployment

### Fixed

- Sign-out routing issue causing 404 errors
- Authentication flow improvements

## [1.1.12] - 2025-12-XX

### Fixed

- Application navigation issue when browser loses focus
- Smart auth state management to prevent unnecessary re-renders on tab focus
- Implemented SPA routing for better navigation experience

## [1.1.11] - 2025-12-XX

### Added

- Team information added to pitching log reports

### Changed

- Updates to tools and reports section

## [1.1.10] - 2025-12-XX

### Added

- Max pitch violation checking (Rule 5: age-based pitch count limits)
- `has_violation` field to games table for tracking violations

### Changed

- Refactored violation checking functions to be DRY (Don't Repeat Yourself)
- Updated game details view with improved violation display

## Earlier Versions

See git history for changes in versions 1.1.9 and earlier.

---

## Categories

This changelog uses the following categories:

- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security vulnerability fixes
