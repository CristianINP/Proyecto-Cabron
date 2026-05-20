// src/App.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import History from './components/Dishes/History';

const VIEW_PATHS = {
  'login':               '/',
  'register':            '/registro',
  'recovery':            '/recuperar-cuenta',
  'menu':                '/menu',
  'inventory':           '/inventario',
  'register-ingredient': '/registrar-ingrediente',
  'generate-recipe':     '/generar-receta-con-ia',
  'recipe-results':      '/resultados',
  'recipe-detail':       '/detalle-receta',
  'pending-dishes':      '/platillos-pendientes',
  'history':             '/historial',
};

const PATH_TO_VIEW = Object.fromEntries(
  Object.entries(VIEW_PATHS).map(([view, path]) => [path, view])
);

const PUBLIC_VIEWS = new Set(['login', 'register', 'recovery']);

function getViewFromPath(pathname) {
  return PATH_TO_VIEW[pathname] ?? 'login';
}

function App() {
  const [currentView, setCurrentViewRaw] = useState(() =>
    getViewFromPath(window.location.pathname)
  );

  // Navega a una vista y sincroniza la URL del navegador
  const setCurrentView = useCallback((view) => {
    const path = VIEW_PATHS[view] ?? '/';
    window.history.pushState({ view }, '', path);
    setCurrentViewRaw(view);
  }, []);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const registrationInProgress = useRef(false);
  const loginInProgress = useRef(false);
  const isInitialLoad = useRef(true);

  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [generatedRecipes, setGeneratedRecipes] = useState([]);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);

  // Sincronizar vista con los botones Atrás/Adelante del navegador
  useEffect(() => {
    const handlePopState = () => {
      setCurrentViewRaw(getViewFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Verificar si hay un usuario autenticado al cargar la app
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser && isInitialLoad.current && !registrationInProgress.current && !loginInProgress.current) {
        // Restaurar a la vista que tenía la URL, salvo que sea una vista pública
        const urlView = getViewFromPath(window.location.pathname);
        const targetView = PUBLIC_VIEWS.has(urlView) ? 'menu' : urlView;
        setCurrentView(targetView);
      } else if (!currentUser) {
        setCurrentView('login');
      }
      isInitialLoad.current = false;
    });

    return () => unsubscribe();
  }, [setCurrentView]);

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

  const renderView = () => {
    switch (currentView) {
      case 'login':
        return (
          <Login
            setCurrentView={setCurrentView}
            onLoginComplete={() => { loginInProgress.current = true; }}
            onLoginReset={() => { loginInProgress.current = false; }}
          />
        );

      case 'register':
        return (
          <Register
            setCurrentView={setCurrentView}
            onRegistrationComplete={() => { registrationInProgress.current = true; }}
            onRegistrationReset={() => { registrationInProgress.current = false; }}
          />
        );

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

      case 'history':
        return (
          <History
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
