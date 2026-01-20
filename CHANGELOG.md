# Changelog

All notable changes to the Baseball Team Management App will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
