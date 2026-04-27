// src/components/Auth/Login.js
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';

// Lista de emojis de comida para el fondo
const FOOD_DECORATIONS = [
  '🥗', '🍳', '🥘', '🍲', '🥙', '🧆', '🌮', '🌯', '🍕', '🍔',
  '🍟', '🥪', '🥙', '🧀', '🥚', '🥓', '🥩', '🍗', '🍖', '🐟',
  '🦐', '🥬', '🥦', '🥕', '🌽', '🥒', '🍅', '🥔', '🧅', '🧄',
  '🍎', '🍌', '🍊', '🍋', '🍇', '🍓', '🫐', '🥝', '🍑', '🍐'
];

const Login = ({ setCurrentView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validaciones básicas
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      setLoading(false);
      return;
    }

    try {
      // Intentar iniciar sesión con Firebase
      await signInWithEmailAndPassword(auth, email, password);
      // Si tiene éxito, onAuthStateChanged en App.js lo detectará automáticamente
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      
      // Mensajes de error personalizados
      switch (error.code) {
        case 'auth/user-not-found':
          setError('No existe una cuenta con este correo');
          break;
        case 'auth/wrong-password':
          setError('Contraseña incorrecta');
          break;
        case 'auth/invalid-email':
          setError('Correo electrónico inválido');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos fallidos. Intenta más tarde');
          break;
        default:
          setError('Error al iniciar sesión. Verifica tus credenciales');
      }
    } finally {
      setLoading(false);
    }
  };

  // Generar posiciones aleatorias para los emojis
  const decorationElements = FOOD_DECORATIONS.slice(0, 15).map((emoji, index) => ({
    emoji,
    style: {
      top: `${Math.random() * 80 + 10}%`,
      left: `${Math.random() * 80 + 10}%`,
      animationDelay: `${Math.random() * 3}s`,
      fontSize: `${Math.random() * 1.5 + 1.5}rem`,
    }
  }));

  return (
    <div className="min-h-screen bg-food-pattern flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decoraciones de comida en el fondo */}
      {decorationElements.map((item, index) => (
        <div
          key={index}
          className="absolute opacity-10 animate-pulse"
          style={{ ...item.style }}
        >
          {item.emoji}
        </div>
      ))}

      <div className="card-food rounded-2xl p-8 w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce">🥗</div>
          <h1 className="text-3xl font-bold text-food-800 font-cooking">Ready to Cook</h1>
          <p className="text-food-600 mt-2">Gestiona tus alimentos, Evita el desperdicio 🥬</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-cream-800 mb-2">
              📧 Correo Electrónico
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-food" 
              placeholder="tucorreo@ejemplo.com"
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-cream-800 mb-2">
              🔐 Contraseña
            </label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-food" 
              placeholder="Ingresa tu contraseña"
              disabled={loading}
            />
          </div>
          
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </div>
          )}
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-food-500 to-food-600 text-white py-3 rounded-xl font-bold hover:from-food-600 hover:to-food-700 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Iniciando Sesión...
              </>
            ) : (
              <>
                🍳 Iniciar Sesión
              </>
            )}
          </button>
          
          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => setCurrentView('recovery')}
              className="text-food-600 hover:text-food-700 font-semibold transition hover:scale-105 inline-block"
            >
              ¿Olvidaste tu Contraseña? 🥺
            </button>
          </div>
          
          <div className="text-center text-sm text-cream-700">
            ¿No tienes Cuenta? - {' '}
            <button 
              type="button"
              onClick={() => setCurrentView('register')}
              className="text-food-600 font-bold hover:text-food-700 transition hover:scale-105 inline-block"
            >
              Regístrate 🍎
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;