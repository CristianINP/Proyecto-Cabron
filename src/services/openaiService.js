// src/services/openaiService.js
import axios from 'axios';
import { normalizeOpenAIResponse, retryOperation } from '../utils/recipeHelpers';

const API_URL = 'http://localhost:3001/openai';

/**
 * Verifica si un error es temporal (retryable)
 */
const isTemporaryError = (error) => {
  const status = error.response?.status || error.status;
  if (!status) return true; // Error de red
  if (status >= 500) return true; // Server error
  if (status === 429) return true; // Rate limit
  return false;
};

/**
 * Sanitiza una cadena para convertirla en JSON válido.
 * Corrige comillas tipográficas, comillas simples y caracteres inválidos.
 */
const sanitizeJsonString = (dirtyJson) => {
  if (typeof dirtyJson !== 'string') return dirtyJson;

  let cleaned = dirtyJson.trim();

  // Reemplazar comillas tipográficas por comillas rectas dobles
  cleaned = cleaned.replace(/[“”]/g, '"');
  
  // Reemplazar apóstrofos tipográficos por comillas simples rectas
  cleaned = cleaned.replace(/[‘’]/g, "'");

  // Eliminar comillas simples alrededor de claves o valores (JSON no las permite)
  cleaned = cleaned.replace(/\s*'([^']+)'\s*:/g, ' "$1": ');
  cleaned = cleaned.replace(/:\s*'([^']+)'/g, ': "$1"');

  // Eliminar caracteres de control inválidos
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  return cleaned;
};

/**
 * Extrae y parsea JSON de una respuesta de OpenAI de forma segura
 */
const safeParseJsonFromResponse = (rawContent) => {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new Error('Respuesta vacía o inválida de OpenAI');
  }

  const sanitized = sanitizeJsonString(rawContent);

  // Buscar bloque JSON desde el primer { hasta el último } balanceado
  const jsonMatch = sanitized.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    console.error('No se encontró bloque JSON en:', sanitized);
    throw new Error('No se encontró un JSON válido en la respuesta.');
  }

  const jsonString = jsonMatch[0];

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error('JSON.parse falló para:', jsonString);
    console.error('Error:', e.message);
    throw new Error('JSON inválido en la respuesta.');
  }
};

// Esquema JSON para forzar formato válido (opcional, mejora calidad)
const jsonSchema = {
  name: "recipe_response",
  description: "Esquema estricto para la respuesta de generación de recetas",
  schema: {
    type: "object",
    properties: {
      recipe: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            categories: { type: "array", items: { type: "string" } },
            ingredients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  quantity: { type: ["string", "number"] },
                  unit: { type: "string" }
                },
                required: ["name", "quantity", "unit"]
              }
            },
            missingIngredients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  quantity: { type: ["string", "number"] },
                  unit: { type: "string" }
                },
                required: ["name", "quantity", "unit"]
              }
            },
            instructions: {
              type: "array",
              items: { type: "string" }
            },
            prepTime: { type: "number" },
            servings: { type: "number" },
            portionWarning: { type: ["string", "null"] }
          },
          required: ["name", "categories", "ingredients", "missingIngredients", "instructions", "prepTime", "servings", "portionWarning"]
        },
        minItems: 1,
        maxItems: 1
      }
    },
    required: ["recipe"],
    additionalProperties: false
  }
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
    const ingredientsList = ingredients.map(ing => 
      `${ing.name} (${ing.quantity} ${ing.unit})`
    ).join(', ');

    const categoriesText = categories.length > 0 
      ? `Categorías: ${categories.join(', ')}` 
      : '';
    
    const regenerateText = regenerate 
      ? '\n\n⚠️ IMPORTANTE: Genera una receta COMPLETAMENTE DIFERENTE a la anterior. Usa diferentes técnicas, sabores y combinaciones.'
      : '';
    const usedNamesText = usedRecipeNames.length > 0
      ? `\n\nRECETAS YA GENERADAS (NO REPITAS NOMBRES): ${usedRecipeNames.join(', ')}`
      : '';

    const prompt = `Eres un chef experto. Genera 1 receta usando estos ingredientes: ${ingredientsList}.
    ${categoriesText}
    Horario: ${mealTime}
    Porciones: ${servings}
    ${priorityOnly ? 'Prioriza usar TODOS los ingredientes.' : ''}
    ${regenerateText}
    ${usedNamesText}

    REGLAS:
    1. Si categorías son incompatibles con ingredientes, responde {"error": "..."}
    2. Solo responde con JSON. Nada más. Sin explicaciones.
    3. Formato de cantidades no numéricas: "Al gusto", "Una pizca" (con mayúscula).
    
    JSON de salida:`;

    const makeRequest = async () => {
      const response = await axios.post(API_URL, {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un generador de JSON estricto. Siempre responde con JSON válido. No uses texto fuera del JSON.`
          },
          { role: 'user', content: prompt }
        ],
        // Forzar formato JSON válido (soportado por GPT-4o-mini)
        response_format: { 
          type: "json_schema",
          json_schema: jsonSchema
        },
        temperature: regenerate ? 0.7 : 0.5,
        max_tokens: 800
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.status >= 400) {
        const err = new Error(response.data?.error?.message || `Error HTTP ${response.status}`);
        err.status = response.status;
        err.response = response;
        throw err;
      }

      // Parsear con sanitización robusta
      const content = response.data?.choices?.[0]?.message?.content;
      return safeParseJsonFromResponse(content);
    };

    const result = await retryOperation(makeRequest, {
      maxRetries: 2,
      initialDelay: 500,
      shouldRetry: isTemporaryError
    });

    if (result.error) {
      const err = new Error(result.error);
      err.isAIError = true;
      err.isCompatibilityError = result.error.includes('No es posible');
      throw err;
    }

    const normalized = normalizeOpenAIResponse(result);
    if (!normalized.isValid) {
      const err = new Error(normalized.error || 'Error al procesar la respuesta de la IA');
      err.isAIError = true;
      throw err;
    }

    normalized.recipe.portionWarning = normalized.portionWarning;
    return [normalized.recipe];
  } catch (error) {
    console.error('Error crítico en generateRecipe:', error);
    throw error;
  }
};

export const calculateDishShelfLife = async (ingredients) => {
  try {
    const ingredientsList = ingredients.map(ing => ing.name).join(', ');
    const prompt = `Como experto en seguridad alimentaria, calcula los días de refrigeración para: ${ingredientsList}. Responde SOLO con un número entero.`;

    const makeRequest = async () => {
      const response = await axios.post(API_URL, {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Responde SIEMPRE con un número entero. Nada más.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 10
      }, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 });

      if (response.status >= 400) {
        const err = new Error(response.data?.error?.message || `Error ${response.status}`);
        err.status = response.status;
        throw err;
      }

      const text = response.data.choices[0].message.content.trim();
      const days = parseInt(text);
      if (isNaN(days) || days < 1 || days > 14) throw new Error('Día inválido');
      return days;
    };

    return await retryOperation(makeRequest, {
      maxRetries: 2,
      initialDelay: 500,
      shouldRetry: isTemporaryError
    });
  } catch (error) {
    console.error('Error calc vida útil:', error);
    return 3;
  }
};
