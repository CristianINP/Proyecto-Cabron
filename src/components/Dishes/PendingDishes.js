// src/components/Dishes/PendingDishes.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getDaysRemaining, isExpired } from '../../utils/dateCalculations';
import { XCircle } from 'lucide-react';
import Modal from '../../utils/Modal';

const PendingDishes = ({ setCurrentView, userId }) => {
  const [dishes, setDishes] = useState([]);
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
    loadDishes();
  }, [userId]);

  const loadDishes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `users/${userId}/pendingDishes`));
      const dishesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Calcular días restantes actualizados
      const updatedDishes = dishesData.map(dish => {
        const daysRemaining = getDaysRemaining(dish.expirationDate);
        return {
          ...dish,
          daysRemaining: daysRemaining || 0,
          expired: isExpired(dish.expirationDate)
        };
      });
      
      // Ordenar: caducados al final
      const sorted = updatedDishes.sort((a, b) => {
        if (a.expired && !b.expired) return 1;
        if (!a.expired && b.expired) return -1;
        return 0;
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

  const handleComplete = (id, name) => {
    showModal(
      'confirm',
      'Marcar como terminado',
      `¿Deseas marcar "${name}" como terminado?`,
      async () => {
        try {
          // Solo eliminar el platillo de pendientes
          // NO actualizar inventario porque ya se descontó cuando se guardó como pendiente
          await deleteDoc(doc(db, `users/${userId}/pendingDishes`, id));
          setDishes(dishes.filter(dish => dish.id !== id));
          showModal('success', 'Platillo terminado', 'Puedes consultar esta receta en tu historial. 😋');
        } catch (error) {
          console.error('Error al eliminar:', error);
          showModal('error', 'Error', 'Error al marcar como terminado');
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
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => setCurrentView('menu')} 
          className="mb-6 text-emerald-600 font-semibold hover:underline"
        >
          ← Volver al menú
        </button>
        
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Platillos Almacenados</h2>
          
          {dishes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No tienes platillos almacenados</p>
              <button
                onClick={() => setCurrentView('generate-recipe')}
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-600 transition"
              >
                Generar una receta
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
                    className={`border-2 rounded-xl p-6 transition ${
                      dish.expired 
                        ? 'border-gray-300 bg-gray-50' 
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 
                          className="text-xl font-bold text-gray-800 mb-2 cursor-pointer hover:text-emerald-600"
                          onClick={() => toggleExpand(dish.id)}
                        >
                          {dish.name} {isExpanded ? '▼' : '▶'}
                        </h3>
                        
                        {/* Ingredientes expandidos */}
                        {isExpanded && dish.ingredients && (
                          <div className="mt-3 mb-3">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Ingredientes usados:</p>
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                              {dish.ingredients.map((ing, idx) => (
                                <div key={idx} className="flex items-center justify-between border-b border-gray-200 pb-2 last:border-0">
                                  <span className="text-sm text-gray-800 font-medium">{ing.name}</span>
                                  <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                                    {ing.quantity} {ing.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Instrucciones (si están disponibles) */}
                        {isExpanded && dish.instructions && dish.instructions.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Instrucciones:</p>
                            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                              {dish.instructions.map((instruction, idx) => (
                                <li key={idx}>{instruction}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                      
                      {/* Estado de caducidad */}
                      <div className={`px-4 py-2 rounded-lg ml-4 ${
                        dish.expired
                          ? 'bg-gray-200 text-gray-700'
                          : isExpiringSoon 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-green-100 text-green-700'
                      }`}>
                        {dish.expired ? (
                          <>
                            <div className="flex items-center gap-1 justify-center mb-1">
                              <XCircle size={16} />
                              <p className="text-xs font-semibold">Caducado</p>
                            </div>
                            <p className="text-sm font-bold text-center">
                              Hace {Math.abs(dish.daysRemaining)} días
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-semibold">Caduca en</p>
                            <p className="text-2xl font-bold">{dish.daysRemaining} días</p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleComplete(dish.id, dish.name)}
                      className="w-full bg-emerald-500 text-white py-2 rounded-lg font-semibold hover:bg-emerald-600 transition"
                    >
                      Marcar como Terminado
                    </button>
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

export default PendingDishes;