// src/components/Recipes/RecipeResults.js
import React, { useState, useEffect, useCallback } from 'react';
import { Heart, ChevronRight, ChevronLeft, RefreshCw } from 'lucide-react';
import { generateRecipe } from '../../services/openaiService';
import { formatQuantity, cleanText } from '../../utils/recipeHelpers';

const RecipeResults = ({ 
  setCurrentView, 
  recipes, 
  currentIndex, 
  setCurrentIndex, 
  setSelectedRecipe,
  setGeneratedRecipes
}) => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [usedRecipeNames, setUsedRecipeNames] = useState([]);
  const [isGeneratingLock, setIsGeneratingLock] = useState(false);

  // Guardar los parámetros de la última generación
  const [lastParams] = useState(() => {
    const saved = sessionStorage.getItem('lastRecipeParams');
    return saved ? JSON.parse(saved) : null;
  });
  // Formatear warning de porciones de forma segura
  const currentRecipe = recipes && recipes.length > 0 ? recipes[currentIndex] : null;
  const portionWarning = currentRecipe?.portionWarning ? cleanText(currentRecipe.portionWarning) : null;
  
  // Formatear ingredientes faltantes de forma segura
  const missingIngredients = Array.isArray(currentRecipe?.missingIngredients)
    ? currentRecipe.missingIngredients.filter(ing => ing && ing.name)
    : [];

  const handleNext = () => {
    setCurrentIndex(prev => (prev < (recipes?.length || 1) - 1 ? prev + 1 : 0));
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : (recipes?.length || 1) - 1));
  };

  const handleViewDetails = () => {
    setSelectedRecipe(currentRecipe);
    setCurrentView('recipe-detail');
  };

  const handleGenerateAnother = useCallback(async () => {
    // Lock para evitar doble clic
    if (isGeneratingLock || !lastParams) {
      if (!lastParams) {
        setCurrentView('generate-recipe');
      }
      return;
    }

    setIsGeneratingLock(true);
    setGenerating(true);
    setError('');

    try {
      // Generar otra receta con los mismos parámetros
      const newRecipes = await generateRecipe({
        ...lastParams,
        regenerate: true,
        usedRecipeNames
      });

      // Actualizar usando el callback para evitar race conditions
      setGeneratedRecipes(prev => {
        const updated = [...prev, ...newRecipes];
        return updated;
      });

      // Actualizar nombres usados
      setUsedRecipeNames(prev => {
        const newNames = newRecipes.map(r => cleanText(r?.name)).filter(Boolean);
        return [...prev, ...newNames];
      });

      // Ir a la nueva receta (la última agregada)
      setGeneratedRecipes(prev => {
        const newIndex = prev.length - 1;
        // Usar setTimeout para asegurar que el estado se haya actualizado
        setTimeout(() => {
          setCurrentIndex(newIndex);
        }, 0);
        return prev;
      });

    } catch (error) {
      console.error('Error al generar otra receta:', error);
      
      if (error.isCompatibilityError || (error.message && error.message.includes('No es posible'))) {
        setError(error.message || 'No es posible generar una receta diferente con estas condiciones.');
      } else if (error.status === 429) {
        setError('Límite de uso alcanzado. Por favor espera un momento.');
      } else if (error.status >= 500 || !error.status) {
        setError('Error temporal. Intenta de nuevo en unos segundos.');
      } else {
        setError(error.message || 'Error al generar otra receta. Intenta nuevamente.');
      }
      
      // Desbloquear incluso si hay error
      setIsGeneratingLock(false);
    } finally {
      setGenerating(false);
    }
  }, [lastParams, usedRecipeNames, isGeneratingLock, setGeneratedRecipes, setCurrentIndex, setCurrentView]);

  // Desbloquear cuando el componente se desmonte o cambie de estado
  useEffect(() => {
    return () => {
      setIsGeneratingLock(false);
    };
  }, []);

  // Actualizar usedRecipeNames cuando cambia el índice o las recetas
  useEffect(() => {
    if (recipes && recipes.length > 0) {
      const names = recipes.map(r => cleanText(r?.name)).filter(Boolean);
      setUsedRecipeNames(names);
    }
  }, [recipes, currentIndex]);

  if (!recipes || recipes.length === 0) {
    return (
      <div className="min-h-screen bg-food-pattern flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-10 left-10 text-4xl opacity-20 animate-pulse">🥕</div>
        <div className="absolute top-20 right-20 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}>🍅</div>
        <div className="absolute bottom-20 left-20 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}>🥦</div>
        
        <div className="text-center relative z-10 card-food p-8 rounded-2xl">
          <div className="text-6xl mb-4">🍽️</div>
          <p className="text-gray-600 mb-4 text-lg font-medium">No hay recetas generadas</p>
          <button
            onClick={() => setCurrentView('generate-recipe')}
            className="btn-food"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-food-pattern p-4 flex flex-col relative overflow-hidden">
      {/* Decoraciones de comida */}
      <div className="absolute top-10 left-10 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '0.5s' }}>🍅</div>
      <div className="absolute bottom-32 left-16 text-4xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}>🥦</div>
      <div className="absolute bottom-10 right-10 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '1.5s' }}>🍳</div>
      
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col relative z-10">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => setCurrentView('generate-recipe')} 
            className="flex items-center gap-2 text-food-600 font-semibold hover:text-food-700 transition hover:scale-105"
          >
            ← Volver
          </button>
          
          <div className="flex flex-col items-center gap-3">
            <div className="backdrop-blur-md bg-white/80 border-2 border-food-200 shadow-sm rounded-2xl px-5 py-3 text-center transition-all duration-300 hover:shadow-md">
              <p className="text-sm font-bold text-gray-800">
                ¿No te convenció esta receta?
              </p>
              <p className="text-xs text-gray-500 mt-1">
                No te preocupes, genera otra 🍽️
              </p>
            </div>

            <button
              onClick={handleGenerateAnother}
              disabled={generating || isGeneratingLock || !lastParams}
              className="group flex items-center gap-2 bg-food-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 hover:bg-food-600 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                size={18}
                className={`
                  transition-transform duration-500
                  ${generating ? 'animate-spin' : 'group-hover:rotate-180'}
                `}
              />
              {generating ? 'Generando...' : 'Generar otra receta'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            {error}
          </div>
        )}
        
        {/* Receta centrada y más grande */}
        <div className="flex-1 flex items-center justify-center">
          <div className="card-food rounded-2xl p-8 w-full max-w-3xl transform hover:scale-[1.02] transition-all duration-300">
            <div className="mb-6 text-center">
              <div className="inline-block text-5xl mb-4 animate-bounce">🍳</div>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 text-center tracking-tight">
                {cleanText(currentRecipe?.name) || 'Receta sin nombre'}
              </h3>
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {Array.isArray(currentRecipe?.categories) && currentRecipe.categories.map((cat, idx) => {
                  const cleanCat = cleanText(cat);
                  return cleanCat ? (
                    <span 
                      key={idx}
                      className="bg-food-100 text-food-700 px-4 py-2 rounded-full text-sm font-bold"
                    >
                      {cleanCat}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-food-50 to-teal-50 rounded-xl p-6 mb-6 border-2 border-food-100">
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                <strong className="text-food-700">Ingredientes principales:</strong>{' '}
                {Array.isArray(currentRecipe?.ingredients) && currentRecipe.ingredients.length > 0
                  ? currentRecipe.ingredients.slice(0, 5).map(ing => ing.name).join(', ')
                  : 'No especificados'
                }
              </p>
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <div className="text-center bg-white rounded-xl px-6 py-3 shadow-md border-2 border-food-100">
                  <p className="text-3xl font-bold text-food-600">
                    {currentRecipe?.servings || 2}
                  </p>
                  <p className="text-xs text-gray-600 font-medium">personas</p>
                </div>
              </div>
            </div>
            
            {/* Advertencia de porciones - SOLO si es un warning válido */}
            {portionWarning && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-bold text-orange-800 mb-1">Advertencia de porciones</p>
                    <p className="text-sm text-orange-700">{portionWarning}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Ingredientes faltantes */}
            {missingIngredients.length > 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-bold text-yellow-800 mb-2">Ingredientes faltantes:</p>
                    <p className="text-sm text-yellow-700">
                      {missingIngredients.map((ing, idx) => (
                        <span key={idx}>
                          {formatQuantity(ing.quantity) !== 'Al gusto' && formatQuantity(ing.quantity) !== '' ? (
                            <>
                              <strong>{formatQuantity(ing.quantity)} {ing.unit || ''}</strong> de <strong>{ing.name}</strong>
                            </>
                          ) : (
                            <>
                              <strong>Al gusto</strong> de <strong>{ing.name}</strong>
                            </>
                          )}
                          {idx < missingIngredients.length - 1 && ', '}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-4">
              <button 
                onClick={handleViewDetails}
                className="flex-1 btn-food text-lg py-4 flex items-center justify-center gap-2 shadow-xl"
              >
                <Heart size={20} />
                Ver Receta Completa
              </button>
              
              {/* Botones de navegación si hay más de 1 receta */}
              {recipes.length > 1 && (
                <>
                  <button 
                    onClick={handlePrevious}
                    className="bg-white border-2 border-food-200 text-food-700 px-5 py-4 rounded-xl font-bold hover:bg-food-50 hover:border-food-300 transition flex items-center justify-center shadow-lg"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={handleNext}
                    className="bg-white border-2 border-food-200 text-food-700 px-5 py-4 rounded-xl font-bold hover:bg-food-50 hover:border-food-300 transition flex items-center justify-center shadow-lg"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Indicador de recetas */}
        <div className="text-center mt-6 mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            {recipes.map((_, idx) => (
              <div 
                key={idx}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'bg-food-500 w-8' : 'bg-food-200'
                }`}
              />
            ))}
          </div>
          <p className="text-base text-gray-600 font-bold">
            Receta {currentIndex + 1} de {recipes.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecipeResults;