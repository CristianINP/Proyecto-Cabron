// src/App.js
import React, { useState, useEffect, useRef } from 'react';
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

  // Ref para bloquear la redirección automática durante el registro
  const registrationInProgress = useRef(false);

  // Ref para bloquear la redirección automática durante el login
  const loginInProgress = useRef(false);

  // Estados para pasar datos entre componentes de recetas
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [generatedRecipes, setGeneratedRecipes] = useState([]);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);

  // Verificar si hay un usuario autenticado al cargar la app
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Si hay usuario, ir al menú principal (a menos que el registro o login estén en progreso)
      if (currentUser && !registrationInProgress.current && !loginInProgress.current) {
        setCurrentView('menu');
      } else if (!currentUser) {
        setCurrentView('login');
      }
      // Si currentUser existe pero hay una acción en progreso, no hacer nada — el callback del modal navegará
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await auth.signOut();
      loginInProgress.current = false;
      registrationInProgress.current = false;
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
      <div className="min-h-screen bg-food-pattern flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-10 left-10 text-4xl opacity-20 animate-pulse">🥕</div>
        <div className="absolute top-20 right-20 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}>🍅</div>
        <div className="absolute bottom-20 left-20 text-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}>🥦</div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-food-200 border-t-food-500 mx-auto mb-4"></div>
          <p className="text-food-600 font-semibold">Cargando...</p>
        </div>
      </div>
    );
  }

  // Función para renderizar el componente según la vista actual
  const renderView = () => {
    switch (currentView) {
      case 'login':
        return <Login setCurrentView={setCurrentView} onLoginComplete={() => { loginInProgress.current = true; }} onLoginReset={() => { loginInProgress.current = false; }} />;

      case 'register':
        return <Register setCurrentView={setCurrentView} onRegistrationComplete={() => { registrationInProgress.current = true; }} onRegistrationReset={() => { registrationInProgress.current = false; }} />;

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