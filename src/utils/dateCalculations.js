// src/utils/dateCalculations.js

// Función para verificar si un ingrediente es prioritario (3 días o menos)
export const isPriority = (expirationDate) => {
  if (!expirationDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  
  const diffTime = expDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= 3 && diffDays >= 0;
};

// Función para verificar si un ingrediente/platillo está caducado
export const isExpired = (expirationDate) => {
  if (!expirationDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  
  return expDate < today;
};

// Función para calcular días restantes (puede ser negativo si ya caducó)
export const getDaysRemaining = (expirationDate) => {
  if (!expirationDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  
  const diffTime = expDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Función para formatear fecha a string legible
export const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  
  return `${day}/${month}/${year}`;
};

// Función para convertir fecha a formato ISO (YYYY-MM-DD) para inputs
export const toISODateString = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Función para obtener fecha actual en formato ISO
export const getTodayISO = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toLocaleDateString('en-CA'); // YYYY-MM-DD
};
