// src/components/Dishes/History.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Star, Trash2, BookOpen, ChefHat } from 'lucide-react';
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
      <div className="min-h-screen bg-food-pattern flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-10 left-10 text-4xl opacity-20 animate-pulse">📚</div>
        <div className="absolute top-20 right-20 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}>🍳</div>
        <div className="absolute bottom-20 left-20 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}>📖</div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-food-200 border-t-food-500 mx-auto mb-4"></div>
          <p className="text-food-600 font-semibold">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-food-pattern p-6 relative overflow-hidden">
      {/* Emojis decorativos */}
      <div className="absolute top-10 left-10 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '0.5s' }}>📚</div>
      <div className="absolute top-20 right-20 text-4xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}>🍳</div>
      <div className="absolute bottom-32 left-16 text-4xl opacity-10 animate-pulse" style={{ animationDelay: '1.5s' }}>📖</div>
      <div className="absolute bottom-10 right-10 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '0s' }}>⭐</div>

      <div className="max-w-4xl mx-auto relative z-10">
        <button
          onClick={() => setCurrentView('menu')}
          className="mb-6 flex items-center gap-2 text-food-600 font-semibold hover:text-food-700 transition hover:scale-105"
        >
          ← Volver al Menú
        </button>

        <div className="card-food rounded-2xl p-8 border-2 border-food-600">
          {/* Encabezado */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-4xl">📚</span>
            <div>
              <h2 className="text-3xl font-bold text-gray-800 font-cooking">Historial de Recetas</h2>
              <p className="text-food-600 text-sm mt-1">Todas las recetas que has preparado</p>
            </div>
          </div>

          {recipes.length === 0 ? (
            <div className="text-center py-12 bg-white/60 rounded-2xl border-2 border-dashed border-food-200">
              <div className="text-6xl mb-4">🍽️</div>
              <p className="text-gray-600 mb-2 text-lg font-medium">No tienes recetas en el historial</p>
              <p className="text-gray-500 text-sm mb-6">Completa una receta para que aparezca aquí</p>
              <button
                onClick={() => setCurrentView('generate-recipe')}
                className="btn-food flex items-center justify-center gap-2 mx-auto"
              >
                <ChefHat size={18} /> Generar una Receta
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recipes.map((recipe) => {
                const isExpanded = expandedId === recipe.id;

                return (
                  <div
                    key={recipe.id}
                    className="border-2 border-food-200 rounded-xl p-6 bg-white hover:border-food-400 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        {/* Nombre */}
                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                          {recipe.name}
                        </h3>
                        <p className="text-sm text-food-500 font-medium">
                          {formatDate(recipe.completedAt)}
                        </p>

                        {/* Categorías */}
                        {recipe.categories && recipe.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {recipe.categories.map((cat, idx) => (
                              <span
                                key={idx}
                                className="bg-food-100 text-food-700 px-3 py-1 rounded-full text-xs font-bold"
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
                            {recipe.ingredients && recipe.ingredients.length > 0 && (
                              <div>
                                <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                                  <span>🥗</span> Ingredientes usados:
                                </p>
                                <div className="bg-food-50 rounded-xl p-3 space-y-2 border border-food-100">
                                  {recipe.ingredients.map((ing, idx) => (
                                    <div key={idx} className="flex items-center justify-between border-b border-food-100 pb-2 last:border-0">
                                      <span className="text-sm text-gray-800 font-medium">{ing.name}</span>
                                      <span className="text-sm text-food-700 bg-white px-3 py-1 rounded-full border border-food-200 font-semibold">
                                        {ing.quantity} {ing.unit}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Instrucciones */}
                            {recipe.instructions && recipe.instructions.length > 0 && (
                              <div>
                                <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                                  <span>📝</span> Instrucciones:
                                </p>
                                <div className="bg-white/60 rounded-xl p-3 border border-food-100">
                                  <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                                    {recipe.instructions.map((instruction, idx) => (
                                      <li key={idx} className="leading-relaxed">{instruction}</li>
                                    ))}
                                  </ol>
                                </div>
                              </div>
                            )}

                            {/* Info adicional */}
                            {(recipe.prepTime || recipe.servings) && (
                              <div className="flex flex-wrap gap-3">
                                {recipe.prepTime && (
                                  <div className="bg-food-50 border border-food-100 rounded-lg px-3 py-2 text-sm text-food-700">
                                    <strong>Tiempo:</strong> {recipe.prepTime} min
                                  </div>
                                )}
                                {recipe.servings && (
                                  <div className="bg-food-50 border border-food-100 rounded-lg px-3 py-2 text-sm text-food-700">
                                    <strong>Porciones:</strong> {recipe.servings} personas
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Botón favorito */}
                      <button
                        onClick={() => toggleFavorite(recipe.id, recipe.favorite)}
                        className={`ml-3 flex-shrink-0 transition-all duration-200 hover:scale-110 ${
                          recipe.favorite ? 'text-food-500' : 'text-gray-300 hover:text-food-400'
                        }`}
                      >
                        <Star size={24} fill={recipe.favorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    <div className="flex gap-3">
                      <button
                        className="flex-1 btn-food py-3 flex items-center justify-center gap-2 font-bold"
                        onClick={() => toggleExpand(recipe.id)}
                      >
                        <BookOpen size={18} />
                        {isExpanded ? 'Ocultar Detalles' : 'Ver Detalles'}
                      </button>
                      <button
                        onClick={() => handleDelete(recipe.id, recipe.name)}
                        className="px-4 py-3 rounded-xl border-2 border-tomato-200 bg-tomato-50 text-tomato-600 hover:bg-tomato-100 hover:border-tomato-400 transition-all duration-200 flex items-center justify-center"
                      >
                        <Trash2 size={18} />
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
