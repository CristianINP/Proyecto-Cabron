// Utilidades para manejo seguro de recetas, cantidades y texto

/**
 * Limpia valores de texto para evitar null/undefined/"null" en la UI
 * @param {*} value - Valor a limpiar
 * @returns {string|null} - String limpio o null si no es válido
 */
export function cleanText(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return null;

  const str = String(value).trim();

  if (
    str === '' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined'
  ) {
    return null;
  }

  return str;
}

/**
 * Formatea cantidades para evitar NaN en la UI
 * @param {*} value - Valor a formatear (number, string, null, undefined)
 * @param {number} decimals - Decimales para números (default 2)
 * @returns {string} - Cantidad formateada o texto original
 */
export function formatQuantity(value, decimals = 2) {
  const parsed = parseSafeQuantity(value);
  
  // Si no es numérico, devolver el texto original (o vacío)
  if (parsed.type === 'text') {
    return parsed.text || '';
  }
  
  // Es numérico: formatear con decimales
  if (decimals === 0) {
    return String(Math.round(parsed.number));
  }
  
  return parsed.number.toFixed(decimals);
}

/**
 * Parse seguro de cantidades que evita NaN
 * @param {*} value - Valor a parsear
 * @returns {{type: 'number'|'text', number?: number, text?: string}} - Resultado parseado
 */
export function parseSafeQuantity(value) {
  // null o undefined
  if (value === null || value === undefined) {
    return { type: 'text', text: '' };
  }

  const str = String(value).trim();

  // Strings vacíos o literales null/undefined
  if (
    str === '' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'undefined'
  ) {
    return { type: 'text', text: '' };
  }

  // Intentar parsear como número
  const num = Number(str);
  
  // Verificar si es numérico válido (no NaN y no infinito)
  if (!isNaN(num) && isFinite(num)) {
    return { type: 'number', number: num };
  }

  // No es número: devolver texto original capitalizado si está vacío o es minúscula
  if (str.length > 0) {
    // Si empieza en minúscula, capitalizar primera letra
    if (str[0] === str[0].toLowerCase()) {
      return { type: 'text', text: str.charAt(0).toUpperCase() + str.slice(1) };
    }
    return { type: 'text', text: str };
  }

  return { type: 'text', text: '' };
}

/**
 * Determina si un valor es numérico válido
 * @param {*} value - Valor a verificar
 * @returns {boolean} - True si es numérico válido
 */
export function isNumeric(value) {
  const parsed = parseSafeQuantity(value);
  return parsed.type === 'number';
}

/**
 * Normaliza una respuesta de OpenAI para garantizar estructura consistente
 * @param {*} rawResponse - Respuesta cruda de OpenAI
 * @returns {{recipe: object|null, portionWarning: string|null, error: string|null, isValid: boolean}} - Respuesta normalizada
 */
export function normalizeOpenAIResponse(rawResponse) {
  // Si ya es error
  if (rawResponse && typeof rawResponse === 'object' && rawResponse.error) {
    return {
      recipe: null,
      portionWarning: null,
      error: cleanText(rawResponse.error),
      isValid: false
    };
  }

  // Asegurar que recipe exista
  const recipe = rawResponse && rawResponse.recipe && Array.isArray(rawResponse.recipe)
    ? rawResponse.recipe[0]
    : (rawResponse && typeof rawResponse === 'object' ? rawResponse : null);

  if (!recipe) {
    return {
      recipe: null,
      portionWarning: null,
      error: 'No se pudo generar una receta válida',
      isValid: false
    };
  }

  // Normalizar portionWarning — solo acepta string, cualquier otro tipo se descarta
  let portionWarning = null;
  if (typeof recipe.portionWarning === 'string') {
    const cleaned = cleanText(recipe.portionWarning);
    if (cleaned) {
      portionWarning = cleaned;
    }
  }

  // Normalizar ingredientes: limpiar cantidades
  let ingredients = [];
  if (Array.isArray(recipe.ingredients)) {
    ingredients = recipe.ingredients.map(ing => ({
      name: cleanText(ing.name) || 'Ingrediente',
      quantity: ing.quantity !== undefined ? ing.quantity : '',
      unit: cleanText(ing.unit) || ''
    }));
  }

  // Normalizar ingredientes faltantes
  let missingIngredients = [];
  if (Array.isArray(recipe.missingIngredients)) {
    missingIngredients = recipe.missingIngredients.map(ing => ({
      name: cleanText(ing.name) || 'Ingrediente',
      quantity: ing.quantity !== undefined ? ing.quantity : '',
      unit: cleanText(ing.unit) || ''
    }));
  }

  // Normalizar instrucciones
  let instructions = [];
  if (Array.isArray(recipe.instructions)) {
    instructions = recipe.instructions.map(inst => cleanText(inst)).filter(Boolean);
  }

  // Normalizar categorías
  let categories = [];
  if (Array.isArray(recipe.categories)) {
    categories = recipe.categories.map(cat => cleanText(cat)).filter(Boolean);
  }

  // Parse seguro de servings y prepTime
  const servings = isNumeric(recipe.servings) ? Number(recipe.servings) : 2;
  const prepTime = isNumeric(recipe.prepTime) ? Number(recipe.prepTime) : null;

  const normalizedRecipe = {
    name: cleanText(recipe.name) || 'Receta sin nombre',
    categories,
    ingredients,
    missingIngredients,
    instructions,
    prepTime,
    servings,
    portionWarning
  };

  return {
    recipe: normalizedRecipe,
    portionWarning,
    error: null,
    isValid: true
  };
}

/**
 * Reintenta una operación con backoff exponencial
 * @param {Function} fn - Función a reintentar
 * @param {Object} options - Opciones de reintento
 * @returns {Promise} - Resultado de la operación
 */
export async function retryOperation(fn, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const initialDelay = options.initialDelay || 500;
  const shouldRetry = options.shouldRetry || ((error) => {
    const status = error.response?.status || error.status;
    return !status || status >= 500 || status === 429;
  });

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Si no es reintento (último intento) o no cumple condición, fallar
      if (attempt === maxRetries || !shouldRetry(error)) {
        break;
      }

      // Calcular delay con backoff exponencial
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
