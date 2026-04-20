// src/components/Auth/Register.js
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

// Lista de emojis de comida para el fondo
const FOOD_DECORATIONS = [
  '🥗', '🍳', '🥘', '🍲', '🥙', '🧆', '🌮', '🌯', '🍕', '🍔',
  '🍟', '🥪', '🧀', '🥚', '🥓', '🥩', '🍗', '🍖', '🐟', '🦐',
  '🥬', '🥦', '🥕', '🌽', '🥒', '🍅', '🥔', '🧅', '🧄', '🍎',
  '🍌', '🍊', '🍋', '🍇', '🍓', '🥝', '🍑', '🍐', '🥜', '🫘'
];

const Register = ({ setCurrentView }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthdate: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    // Validar campos vacíos
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword || !formData.birthdate) {
      setError('Por favor completa todos los campos');
      return false;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Formato de correo electrónico inválido');
      return false;
    }

    // Validar contraseña (mínimo 8 caracteres, 1 mayúscula, 1 número)
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número');
      return false;
    }

    // Validar que las contraseñas coincidan
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }

    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      const user = userCredential.user;

      // Actualizar el perfil del usuario con el nombre
      await updateProfile(user, {
        displayName: formData.username
      });

      // Crear documento del usuario en Firestore
      await setDoc(doc(db, 'users', user.uid), {
        username: formData.username,
        email: formData.email,
        birthdate: formData.birthdate,
        createdAt: new Date().toISOString()
      });

      // Si todo sale bien, Firebase Auth redirigirá automáticamente al menú
      alert('¡Cuenta creada exitosamente! 🎉');
    } catch (error) {
      console.error('Error al registrar:', error);
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('Ya existe una cuenta con este correo electrónico');
          break;
        case 'auth/weak-password':
          setError('La contraseña es muy débil');
          break;
        case 'auth/invalid-email':
          setError('Correo electrónico inválido');
          break;
        default:
          setError('Error al crear la cuenta. Intenta nuevamente');
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
        <div className="text-center mb-6">
          <div className="text-5xl mb-3 animate-bounce">🍳</div>
          <h2 className="text-2xl font-bold text-food-800 font-cooking">Crear Cuenta</h2>
          <p className="text-food-600 text-sm">¡Únete a la causa contra el desperdicio de alimentos! 🥬</p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-cream-800 mb-2">
              👤 Nombre de usuario
            </label>
            <input 
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input-food"
              placeholder="Tu nombre"
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-cream-800 mb-2">
              📧 Correo electrónico
            </label>
            <input 
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
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
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-food"
              placeholder="Mínimo 8 caracteres"
              disabled={loading}
            />
            <p className="text-xs text-cream-600 mt-1">
              💡 Mínimo 8 caracteres, una mayúscula y un número
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-cream-800 mb-2">
              🔐 Confirmar contraseña
            </label>
            <input 
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input-food"
              placeholder="Repite tu contraseña"
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-cream-800 mb-2">
              🎂 Fecha de nacimiento
            </label>
            <input 
              type="date"
              name="birthdate"
              value={formData.birthdate}
              onChange={handleChange}
              className="input-food"
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
                Creando cuenta...
              </>
            ) : (
              <>
                🍎 Registrarse
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
      </div>
    </div>
  );
};

export default Register;