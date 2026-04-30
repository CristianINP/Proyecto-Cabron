// src/App.js
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';

// Importar componentes
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Recovery from './components/Auth/Recovery';
import Inventory from './components/Ingredients/Inventory';
import MainMenu from './components/Main/MainMenu';
import RegisterIngredient from './components/Ingredients/RegisterIngredient';
import GenerateRecipe from './components/Recipes/GenerateRecipe';
import RecipeResults from './components/Recipes/RecipeResults';
import RecipeDetail from './components/Recipes/RecipeDetail';
import PendingDishes from './components/Dishes/PendingDishes';

function App() {
  // Estado para controlar la vista actual
  const [currentView, setCurrentView] = useState('login');

  // Estado para el usuario autenticado
  const [user, setUser] = useState(null);

  // Estado de carga
  const [loading, setLoading] = useState(true);

  // Estados para pasar datos entre componentes de recetas
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [generatedRecipes, setGeneratedRecipes] = useState([]);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);

  // Verificar si hay un usuario autenticado al cargar la app
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Si hay usuario, ir al menú principal
      if (currentUser) {
        setCurrentView('menu');
      } else {
        setCurrentView('login');
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await auth.signOut();
      setCurrentView('login');
      setUser(null);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('Error al cerrar sesión');
    }
  };

  // Mostrar pantalla de carga
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

  // Función para renderizar el componente según la vista actual
  const renderView = () => {
    switch (currentView) {
      case 'login':
        return <Login setCurrentView={setCurrentView} />;

      case 'register':
        return <Register setCurrentView={setCurrentView} />;

      case 'recovery':
        return <Recovery setCurrentView={setCurrentView} />;

      case 'menu':
        return <MainMenu setCurrentView={setCurrentView} onLogout={handleLogout} />;

      case 'register-ingredient':
        return <RegisterIngredient setCurrentView={setCurrentView} userId={user?.uid} />;

      case 'inventory':
        return <Inventory setCurrentView={setCurrentView} userId={user?.uid} />;

      case 'generate-recipe':
        return (
          <GenerateRecipe
            setCurrentView={setCurrentView}
            userId={user?.uid}
            setGeneratedRecipes={setGeneratedRecipes}
            setCurrentRecipeIndex={setCurrentRecipeIndex}
          />
        );

      case 'recipe-results':
        return (
          <RecipeResults
            setCurrentView={setCurrentView}
            recipes={generatedRecipes}
            currentIndex={currentRecipeIndex}
            setCurrentIndex={setCurrentRecipeIndex}
            setSelectedRecipe={setSelectedRecipe}
            setGeneratedRecipes={setGeneratedRecipes}
          />
        );

      case 'recipe-detail':
        return (
          <RecipeDetail
            setCurrentView={setCurrentView}
            recipe={selectedRecipe}
            userId={user?.uid}
          />
        );
        
      case 'pending-dishes':
        return (
          <PendingDishes
            setCurrentView={setCurrentView}
            userId={user?.uid}
          />
        );

      default:
        return <Login setCurrentView={setCurrentView} />;
    }
  };

  return (
    <div className="App">
      {renderView()}
    </div>
  );
}

export default App;