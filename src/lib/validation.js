const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Returns an error message for an invalid email, or '' when it is valid. */
export function validateEmail(value) {
  const email = value.trim()
  if (!email) return 'Please enter your email address.'
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Please enter a valid email address, like name@example.com.'
  return ''
}
