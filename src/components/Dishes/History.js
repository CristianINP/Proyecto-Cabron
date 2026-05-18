// src/components/Dishes/History.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Star, Trash2 } from 'lucide-react';
import { formatDate } from '../../utils/dateCalculations';
import Modal from '../../utils/Modal';

const History = ({ setCurrentView, userId }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  
  // Estados para modales
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    loadHistory();
  }, [userId]);

  const loadHistory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `users/${userId}/history`));
      const recipesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordenar por fecha (más recientes primero)
      const sorted = recipesData.sort((a, b) => 
        new Date(b.completedAt) - new Date(a.completedAt)
      );
      
      setRecipes(sorted);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      showModal('error', 'Error', 'Error al cargar el historial');
    } finally {
      setLoading(false);
    }
  };

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

  const toggleFavorite = async (id, currentFavorite) => {
    try {
      const recipeRef = doc(db, `users/${userId}/history`, id);
      await updateDoc(recipeRef, {
        favorite: !currentFavorite
      });

      // Actualizar estado local
      setRecipes(recipes.map(recipe => 
        recipe.id === id 
          ? { ...recipe, favorite: !currentFavorite }
          : recipe
      ));
    } catch (error) {
      console.error('Error al actualizar favorito:', error);
      showModal('error', 'Error', 'Error al actualizar favorito');
    }
  };

  const handleDelete = (id, name) => {
    showModal(
      'confirm',
      'Eliminar del historial',
      `¿Deseas eliminar "${name}" del historial?`,
      async () => {
        try {
          await deleteDoc(doc(db, `users/${userId}/history`, id));
          setRecipes(recipes.filter(recipe => recipe.id !== id));
          showModal('success', '¡Eliminada!', 'Receta eliminada del historial');
        } catch (error) {
          console.error('Error al eliminar:', error);
          showModal('error', 'Error', 'Error al eliminar la receta');
        }
      }
    );
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={() => setCurrentView('menu')} 
          className="mb-6 text-emerald-600 font-semibold hover:underline"
        >
          ← Volver al menú
        </button>
        
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Historial de Recetas</h2>
          
          {recipes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No tienes recetas en el historial</p>
              <button
                onClick={() => setCurrentView('generate-recipe')}
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-600 transition"
              >
                Generar una receta
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {recipes.map((recipe) => {
                const isExpanded = expandedId === recipe.id;

                return (
                  <div 
                    key={recipe.id} 
                    className="border-2 border-gray-200 rounded-xl p-6 hover:border-emerald-300 transition"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 
                          className="text-lg font-bold text-gray-800 mb-1 cursor-pointer hover:text-emerald-600"
                          onClick={() => toggleExpand(recipe.id)}
                        >
                          {recipe.name} {isExpanded ? '▼' : '▶'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(recipe.completedAt)}
                        </p>
                        
                        {/* Categorías */}
                        {recipe.categories && recipe.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {recipe.categories.map((cat, idx) => (
                              <span 
                                key={idx}
                                className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-semibold"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Detalles expandibles */}
                        {isExpanded && (
                          <div className="mt-4 space-y-3">
                            {/* Ingredientes */}
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">Ingredientes:</p>
                              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                {recipe.ingredients?.map((ing, idx) => (
                                  <li key={idx}>
                                    {ing.quantity} {ing.unit} de {ing.name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            {/* Instrucciones */}
                            {recipe.instructions && (
                              <div>
                                <p className="text-sm font-semibold text-gray-700 mb-1">Instrucciones:</p>
                                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                                  {recipe.instructions.map((instruction, idx) => (
                                    <li key={idx}>{instruction}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            
                            {/* Info adicional */}
                            <div className="text-sm text-gray-600">
                              {recipe.prepTime && (
                                <p><strong>Tiempo:</strong> {recipe.prepTime} min</p>
                              )}
                              {recipe.servings && (
                                <p><strong>Porciones:</strong> {recipe.servings} personas</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => toggleFavorite(recipe.id, recipe.favorite)}
                        className={`${
                          recipe.favorite ? 'text-pink-500' : 'text-gray-300'
                        } hover:text-pink-500 transition ml-2`}
                      >
                        <Star size={24} fill={recipe.favorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        className="flex-1 bg-emerald-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-600 transition"
                        onClick={() => toggleExpand(recipe.id)}
                      >
                        {isExpanded ? 'Ocultar Detalles' : 'Ver Detalles'}
                      </button>
                      <button 
                        onClick={() => handleDelete(recipe.id, recipe.name)}
                        className="bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-200 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

export default History;