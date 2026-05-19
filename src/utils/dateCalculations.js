// src/utils/dateCalculations.js

const TZ = 'America/Mexico_City';

// Returns "YYYY-MM-DD" in Guadalajara local time for any Date or ISO string
const toLocalDateStr = (value) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(value));

// Creates a Date at local midnight for a given date/datetime value.
// Using local midnight ensures day-level comparisons are timezone-correct.
const toLocalMidnight = (value) => {
  const [y, m, d] = toLocalDateStr(value).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const isPriority = (expirationDate) => {
  if (!expirationDate) return false;
  const today = toLocalMidnight(new Date());
  const expDate = toLocalMidnight(expirationDate);
  const diffDays = Math.round((expDate - today) / 864e5);
  return diffDays >= 0 && diffDays <= 3;
};

export const isExpired = (expirationDate) => {
  if (!expirationDate) return false;
  const today = toLocalMidnight(new Date());
  const expDate = toLocalMidnight(expirationDate);
  return expDate < today;
};

export const getDaysRemaining = (expirationDate) => {
  if (!expirationDate) return null;
  const today = toLocalMidnight(new Date());
  const expDate = toLocalMidnight(expirationDate);
  return Math.round((expDate - today) / 864e5);
};

export const formatDate = (dateString) => {
  if (!dateString) return 'Fecha desconocida';
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: TZ
  });
};

// Returns "YYYY-MM-DD" in local timezone — safe for <input type="date"> values
export const toISODateString = (date) => {
  if (!date) return '';
  return toLocalDateStr(date);
};

// Returns "YYYY-MM-DD" for today in Guadalajara
export const getTodayISO = () => toLocalDateStr(new Date());
