// src/components/Recipes/GenerateRecipe.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Search, ChefHat, AlertTriangle } from 'lucide-react';
import { isPriority, isExpired, getDaysRemaining } from '../../utils/dateCalculations';
import { generateRecipe } from '../../services/openaiService';
import { formatQuantity } from '../../utils/recipeHelpers';

const GenerateRecipe = ({ setCurrentView, userId, setGeneratedRecipes, setCurrentRecipeIndex }) => {
  const [ingredients, setIngredients] = useState([]);
  const [pendingDishes, setPendingDishes] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingMode, setGeneratingMode] = useState('');
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('');

  const [selectedCategories, setSelectedCategories] = useState([]);
  const [mealTime, setMealTime] = useState('Comida');
  const [servings, setServings] = useState(2);

  const categories = [
    'Snack', 'Postre', 'Saludable', 'Rápida', 
    'Internacional', 'Mexicana', 'Vegana', 
    'Vegetariana', 'Alta en proteína'
  ];

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const ingredientsSnapshot = await getDocs(collection(db, `users/${userId}/ingredients`));
      const ingredientsData = ingredientsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(ing => !isExpired(ing.expirationDate));
      setIngredients(ingredientsData);

      const dishesSnapshot = await getDocs(collection(db, `users/${userId}/pendingDishes`));
      const dishesData = dishesSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return { id: doc.id, ...data, daysRemaining: getDaysRemaining(data.expirationDate) || 0 };
        })
        .filter(dish => !isExpired(dish.expirationDate));
      setPendingDishes(dishesData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError('Error al cargar ingredientes');
    } finally {
      setLoading(false);
    }
  };

  const priorityIngredients = ingredients.filter(ing => isPriority(ing.expirationDate));
  const normalIngredients = ingredients.filter(ing => !isPriority(ing.expirationDate));

  const filteredPriority = priorityIngredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredNormal = normalIngredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleIngredient = (ingredientId) => {
    if (selectedIngredients.includes(ingredientId)) {
      setSelectedIngredients(selectedIngredients.filter(id => id !== ingredientId));
    } else {
      setSelectedIngredients([...selectedIngredients, ingredientId]);
    }
  };

  const toggleDish = (dishId) => {
    if (selectedDishes.includes(dishId)) {
      setSelectedDishes(selectedDishes.filter(id => id !== dishId));
    } else {
      setSelectedDishes([...selectedDishes, dishId]);
    }
  };

  const toggleCategory = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(cat => cat !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleGenerate = async (priorityOnly = false) => {
    setError('');

    let ingredientsToUse = priorityOnly 
      ? priorityIngredients.map(ing => ing.id)
      : selectedIngredients;

    if (ingredientsToUse.length === 0 && selectedDishes.length === 0) {
      setError('Por favor selecciona al menos un ingrediente o platillo almacenado');
      setErrorType('validation');
      return;
    }

    if (selectedCategories.length === 0) {
      setError('Por favor selecciona al menos una categoría');
      setErrorType('validation');
      return;
    }

    setGenerating(true);
    setGeneratingMode(priorityOnly ? 'priority' : 'ia');

    try {
      // Preparar datos para la IA
      const selectedIngredientsData = ingredients.filter(ing => 
        ingredientsToUse.includes(ing.id)
      );

      const selectedDishesData = pendingDishes.filter(dish =>
        selectedDishes.includes(dish.id)
      );

      // ✅ CRUCIAL: Combinar SOLO ingredientes sueltos. 
      // Los platillos NO van aquí, para que la IA no los trate como ingredientes a descontar del inventario.
      const allItems = selectedIngredientsData.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit
      }));

      const params = {
        ingredients: allItems,
        categories: selectedCategories,
        mealTime,
        servings,
        priorityOnly
      };

      sessionStorage.setItem('lastRecipeParams', JSON.stringify(params));

      const recipes = await generateRecipe(params);

      setGeneratedRecipes(recipes);
      setCurrentRecipeIndex(0);
      setCurrentView('recipe-results');

    } catch (error) {
      console.error('Error al generar recetas:', error);
      
      if (error.isCompatibilityError || (error.message && error.message.includes('No es posible'))) {
        setError(error.message || 'No es posible generar una receta con las categorías seleccionadas.');
        setErrorType('ai');
      } else if (error.status === 429) {
        setError('Límite de uso de IA alcanzado. Por favor, espera un momento e intenta de nuevo.');
        setErrorType('technical');
      } else if (error.status >= 500 || !error.status) {
        setError('Error temporal de conexión. Por favor, intenta de nuevo.');
        setErrorType('technical');
      } else {
        setError(error.message || 'Error al generar recetas. Verifica tu conexión.');
        setErrorType('technical');
      }
    } finally {
      setGenerating(false);
      setGeneratingMode('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-food-pattern flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-10 left-10 text-4xl opacity-20 animate-pulse">🥕</div>
        <div className="absolute top-20 right-20 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}>🍅</div>
        <div className="absolute bottom-20 left-20 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}>🥦</div>
        
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-food-200 border-t-food-500 mx-auto mb-4"></div>
          <p className="text-food-600 font-semibold">Cargando ingredientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-food-pattern p-6 relative overflow-hidden">
      <div className="absolute top-10 left-10 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '0.5s' }}>🍅</div>
      <div className="absolute bottom-32 left-16 text-4xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}>🥦</div>
      <div className="absolute bottom-10 right-10 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '1.5s' }}>🍳</div>

      <div className="max-w-6xl mx-auto relative z-10">
        <button 
          onClick={() => setCurrentView('menu')} 
          className="mb-6 flex items-center gap-2 text-food-600 font-semibold hover:text-food-700 transition hover:scale-105"
        >
          ← Volver al menú
        </button>
        
        <div className="card-food rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-4xl">🍳</span>
            <h2 className="text-3xl font-bold text-gray-800 font-cooking">Generar Recetas con IA</h2>
          </div>
          
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-food-400" size={20} />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-food-200 rounded-xl focus:ring-2 focus:ring-food-500 focus:border-transparent bg-white/80 backdrop-blur transition-all" 
                placeholder="Buscar ingrediente en tu inventario..."
              />
            </div>
          </div>
          
          {filteredPriority.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">⚠️</span>
                <h3 className="text-lg font-bold text-gray-800">Ingredientes Prioritarios</h3>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Próximos a caducar</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filteredPriority.map(ing => (
                  <div 
                    key={ing.id}
                    onClick={() => toggleIngredient(ing.id)}
                    className={`border-2 rounded-xl p-3 cursor-pointer transition-all duration-200 hover:scale-105 ${
                      selectedIngredients.includes(ing.id)
                        ? 'border-red-500 bg-red-50 shadow-md'
                        : 'border-red-200 bg-white hover:bg-red-50 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{ing.name}</p>
                        <p className="text-xs text-red-600 font-medium">{formatQuantity(ing.quantity, 2)} {ing.unit}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedIngredients.includes(ing.id)
                          ? 'border-red-500 bg-red-500'
                          : 'border-red-300'
                      }`}>
                        {selectedIngredients.includes(ing.id) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {filteredNormal.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-xl">🥗</span> Ingredientes Disponibles
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filteredNormal.map(ing => (
                  <div 
                    key={ing.id}
                    onClick={() => toggleIngredient(ing.id)}
                    className={`border-2 rounded-xl p-3 cursor-pointer transition-all duration-200 hover:scale-105 ${
                      selectedIngredients.includes(ing.id)
                        ? 'border-food-500 bg-food-50 shadow-md'
                        : 'border-food-200 bg-white hover:bg-food-50 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{ing.name}</p>
                        <p className="text-xs text-gray-500 font-medium">{formatQuantity(ing.quantity, 2)} {ing.unit}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedIngredients.includes(ing.id)
                          ? 'border-food-500 bg-food-500'
                          : 'border-food-300'
                      }`}>
                        {selectedIngredients.includes(ing.id) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingDishes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-xl">🧊</span> Platillos Almacenados
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {pendingDishes.map(dish => {
                  const isExpiringSoon = dish.daysRemaining <= 2;
                  return (
                    <div 
                      key={dish.id}
                      onClick={() => toggleDish(dish.id)}
                      className={`border-2 rounded-xl p-3 cursor-pointer transition-all duration-200 hover:scale-105 ${
                        selectedDishes.includes(dish.id)
                          ? 'border-orange-500 bg-orange-50 shadow-md'
                          : 'border-orange-200 bg-white hover:bg-orange-50 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{dish.name}</p>
                          <p className={`text-xs font-medium ${isExpiringSoon ? 'text-red-600' : 'text-orange-600'}`}>
                            Caduca en {dish.daysRemaining} días
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          selectedDishes.includes(dish.id)
                            ? 'border-orange-500 bg-orange-500'
                            : 'border-orange-300'
                        }`}>
                          {selectedDishes.includes(dish.id) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {ingredients.length === 0 && pendingDishes.length === 0 && (
            <div className="text-center py-12 bg-white/60 rounded-2xl mb-6 border-2 border-dashed border-food-200">
              <div className="text-6xl mb-4">🥬</div>
              <p className="text-gray-600 mb-2 text-lg font-medium">No tienes ingredientes disponibles</p>
              <button onClick={() => setCurrentView('register-ingredient')} className="btn-food">
                🥗 Registrar ingredientes
              </button>
            </div>
          )}
          
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/60 rounded-xl p-4 border-2 border-food-100 md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-lg">🏷️</span> Categorías (selecciona varias)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {categories.map(cat => (
                  <label key={cat} onClick={() => toggleCategory(cat)} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-food-50 transition border border-transparent hover:border-food-200">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      selectedCategories.includes(cat) ? 'border-food-500 bg-food-500' : 'border-food-300'
                    }`}>
                      {selectedCategories.includes(cat) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-gray-700 truncate">{cat}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="bg-white/60 rounded-xl p-4 border-2 border-food-100">
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-lg">🕐</span> Horario
              </label>
              <select value={mealTime} onChange={(e) => setMealTime(e.target.value)} className="w-full px-4 py-3 border-2 border-food-200 rounded-xl focus:ring-2 focus:ring-food-500 focus:border-transparent bg-white transition-all">
                <option>Desayuno</option>
                <option>Comida</option>
                <option>Cena</option>
              </select>
            </div>
            
            <div className="bg-white/60 rounded-xl p-4 border-2 border-food-100">
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-lg">👥</span> Personas
              </label>
              <input type="number" min="1" max="20" value={servings} onChange={(e) => setServings(parseInt(e.target.value) || 2)} className="w-full px-4 py-3 border-2 border-food-200 rounded-xl focus:ring-2 focus:ring-food-500 focus:border-transparent bg-white transition-all" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-4 rounded-xl text-sm mb-6 flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold mb-1">Error</p>
                <p className="text-red-600">{error}</p>
                {errorType === 'ai' && <p className="mt-3 text-xs bg-white/60 p-2 rounded-lg text-red-500">💡 Intenta ajustar las categorías seleccionadas o usar ingredientes diferentes.</p>}
                {errorType === 'technical' && <p className="mt-3 text-xs bg-white/60 p-2 rounded-lg text-red-500">💡 Error técnico. Verifica tu conexión o inténtalo más tarde.</p>}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button 
              onClick={() => handleGenerate(false)}
              disabled={generating || (ingredients.length === 0 && pendingDishes.length === 0)}
              className="w-full btn-food text-lg py-4 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChefHat size={24} />
              {generating && generatingMode === 'ia' ? 'Generando Recetas...' : 'Generar Recetas con IA'}
            </button>
            
            {priorityIngredients.length > 0 && (
              <button 
                onClick={() => handleGenerate(true)}
                disabled={generating}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 rounded-xl font-bold hover:from-red-600 hover:to-orange-600 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span><AlertTriangle color="white" /></span>
                {generating && generatingMode === 'priority' ? 'Generando...' : 'Usar Ingredientes Prioritarios'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateRecipe;