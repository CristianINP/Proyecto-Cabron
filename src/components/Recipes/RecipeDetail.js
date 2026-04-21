// src/components/Recipes/RecipeDetail.js
import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { calculateDishShelfLife } from '../../services/openaiService';
import { Check, Clock, BookOpen } from 'lucide-react';
import Modal from '../../utils/Modal';

const RecipeDetail = ({ setCurrentView, recipe, userId }) => {
  const [usedIngredients, setUsedIngredients] = useState(
    recipe.ingredients?.map(ing => ({ 
      ...ing, 
      used: true,
      usedQuantity: ing.quantity,
      usedUnit: ing.unit
    })) || []
  );
  const [saving, setSaving] = useState(false);
  
  // Estados para modales
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  if (!recipe) {
    return (
      <div className="min-h-screen bg-food-pattern flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-10 left-10 text-4xl opacity-20 animate-pulse">🥕</div>
        <div className="absolute top-20 right-20 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}>🍅</div>
        <div className="absolute bottom-20 left-20 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}>🥦</div>
        
        <div className="text-center relative z-10 card-food p-8 rounded-2xl">
          <div className="text-6xl mb-4">🍽️</div>
          <p className="text-gray-600 mb-4 text-lg font-medium">No hay receta seleccionada</p>
          <button
            onClick={() => setCurrentView('recipe-results')}
            className="btn-food"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  const showModal = (type, title, message, onConfirm = () => {}) => {
    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      onConfirm
    });
  };

  const closeModal = () => {
    setModalConfig({ ...modalConfig, isOpen: false });
  };

  const toggleIngredient = (index) => {
    setUsedIngredients(usedIngredients.map((ing, i) => 
      i === index ? { ...ing, used: !ing.used } : ing
    ));
  };

  const handleTempChange = (index, value) => {
    setUsedIngredients(usedIngredients.map((ing, i) =>
      i === index ? { ...ing, usedQuantity: value } : ing
    ));
  };

  const handleQuantityBlur = (index) => {
    const value = parseFloat(usedIngredients[index].usedQuantity);

    if (isNaN(value) || value < 0.25) {
      showModal(
        'error',
        'Cantidad inválida',
        'La cantidad mínima permitida es 0.25. Se ajustará automáticamente.',
        () => {
          setUsedIngredients(usedIngredients.map((ing, i) =>
            i === index ? { ...ing, usedQuantity: 0.25 } : ing
          ));
        }
      );
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleUnitChange = (index, newUnit) => {
    setUsedIngredients(usedIngredients.map((ing, i) => 
      i === index ? { ...ing, usedUnit: newUnit } : ing
    ));
  };

  const handleMarkAsCompleted = () => {
    showModal(
      'confirm',
      'Marcar como terminada',
      '¿Estás seguro de marcar esta receta como terminada? Se actualizará tu inventario.',
      async () => {
        setSaving(true);
        try {
          const ingredientsSnapshot = await getDocs(
            collection(db, `users/${userId}/ingredients`)
          );
          
          const usedIngredientsReport = []; // Para mostrar al final
          
          for (const ing of usedIngredients) {
            if (!ing.used) continue;
            
            const ingredientDoc = ingredientsSnapshot.docs.find(doc => {
              const docData = doc.data();
              return docData.name.toLowerCase().trim() === ing.name.toLowerCase().trim();
            });
            
            if (ingredientDoc) {
              const currentData = ingredientDoc.data();
              const quantityUsed = parseFloat(ing.usedQuantity) || 0;
              const newQuantity = currentData.quantity - quantityUsed;
              
              if (newQuantity <= 0) {
                await deleteDoc(doc(db, `users/${userId}/ingredients`, ingredientDoc.id));
                usedIngredientsReport.push(`${ing.name}: Usadas 🥳 (se acabó)`);
              } else {
                const isFractioned = newQuantity < 1;
                const updateData = {
                  quantity: newQuantity,
                  isFractioned
                };

                // Actualizar fecha de caducidad si es Piezas y se vuelve fraccionado
                if (currentData.unit === 'Piezas' && isFractioned && !currentData.isFractioned) {
                  const { searchFood } = await import('../../services/foodDatabase');
                  const food = searchFood(currentData.name);
                  
                  if (food && food.fraccionado > 0) {
                    const purchaseDate = new Date(currentData.purchaseDate);
                    const newExpDate = new Date(purchaseDate);
                    newExpDate.setDate(newExpDate.getDate() + food.fraccionado);
                    updateData.expirationDate = newExpDate.toISOString();
                  }
                }

                await updateDoc(doc(db, `users/${userId}/ingredients`, ingredientDoc.id), updateData);
                usedIngredientsReport.push(`${ing.name}: ${quantityUsed} ${ing.usedUnit} usadas`);
              }
            }
          }

          const usedIngredientsForHistory = usedIngredients
            .filter(ing => ing.used)
            .map(ing => ({
              name: ing.name,
              quantity: ing.usedQuantity,
              unit: ing.usedUnit
            }));

          await addDoc(collection(db, `users/${userId}/history`), {
            name: recipe.name,
            ingredients: usedIngredientsForHistory,
            instructions: recipe.instructions || [],
            categories: recipe.categories || [],
            prepTime: recipe.prepTime || null,
            servings: recipe.servings || 2,
            completedAt: new Date().toISOString(),
            favorite: false
          });

          const reportMessage = usedIngredientsReport.length > 0 
            ? (
              <div>
                <p className="font-semibold mb-2">Inventario actualizado:</p>
                <ul className="text-left space-y-1">
                  {usedIngredientsReport.map((report, idx) => (
                    <li key={idx} className="text-sm">• {report}</li>
                  ))}
                </ul>
              </div>
            )
            : 'Receta completada exitosamente';

          showModal('success', '¡Receta completada! 🎉', reportMessage, () => {
            setCurrentView('menu');
          });
        } catch (error) {
          console.error('Error al completar receta:', error);
          showModal('error', 'Error', `Error al guardar: ${error.message}`);
        } finally {
          setSaving(false);
        }
      }
    );
  };

  const handleSaveAsPending = () => {
    showModal(
      'confirm',
      'Guardar como pendiente',
      '¿Deseas guardar este platillo como pendiente? Se actualizará tu inventario y podrás terminarlo después.',
      async () => {
        setSaving(true);
        try {
          // Actualizar inventario (igual que en handleMarkAsCompleted)
          const ingredientsSnapshot = await getDocs(
            collection(db, `users/${userId}/ingredients`)
          );
          
          const usedIngredientsReport = [];
          
          for (const ing of usedIngredients) {
            if (!ing.used) continue;
            
            const ingredientDoc = ingredientsSnapshot.docs.find(doc => {
              const docData = doc.data();
              return docData.name.toLowerCase().trim() === ing.name.toLowerCase().trim();
            });
            
            if (ingredientDoc) {
              const currentData = ingredientDoc.data();
              const quantityUsed = parseFloat(ing.usedQuantity) || 0;
              const newQuantity = currentData.quantity - quantityUsed;
              
              if (newQuantity <= 0) {
                await deleteDoc(doc(db, `users/${userId}/ingredients`, ingredientDoc.id));
                usedIngredientsReport.push(`${ing.name}: Usadas 🥳 (se acabó)`);
              } else {
                const isFractioned = newQuantity < 1;
                const updateData = {
                  quantity: newQuantity,
                  isFractioned
                };

                // Actualizar fecha de caducidad si es Piezas y se vuelve fraccionado
                if (currentData.unit === 'Piezas' && isFractioned && !currentData.isFractioned) {
                  const { searchFood } = await import('../../services/foodDatabase');
                  const food = searchFood(currentData.name);
                  
                  if (food && food.fraccionado > 0) {
                    const purchaseDate = new Date(currentData.purchaseDate);
                    const newExpDate = new Date(purchaseDate);
                    newExpDate.setDate(newExpDate.getDate() + food.fraccionado);
                    updateData.expirationDate = newExpDate.toISOString();
                  }
                }

                await updateDoc(doc(db, `users/${userId}/ingredients`, ingredientDoc.id), updateData);
                usedIngredientsReport.push(`${ing.name}: ${quantityUsed} ${ing.usedUnit} usadas`);
              }
            }
          }

          let daysRemaining = 3;
          
          try {
            // Solo pasar los nombres de los ingredientes, ChatGPT calculará la vida útil
            const ingredientNames = recipe.ingredients.map(ing => ({
              name: ing.name
            }));
            
            daysRemaining = await calculateDishShelfLife(ingredientNames);
          } catch (error) {
            console.log('Usando días por defecto (3)');
          }

          const usedIngredientsForPending = usedIngredients
            .filter(ing => ing.used)
            .map(ing => ({
              name: ing.name,
              quantity: ing.usedQuantity,
              unit: ing.usedUnit
            }));

          await addDoc(collection(db, `users/${userId}/pendingDishes`), {
            name: recipe.name,
            ingredients: usedIngredientsForPending,
            instructions: recipe.instructions || [],
            daysRemaining: daysRemaining,
            expirationDate: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString()
          });

          await addDoc(collection(db, `users/${userId}/history`), {
            name: recipe.name,
            ingredients: usedIngredientsForPending,
            instructions: recipe.instructions || [],
            categories: recipe.categories || [],
            prepTime: recipe.prepTime || null,
            servings: recipe.servings || 2,
            completedAt: new Date().toISOString(),
            favorite: false
          });

          const reportMessage = usedIngredientsReport.length > 0 
            ? (
              <div>
                <p className="font-semibold mb-2">Inventario actualizado:</p>
                <ul className="text-left space-y-1 mb-3">
                  {usedIngredientsReport.map((report, idx) => (
                    <li key={idx} className="text-sm">• {report}</li>
                  ))}
                </ul>
                <p className="text-sm mt-3 pt-3 border-t border-gray-200">
                  Se conservará por aproximadamente {daysRemaining} días.
                </p>
              </div>
            )
            : `Se conservará por aproximadamente ${daysRemaining} días.`;

          showModal('success', '¡Platillo guardado! 📦', reportMessage, () => {
            setCurrentView('menu');
          });
        } catch (error) {
          console.error('Error al guardar platillo:', error);
          showModal('error', 'Error', `Error al guardar: ${error.message}`);
        } finally {
          setSaving(false);
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-food-pattern p-6 relative overflow-hidden">
      {/* Decoraciones de comida en el fondo */}
      <div className="absolute top-10 left-10 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '0.5s' }}>🍅</div>
      <div className="absolute bottom-32 left-16 text-4xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}>🥦</div>
      <div className="absolute bottom-10 right-10 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '1.5s' }}>📖</div>

      <div className="max-w-3xl mx-auto relative z-10">
        <button 
          onClick={() => setCurrentView('recipe-results')} 
          className="mb-6 flex items-center gap-2 text-food-600 font-semibold hover:text-food-700 transition hover:scale-105"
        >
          ← Volver a resultados
        </button>
        
        <div className="card-food rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="inline-block text-5xl mb-3 animate-bounce">🍳</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4 font-cooking">{recipe.name}</h2>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {recipe.categories?.map((cat, idx) => (
              <span 
                key={idx}
                className="bg-food-100 text-food-700 px-4 py-2 rounded-full text-sm font-bold"
              >
                {cat}
              </span>
            ))}
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-2xl">🥗</span> Ingredientes de tu inventario
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Marca los que usaste y ajusta las cantidades si es necesario
            </p>
            <div className="space-y-3">
              {usedIngredients.map((ing, index) => (
                <div key={index} className={`border-2 rounded-xl p-4 transition-all ${ing.used ? 'border-food-200 bg-white shadow-md' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start gap-3">
                    <div 
                      onClick={() => toggleIngredient(index)}
                      className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${
                        ing.used 
                          ? 'border-food-500 bg-food-500' 
                          : 'border-gray-300 hover:border-food-300'
                      }`}
                    >
                      {ing.used && <Check size={16} className="text-white" />}
                    </div>
                    
                    <div className="flex-1">
                      <p className={`font-bold text-lg ${!ing.used ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {ing.name}
                      </p>
                      
                      {ing.used && (
                        <div className="flex gap-2 mt-3">
                          <input
                            type="number"
                            step="0.01"
                            value={ing.usedQuantity}
                            onChange={(e) => handleTempChange(index, e.target.value)}
                            onBlur={() => handleQuantityBlur(index)}
                            className="w-28 px-3 py-2 border-2 border-food-200 rounded-lg text-sm focus:ring-2 focus:ring-food-500 focus:border-transparent"
                            placeholder="Cantidad"
                          />
                          <div className="px-4 py-2 rounded-lg bg-food-100 text-food-700 text-sm font-bold border-2 border-food-200">
                            {ing.usedUnit}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right bg-food-50 px-3 py-2 rounded-lg">
                      <p className="text-xs text-gray-500 font-medium">Receta sugiere:</p>
                      <p className="text-sm text-food-700 font-bold">{parseFloat(ing.quantity).toFixed(2)} {ing.unit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
            <div className="mb-6 bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
              <h3 className="text-lg font-bold text-yellow-800 mb-3 flex items-center gap-2">
                <span className="text-xl">🛒</span> Ingredientes adicionales necesarios
              </h3>
              <ul className="space-y-2">
                {recipe.missingIngredients.map((ing, idx) => (
                  <li key={idx} className="text-yellow-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                    <span className="font-medium">{parseFloat(ing.quantity).toFixed(2)} {ing.unit}</span> de <span className="font-bold">{ing.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">📝</span> Instrucciones de Preparación
            </h3>
            <div className="bg-white/60 rounded-xl p-4 border-2 border-food-100">
              <ol className="space-y-4">
                {recipe.instructions?.map((instruction, idx) => (
                  <li key={idx} className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-food-500 text-white rounded-full flex items-center justify-center font-bold">
                      {idx + 1}
                    </div>
                    <p className="text-gray-700 leading-relaxed pt-1">{instruction}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          
          {recipe.prepTime && (
            <div className="bg-gradient-to-r from-food-50 to-teal-50 border-2 border-food-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <div className="w-12 h-12 bg-food-500 rounded-xl flex items-center justify-center">
                <Clock className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-food-600 font-medium">Tiempo de preparación</p>
                <p className="text-2xl font-bold text-food-800">{recipe.prepTime} <span className="text-base font-normal">minutos</span></p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleMarkAsCompleted}
              disabled={saving}
              className="btn-food flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={20} />
              {saving ? 'Guardando...' : 'Marcar como Terminada'}
            </button>
            <button 
              onClick={handleSaveAsPending}
              disabled={saving}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-bold hover:from-orange-600 hover:to-orange-700 transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BookOpen size={20} />
              {saving ? 'Guardando...' : 'Guardar como Pendiente'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
      />
    </div>
  );
};

export default RecipeDetail;