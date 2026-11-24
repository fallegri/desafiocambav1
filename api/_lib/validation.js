import { badRequest } from './errors.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PASSWORD_MIN = 8
const PASSWORD_MAX = 72 // bcrypt only hashes the first 72 bytes
const NAME_MAX = 60

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function validateEmail(value, details = {}) {
  const email = normalizeEmail(value)
  if (!email) details.email = 'El email es obligatorio'
  else if (email.length > 254) details.email = 'El email es demasiado largo'
  else if (!EMAIL_RE.test(email)) details.email = 'El email no tiene un formato válido'
  return email
}

export function validatePassword(value, details = {}) {
  const password = typeof value === 'string' ? value : ''
  if (!password) details.password = 'La contraseña es obligatoria'
  else if (password.length < PASSWORD_MIN) {
    details.password = `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`
  } else if (password.length > PASSWORD_MAX) {
    details.password = `La contraseña no puede superar los ${PASSWORD_MAX} caracteres`
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    details.password = 'La contraseña debe incluir al menos una letra y un número'
  }
  return password
}

export function validateDisplayName(value, details = {}) {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name) details.name = 'El nombre es obligatorio'
  else if (name.length < 2) details.name = 'El nombre debe tener al menos 2 caracteres'
  else if (name.length > NAME_MAX) details.name = `El nombre no puede superar los ${NAME_MAX} caracteres`
  return name
}

export function failIfInvalid(details) {
  if (Object.keys(details).length > 0) {
    throw badRequest('Revisá los datos ingresados', details)
  }
}
