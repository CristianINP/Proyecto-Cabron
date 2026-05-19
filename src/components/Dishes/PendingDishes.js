// src/components/Dishes/PendingDishes.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getDaysRemaining, isExpired } from '../../utils/dateCalculations';
import { XCircle, Clock, CheckCircle, BookOpen, ChefHat } from 'lucide-react';
import Modal from '../../utils/Modal';

const PendingDishes = ({ setCurrentView, userId }) => {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    loadDishes();
  }, [userId]);

  const loadDishes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `users/${userId}/pendingDishes`));
      const dishesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const updatedDishes = dishesData.map(dish => {
        const daysRemaining = getDaysRemaining(dish.expirationDate);
        return {
          ...dish,
          daysRemaining: daysRemaining || 0,
          expired: isExpired(dish.expirationDate)
        };
      });

      const sorted = updatedDishes.sort((a, b) => {
        if (a.expired && !b.expired) return 1;
        if (!a.expired && b.expired) return -1;
        return a.daysRemaining - b.daysRemaining;
      });

      setDishes(sorted);
    } catch (error) {
      console.error('Error al cargar platillos:', error);
      showModal('error', 'Error', 'Error al cargar platillos almacenados');
    } finally {
      setLoading(false);
    }
  };

  const showModal = (type, title, message, onConfirm = () => {}) => {
    setModalConfig({ isOpen: true, type, title, message, onConfirm });
  };

  const closeModal = () => {
    setModalConfig({ ...modalConfig, isOpen: false });
  };

  const handleComplete = (id, name) => {
    showModal(
      'confirm',
      'Marcar como terminado',
      `¿Deseas marcar "${name}" como terminado?`,
      async () => {
        try {
          const dish = dishes.find(d => d.id === id);
          if (dish) {
            try {
              await addDoc(collection(db, `users/${userId}/history`), {
                name: dish.name,
                ingredients: dish.ingredients || [],
                instructions: dish.instructions || [],
                prepTime: dish.prepTime ?? null,
                servings: dish.servings ?? null,
                completedAt: new Date().toISOString(),
                favorite: false
              });
            } catch (historyError) {
              console.error('Error al guardar en historial:', historyError);
            }
          }
          await deleteDoc(doc(db, `users/${userId}/pendingDishes`, id));
          setDishes(dishes.filter(dish => dish.id !== id));
          showModal('success', '!Platillo Terminado¡', 'Puedes consultar esta receta en tu historial.');
        } catch (error) {
          console.error('Error al eliminar:', error);
          showModal('error', 'Error', 'Error al marcar como Terminado');
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
        <div className="absolute top-10 left-10 text-4xl opacity-20 animate-pulse">🍳</div>
        <div className="absolute top-20 right-20 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}>🥗</div>
        <div className="absolute bottom-20 left-20 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}>🥦</div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-food-200 border-t-food-500 mx-auto mb-4"></div>
          <p className="text-food-600 font-semibold">Cargando platillos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-food-pattern p-6 relative overflow-hidden">
      {/* Emojis decorativos */}
      <div className="absolute top-10 left-10 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '0.5s' }}>🍳</div>
      <div className="absolute top-20 right-20 text-4xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}>🥗</div>
      <div className="absolute bottom-32 left-16 text-4xl opacity-10 animate-pulse" style={{ animationDelay: '1.5s' }}>🥦</div>
      <div className="absolute bottom-10 right-10 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '0s' }}>⏰</div>

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
            <span className="text-4xl">⏰</span>
            <div>
              <h2 className="text-3xl font-bold text-gray-800 font-cooking">Platillos Almacenados</h2>
              <p className="text-food-600 text-sm mt-1">Recetas guardadas para terminar después</p>
            </div>
          </div>

          {dishes.length === 0 ? (
            <div className="text-center py-12 bg-white/60 rounded-2xl border-2 border-dashed border-food-200">
              <div className="text-6xl mb-4">🍽️</div>
              <p className="text-gray-600 mb-2 text-lg font-medium">No tienes Platillos Almacenados</p>
              <p className="text-gray-500 text-sm mb-6">Guarda una receta como pendiente para verla aquí</p>
              <button
                onClick={() => setCurrentView('generate-recipe')}
                className="btn-food flex items-center justify-center gap-2 mx-auto"
              >
                <ChefHat size={18} /> Generar una Receta
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {dishes.map((dish) => {
                const isExpanded = expandedId === dish.id;
                const isExpiringSoon = !dish.expired && dish.daysRemaining <= 2;

                return (
                  <div
                    key={dish.id}
                    className={`border-2 rounded-xl p-6 transition-all duration-200 ${
                      dish.expired
                        ? 'border-gray-300 bg-gray-50 opacity-75'
                        : isExpiringSoon
                          ? 'border-red-300 bg-red-50 warning-glow'
                          : 'border-food-200 bg-white hover:border-food-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        {/* Nombre */}
                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                          {dish.name}
                        </h3>

                        {isExpiringSoon && !dish.expired && (
                          <span className="badge-priority text-xs">⚠️ Próximo a caducar</span>
                        )}

                        {/* Ingredientes (expandido) */}
                        {isExpanded && dish.ingredients && dish.ingredients.length > 0 && (
                          <div className="mt-4 mb-3">
                            <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                              <span>🥗</span> Ingredientes usados:
                            </p>
                            <div className="bg-food-50 rounded-xl p-3 space-y-2 border border-food-100">
                              {dish.ingredients.map((ing, idx) => (
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

                        {/* Instrucciones (expandido) */}
                        {isExpanded && dish.instructions && dish.instructions.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
                              <span>📝</span> Instrucciones:
                            </p>
                            <div className="bg-white/60 rounded-xl p-3 border border-food-100">
                              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                                {dish.instructions.map((instruction, idx) => (
                                  <li key={idx} className="leading-relaxed">{instruction}</li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Badge de caducidad */}
                      <div className={`px-4 py-3 rounded-xl ml-4 text-center flex-shrink-0 ${
                        dish.expired
                          ? 'bg-gray-200 text-gray-600'
                          : isExpiringSoon
                            ? 'bg-red-100 text-red-700'
                            : 'bg-fresh-100 text-fresh-700'
                      }`}>
                        {dish.expired ? (
                          <>
                            <div className="flex items-center gap-1 justify-center mb-1">
                              <XCircle size={14} />
                              <p className="text-xs font-bold">Caducado</p>
                            </div>
                            <p className="text-sm font-bold">
                              Hace {Math.abs(dish.daysRemaining)} días
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1 justify-center mb-1">
                              <Clock size={14} />
                              <p className="text-xs font-semibold">Caduca en</p>
                            </div>
                            <p className="text-3xl font-bold leading-none">{dish.daysRemaining}</p>
                            <p className="text-xs mt-1">días</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => toggleExpand(dish.id)}
                        className="flex-1 btn-food py-3 flex items-center justify-center gap-2 font-bold"
                      >
                        <BookOpen size={18} />
                        {isExpanded ? 'Ocultar receta' : 'Ver receta completa'}
                      </button>
                      <button
                        onClick={() => handleComplete(dish.id, dish.name)}
                        className="flex-1 btn-food py-3 flex items-center justify-center gap-2 font-bold"
                      >
                        <CheckCircle size={20} />
                        Marcar como Terminado
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

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

export default PendingDishes;
