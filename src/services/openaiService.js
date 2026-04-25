// src/services/openaiService.js
import axios from 'axios';
import {
  normalizeOpenAIResponse,
  retryOperation
} from '../utils/recipeHelpers';

const API_URL = 'http://localhost:3001/openai';

/**
 * Verifica si un error es de un tipo que merece reintento
 * @param {Error} error - Error a verificar
 * @returns {boolean} - True si debe reintentar
 */
const isTemporaryError = (error) => {
  const status = error.response?.status || error.status;
  // Reintentar en errores de servidor, rate limiting o timeout
  if (!status) return true; // Error de red
  if (status >= 500) return true; // Errores del servidor
  if (status === 429) return true; // Rate limit
  if (status >= 400 && status < 500 && status !== 422) return false; // Errores cliente (422 validación puede que sí)
  return false;
};

export const generateRecipe = async ({
  ingredients,
  categories,
  mealTime,
  servings,
  priorityOnly = false,
  regenerate = false,
  usedRecipeNames = []
}) => {
  try {
    // Crear lista de ingredientes
    const ingredientsList = ingredients.map(ing => 
      `${ing.name} (${ing.quantity} ${ing.unit})`
    ).join(', ');

    // Crear texto de categorías
    const categoriesText = categories.length > 0 
      ? `Categorías: ${categories.join(', ')}` 
      : '';
    
    // Texto adicional si es regeneración
    const regenerateText = regenerate 
      ? '\n\n⚠️ IMPORTANTE: Genera una receta COMPLETAMENTE DIFERENTE a la anterior. No repitas la misma receta, usa diferentes técnicas de cocción, sabores y/o combinaciones.'
      : '';
    const usedNamesText = usedRecipeNames.length > 0
      ? `\n\nRECETAS YA GENERADAS (NO REPITAS NOMBRES NI PLATILLOS SIMILARES): ${usedRecipeNames.join(', ')}`
      : '';

    
    // Crear el prompt para GPT
    const prompt = `Eres un chef experto. Genera 1 receta usando estos ingredientes DISPONIBLES EN EL INVENTARIO: ${ingredientsList}.

    ${categoriesText}
    Horario: ${mealTime}
    Porciones: ${servings} personas
    ${priorityOnly ? 'IMPORTANTE: Prioriza el uso de TODOS los ingredientes disponibles.' : ''}
    ${regenerateText}
    ${usedNamesText}

    REGLAS CRÍTICAS:
    1. Si las categorías seleccionadas son incompatibles con los ingredientes disponibles (por ejemplo, "Vegetariana" pero hay carne, o "Vegana" pero hay lácteos/huevos), debes responder con un mensaje de error en lugar de generar una receta.
    2. Si no es posible crear una receta que cumpla con TODAS las categorías seleccionadas simultáneamente, responde con un mensaje de error explicando la incompatibilidad.
    3. Solo genera la receta si todos los ingredientes disponibles son compatibles con todas las categorías seleccionadas.

    SEPARACIÓN DE INGREDIENTES (MUY IMPORTANTE):
    - En "ingredients": SOLO incluye los ingredientes que están en la lista de DISPONIBLES arriba.
    - En "missingIngredients": incluye CUALQUIER ingrediente que necesites pero NO esté en la lista de disponibles (sal, aceite, harina, azúcar, especias, condimentos, miel, etc.) y que cada ingrediente empiece con MAYÚSCULA.
    - Si un ingrediente NO está en la lista de disponibles, DEBE ir en "missingIngredients", sin excepción.

    FORMATO DE CANTIDADES (MUY IMPORTANTE):
    - Si la cantidad de un ingrediente NO es un número (por ejemplo: "al gusto", "una pizca", "suficiente"), la primera letra DEBE ir en MAYÚSCULA.
    - Ejemplos correctos: "Al gusto", "Una pizca", "Suficiente".
    - NUNCA escribas cantidades no numéricas en minúsculas.

    Para recetas válidas proporciona:
    1. Nombre atractivo de la receta
    2. Lista de ingredientes (SOLO los disponibles) con cantidades exactas ajustadas a ${servings} personas
    3. Lista de ingredientes faltantes (TODO lo que necesites pero no esté disponible)
    4. Pasos de preparación numerados y detallados
    5. Tiempo estimado de preparación en minutos
    6. Si la receta no puede ajustarse exactamente a ${servings} personas por la naturaleza de los ingredientes, indícalo en "portionWarning"

    Formato de respuesta en JSON:

    Para ERROR (categorías incompatibles):
    {
      "error": "No es posible generar una receta [categoría] con los ingredientes seleccionados. [Explicación específica del conflicto]"
    }

    Para receta VÁLIDA:
    {
      "recipe": [
        {
          "name": "Nombre de la receta",
          "categories": ["categoria1", "categoria2"],
          "ingredients": [
            {"name": "ingrediente", "quantity": "cantidad", "unit": "unidad"}
          ],
          "missingIngredients": [
            {"name": "ingrediente", "quantity": "cantidad", "unit": "unidad"}
          ],
          "instructions": ["paso 1", "paso 2", ...],
          "prepTime": 30,
          "servings": ${servings},
          "portionWarning": "Texto de advertencia si aplica o null"
        }
      ]
    }
      
    ⚠️ RESPUESTA FINAL OBLIGATORIA:
    - Devuelve SOLO el JSON.
    - No escribas texto antes ni después.
    - No uses bloques de codigo.
    - No incluyas texto explicativo.`;

    // Hacer petición con reintentos automáticos
    const makeRequest = async () => {
      const response = await axios.post(API_URL, {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `
              Responde EXCLUSIVAMENTE con JSON valido.
              No escribas texto fuera del JSON.
              No incluyas comentarios ni explicaciones.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: regenerate ? 0.75 : 0.6,
        top_p: 0.95,
        presence_penalty: regenerate ? 0.8 : 0.2,
        frequency_penalty: regenerate ? 0.6 : 0.2,
        max_tokens: 700
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      // Verificar errores HTTP de OpenAI
      if (response.status >= 400) {
        const error = new Error(response.data?.error?.message || `Error HTTP ${response.status}`);
        error.status = response.status;
        error.response = response;
        throw error;
      }

      const content = response.data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new Error('Respuesta vacía de OpenAI');
      }

      // Extraer solo el primer JSON valido
      const jsonMatch = content.match(/\{[\s\S]*\}$/);

      if (!jsonMatch) {
        console.error('Respuesta cruda de OpenAI:', content);
        throw new Error('No se encontró un JSON válido en la respuesta.');
      }

      let result;
      try {
        result = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('JSON malformado:', jsonMatch[0]);
        throw new Error('JSON inválido en la respuesta.');
      }

      return result;
    };

    const result = await retryOperation(makeRequest, {
      maxRetries: 2,
      initialDelay: 500,
      shouldRetry: isTemporaryError
    });

    // Verificar si hay un error de compatibilidad en la respuesta
    if (result.error) {
      const error = new Error(result.error);
      error.isAIError = true;
      error.isCompatibilityError = result.error.includes('No es posible generar una receta');
      throw error;
    }

    // Normalizar la respuesta
    const normalized = normalizeOpenAIResponse(result);

    if (!normalized.isValid) {
      const error = new Error(normalized.error || 'Error al procesar la respuesta de la IA');
      error.isAIError = true;
      throw error;
    }

    // Garantizar que portionWarning sea null o string limpio
    if (normalized.recipe) {
      normalized.recipe.portionWarning = normalized.portionWarning;
    }
    
    return [normalized.recipe];
  } catch (error) {
    console.error('Error al generar receta:', error);
    // Re-lanzar para que lo maneje el frontend
    throw error;
  }
};

export const calculateDishShelfLife = async (ingredients) => {
  try {
    const makeRequest = async () => {
      // Crear lista de ingredientes solo con nombres
      const ingredientsList = ingredients.map(ing => ing.name).join(', ');

      const prompt = `Como experto en seguridad alimentaria, calcula cuántos días se puede almacenar de forma segura en refrigeración un platillo preparado con estos ingredientes: ${ingredientsList}.

      Considera el ingrediente más perecedero una vez COCIDO/PREPARADO y las normas de seguridad alimentaria estándar para alimentos cocinados refrigerados.

      Responde ÚNICAMENTE con un número entero (días), sin texto adicional.`;

      const response = await axios.post(API_URL, {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en seguridad alimentaria. Respondes SOLO con números enteros.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 10
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.status >= 400) {
        const error = new Error(response.data?.error?.message || `Error HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }

      const days = parseInt(response.data.choices?.[0]?.message?.content?.trim());
      
      if (isNaN(days) || days < 1 || days > 14) {
        throw new Error('Día inválido');
      }

      return days;
    };

    const days = await retryOperation(makeRequest, {
      maxRetries: 2,
      initialDelay: 500,
      shouldRetry: isTemporaryError
    });
    
    return days;
  } catch (error) {
    console.error('Error al calcular vida útil del platillo:', error);
    return 3; // Default en caso de error
  }
};
