// src/components/Recipes/RecipeResults.js
import React, { useState } from 'react';
import { Heart, ChevronRight, ChevronLeft, RefreshCw } from 'lucide-react';
import { generateRecipe } from '../../services/openaiService';

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

  // Guardar los parámetros de la última generación
  const [lastParams, setLastParams] = useState(() => {
    const saved = sessionStorage.getItem('lastRecipeParams');
    return saved ? JSON.parse(saved) : null;
  });

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

  const currentRecipe = recipes[currentIndex];
  

  const handleNext = () => {
    if (currentIndex < recipes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Volver al inicio
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(recipes.length - 1); // Ir al final
    }
  };

  const handleViewDetails = () => {
    setSelectedRecipe(currentRecipe);
    setCurrentView('recipe-detail');
  };

  const handleGenerateAnother = async () => {
    if (!lastParams) {
      // Si no hay parámetros guardados, volver a la pantalla de generación
      setCurrentView('generate-recipe');
      return;
    }

    setGenerating(true);
    setError('');

    try {
            // Generar otra receta con los mismos parámetros
      const newRecipes = await generateRecipe({
        ...lastParams,
        regenerate: true,
        usedRecipeNames
      });



      // Agregar las nuevas recetas al array existente
      setGeneratedRecipes([...recipes, ...newRecipes]);

      setUsedRecipeNames(prev => [
        ...prev,
        ...newRecipes.map(r => r.name)
      ]);

      
      // Ir a la nueva receta (la última agregada)
      setCurrentIndex(recipes.length);
    } catch (error) {
      console.error('Error al generar otra receta:', error);
      
      if (error.message && error.message.includes('No es posible')) {
        setError(error.message);
      } else {
        setError('Error al generar otra receta. Intenta nuevamente.');
      }
    } finally {
      setGenerating(false);
    }
  };

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
              disabled={generating}
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
        
        <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-8 text-gray-800 relative">
          <span className="relative z-10 font-cooking">Recetas Generadas</span>
          <span className="absolute inset-x-0 -bottom-2 h-3 bg-food-200/60 rounded-full blur-md"></span>
          <span className="absolute left-1/2 -translate-x-1/2 -bottom-3 h-1 w-28 bg-gradient-to-r from-food-400 to-teal-500 rounded-full"></span>
        </h2>

        
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
                {currentRecipe.name}
              </h3>
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {currentRecipe.categories?.map((cat, idx) => (
                  <span 
                    key={idx}
                    className="bg-food-100 text-food-700 px-4 py-2 rounded-full text-sm font-bold"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-food-50 to-teal-50 rounded-xl p-6 mb-6 border-2 border-food-100">
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                <strong className="text-food-700">Ingredientes principales:</strong>{' '}
                {currentRecipe.ingredients?.slice(0, 5).map(ing => ing.name).join(', ')}
              </p>
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <div className="text-center bg-white rounded-xl px-6 py-3 shadow-md border-2 border-food-100">
                  <p className="text-3xl font-bold text-food-600">{currentRecipe.servings || 2}</p>
                  <p className="text-xs text-gray-600 font-medium">personas</p>
                </div>
              </div>
            </div>
            
            {/* Ingredientes faltantes */}
            {currentRecipe.missingIngredients && currentRecipe.missingIngredients.length > 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-bold text-yellow-800 mb-2">Ingredientes faltantes:</p>
                    <p className="text-sm text-yellow-700">
                      {currentRecipe.missingIngredients.map(ing => ing.name).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Advertencia de porciones */}
            {currentRecipe.portionWarning && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-bold text-red-800 mb-1">Advertencia de porciones</p>
                    <p className="text-sm text-red-700">Debido a las características intrínsecas de los ingredientes y/o del proceso de preparación, la porción resultante puede generar un excedente.</p>
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