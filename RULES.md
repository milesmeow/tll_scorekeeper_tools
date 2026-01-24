# Baseball Game Rules & Validation

**Last Updated**: January 2026
**Status**: All 6 rules implemented with validation warnings

---

## Overview

This document outlines the baseball rules that must be enforced in the TLL Scorekeeper application. These rules are based on youth baseball safety guidelines and league-specific regulations designed to protect player health and ensure fair play.

---

## Pitching & Catching Rules

### 1. Consecutive Innings Rule (Pitchers)

**Status**: ✅ **Implemented** (validation warnings shown)

**Rule**: A pitcher cannot return to pitch after being taken out. Once a pitcher stops pitching, they cannot pitch again in that game.

**Example**:

- ✅ Valid: Player pitches innings 1, 2, 3
- ✅ Valid: Player pitches innings 4, 5, 6
- ❌ Invalid: Player pitches innings 1, 2, then inning 5 (gap between 2 and 5)
- ❌ Invalid: Player pitches inning 2, then inning 4 (missing inning 3)

**Implementation**:

- Location: `src/components/games/GameEntry.jsx` (lines ~767-797, 1113-1134)
- Behavior: Checkboxes are clickable but validation error appears in player's section
- Error Message: "⚠️ Violation: A pitcher cannot return after being taken out. Innings must be consecutive (e.g., 1,2,3 or 4,5,6)."

**Technical Details**:

```javascript
// Helper function checks for gaps in innings array
const hasInningsGap = (innings) => {
  if (innings.length <= 1) return false;
  const sorted = [...innings].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] !== 1) {
      return true; // Gap found
    }
  }
  return false;
};
```

---

### 2. High Pitch Count Catching Restriction

**Status**: ✅ **Implemented** (validation warnings shown)

**Rule**: If a player throws 41+ pitches in a game, they cannot catch AFTER pitching.

**Key Point**: The violation occurs when a player catches AFTER pitching 41+. The sequence matters - catching innings must occur AFTER pitching innings.

**Rationale**: Protects arm health by preventing excessive throwing stress in a single day.

**Example 1 - VIOLATION**:

- Player pitches innings 1, 2, 3 with 45 pitches (penultimate = 44, so 44+1 = 45)
- Player tries to catch innings 4, 5, 6, or 7
- ❌ **VIOLATION**: Pitched 41+ then caught

**Example 2 - NO VIOLATION**:

- Player catches innings 1, 2
- Player pitches innings 3, 4 with 45 pitches
- ✅ **OK**: Catching occurred BEFORE pitching, not after

**Implementation Details**:

- Location: `src/components/games/GameEntry.jsx` (lines ~807-827)
- Uses penultimate batter count + 1 for pitch threshold (41+)
- Checks if catching innings occur AFTER the last pitching inning (by inning number)
- Display warning: "⚠️ Violation: Player threw [X] pitches (41+) and cannot catch for the remainder of this game."
- Validation is non-blocking - checkboxes remain clickable

**Technical Logic**:

```javascript
// Only violates if:
// 1. Pitched 41+ (using penultimate + 1)
// 2. Has catching innings after pitching innings
const maxPitchingInning = Math.max(...player.innings_pitched);
const hasCaughtAfterPitching = player.innings_caught.some(
  (inning) => inning > maxPitchingInning
);
```

---

### 3. Four Inning Catching Restriction

**Status**: ✅ **Implemented** (validation warnings shown)

**Rule**: If a player catches 4 innings in a game, they cannot pitch AFTER catching 4 innings.

**Key Point**: The violation occurs when a player pitches AFTER catching 4 innings. Once they reach 4 caught innings, they cannot pitch any innings after that point.

**Rationale**: Prevents excessive throwing stress by limiting combined catching and pitching.

**Example 1 - VIOLATION**:

- Player catches innings 1, 2, 3, 4 (reached 4 catches at inning 4)
- Player tries to pitch inning 5 or later
- ❌ **VIOLATION**: Pitched after catching 4 innings

**Example 2 - NO VIOLATION**:

- Player pitches innings 1, 2
- Player catches innings 3, 4, 5, 6 (4 innings)
- ✅ **OK**: Pitching occurred BEFORE catching 4 innings

**Example 3 - NO VIOLATION (partial)**:

- Player catches innings 1, 2
- Player pitches inning 3
- Player catches innings 4, 5 (now has 4 total catches, reached at inning 5)
- ✅ **OK**: Pitching at inning 3 was before reaching 4 catches (which happened at inning 5)

**Implementation Details**:

- Location: `src/components/games/GameEntry.jsx` (lines ~829-845)
- Finds the 4th catching inning chronologically (when they reached the 4-inning limit)
- Checks if any pitching innings occur after that point
- Display warning: "⚠️ Violation: Player caught [X] innings and cannot pitch in this game."
- Validation is non-blocking - checkboxes remain clickable

**Technical Logic**:

```javascript
// Only violates if:
// 1. Caught 4+ innings
// 2. Has pitching innings that occur after the 4th catching inning
const sortedCatchingInnings = [...player.innings_caught].sort((a, b) => a - b);
const fourthCatchingInning = sortedCatchingInnings[3]; // When they reached 4 catches
const hasPitchedAfterFourCatches = player.innings_pitched.some(
  (inning) => inning > fourthCatchingInning
);
```

---

### 4. Combined Catching and Pitching Restriction (Cannot RETURN to Catch)

**Status**: ✅ **Implemented** (validation warnings shown)

**Rule**: "A player who played the position of catcher for three (3) innings or less, moves to the pitcher position, and delivers 21 pitches or more in the same day, may not RETURN to the catcher position on that calendar day."

**Key Point**: The violation requires THREE phases in sequence:

1. **Catch** 1-3 innings (BEFORE pitching)
2. **THEN Pitch** 21+ pitches
3. **THEN Return to Catch** (AFTER pitching)

All three must occur for a violation. Just catching after pitching is not enough - they must have also caught BEFORE pitching.

**Rationale**: Limits cumulative throwing stress from both catching and pitching.

**Example Scenario 1 - VIOLATION**:

- Player catches innings 1, 2 (2 innings) ← Caught BEFORE
- Player pitches innings 3, 4 with 25 pitches (penultimate = 24, so 24+1 = 25)
- Player catches inning 5 ← Returned to catch AFTER
- ❌ **VIOLATION**: Caught before, pitched 21+, returned to catch

**Example Scenario 2 - NO VIOLATION (under 21 pitches)**:

- Player catches inning 1 (1 inning)
- Player pitches innings 2, 3 with 15 pitches total
- Player catches inning 4
- ✅ **OK**: Under 21 pitches, can return to catch

**Example Scenario 3 - VIOLATION**:

- Player catches innings 1, 2, 3 (3 innings) ← Caught BEFORE
- Player pitches innings 4, 5 with 30 pitches total
- Player catches inning 6 ← Returned to catch AFTER
- ❌ **VIOLATION**: Caught 3 innings before, pitched 21+, returned to catch

**Example Scenario 4 - NO VIOLATION (didn't catch before pitching)**:

- Player pitches innings 1, 2 with 30 pitches
- Player catches innings 3, 4, 5 (3 innings) ← Only caught AFTER, never before
- ✅ **OK**: Not "returning" to catch because they never caught before pitching

**Example Scenario 5 - NO VIOLATION (didn't return after pitching)**:

- Player catches innings 1, 2, 3 (3 innings) ← Caught BEFORE
- Player pitches innings 4, 5 with 30 pitches
- ✅ **OK**: Caught before and pitched, but didn't return to catch after

**Implementation Details**:

- Location: `src/components/games/GameEntry.jsx` (lines ~847-877)
- Uses penultimate batter count + 1 for pitch threshold
- Checks for catching BEFORE pitching AND catching AFTER pitching
- Display warning: "⚠️ Violation: Player caught 1-3 innings and threw [X] pitches (21+). Cannot catch again in this game."
- Validation is non-blocking - checkboxes remain clickable

**Technical Logic**:

```javascript
// Only violates if ALL conditions are met:
// 1. Caught 1-3 innings total
// 2. Pitched 21+ (using penultimate + 1)
// 3. Has catching innings BEFORE pitching started
// 4. Has catching innings AFTER pitching ended
const minPitchingInning = Math.min(...pitchedInnings);
const maxPitchingInning = Math.max(...pitchedInnings);
const hasCaughtBeforePitching = player.innings_caught.some(
  (inning) => inning < minPitchingInning
);
const hasReturnedToCatch = player.innings_caught.some(
  (inning) => inning > maxPitchingInning
);
return hasCaughtBeforePitching && hasReturnedToCatch;
```

---

---

### 5. Age-Based Pitch Count Limits

**Status**: ✅ **Implemented** (validation warnings shown)

**Rule**: Players cannot exceed their age-specific maximum pitch count per game.

| Age Range | Max Pitches Per Game |
| --------- | -------------------- |
| 7-8       | 50                   |
| 9-10      | 75                   |
| 11-12     | 85                   |

**Example**:

- 10-year-old throws 76 pitches: ❌ **VIOLATION** (max 75)
- 12-year-old throws 85 pitches: ✅ **OK** (exactly at limit)
- 8-year-old throws 51 pitches: ❌ **VIOLATION** (max 50)

**Implementation Details**:

- Location: `src/lib/violationRules.js` - `exceedsMaxPitchesForAge()`
- Uses penultimate batter count + 1 for pitch threshold
- Display warning: "⚠️ Violation: Threw [X] pitches, exceeding the maximum of [Y] for age [Z]."
- Validation is non-blocking - data can still be saved

---

### 6. Pitched Before Required Rest Period

**Status**: ✅ **Implemented** (validation warnings shown)

**Rule**: A player cannot pitch until their `next_eligible_pitch_date` has arrived. This is a cross-game rule that checks the player's most recent pitching appearance.

**Key Point**: Unlike Rules 1-5 which only look at current game data, Rule 6 requires historical data from previous games.

**Rationale**: Ensures players get required rest between pitching appearances to protect arm health.

**Example Scenario 1 - VIOLATION**:

- Player pitched 51 pitches on May 10 (requires 3 rest days)
- Next eligible date: May 14
- Player pitches in a game on May 12
- ❌ **VIOLATION**: Pitched 2 days before eligible date

**Example Scenario 2 - NO VIOLATION**:

- Player pitched 51 pitches on May 10 (requires 3 rest days)
- Next eligible date: May 14
- Player pitches in a game on May 14
- ✅ **OK**: Pitching exactly on eligible date is allowed

**Example Scenario 3 - NO VIOLATION (first time pitching)**:

- Player has never pitched before
- Player pitches in any game
- ✅ **OK**: No previous eligibility date to check

**Implementation Details**:

- Location: `src/lib/violationRules.js` - `pitchedBeforeEligibleDate()`
- Fetches most recent `next_eligible_pitch_date` from `pitching_logs` table
- Uses simple YYYY-MM-DD string comparison (lexicographic ordering works for ISO dates)
- Display warning: "⚠️ Violation: Player pitched before their required rest period ended. Not eligible to pitch until [date]."
- Validation is non-blocking - data can still be saved

**Technical Logic**:

```javascript
// Only violates if:
// 1. Player is pitching in this game (pitchedInnings.length > 0)
// 2. Player has a previous pitching record (nextEligiblePitchDate exists)
// 3. Current game date is before eligible date
return gameDate < nextEligiblePitchDate;
```

---

## Pitch Smart Guidelines (Age-Based)

**Status**: ✅ **Implemented** (reference data in `pitch_count_rules` table)

These guidelines define maximum pitch counts and required rest days based on player age and pitches thrown.

### Daily Maximum Pitch Counts

| Age Group | Max Pitches per Day |
| --------- | ------------------- |
| 7-8       | 50                  |
| 9-10      | 75                  |
| 11-12     | 85                  |

### Required Rest Days by Pitch Count

**Ages 7-8**:

- 1-20 pitches: 0 days rest
- 21-35 pitches: 1 day rest
- 36-50 pitches: 2 days rest

**Ages 9-12**:

- 1-20 pitches: 0 days rest
- 21-35 pitches: 1 day rest
- 36-50 pitches: 2 days rest
- 51-65 pitches: 3 days rest
- 66+ pitches: 4 days rest

---

## Implementation Status

### Completed - All 6 Rules Implemented

- ✅ Rule 1: Consecutive pitching innings (warning display)
- ✅ Rule 2: 41+ pitches → cannot catch after pitching
- ✅ Rule 3: 4 innings catching → cannot pitch after
- ✅ Rule 4: Caught 1-3 innings + 21+ pitches → cannot return to catch
- ✅ Rule 5: Age-based pitch count limits
- ✅ Rule 6: Pitched before required rest period (cross-game validation)

### Current Features

1. **Real-time Validation**
   - All 6 rules checked as user enters data
   - Warnings shown in player sections
   - Non-blocking validation (saves allowed with warnings)

2. **Violation Tracking**
   - `has_violation` flag on games table
   - Red badge on games list for games with violations
   - Detailed violation messages in game details

3. **Rest Day Calculations**
   - `next_eligible_pitch_date` calculated and stored
   - Previous games checked when entering new game data
   - Eligibility status shown in team roster views

### Planned Enhancements

- Compliance dashboard with violation statistics
- Automated reports for league administrators
- Email notifications for rule violations

---

## Technical Implementation Notes

### Database Schema Support

**Current Tables**:

- `pitching_logs`: Stores pitch counts (final + penultimate batter)
- `positions_played`: Tracks innings pitched and caught per player
- `game_players`: Tracks attendance and absences
- `pitch_count_rules`: Reference data for Pitch Smart guidelines

**Needed for Phase 4**:

- Player age calculation (from `players.age` + `games.game_date`)
- Multi-game lookups for rest day calculations
- Violation logging table (optional)

### Validation Approach Options

**Option 1: Blocking (Strict)**

- Disable checkboxes when rule would be violated
- Prevent saving if violations exist
- Pro: Ensures compliance
- Con: May be too restrictive for special circumstances

**Option 2: Warning (Flexible)**

- Allow all selections
- Show red warning boxes for violations
- Allow saving with warnings
- Pro: Scorekeeper can override if needed
- Con: Violations might slip through

**Option 3: Hybrid (Recommended)**

- Block obvious violations (e.g., 4 innings caught + pitching)
- Warn for complex rules (e.g., rest days from previous games)
- Allow admin override with confirmation
- Pro: Balance of safety and flexibility
- Con: More complex to implement

---

## Rule Priority & Dependencies

### High Priority (Safety-Critical) - ✅ ALL IMPLEMENTED

1. ✅ Consecutive innings (pitchers) - Rule 1
2. ✅ 41+ pitches → no catching - Rule 2
3. ✅ 4 innings catching → no pitching - Rule 3
4. ✅ 1-3 innings catching + 21+ pitches → no more catching - Rule 4

### Medium Priority (Compliance) - ✅ ALL IMPLEMENTED

- ✅ Daily max pitch counts (age-based) - Rule 5
- ✅ Rest day calculations - Rule 6

### Low Priority (Reporting) - Planned

- ⏳ Compliance dashboard
- ⏳ Player workload tracking
- ⏳ Season compliance statistics

---

## Testing Scenarios

All rules are covered by automated tests in `src/__tests__/lib/violationRules.test.js` (37 tests, 95%+ coverage).

### Test Case 1: Consecutive Pitching (Rule 1)

```
Input: Check innings 1, 2, 4 for pitcher
Expected: Warning displayed
Actual: ✅ Warning shown
```

### Test Case 2: High Pitch Count → Catching (Rule 2)

```
Input:
- Player pitches 50 pitches in innings 1-3
- Try to check catching for inning 4
Expected: Warning displayed
Actual: ✅ Warning shown
```

### Test Case 3: Four Innings Catching → Pitching (Rule 3)

```
Input:
- Player catches innings 1, 2, 3, 4
- Try to check pitching for inning 5
Expected: Warning displayed
Actual: ✅ Warning shown
```

### Test Case 4: Combined Rule (Rule 4)

```
Input:
- Player catches innings 1, 2 (2 innings)
- Player pitches innings 3, 4 (25 pitches)
- Try to check catching for inning 5
Expected: Warning displayed
Actual: ✅ Warning shown
```

### Test Case 5: Age-Based Pitch Limit (Rule 5)

```
Input:
- 10-year-old player throws 76 pitches
Expected: Warning displayed (max is 75)
Actual: ✅ Warning shown
```

### Test Case 6: Pitched Before Eligible (Rule 6)

```
Input:
- Player's next_eligible_pitch_date is May 14
- Try to enter pitching for game on May 12
Expected: Warning displayed
Actual: ✅ Warning shown
```

---

## Future Enhancements

### Advanced Features

- **Multi-day tracking**: Check rest requirements across games
- **Player health dashboard**: Show cumulative pitch counts per week/season
- **Automated scheduling**: Suggest eligible pitchers for upcoming games
- **Mobile alerts**: Notify coaches when players approach limits
- **Export compliance reports**: PDF reports for league officials

### Edge Cases to Consider

- Player swapped between teams mid-season (carry over pitch counts?)
- Make-up games with tight scheduling (rest day conflicts)
- Tournament play (multiple games per day rules)
- Age boundary games (player turns 13 mid-season)
- Retroactive data entry (game entered days later)

---

## References

- **Pitch Smart Guidelines**: https://www.mlb.com/pitch-smart/pitching-guidelines
- **USA Baseball Medical & Safety Advisory Committee**
- **League-specific rules**: [TBD - add league documentation if available]

---

**Document Version**: 2.0
**Last Review**: January 2026
**Next Review**: After compliance dashboard implementation
