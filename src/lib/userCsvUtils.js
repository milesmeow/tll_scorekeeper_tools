/**
 * User CSV parsing utilities for bulk user creation.
 *
 * Single source of truth for the "Bulk Add Users" flow. Unlike bulk player
 * import (a single atomic insert), each user must be created via the
 * `create-user` edge function one request at a time, so parsing/validation is
 * kept separate from the network loop that consumes these objects.
 */

// Unambiguous character set shared with the single-user AddUserModal.
// Excludes 0/O and 1/I/l to avoid confusion when a coach types the password.
const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
const PASSWORD_LENGTH = 12

// Simple, permissive email check: something@something.tld
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Parse CSV data into user objects for bulk creation.
 * Format: Full Name, email  (one user per line). All users become coaches.
 *
 * @param {string} csvData - Raw CSV string with one user per line
 * @returns {Array<{name: string, email: string}>} Parsed users (emails lowercased)
 * @throws {Error} Validation errors with line numbers for user feedback
 *
 * @example
 * parseUserCsv("John Smith, john@example.com\nJane Doe, jane@example.com")
 * // [
 * //   { name: "John Smith", email: "john@example.com" },
 * //   { name: "Jane Doe",  email: "jane@example.com" }
 * // ]
 */
export function parseUserCsv(csvData) {
  const lines = csvData.split('\n')
  const users = []
  const seenEmails = new Set()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(',').map((p) => p.trim())

    if (parts.length < 2) {
      throw new Error(
        `Line ${i + 1}: Invalid format. Expected: Full Name, email`
      )
    }

    const name = parts[0]
    const email = (parts[1] || '').toLowerCase()

    if (!name) {
      throw new Error(`Line ${i + 1}: Name is required`)
    }

    if (!email) {
      throw new Error(`Line ${i + 1}: Email is required`)
    }

    if (!EMAIL_REGEX.test(email)) {
      throw new Error(`Line ${i + 1}: "${parts[1]}" is not a valid email`)
    }

    if (seenEmails.has(email)) {
      throw new Error(`Line ${i + 1}: Duplicate email "${email}" in the list`)
    }
    seenEmails.add(email)

    users.push({ name, email })
  }

  if (users.length === 0) {
    throw new Error('No valid users found in CSV data')
  }

  return users
}

/**
 * Generate a 12-character temporary password from an unambiguous charset.
 * @returns {string}
 */
export function generateTempPassword() {
  let password = ''
  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    password += PASSWORD_CHARS.charAt(
      Math.floor(Math.random() * PASSWORD_CHARS.length)
    )
  }
  return password
}

/**
 * Escape a single CSV field, quoting when it contains a comma, quote, or newline.
 * @param {string} value
 * @returns {string}
 */
function escapeCsvField(value) {
  const str = String(value ?? '')
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Build the result CSV that the super_admin hands to each coach.
 * Format: Full Name,email,temp password (with header row).
 *
 * @param {Array<{name: string, email: string, password: string}>} rows
 * @returns {string} CSV text (header only when rows is empty)
 */
export function usersToResultCsv(rows) {
  const header = 'Full Name,email,temp password'
  const body = rows.map(
    (r) =>
      `${escapeCsvField(r.name)},${escapeCsvField(r.email)},${escapeCsvField(
        r.password
      )}`
  )
  return [header, ...body].join('\n')
}
