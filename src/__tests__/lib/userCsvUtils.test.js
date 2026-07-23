import { describe, it, expect } from 'vitest'
import {
  parseUserCsv,
  generateTempPassword,
  usersToResultCsv
} from '../../lib/userCsvUtils'

describe('parseUserCsv', () => {
  it('parses a valid two-column CSV into user objects', () => {
    const csv = 'John Smith, john@example.com\nJane Doe, jane@example.com'
    expect(parseUserCsv(csv)).toEqual([
      { name: 'John Smith', email: 'john@example.com' },
      { name: 'Jane Doe', email: 'jane@example.com' }
    ])
  })

  it('trims whitespace around name and email', () => {
    const csv = '  John Smith  ,   john@example.com  '
    expect(parseUserCsv(csv)).toEqual([
      { name: 'John Smith', email: 'john@example.com' }
    ])
  })

  it('lowercases emails for consistent comparison', () => {
    const csv = 'John Smith, John@Example.COM'
    expect(parseUserCsv(csv)[0].email).toBe('john@example.com')
  })

  it('skips blank lines', () => {
    const csv = 'John Smith, john@example.com\n\n   \nJane Doe, jane@example.com'
    expect(parseUserCsv(csv)).toHaveLength(2)
  })

  it('throws when a line is missing the email', () => {
    expect(() => parseUserCsv('John Smith')).toThrow(/Line 1/)
  })

  it('throws when name is empty', () => {
    expect(() => parseUserCsv(', john@example.com')).toThrow(/Line 1.*[Nn]ame/)
  })

  it('throws when email is empty', () => {
    expect(() => parseUserCsv('John Smith, ')).toThrow(/Line 1.*[Ee]mail/)
  })

  it('throws on an invalid email format', () => {
    expect(() => parseUserCsv('John Smith, not-an-email')).toThrow(/Line 1.*email/i)
  })

  it('throws on duplicate emails within the paste (case-insensitive)', () => {
    const csv = 'John Smith, dup@example.com\nJane Doe, DUP@example.com'
    expect(() => parseUserCsv(csv)).toThrow(/[Dd]uplicate/)
  })

  it('throws when no valid users are found', () => {
    expect(() => parseUserCsv('   \n  ')).toThrow(/No valid users/)
  })

  it('reports the correct line number for errors after blank lines', () => {
    const csv = 'John Smith, john@example.com\n\nBadRow'
    expect(() => parseUserCsv(csv)).toThrow(/Line 3/)
  })
})

describe('generateTempPassword', () => {
  it('returns a 12-character password', () => {
    expect(generateTempPassword()).toHaveLength(12)
  })

  it('uses only unambiguous characters (no 0, O, 1, I, l)', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTempPassword()).not.toMatch(/[0O1Il]/)
    }
  })

  it('produces different passwords on subsequent calls', () => {
    expect(generateTempPassword()).not.toBe(generateTempPassword())
  })
})

describe('usersToResultCsv', () => {
  it('produces a CSV with a header row and one row per user', () => {
    const rows = [
      { name: 'John Smith', email: 'john@example.com', password: 'abc123XYZ' }
    ]
    expect(usersToResultCsv(rows)).toBe(
      'Full Name,email,temp password\nJohn Smith,john@example.com,abc123XYZ'
    )
  })

  it('quotes fields that contain commas', () => {
    const rows = [
      { name: 'Doe, John', email: 'john@example.com', password: 'pw' }
    ]
    expect(usersToResultCsv(rows)).toContain('"Doe, John"')
  })

  it('returns just the header when given no rows', () => {
    expect(usersToResultCsv([])).toBe('Full Name,email,temp password')
  })
})
