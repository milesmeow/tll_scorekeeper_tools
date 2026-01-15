# Baseball Game Rules & Validation

**Last Updated**: December 2024
**Status**: Some rules implemented, others planned for Phase 4

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

## Pitch Smart Guidelines (Age-Based)

**Status**: ✅ **In Database** (reference data in `pitch_count_rules` table)
**Enforcement**: ⏳ **Planned** (Phase 4)

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

## Implementation Strategy

### Phase 3 (Current) - Basic Validation

- ✅ Consecutive pitching innings (warning display)
- ✅ Data entry for pitches, innings pitched/caught
- ✅ Manual tracking by scorekeeper

### Phase 4 (Planned) - Rules Engine

1. **Real-time Validation**

   - Check rules as user enters data
   - Show warnings/errors in player sections
   - Prevent invalid combinations (or allow with warnings)

2. **Violation Tracking**

   - Flag games with rule violations
   - Generate compliance reports
   - Alert administrators to violations

3. **Rest Day Calculations**

   - Calculate required rest based on pitch count + age
   - Check previous games before allowing player to pitch
   - Show eligibility status when entering new game

4. **Progressive Implementation**
   - Implement rules one at a time
   - Test thoroughly with real game scenarios
   - Get feedback from scorekeepers and admins

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

### High Priority (Safety-Critical)

1. ✅ Consecutive innings (pitchers)
2. ⏳ 41+ pitches → no catching
3. ⏳ 4 innings catching → no pitching
4. ⏳ 1-3 innings catching + 21+ pitches → no more catching

### Medium Priority (Compliance)

- ⏳ Daily max pitch counts (age-based)
- ⏳ Rest day calculations

### Low Priority (Reporting)

- ⏳ Violation reports
- ⏳ Player workload tracking
- ⏳ Season compliance statistics

---

## Testing Scenarios

### Test Case 1: Consecutive Pitching

```
Input: Check innings 1, 2, 4 for pitcher
Expected: Warning displayed
Actual: ✅ Warning shown
```

### Test Case 2: High Pitch Count → Catching

```
Input:
- Player pitches 50 pitches in innings 1-3
- Try to check catching for inning 4
Expected: Blocked or warning
Actual: ⏳ Not yet implemented
```

### Test Case 3: Four Innings Catching → Pitching

```
Input:
- Player catches innings 1, 2, 3, 4
- Try to check pitching for inning 5
Expected: Blocked or warning
Actual: ⏳ Not yet implemented
```

### Test Case 4: Combined Rule

```
Input:
- Player catches innings 1, 2 (2 innings)
- Player pitches inning 3 (25 pitches)
- Try to check catching for inning 4
Expected: Blocked or warning
Actual: ⏳ Not yet implemented
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

**Document Version**: 1.0
**Last Review**: December 2024
**Next Review**: After Phase 4 implementation
