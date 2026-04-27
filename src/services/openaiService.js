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
    - Para cualquier vegetal, proteína, lácteo, cereal, fruta o ingrediente principal: USA SIEMPRE un número concreto como cantidad (ejemplos: 100, 200, 2, 0.5). NUNCA uses "Suficiente", "Cantidad necesaria", "Lo necesario" ni ninguna variante vaga para estos ingredientes.
    - "Al gusto" ÚNICAMENTE está permitido para: sal, pimienta, salsa picante u otro condimento puro donde realmente no existe una medida fija.
    - "Una pizca" ÚNICAMENTE está permitido para especias secas como comino, orégano, canela.
    - "Suficiente" NUNCA es una cantidad válida. Si no tienes certeza de la cantidad, estima una razonable basada en las porciones.
    - Cuando uses texto no numérico (solo los casos permitidos arriba), escribe la primera letra en MAYÚSCULA.

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
        max_tokens: 1500
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
