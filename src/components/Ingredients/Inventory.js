// src/components/Ingredients/Inventory.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { isPriority, isExpired, formatDate } from '../../utils/dateCalculations';
import { searchFood } from '../../services/foodDatabase';
import Modal from '../../utils/Modal';

// Emojis de comida según tipo de estado
const STATUS_ICONS = {
  expired: '🥫',
  priority: '⚠️',
  normal: '✅'
};

// Función para obtener icono de comida según el ingrediente
const getFoodEmoji = (name) => {
  const nameLower = name.toLowerCase();
  
  const foodEmojis = {
    // Frutas
    'manzana': '🍎', 'platano': '🍌', 'naranja': '🍊', 'limón': '🍋', 'uva': '🍇',
    'fresa': '🍓', 'mango': '🥭', 'piña': '🍍', 'sandia': '🍉', 'melón': '🍈',
    'cereza': '🍒', 'durazno': '🍑', 'pera': '🍐', 'kiwi': '🥝', 'papaya': '🍈',
    
    // Verduras
    'lechuga': '🥬', 'espinaca': '🥬', 'col': '🥬', 'brócoli': '🥦', 'papa': '🥔',
    'cebolla': '🧅', 'ajo': '🧄', 'tomate': '🍅', 'pimiento': '🫑', 'zanahoria': '🥕',
    'apio': '🥬', 'pepino': '🥒', 'calabaza': '🎃', 'elote': '🌽', 'ejote': '🫛',
    'champiñón': '🍄', 'jitomate': '🍅', 'acelgas': '🥬', 'coliflor': '🥦',
    
    // Carnes
    'pollo': '🍗', 'res': '🥩', 'cerdo': '🥓', 'hamburguesa': '🍔', 'tocino': '🥓',
    'fish': '🐟', 'salmón': '🐟', 'atún': '🐟', 'camarón': '🦐', 'mariscos': '🦐',
    
    // Lácteos
    'leche': '🥛', 'queso': '🧀', 'mantequilla': '🧈', 'yogur': '🥛', 'crema': '🥛',
    
    // Panadería
    'pan': '🍞', 'torta': '🥪', 'bagel': '🥯', 'croissant': '🥐', 'galletas': '🍪',
    
    // Otros
    'huevo': '🥚', 'aceite': '🫗', 'vinagre': '🫗', 'sal': '🧂', 'pimienta': '🧂',
    'arroz': '🍚', 'pasta': '🍝', 'frijoles': '🫘', 'lentejas': '🫘', 'harina': '🌾',
    'azúcar': '🍬', 'miel': '🍯', 'café': '☕', 'té': '🍵', 'jugo': '🧃',
    'salsa': '🥫', 'mermelada': '🥫', 'consomé': '🥫', 'sopas': '🍲',
  };
  
  for (const [key, emoji] of Object.entries(foodEmojis)) {
    if (nameLower.includes(key)) return emoji;
  }
  
  return '🥗'; // Default emoji
};

const Inventory = ({ setCurrentView, userId }) => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Estados para modales
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: () => { }
  });

  useEffect(() => {
    loadIngredients();

    // Verificar cada 60 segundos la caducidad de los ingredientes
    const interval = setInterval(() => {
      loadIngredients();
    }, 60000);

    return () => clearInterval(interval);
  }, [userId]);

  const loadIngredients = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `users/${userId}/ingredients`));
      const ingredientsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Ordenar: Prioritarios (3 días o menos) primero, luego los normales, y los caducados al final
      const sorted = ingredientsData.sort((a, b) => {
        const aExpired = isExpired(a.expirationDate);
        const bExpired = isExpired(b.expirationDate);
        const aPriority = isPriority(a.expirationDate);
        const bPriority = isPriority(b.expirationDate);

        if (aExpired && !bExpired) return 1;
        if (!aExpired && bExpired) return -1;
        if (aPriority && !bPriority) return -1;
        if (!aPriority && bPriority) return 1;
        return 0;
      });

      setIngredients(sorted);
    } catch (error) {
      console.error('Error al cargar ingredientes:', error);
      showModal('error', 'Error', 'Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  };

  const showModal = (type, title, message, onConfirm = () => { }) => {
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

  const handleDelete = (id, name) => {
    showModal(
      'confirm',
      'Eliminar ingrediente',
      `¿Estás seguro de eliminar ${name}?`,
      async () => {
        try {
          await deleteDoc(doc(db, `users/${userId}/ingredients`, id));
          setIngredients(ingredients.filter(ing => ing.id !== id));
          showModal('success', '¡Eliminado!', 'Ingrediente eliminado exitosamente');
        } catch (error) {
          console.error('Error al eliminar:', error);
          showModal('error', 'Error', 'Error al eliminar el ingrediente');
        }
      }
    );
  };

  const startEdit = (ingredient) => {
    setEditingId(ingredient.id);
    setEditForm({
      quantity: ingredient.quantity.toFixed(2), // Formatear a 2 decimales
      unit: ingredient.unit,
      expirationDate: ingredient.expirationDate,
      purchaseDate: ingredient.purchaseDate,
      name: ingredient.name
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = (id) => {
    const newQuantity = parseFloat(editForm.quantity);

    // 🚨 VALIDACIÓN ANTES DEL MODAL
    if (!newQuantity || newQuantity < 0.5) {
      showModal(
        'error',
        'Cantidad inválida',
        'La cantidad debe ser mayor o igual a 0.5'
      );
      return;
    }

    // ✅ SI PASA VALIDACIÓN, ahora sí confirmar
    showModal(
      'confirm',
      'Guardar cambios',
      '¿Deseas guardar los cambios realizados?',
      async () => {
        try {
          const ingredientRef = doc(db, `users/${userId}/ingredients`, id);
          const isFractioned = newQuantity < 1;

          let newExpirationDate = editForm.expirationDate;

          if (editForm.unit === 'Piezas') {
            const food = searchFood(editForm.name);
            if (food) {
              const purchaseDate = new Date(editForm.purchaseDate);
              const expDate = new Date(purchaseDate);

              if (isFractioned) {
                // 🧩 Fraccionado
                expDate.setDate(expDate.getDate() + food.fraccionado);
              } else {
                // 📦 Entero (regresar a fecha normal)
                expDate.setDate(expDate.getDate() + food.completo);
              }

              newExpirationDate = expDate.toISOString();
            }
          }

          // Guardar con cantidad formateada a 2 decimales
          const formattedQuantity = parseFloat(newQuantity.toFixed(2));

          await updateDoc(ingredientRef, {
            quantity: formattedQuantity,
            unit: editForm.unit,
            expirationDate: newExpirationDate,
            isFractioned
          });

          setIngredients(ingredients.map(ing =>
            ing.id === id
              ? {
                ...ing,
                quantity: formattedQuantity,
                unit: editForm.unit,
                expirationDate: newExpirationDate,
                isFractioned
              }
              : ing
          ));

          setEditingId(null);
          setEditForm({});
          showModal('success', '¡Actualizado!', 'Ingrediente actualizado exitosamente');
        } catch (error) {
          console.error('Error al actualizar:', error);
          showModal('error', 'Error', 'Error al actualizar el ingrediente');
        }
      }
    );
  };

  // Función para formatear cantidad a 2 decimales
  const formatQuantity = (quantity) => {
    return parseFloat(quantity).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-food-pattern flex items-center justify-center relative overflow-hidden">
        {/* Decoraciones de comida */}
        <div className="absolute top-10 left-10 text-4xl opacity-20 animate-pulse">🥕</div>
        <div className="absolute top-20 right-20 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}>🍅</div>
        <div className="absolute bottom-20 left-20 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}>🥦</div>
        
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-food-200 border-t-food-500 mx-auto mb-4"></div>
          <p className="text-food-600 font-semibold">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-food-pattern p-6 relative overflow-hidden">
      {/* Decoraciones de comida en el fondo */}
      <div className="absolute top-10 left-10 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '0.5s' }}>🍅</div>
      <div className="absolute bottom-32 left-16 text-4xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}>🥦</div>
      <div className="absolute bottom-10 right-10 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '1.5s' }}>🍊</div>

      <div className="max-w-6xl mx-auto relative z-10">
        <button
          onClick={() => setCurrentView('menu')}
          className="mb-6 flex items-center gap-2 text-food-600 font-semibold hover:text-food-700 transition hover:scale-105"
        >
          <ArrowLeft size={20} />
          ← Volver al menú
        </button>

        <div className="card-food rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-4xl">📦</span>
            <h2 className="text-3xl font-bold text-gray-800 font-cooking">Mi Despensa</h2>
          </div>

          {ingredients.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-bounce">🥬</div>
              <p className="text-gray-600 mb-4 text-lg">No tienes ingredientes registrados</p>
              <button
                onClick={() => setCurrentView('register-ingredient')}
                className="btn-food"
              >
                🥗 Registrar primer ingrediente
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-cream-300">
                    <th className="text-left py-3 px-4 font-bold text-cream-800 text-sm uppercase tracking-wider">🍽️ Ingrediente</th>
                    <th className="text-left py-3 px-4 font-bold text-cream-800 text-sm uppercase tracking-wider">📊 Cantidad</th>
                    <th className="text-left py-3 px-4 font-bold text-cream-800 text-sm uppercase tracking-wider">🛒 Fecha de Compra</th>
                    <th className="text-left py-3 px-4 font-bold text-cream-800 text-sm uppercase tracking-wider">📅 Fecha de Caducidad</th>
                    <th className="text-left py-3 px-4 font-bold text-cream-800 text-sm uppercase tracking-wider">🏷️ Estado</th>
                    <th className="text-center py-3 px-4 font-bold text-cream-800 text-sm uppercase tracking-wider">⚙️ Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ingredient) => {
                    const isEditing = editingId === ingredient.id;
                    const expired = isExpired(ingredient.expirationDate);
                    const priority = !expired && isPriority(ingredient.expirationDate);

                    return (
                      <tr
                        key={ingredient.id}
                        className={`border-b border-cream-200 hover:bg-food-50 transition-all duration-200 ${expired ? 'bg-red-50' : priority ? 'bg-orange-50' : ''
                          }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl" title={ingredient.name}>
                              {getFoodEmoji(ingredient.name)}
                            </span>
                            <span className="text-gray-800 text-sm font-medium">
                              {ingredient.name}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0.5"
                                value={editForm.quantity}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    quantity: e.target.value
                                  })
                                }
                                onBlur={() => {
                                  const value = parseFloat(editForm.quantity);
                                  if (!isNaN(value)) {
                                    setEditForm({
                                      ...editForm,
                                      quantity: value.toFixed(2)
                                    });
                                  }
                                }}
                                className="w-20 px-2 py-1 border rounded text-sm"
                              />
                              <select
                                value={editForm.unit}
                                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                                className="px-2 py-1 border rounded text-sm"
                              >
                                <option>Piezas</option>
                                <option>Gramos</option>
                                <option>Kilogramos</option>
                                <option>Mililitros</option>
                                <option>Litros</option>
                              </select>
                            </div>
                          ) : (
                            `${formatQuantity(ingredient.quantity)} ${ingredient.unit}`
                          )}
                        </td>

                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {formatDate(ingredient.purchaseDate)}
                        </td>

                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editForm.expirationDate ? new Date(editForm.expirationDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => setEditForm({ ...editForm, expirationDate: e.target.value })}
                              className="px-2 py-1 border rounded text-sm"
                            />
                          ) : (
                            formatDate(ingredient.expirationDate)
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {expired ? (
                            <span className="badge-expired flex items-center gap-1 w-fit">
                              <span>{STATUS_ICONS.expired}</span>
                              Caducado
                            </span>
                          ) : priority ? (
                            <span className="badge-priority flex items-center gap-1 w-fit animate-pulse">
                              <span>{STATUS_ICONS.priority}</span>
                              Prioritario
                            </span>
                          ) : (
                            <span className="badge-fresh flex items-center gap-1 w-fit">
                              <span>{STATUS_ICONS.normal}</span>
                              Fresco
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => saveEdit(ingredient.id)}
                                className="text-green-600 hover:text-green-700 text-sm font-semibold"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-gray-600 hover:text-gray-700 text-sm font-semibold"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => startEdit(ingredient)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(ingredient.id, ingredient.name)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

export default Inventory;