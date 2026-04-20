// src/components/Ingredients/RegisterIngredient.js
import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  getFoodSuggestionsComplete,
  calculateExpirationDateComplete,
  addToPersonalFoodDatabase
} from '../../services/foodDatabase';
import { toISODateString, getTodayISO } from '../../utils/dateCalculations';

// 🔹 Normaliza fecha para evitar desfase por UTC (fija hora a 12:00 PM)
const normalizeDateForFirestore = (isoDate) => {
  const [year, month, day] = isoDate.split('-');
  return new Date(year, month - 1, day, 12).toISOString();
};

const RegisterIngredient = ({ setCurrentView, userId }) => {
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'Piezas',
    purchaseDate: getTodayISO(),
    expirationDate: ''
  });

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualExpiration, setManualExpiration] = useState(false);

  const handleNameChange = async (e) => {
    const value = e.target.value;
    setFormData({ ...formData, name: value });

    if (value.length >= 2) {
      const foodSuggestions = await getFoodSuggestionsComplete(value, userId);
      setSuggestions(foodSuggestions);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // ✅ CORREGIDO: Ahora sí autocompleta
  const selectSuggestion = (suggestion) => {
    setFormData({ ...formData, name: suggestion });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.quantity || !formData.purchaseDate) {
      setError('Por favor completa todos los campos obligatorios');
      return;
    }

    if (parseFloat(formData.quantity) <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    setLoading(true);

    try {
      // 🔹 Fecha de compra normalizada
      const normalizedPurchaseDate = normalizeDateForFirestore(formData.purchaseDate);

      let finalExpirationDate = formData.expirationDate;

      // 🔹 Calculo automático de caducidad
      let foodAddedToPersonalDB = false;

      // 🆕 Cálculo automático usando BD completa (global + personal)
      if (!manualExpiration || !formData.expirationDate) {
        const calculatedDate = await calculateExpirationDateComplete(
          formData.purchaseDate,
          formData.name,
          parseFloat(formData.quantity),
          userId
        );

        if (calculatedDate) {
          finalExpirationDate = toISODateString(calculatedDate);
        } else {
          setError('No se pudo calcular la fecha de caducidad. Por favor ingrésala manualmente.');
          setManualExpiration(true);
          setLoading(false);
          return;
        }
      } else {
        const purchaseDate = new Date(formData.purchaseDate);
        const expirationDate = new Date(formData.expirationDate);
        const diffTime = Math.abs(expirationDate - purchaseDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        foodAddedToPersonalDB = await addToPersonalFoodDatabase(
          formData.name,
          diffDays,
          userId
        );
      }

      // 🔹 Fecha de caducidad normalizada
      const normalizedExpirationDate = normalizeDateForFirestore(finalExpirationDate);

      let finalQuantity = parseFloat(formData.quantity);

      // Limitar a máximo 2 decimales antes de guardar
      finalQuantity = parseFloat(finalQuantity.toFixed(2));

      const ingredientData = {
        name: formData.name,
        quantity: finalQuantity,
        unit: formData.unit,
        purchaseDate: normalizedPurchaseDate,
        expirationDate: normalizedExpirationDate,
        isFractioned: parseFloat(formData.quantity) < 1,
        createdAt: new Date().toISOString(),
        userId: userId
      };

      await addDoc(collection(db, `users/${userId}/ingredients`), ingredientData);

      let successMessage = '¡Ingrediente registrado exitosamente!';
      if (foodAddedToPersonalDB) {
        successMessage += ' (Alimento agregado a tu base de datos personal)';
      }
      setSuccess(successMessage);

      // Limpiar formulario
      setFormData({
        name: '',
        quantity: '',
        unit: 'Piezas',
        purchaseDate: getTodayISO(),
        expirationDate: ''
      });
      setManualExpiration(false);

      // Ocultar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccess('');
      }, 3000);

    } catch (error) {
      console.error('Error al registrar ingrediente:', error);
      setError('Error al registrar el ingrediente. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-food-pattern p-6 relative overflow-hidden">
      {/* Decoraciones de comida en el fondo */}
      <div className="absolute top-10 left-10 text-5xl opacity-10 animate-pulse">🥕</div>
      <div className="absolute top-32 right-16 text-4xl opacity-10 animate-pulse" style={{ animationDelay: '0.5s' }}>🍅</div>
      <div className="absolute bottom-32 left-16 text-4xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}>🥦</div>
      <div className="absolute bottom-10 right-10 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '1.5s' }}>🍊</div>

      <div className="max-w-2xl mx-auto relative z-10">
        <button
          onClick={() => setCurrentView('menu')}
          className="mb-6 flex items-center gap-2 text-food-600 font-semibold hover:text-food-700 transition hover:scale-105"
        >
          ← Volver al menú
        </button>

        <div className="card-food rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-4xl animate-bounce">🥬</span>
            <h2 className="text-3xl font-bold text-gray-800 font-cooking">Registrar Ingrediente</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre del ingrediente con autocompletado */}
            <div className="relative">
              <label className="block text-sm font-bold text-cream-800 mb-2">
                🍽️ Nombre del ingrediente *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                onFocus={() => {
                  if (formData.name.length >= 2 && suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                className="input-food"
                placeholder="Ej: manzana, leche, queso..."
                disabled={loading}
              />

              {/* Sugerencias - CORREGIDO */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border-2 border-food-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  <p className="text-xs text-food-600 px-3 py-2 bg-food-50 border-b sticky top-0 font-semibold">
                    🔍 Sugerencias:
                  </p>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Evita que se pierda el foco
                        selectSuggestion(suggestion);
                      }}
                      className="w-full text-left text-sm text-gray-700 hover:bg-food-50 px-3 py-2 cursor-pointer transition flex items-center gap-2"
                    >
                      <span>🥗</span>
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cantidad y Unidad */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-cream-800 mb-2">
                  📊 Cantidad *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="input-food"
                  placeholder="1"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-cream-800 mb-2">
                  ⚖️ Unidad *
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="input-food"
                  disabled={loading}
                >
                  <option>Piezas</option>
                  <option>Gramos</option>
                  <option>Kilogramos</option>
                  <option>Mililitros</option>
                  <option>Litros</option>
                </select>
              </div>
            </div>

            {/* Fecha de compra */}
            <div>
              <label className="block text-sm font-bold text-cream-800 mb-2">
                🛒 Fecha de compra *
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                max={getTodayISO()}
                className="input-food"
                disabled={loading}
              />
            </div>

            {/* Fecha de caducidad opcional */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-cream-800">
                  📅 Fecha de caducidad (opcional)
                </label>
                <button
                  type="button"
                  onClick={() => setManualExpiration(!manualExpiration)}
                  className="text-xs text-food-600 hover:text-food-700 font-semibold transition hover:scale-105"
                >
                  {manualExpiration ? '⚡ Calcular automáticamente' : '✏️ Ingresar manualmente'}
                </button>
              </div>

              {manualExpiration && (
                <input
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                  min={formData.purchaseDate}
                  className="input-food"
                  disabled={loading}
                />
              )}

              <p className="text-xs text-cream-600 mt-2 flex items-center gap-1">
                💡 {manualExpiration
                  ? 'Ingresa la fecha de caducidad manualmente'
                  : 'Si no la ingresas, el sistema la calculará automáticamente'
                }
              </p>
            </div>

            {/* Mensajes de error y éxito */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </div>
            )}

            {success && (
              <div className="bg-fresh-50 border-2 border-fresh-200 text-fresh-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <span>✅</span>
                {success}
              </div>
            )}

            {/* Botón de submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-food-500 to-food-600 text-white py-4 rounded-xl font-bold text-lg hover:from-food-600 hover:to-food-700 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Registrando...
                </>
              ) : (
                <>
                  🥗 Registrar Ingrediente
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterIngredient;