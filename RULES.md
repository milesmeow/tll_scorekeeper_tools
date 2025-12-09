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
  if (innings.length <= 1) return false
  const sorted = [...innings].sort((a, b) => a - b)
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] !== 1) {
      return true  // Gap found
    }
  }
  return false
}
```

---

### 2. High Pitch Count Catching Restriction
**Status**: ⏳ **Planned** (Phase 4)

**Rule**: If a player throws 41+ pitches in a game, they cannot catch for the remainder of that day.

**Rationale**: Protects arm health by preventing excessive throwing stress in a single day.

**Example**:
- Player pitches 45 total pitches in innings 1-3
- ❌ Player cannot catch in innings 4, 5, 6, or 7
- ✅ Player can play other positions (1B, 2B, 3B, SS, OF)

**Implementation Notes**:
- Check total pitches thrown by player in current game
- If >= 41 pitches, block catching checkbox selection
- Display warning: "Cannot catch: Player threw 41+ pitches this game"
- Alternative: Allow selection but show violation warning

---

### 3. Four Inning Catching Restriction
**Status**: ⏳ **Planned** (Phase 4)

**Rule**: If a player catches 4 innings in a game, they cannot pitch in that game.

**Rationale**: Prevents excessive throwing stress by limiting combined catching and pitching.

**Example**:
- Player catches innings 1, 2, 3, 4
- ❌ Player cannot pitch in any inning
- ✅ Player can continue catching or play other positions

**Implementation Notes**:
- Count total innings caught by player
- If >= 4 innings, block pitching checkbox selection
- Display warning: "Cannot pitch: Player caught 4+ innings this game"
- Must check both before allowing pitch selection AND after catching selection changes

---

### 4. Combined Catching and Pitching Restriction
**Status**: ⏳ **Planned** (Phase 4)

**Rule**: If a player catches 1, 2, or 3 innings AND then throws 21+ pitches, they cannot catch again in that game.

**Rationale**: Limits cumulative throwing stress from both catching and pitching.

**Example Scenario 1**:
- Player catches innings 1, 2 (2 innings)
- Player pitches inning 3 with 25 pitches
- ❌ Player cannot catch innings 4, 5, 6, or 7
- ✅ Player can continue pitching (if consecutive) or play other positions

**Example Scenario 2**:
- Player catches inning 1 (1 inning)
- Player pitches innings 2, 3 with 15 pitches total
- ✅ Player can catch again (under 21 pitches)

**Example Scenario 3**:
- Player catches innings 1, 2, 3 (3 innings)
- Player pitches innings 4, 5 with 30 pitches total
- ❌ Player cannot catch again (3 innings + 21+ pitches)

**Implementation Notes**:
- Track both innings caught AND total pitches thrown
- Check if: `(innings_caught >= 1 AND innings_caught <= 3) AND (total_pitches >= 21)`
- If true, disable catching checkboxes for remaining innings
- Display warning: "Cannot catch again: Player caught [X] innings and threw 21+ pitches"
- This is a dynamic rule - must recalculate after any pitch count or position change

---

## Pitch Smart Guidelines (Age-Based)

**Status**: ✅ **In Database** (reference data in `pitch_count_rules` table)
**Enforcement**: ⏳ **Planned** (Phase 4)

These guidelines define maximum pitch counts and required rest days based on player age and pitches thrown.

### Daily Maximum Pitch Counts

| Age Group | Max Pitches per Day |
|-----------|---------------------|
| 7-8       | 50                  |
| 9-10      | 75                  |
| 11-12     | 85                  |
| 13-14     | 95                  |
| 15-16     | 95                  |
| 17-18     | 105                 |
| 19-22     | 120                 |

### Required Rest Days by Pitch Count

**Ages 7-8**:
- 1-20 pitches: 0 days rest
- 21-35 pitches: 1 day rest
- 36-50 pitches: 2 days rest

**Ages 9-14**:
- 1-20 pitches: 0 days rest
- 21-35 pitches: 1 day rest
- 36-50 pitches: 2 days rest
- 51-65 pitches: 3 days rest
- 66+ pitches: 4 days rest

**Ages 15-16**:
- 1-30 pitches: 0 days rest
- 31-45 pitches: 1 day rest
- 46-60 pitches: 2 days rest
- 61-75 pitches: 3 days rest
- 76+ pitches: 4 days rest

**Ages 17-18**:
- 1-30 pitches: 0 days rest
- 31-45 pitches: 1 day rest
- 46-60 pitches: 2 days rest
- 61-80 pitches: 3 days rest
- 81+ pitches: 4 days rest

**Ages 19-22**:
- 1-30 pitches: 0 days rest
- 31-45 pitches: 1 day rest
- 46-60 pitches: 2 days rest
- 61-80 pitches: 3 days rest
- 81-105 pitches: 4 days rest
- 106+ pitches: 5 days rest

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
