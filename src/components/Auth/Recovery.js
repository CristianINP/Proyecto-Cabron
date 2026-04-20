// src/components/Auth/Recovery.js
import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebase';

// Lista de emojis de comida para el fondo
const FOOD_DECORATIONS = [
  '🥗', '🍳', '🥘', '🍲', '🥙', '🧆', '🌮', '🌯', '🍕', '🍔',
  '🍟', '🥪', '🧀', '🥚', '🥓', '🥩', '🍗', '🍖', '🐟', '🦐',
  '🥬', '🥦', '🥕', '🌽', '🥒', '🍅', '🥔', '🧅', '🧄', '🍎',
  '🍌', '🍊', '🍋', '🍇', '🍓', '🥝', '🍑', '🍐', '🥜', '🫘'
];

const Recovery = ({ setCurrentView }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRecovery = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // Validar campo vacío
    if (!email) {
      setError('Por favor ingresa tu correo electrónico');
      setLoading(false);
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Formato de correo electrónico inválido');
      setLoading(false);
      return;
    }

    try {
      // Enviar email de recuperación
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
      setEmail(''); // Limpiar el campo
    } catch (error) {
      console.error('Error al enviar email:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          setError('No existe una cuenta con este correo electrónico');
          break;
        case 'auth/invalid-email':
          setError('Correo electrónico inválido');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos. Intenta más tarde');
          break;
        default:
          setError('Error al enviar el correo. Intenta nuevamente');
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
        
        {!success ? (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-3 animate-bounce">🔐</div>
              <h2 className="text-2xl font-bold text-food-800 font-cooking mb-2">Recuperar Contraseña</h2>
              <p className="text-sm text-food-600">
                Te enviaremos un enlace para restablecer tu contraseña 🥬
              </p>
            </div>
            
            <form onSubmit={handleRecovery} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-cream-800 mb-2">
                  📧 Correo electrónico
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
                    Enviando...
                  </>
                ) : (
                  <>
                    📧 Enviar enlace de recuperación
                  </>
                )}
              </button>
              
              <button 
                type="button"
                onClick={() => setCurrentView('login')}
                className="w-full text-food-600 py-2 font-bold hover:text-food-700 transition hover:scale-105"
                disabled={loading}
              >
                ← Volver al inicio de sesión
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Pantalla de éxito - MEJORADA */}
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">✅</div>
              
              <h2 className="text-2xl font-bold text-food-800 mb-3 font-cooking">
                ¡Correo enviado! 📧
              </h2>
              
              <p className="text-food-600 mb-4">
                Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
              </p>

              {/* NUEVA SECCIÓN: Aviso de spam */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-2 text-left">
                  <span className="text-2xl">📬</span>
                  <div>
                    <p className="text-sm font-bold text-amber-800 mb-1">
                      ¿No ves el correo?
                    </p>
                    <p className="text-sm text-amber-700 leading-relaxed">
                      Verifique su carpeta de <strong>spam</strong> o <strong>correo no deseado</strong> 📮
                    </p>
                  </div>
                </div>
              </div>

              {/* Nota informativa */}
              <div className="bg-food-50 border-2 border-food-200 rounded-xl p-3 mb-6">
                <p className="text-sm text-food-800">
                  <strong>💡 Nota:</strong> El correo de recuperación se enviará siempre y cuando la dirección de correo electrónico se encuentre registrada en nuestro sistema.
                </p>
              </div>
              
              <button 
                onClick={() => setCurrentView('login')}
                className="w-full bg-gradient-to-r from-food-500 to-food-600 text-white py-3 rounded-xl font-bold hover:from-food-600 hover:to-food-700 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Recovery;