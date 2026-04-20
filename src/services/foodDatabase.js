// src/services/foodDatabase.js
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';

export const foodDatabase = [
  // Carnes
  { name: "Carnes frescas", completo: 2, fraccionado: 2, category: "carnes" },
  { name: "Carnes cocidas", completo: 4, fraccionado: 4, category: "carnes" },
  { name: "Pescado fresco", completo: 2, fraccionado: 2, category: "carnes" },
  { name: "Pescado cocido", completo: 4, fraccionado: 4, category: "carnes" },
  { name: "Pollo crudo", completo: 2, fraccionado: 2, category: "carnes" },
  { name: "Pollo cocido", completo: 4, fraccionado: 4, category: "carnes" },
  { name: "Res cruda", completo: 2, fraccionado: 2, category: "carnes" },
  { name: "Res cocida", completo: 4, fraccionado: 4, category: "carnes" },
  { name: "Cerdo crudo", completo: 2, fraccionado: 2, category: "carnes" },
  { name: "Cerdo cocido", completo: 4, fraccionado: 4, category: "carnes" },

  // Lácteos y Huevos
  { name: "Huevos con cáscara", completo: 28, fraccionado: 28, category: "lacteos" },
  { name: "Huevos duros", completo: 7, fraccionado: 7, category: "lacteos" },
  { name: "Leche", completo: 3, fraccionado: 3, category: "lacteos" },
  { name: "Yogur", completo: 9, fraccionado: 9, category: "lacteos" },
  { name: "Queso fresco", completo: 6, fraccionado: 6, category: "lacteos" },
  { name: "Queso curado", completo: 23, fraccionado: 23, category: "lacteos" },
  { name: "Mantequilla", completo: 18, fraccionado: 18, category: "lacteos" },
  { name: "Margarina", completo: 18, fraccionado: 18, category: "lacteos" },
  { name: "Crema agria", completo: 9, fraccionado: 9, category: "lacteos" },

  // Embutidos
  { name: "Jamón cocido", completo: 7, fraccionado: 7, category: "embutidos" },
  { name: "Jamón crudo", completo: 2, fraccionado: 2, category: "embutidos" },
  { name: "Salchichas cocidas", completo: 4, fraccionado: 4, category: "embutidos" },
  { name: "Salchichas crudas", completo: 2, fraccionado: 2, category: "embutidos" },
  { name: "Tocino cocido", completo: 7, fraccionado: 7, category: "embutidos" },
  { name: "Tocino crudo", completo: 7, fraccionado: 7, category: "embutidos" },

  // Frutas
  { name: "Manzanas", completo: 25, fraccionado: 25, category: "frutas" },
  { name: "Peras", completo: 6, fraccionado: 6, category: "frutas" },
  { name: "Plátanos", completo: 3, fraccionado: 0, category: "frutas" },
  { name: "Uvas", completo: 6, fraccionado: 6, category: "frutas" },
  { name: "Arándanos", completo: 11, fraccionado: 11, category: "frutas" },
  { name: "Fresas", completo: 3, fraccionado: 3, category: "frutas" },
  { name: "Frambuesas", completo: 3, fraccionado: 3, category: "frutas" },
  { name: "Cerezas", completo: 6, fraccionado: 6, category: "frutas" },
  { name: "Ciruelas", completo: 4, fraccionado: 4, category: "frutas" },
  { name: "Duraznos", completo: 4, fraccionado: 4, category: "frutas" },
  { name: "Mangos", completo: 6, fraccionado: 6, category: "frutas" },
  { name: "Kiwis", completo: 6, fraccionado: 6, category: "frutas" },
  { name: "Papaya", completo: 3, fraccionado: 3, category: "frutas" },
  { name: "Piña", completo: 4, fraccionado: 4, category: "frutas" },
  { name: "Sandía", completo: 4, fraccionado: 4, category: "frutas" },
  { name: "Melón", completo: 9, fraccionado: 9, category: "frutas" },
  { name: "Granada", completo: 11, fraccionado: 11, category: "frutas" },
  { name: "Aguacate", completo: 4, fraccionado: 2, category: "frutas" },

  // Verduras
  { name: "Zanahorias", completo: 25, fraccionado: 25, category: "verduras" },
  { name: "Apio", completo: 11, fraccionado: 11, category: "verduras" },
  { name: "Espárragos", completo: 4, fraccionado: 4, category: "verduras" },
  { name: "Brócoli", completo: 4, fraccionado: 4, category: "verduras" },
  { name: "Coliflor", completo: 9, fraccionado: 9, category: "verduras" },
  { name: "Repollo", completo: 25, fraccionado: 25, category: "verduras" },
  { name: "Lechuga", completo: 5, fraccionado: 5, category: "verduras" },
  { name: "Espinacas", completo: 4, fraccionado: 4, category: "verduras" },
  { name: "Perejil", completo: 11, fraccionado: 11, category: "verduras" },
  { name: "Cilantro", completo: 11, fraccionado: 11, category: "verduras" },
  { name: "Pimientos", completo: 11, fraccionado: 11, category: "verduras" },
  { name: "Calabacín", completo: 9, fraccionado: 9, category: "verduras" },
  { name: "Berenjena", completo: 9, fraccionado: 9, category: "verduras" },
  { name: "Pepinos", completo: 9, fraccionado: 9, category: "verduras" },
  { name: "Guisantes", completo: 4, fraccionado: 4, category: "verduras" },
  { name: "Judías verdes", completo: 4, fraccionado: 4, category: "verduras" },
  { name: "Nabos", completo: 9, fraccionado: 9, category: "verduras" },
  { name: "Rábanos", completo: 9, fraccionado: 9, category: "verduras" },
  { name: "Remolachas", completo: 18, fraccionado: 18, category: "verduras" },
  { name: "Chirivías", completo: 18, fraccionado: 18, category: "verduras" },
  { name: "Tomate", completo: 7, fraccionado: 7, category: "verduras" },
  { name: "Cebolla", completo: 14, fraccionado: 14, category: "verduras" },
  { name: "Ajo", completo: 21, fraccionado: 21, category: "verduras" },

  // Comidas preparadas
  { name: "Sopas y guisos cocidos", completo: 4, fraccionado: 4, category: "preparadas" },
  { name: "Comidas preparadas caseras", completo: 4, fraccionado: 4, category: "preparadas" },
  { name: "Arroz cocido", completo: 4, fraccionado: 4, category: "preparadas" },
  { name: "Pasta cocida", completo: 4, fraccionado: 4, category: "preparadas" },
  { name: "Puré de papas cocido", completo: 4, fraccionado: 4, category: "preparadas" }
];

// Función para normalizar texto (quitar acentos, minúsculas, espacios extra)
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .trim();
};

// Buscar alimento EXACTO (normalizado)
export const searchFood = (foodName) => {
  const normalizedSearch = normalizeText(foodName);
  return foodDatabase.find(food =>
    normalizeText(food.name) === normalizedSearch
  );
};

// Obtener sugerencias inteligentes
export const getFoodSuggestions = (searchTerm) => {
  if (!searchTerm || searchTerm.length < 2) return [];

  const normalizedSearch = normalizeText(searchTerm);

  return foodDatabase
    .filter(food => normalizeText(food.name).includes(normalizedSearch))
    .slice(0, 5)
    .map(food => food.name);
};

// Calcular fecha de caducidad
export const calculateExpirationDate = (purchaseDate, foodName, quantity) => {
  const food = searchFood(foodName);

  if (!food) return null;

  const isFractioned = quantity < 1;
  const daysToAdd = isFractioned ? food.fraccionado : food.completo;

  if (daysToAdd === 0) return null; // No se debe refrigerar

  const expDate = new Date(purchaseDate);
  expDate.setDate(expDate.getDate() + daysToAdd);

  return expDate;
};

// Buscar alimento en base de datos PERSONAL del usuario
export const searchPersonalFood = async (foodName, userId) => {
  if (!userId) return null;

  const normalizedSearch = normalizeText(foodName);

  try {
    const q = query(
      collection(db, `users/${userId}/personalFoodDatabase`),
      where('normalizedName', '==', normalizedSearch)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data();
    }

    return null;
  } catch (error) {
    console.error('Error buscando en BD personal:', error);
    return null;
  }
};

// Buscar en AMBAS bases de datos (global + personal)
export const searchFoodComplete = async (foodName, userId) => {
  // Primero buscar en BD global
  const globalFood = searchFood(foodName);
  if (globalFood) return globalFood;

  // Si no está, buscar en BD personal
  const personalFood = await searchPersonalFood(foodName, userId);
  return personalFood;
};

// Agregar alimento a base de datos PERSONAL
export const addToPersonalFoodDatabase = async (foodName, days, userId) => {
  if (!userId) return false;

  const normalizedName = normalizeText(foodName);

  try {
    // Verificar que no exista ya
    const existing = await searchPersonalFood(foodName, userId);
    if (existing) {
      console.log('Alimento ya existe en BD personal');
      return false;
    }

    // Agregar a Firestore
    await addDoc(collection(db, `users/${userId}/personalFoodDatabase`), {
      name: foodName,
      normalizedName: normalizedName,
      completo: days,
      fraccionado: days,
      category: 'personal',
      createdAt: new Date().toISOString()
    });

    console.log(`✅ "${foodName}" agregado a BD personal`);
    return true;
  } catch (error) {
    console.error('Error agregando a BD personal:', error);
    return false;
  }
};

// Obtener sugerencias de AMBAS bases de datos
export const getFoodSuggestionsComplete = async (searchTerm, userId) => {
  // Sugerencias de BD global
  const globalSuggestions = getFoodSuggestions(searchTerm);

  if (!userId) return globalSuggestions;

  try {
    // Sugerencias de BD personal
    const normalizedSearch = normalizeText(searchTerm);
    const querySnapshot = await getDocs(
      collection(db, `users/${userId}/personalFoodDatabase`)
    );

    const personalSuggestions = querySnapshot.docs
      .map(doc => doc.data().name)
      .filter(name => normalizeText(name).includes(normalizedSearch));

    // Combinar y eliminar duplicados
    const combined = [...new Set([...globalSuggestions, ...personalSuggestions])];
    return combined.slice(0, 5);
  } catch (error) {
    console.error('Error obteniendo sugerencias personales:', error);
    return globalSuggestions;
  }
};

// Calcular fecha de caducidad buscando en AMBAS bases
export const calculateExpirationDateComplete = async (purchaseDate, foodName, quantity, userId) => {
  // Buscar en ambas bases
  const food = await searchFoodComplete(foodName, userId);

  if (!food) return null;

  const isFractioned = quantity < 1;
  const daysToAdd = isFractioned ? food.fraccionado : food.completo;

  if (daysToAdd === 0) return null;

  const expDate = new Date(purchaseDate);
  expDate.setDate(expDate.getDate() + daysToAdd);

  return expDate;
};