// src/components/Main/MainMenu.js
import React from 'react';
import { LogOut } from 'lucide-react';

// Emojis de comida para los botones
const FOOD_ICONS = {
  register: '🥬',
  inventory: '📦',
  recipes: '🍳',
  stored: '🧊'
};

const MainMenu = ({ setCurrentView, onLogout }) => {
  return (
    <div className="min-h-screen bg-food-pattern p-6 relative overflow-hidden">
      {/* Elementos decorativos de comida */}
      <div className="absolute top-10 left-10 text-6xl opacity-10 animate-pulse">🥕</div>
      <div className="absolute top-20 right-20 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '0.5s' }}>🍅</div>
      <div className="absolute bottom-20 left-20 text-5xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}>🥦</div>
      <div className="absolute bottom-10 right-10 text-6xl opacity-10 animate-pulse" style={{ animationDelay: '1.5s' }}>🍊</div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header con botón de cerrar sesión */}
        <div className="flex justify-end mb-4">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 text-food-700 font-medium border-2 border-transparent hover:border-food-300"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">🥗</div>
          <h1 className="text-4xl font-bold text-food-800 mb-2 font-cooking">¡Bienvenido a Ready to Cook!</h1>
          <p className="text-food-600 text-lg">¿Qué quieres hacer hoy con tus alimentos?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => setCurrentView('register-ingredient')}
            className="card-food p-8 hover:scale-105 transition-all duration-300 group relative overflow-hidden">
            {/* Efecto de hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-food-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="bg-food-100 w-20 h-20 rounded-full flex items-center justify-center mb-4 group-hover:bg-food-200 transition-all duration-300 group-hover:scale-110 mx-auto relative">
              <span className="text-4xl">{FOOD_ICONS.register}</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Registrar Ingredientes</h3>
            <p className="text-gray-600 text-center">Añade nuevos alimentos a tu despensa</p>
            <div className="absolute -bottom-2 -right-2 text-2xl opacity-50">🥕</div>
          </button>

          <button
            onClick={() => setCurrentView('inventory')}
            className="card-food p-8 hover:scale-105 transition-all duration-300 group relative overflow-hidden">
            {/* Efecto de hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-fresh-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="bg-fresh-100 w-20 h-20 rounded-full flex items-center justify-center mb-4 group-hover:bg-fresh-200 transition-all duration-300 group-hover:scale-110 mx-auto relative">
              <span className="text-4xl">{FOOD_ICONS.inventory}</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Gestionar Inventario</h3>
            <p className="text-gray-600 text-center">Consulta y Organiza tus ingredientes</p>
            <div className="absolute -bottom-2 -right-2 text-2xl opacity-50">🥬</div>
          </button>

          <button
            onClick={() => setCurrentView('generate-recipe')}
            className="card-food p-8 hover:scale-105 transition-all duration-300 group relative overflow-hidden">
            {/* Efecto de hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-fresh-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="bg-fresh-100 w-20 h-20 rounded-full flex items-center justify-center mb-4 group-hover:bg-fresh-200 transition-all duration-300 group-hover:scale-110 mx-auto relative">
              <span className="text-4xl">{FOOD_ICONS.recipes}</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Generar Recetas con IA</h3>
            <p className="text-gray-500 text-center text-sm">Crea recetas con tus ingredientes</p>
            <div className="absolute -bottom-2 -right-2 text-2xl opacity-30">🍳</div>
          </button>

          {/* Botones deshabilitados - Próximamente */}
          <div className="card-food p-8 opacity-60 cursor-not-allowed relative overflow-hidden">
            <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mb-4 mx-auto">
              <span className="text-4xl">{FOOD_ICONS.stored}</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Platillos Almacenados</h3>
            <p className="text-gray-500 text-center text-sm">¡Próximamente!</p>
            <div className="absolute -bottom-2 -right-2 text-2xl opacity-30">🧊</div>
          </div>
        </div>

        {/* Mensaje motivacional */}
        <div className="mt-8 text-center">
          <p className="text-food-500 text-sm font-medium">
            🌱 «Cada alimento ahorrado es un paso hacia un mundo mejor»
          </p>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;