import React, { useState, useEffect } from 'react';
import { Play, Lock, Plus, Trash2, ArrowLeft, AlertCircle, User, Shield, Video, CheckSquare, Square, LogOut, KeyRound } from 'lucide-react';
import SafeYouTubePlayer from './SafeYouTubePlayer';

const AVATAR_OPTIONS = [
  { emoji: '🦖', color: 'bg-green-500' },
  { emoji: '🦄', color: 'bg-pink-500' },
  { emoji: '🚀', color: 'bg-blue-500' },
  { emoji: '🐱', color: 'bg-yellow-500' },
  { emoji: '🐼', color: 'bg-teal-500' },
  { emoji: '🚗', color: 'bg-red-500' },
];

const STORAGE_KEY = 'pequetube_data';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore parse errors */ }
  return null;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const extraerIdYouTube = (urlStr) => {
  try {
    // Usamos la API de URL moderna para limpiar parámetros como &list=
    const url = new URL(urlStr);
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;
    }
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.slice(1);
    }
  } catch {
    // Fallback silencioso
  }
  
  // Expresión regular como plan B
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = urlStr.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function App() {
  // Cargar datos persistentes al inicio (síncrono)
  const savedData = loadData();
  
  const [initialized, setInitialized] = useState(!!savedData);
  const [adminPin, setAdminPin] = useState(savedData?.adminPin || '');
  const [users, setUsers] = useState(savedData?.users || []);
  const [videos, setVideos] = useState(savedData?.videos || []);
  
  // Flujo de primera vez: crear PIN de adultos
  const [setupStep, setSetupStep] = useState(savedData ? null : 'create-pin');
  const [setupPin, setSetupPin] = useState('');
  const [setupPinConfirm, setSetupPinConfirm] = useState('');
  const [setupError, setSetupError] = useState('');

  // Estado de navegación
  const [currentUser, setCurrentUser] = useState(null);
  const [videoActual, setVideoActual] = useState(null);
  
  // Estado del Modal de PIN (adultos)
  const [mostrarPin, setMostrarPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [errorPin, setErrorPin] = useState(false);

  // Estado del Modal de PIN (niños)
  const [childPinModal, setChildPinModal] = useState(null); // user object
  const [childPinInput, setChildPinInput] = useState('');
  const [errorChildPin, setErrorChildPin] = useState(false);

  // Estados para formularios en Panel de Adultos
  const [nuevoNombreUsuario, setNuevoNombreUsuario] = useState('');
  const [nuevoEmojiUsuario, setNuevoEmojiUsuario] = useState(AVATAR_OPTIONS[0]);
  const [nuevoPinUsuario, setNuevoPinUsuario] = useState('');
  
  const [nuevaUrl, setNuevaUrl] = useState('');
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState([]);
  const [errorAñadirVideo, setErrorAñadirVideo] = useState('');

  // Modal editar PIN
  const [editPinUser, setEditPinUser] = useState(null); // 'admin' o user object
  const [editPinValue, setEditPinValue] = useState('');
  const [editPinConfirm, setEditPinConfirm] = useState('');
  const [editPinError, setEditPinError] = useState('');
  const [showEditPin, setShowEditPin] = useState(false);

  // Guardar en localStorage cada vez que cambian los datos
  useEffect(() => {
    if (!initialized || setupStep) return;
    saveData({ adminPin, users, videos });
  }, [adminPin, users, videos, initialized, setupStep]);

  // --- Funciones de Navegación e Ingreso ---
  const handleVerificarPin = (e) => {
    e.preventDefault();
    if (pinInput === adminPin) {
      setCurrentUser('adult');
      setMostrarPin(false);
      setPinInput('');
      setErrorPin(false);
    } else {
      setErrorPin(true);
      setPinInput('');
    }
  };

  const handleChildLogin = (user) => {
    if (user.pin) {
      // Tiene PIN, pedir contraseña
      setChildPinModal(user);
      setChildPinInput('');
      setErrorChildPin(false);
    } else {
      // Sin PIN, acceso directo
      setCurrentUser(user);
    }
  };

  const handleVerificarChildPin = (e) => {
    e.preventDefault();
    if (childPinInput === childPinModal.pin) {
      setCurrentUser(childPinModal);
      setChildPinModal(null);
      setChildPinInput('');
      setErrorChildPin(false);
    } else {
      setErrorChildPin(true);
      setChildPinInput('');
    }
  };

  const handleSetupPin = (e) => {
    e.preventDefault();
    setSetupError('');
    if (setupPin.length < 4) {
      setSetupError('El PIN debe tener al menos 4 caracteres.');
      return;
    }
    if (setupPin !== setupPinConfirm) {
      setSetupError('Los PIN no coinciden.');
      return;
    }
    setAdminPin(setupPin);
    setSetupStep(null);
    setInitialized(true);
    setSetupPin('');
    setSetupPinConfirm('');
    saveData({ adminPin: setupPin, users: [], videos: [] });
  };

  const handleEditPin = (e) => {
    e.preventDefault();
    setEditPinError('');
    if (editPinValue && editPinValue.length < 4) {
      setEditPinError('El PIN debe tener al menos 4 caracteres.');
      return;
    }
    if (editPinValue && editPinValue !== editPinConfirm) {
      setEditPinError('Los PIN no coinciden.');
      return;
    }
    if (editPinUser === 'admin') {
      if (!editPinValue) {
        setEditPinError('El PIN de adultos es obligatorio.');
        return;
      }
      setAdminPin(editPinValue);
    } else {
      // Actualizar PIN del niño (vacío = sin PIN)
      setUsers(users.map(u => u.id === editPinUser.id ? { ...u, pin: editPinValue || '' } : u));
    }
    setShowEditPin(false);
    setEditPinUser(null);
    setEditPinValue('');
    setEditPinConfirm('');
  };

  const cerrarSesion = () => {
    setCurrentUser(null);
    setVideoActual(null);
  };

  // --- Funciones de Gestión (Adultos) ---
  const handleAñadirUsuario = (e) => {
    e.preventDefault();
    if (!nuevoNombreUsuario.trim()) return;
    
    const newUser = {
      id: Date.now().toString(),
      name: nuevoNombreUsuario,
      emoji: nuevoEmojiUsuario.emoji,
      color: nuevoEmojiUsuario.color,
      pin: nuevoPinUsuario || ''
    };
    
    setUsers([...users, newUser]);
    setNuevoNombreUsuario('');
    setNuevoPinUsuario('');
  };

  const handleEliminarUsuario = (userId) => {
    setUsers(users.filter(u => u.id !== userId));
    // Quitar a este usuario de los videos permitidos
    setVideos(videos.map(v => ({
      ...v,
      allowedUsers: v.allowedUsers.filter(id => id !== userId)
    })));
  };

  const toggleUsuarioParaVideo = (userId) => {
    if (usuariosSeleccionados.includes(userId)) {
      setUsuariosSeleccionados(usuariosSeleccionados.filter(id => id !== userId));
    } else {
      setUsuariosSeleccionados([...usuariosSeleccionados, userId]);
    }
  };

  const handleAñadirVideo = (e) => {
    e.preventDefault();
    setErrorAñadirVideo('');

    if (!nuevaUrl || !nuevoTitulo) {
      setErrorAñadirVideo('Rellena la URL y el Título.');
      return;
    }
    if (usuariosSeleccionados.length === 0) {
      setErrorAñadirVideo('Selecciona al menos un niño que pueda ver el video.');
      return;
    }

    const id = extraerIdYouTube(nuevaUrl);
    if (!id) {
      setErrorAñadirVideo('URL de YouTube no válida.');
      return;
    }
    if (videos.some(v => v.id === id)) {
      setErrorAñadirVideo('Este video ya está en la biblioteca.');
      return;
    }

    const nuevoVideo = {
      id,
      title: nuevoTitulo,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      allowedUsers: usuariosSeleccionados
    };

    setVideos([...videos, nuevoVideo]);
    setNuevaUrl('');
    setNuevoTitulo('');
    setUsuariosSeleccionados([]);
  };

  const handleEliminarVideo = (videoId) => {
    setVideos(videos.filter(v => v.id !== videoId));
  };


  // --- COMPONENTE: PANTALLA DE CONFIGURACIÓN INICIAL ---
  if (setupStep === 'create-pin') {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-gray-800 mb-2 tracking-tight">
            Peque<span className="text-red-500">Tube</span>
          </h1>
          <p className="text-xl text-gray-600 font-medium">¡Bienvenido! Configura tu PIN de adulto</p>
        </div>

        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          <h2 className="text-xl font-bold mb-2 flex items-center justify-center gap-2 text-gray-800">
            <KeyRound className="text-blue-600" /> Crear PIN de Adultos
          </h2>
          <p className="text-gray-500 mb-6 text-center text-sm">Este PIN protege el panel de control</p>
          
          <form onSubmit={handleSetupPin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN (mínimo 4 caracteres)</label>
              <input
                type="password"
                placeholder="••••"
                className="w-full text-center text-2xl tracking-[0.3em] p-3 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 outline-none transition-colors"
                value={setupPin}
                onChange={(e) => setSetupPin(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar PIN</label>
              <input
                type="password"
                placeholder="••••"
                className="w-full text-center text-2xl tracking-[0.3em] p-3 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 outline-none transition-colors"
                value={setupPinConfirm}
                onChange={(e) => setSetupPinConfirm(e.target.value)}
              />
            </div>
            {setupError && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                <p>{setupError}</p>
              </div>
            )}
            <button 
              type="submit"
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Guardar y empezar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- COMPONENTE: PANTALLA DE INICIO ---
  if (currentUser === null) {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-gray-800 mb-2 tracking-tight">
            Peque<span className="text-red-500">Tube</span>
          </h1>
          <p className="text-xl text-gray-600 font-medium">¿Quién está viendo hoy?</p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 max-w-4xl">
          {/* Tarjetas de Niños */}
          {users.map(user => (
            <div 
              key={user.id} 
              onClick={() => handleChildLogin(user)}
              className="flex flex-col items-center cursor-pointer group transform transition-transform hover:scale-110"
            >
              <div className={`w-32 h-32 rounded-full ${user.color} flex items-center justify-center text-6xl shadow-lg border-4 border-white mb-4 group-hover:shadow-xl relative`}>
                {user.emoji}
                {user.pin && (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow">
                    <Lock size={14} className="text-gray-500" />
                  </div>
                )}
              </div>
              <span className="text-2xl font-bold text-gray-700">{user.name}</span>
            </div>
          ))}

          {/* Botón de Adultos */}
          <div 
            onClick={() => setMostrarPin(true)}
            className="flex flex-col items-center cursor-pointer group transform transition-transform hover:scale-110 ml-8"
          >
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center shadow-inner border-4 border-white mb-4">
              <Shield size={48} className="text-gray-500 group-hover:text-gray-700" />
            </div>
            <span className="text-2xl font-bold text-gray-500">Padres</span>
          </div>
        </div>

        {/* Modal PIN */}
        {mostrarPin && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl transform transition-all">
              <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2 text-gray-800">
                <Shield className="text-blue-600" /> Zona de Adultos
              </h2>
              <p className="text-gray-500 mb-8 text-center text-sm">Introduce el PIN de adultos</p>
              
              <form onSubmit={handleVerificarPin}>
                <input
                  type="password"
                  placeholder="****"
                  className={`w-full text-center text-4xl tracking-[0.5em] p-4 rounded-2xl mb-6 bg-gray-50 border-2 outline-none transition-colors ${errorPin ? 'border-red-500 text-red-600' : 'border-gray-200 focus:border-blue-500'}`}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  autoFocus
                />
                {errorPin && <p className="text-red-500 text-sm mb-4 text-center font-medium">PIN incorrecto.</p>}
                
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => { setMostrarPin(false); setErrorPin(false); setPinInput(''); }}
                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                  >
                    Volver
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                  >
                    Entrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal PIN de Niño */}
        {childPinModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl transform transition-all">
              <div className="flex flex-col items-center mb-4">
                <div className={`w-20 h-20 rounded-full ${childPinModal.color} flex items-center justify-center text-4xl shadow-lg mb-3`}>
                  {childPinModal.emoji}
                </div>
                <h2 className="text-xl font-bold text-gray-800">{childPinModal.name}</h2>
                <p className="text-gray-500 text-sm">Introduce tu contraseña</p>
              </div>
              
              <form onSubmit={handleVerificarChildPin}>
                <input
                  type="password"
                  placeholder="••••"
                  className={`w-full text-center text-3xl tracking-[0.4em] p-4 rounded-2xl mb-4 bg-gray-50 border-2 outline-none transition-colors ${errorChildPin ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                  value={childPinInput}
                  onChange={(e) => setChildPinInput(e.target.value)}
                  autoFocus
                />
                {errorChildPin && <p className="text-red-500 text-sm mb-3 text-center font-medium">Contraseña incorrecta.</p>}
                
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => { setChildPinModal(null); setErrorChildPin(false); setChildPinInput(''); }}
                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                  >
                    Volver
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                  >
                    Entrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- COMPONENTE: PANEL DE ADULTOS ---
  if (currentUser === 'adult') {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Shield size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Panel de Control</h1>
                <p className="text-sm text-gray-500">Añade videos y gestiona perfiles</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { setEditPinUser('admin'); setEditPinValue(''); setEditPinConfirm(''); setEditPinError(''); setShowEditPin(true); }}
                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-xl transition-colors font-medium text-sm"
              >
                <KeyRound size={16} /> Cambiar PIN
              </button>
              <button 
                onClick={cerrarSesion}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl transition-colors font-medium"
              >
                <LogOut size={18} /> Salir
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Columna Izquierda: Formularios */}
            <div className="space-y-8 lg:col-span-1">
              
              {/* Formulario Crear Niño */}
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                  <User className="text-green-500" /> Crear Perfil de Niño
                </h2>
                <form onSubmit={handleAñadirUsuario} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Sofía"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={nuevoNombreUsuario}
                      onChange={(e) => setNuevoNombreUsuario(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_OPTIONS.map((opt, i) => (
                        <div 
                          key={i}
                          onClick={() => setNuevoEmojiUsuario(opt)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl cursor-pointer transition-transform ${opt.color} ${nuevoEmojiUsuario.emoji === opt.emoji ? 'ring-4 ring-offset-2 ring-gray-800 scale-110' : 'opacity-80 hover:opacity-100'}`}
                        >
                          {opt.emoji}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña (opcional)</label>
                    <input 
                      type="password" 
                      placeholder="Dejar vacío = sin contraseña"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      value={nuevoPinUsuario}
                      onChange={(e) => setNuevoPinUsuario(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
                    <Plus size={18} /> Añadir Perfil
                  </button>
                </form>

                {/* Lista rápida de niños */}
                <div className="mt-6 space-y-2">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full ${u.color} flex items-center justify-center text-sm`}>{u.emoji}</div>
                        <span className="font-medium text-sm">{u.name}</span>
                        {u.pin ? (
                          <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Lock size={10} /> PIN</span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Sin PIN</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => { setEditPinUser(u); setEditPinValue(''); setEditPinConfirm(''); setEditPinError(''); setShowEditPin(true); }} 
                          className="text-gray-400 hover:text-blue-500 p-1" title="Editar contraseña"
                        >
                          <KeyRound size={14} />
                        </button>
                        <button onClick={() => handleEliminarUsuario(u.id)} className="text-gray-400 hover:text-red-500 p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Formulario Añadir Video */}
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                  <Video className="text-red-500" /> Añadir Video Nuevo
                </h2>
                <form onSubmit={handleAñadirVideo} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enlace de YouTube</label>
                    <input 
                      type="text" 
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      value={nuevaUrl}
                      onChange={(e) => setNuevaUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Aprende los números"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      value={nuevoTitulo}
                      onChange={(e) => setNuevoTitulo(e.target.value)}
                    />
                  </div>
                  
                  {/* Selector de Niños para el video */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">¿Quién puede ver este video?</label>
                    {users.length === 0 ? (
                      <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">Primero debes crear un perfil de niño.</p>
                    ) : (
                      <div className="space-y-2">
                        {users.map(u => (
                          <div 
                            key={u.id} 
                            onClick={() => toggleUsuarioParaVideo(u.id)}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border ${usuariosSeleccionados.includes(u.id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}
                          >
                            {usuariosSeleccionados.includes(u.id) ? <CheckSquare className="text-blue-500" size={20} /> : <Square className="text-gray-400" size={20} />}
                            <div className={`w-6 h-6 rounded-full ${u.color} flex items-center justify-center text-xs`}>{u.emoji}</div>
                            <span className="font-medium text-sm">{u.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {errorAñadirVideo && (
                    <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <p>{errorAñadirVideo}</p>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={users.length === 0}
                    className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={18} /> Guardar Video
                  </button>
                </form>
              </div>

            </div>

            {/* Columna Derecha: Biblioteca global */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b pb-2">
                Biblioteca Global de Videos ({videos.length})
              </h2>
              
              <div className="space-y-4">
                {videos.length === 0 ? (
                  <p className="text-gray-500 text-center py-12">No hay videos en la biblioteca.</p>
                ) : (
                  videos.map(video => (
                    <div key={video.id} className="flex gap-4 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group">
                      <img src={video.thumbnail} alt={video.title} className="w-32 h-20 object-cover rounded-lg" />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-gray-800 line-clamp-1">{video.title}</h3>
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <span className="text-xs text-gray-500 mr-1">Visible para:</span>
                            {video.allowedUsers.length === 0 ? (
                              <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">Ninguno</span>
                            ) : (
                              video.allowedUsers.map(uid => {
                                const user = users.find(u => u.id === uid);
                                if (!user) return null;
                                return (
                                  <div key={uid} className={`w-5 h-5 rounded-full ${user.color} flex items-center justify-center text-[10px]`} title={user.name}>
                                    {user.emoji}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleEliminarVideo(video.id)}
                        className="self-center p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar de la biblioteca"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Modal Editar PIN */}
        {showEditPin && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
              <h2 className="text-xl font-bold mb-1 text-center text-gray-800">
                {editPinUser === 'admin' ? '🔒 Cambiar PIN de Adultos' : `🔑 Contraseña de ${editPinUser?.name}`}
              </h2>
              <p className="text-gray-500 mb-6 text-center text-sm">
                {editPinUser === 'admin' 
                  ? 'Introduce el nuevo PIN de acceso al panel'
                  : 'Dejar vacío para quitar la contraseña'}
              </p>

              <form onSubmit={handleEditPin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editPinUser === 'admin' ? 'Nuevo PIN' : 'Nueva contraseña'}
                  </label>
                  <input
                    type="password"
                    placeholder={editPinUser === 'admin' ? '••••' : 'Vacío = sin contraseña'}
                    className="w-full text-center text-xl tracking-[0.3em] p-3 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 outline-none transition-colors"
                    value={editPinValue}
                    onChange={(e) => setEditPinValue(e.target.value)}
                    autoFocus
                  />
                </div>
                {editPinValue && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar</label>
                    <input
                      type="password"
                      placeholder="••••"
                      className="w-full text-center text-xl tracking-[0.3em] p-3 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 outline-none transition-colors"
                      value={editPinConfirm}
                      onChange={(e) => setEditPinConfirm(e.target.value)}
                    />
                  </div>
                )}
                {editPinError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <p>{editPinError}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowEditPin(false); setEditPinError(''); }}
                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- COMPONENTE: VISTA DE NIÑO ---
  // Obtener solo los videos permitidos para el niño actual
  const misVideos = videos.filter(v => v.allowedUsers.includes(currentUser.id));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      {/* Barra superior de Niño */}
      <nav className={`text-white px-4 h-16 flex items-center justify-between shadow-md ${currentUser.color}`}>
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setVideoActual(null)}
        >
          <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
            <span className="text-2xl">{currentUser.emoji}</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Hola, {currentUser.name}</span>
        </div>

        <button 
          onClick={cerrarSesion}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors text-sm font-bold backdrop-blur-sm"
        >
          <LogOut size={16} /> Salir
        </button>
      </nav>

      {/* Área de Visualización */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl w-full mx-auto">
        
        {videoActual ? (
          // Vista Reproductor
          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1">
              <button 
                onClick={() => setVideoActual(null)}
                className="mb-4 flex items-center gap-2 text-gray-600 hover:text-black font-bold transition-colors bg-white px-4 py-2 rounded-full shadow-sm"
              >
                <ArrowLeft size={20} /> Volver a mis videos
              </button>
              
              <SafeYouTubePlayer
                videoId={videoActual.id}
                hasNext={misVideos.indexOf(videoActual) < misVideos.length - 1}
                hasPrev={misVideos.indexOf(videoActual) > 0}
                onNext={() => {
                  const idx = misVideos.indexOf(videoActual);
                  if (idx < misVideos.length - 1) setVideoActual(misVideos[idx + 1]);
                }}
                onPrev={() => {
                  const idx = misVideos.indexOf(videoActual);
                  if (idx > 0) setVideoActual(misVideos[idx - 1]);
                }}
                siblingVideos={misVideos.filter(v => v.id !== videoActual.id)}
                onSelectVideo={(video) => setVideoActual(video)}
              />
              <h1 className="text-2xl font-bold mt-6 ml-2">{videoActual.title}</h1>
            </div>

            {/* Lista "Siguientes" (solo videos del niño) */}
            <div className="w-full xl:w-96 flex flex-col gap-4">
              <h3 className="font-bold text-xl mb-2 text-gray-800">Sigue viendo</h3>
              <div className="space-y-4">
                {misVideos.filter(v => v.id !== videoActual.id).map(video => (
                  <div 
                    key={video.id}
                    className="flex gap-3 cursor-pointer group bg-white p-2 rounded-2xl shadow-sm hover:shadow-md transition-all"
                    onClick={() => setVideoActual(video)}
                  >
                    <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                    </div>
                    <div className="flex-1 py-1 pr-2">
                      <h4 className="font-bold text-sm text-gray-800 line-clamp-3 group-hover:text-blue-600 transition-colors leading-tight">{video.title}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Vista Cuadrícula de Niño
          <div>
            <h2 className="text-3xl font-black mb-8 text-gray-800 ml-2">Tus videos favoritos</h2>
            
            {misVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-200 p-8 text-center">
                <Video size={64} className="mb-4 text-gray-300" />
                <p className="text-xl font-bold text-gray-600">Aún no tienes videos.</p>
                <p className="text-md">¡Pídele a un adulto que te añada algunos!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {misVideos.map(video => (
                  <div 
                    key={video.id} 
                    className="flex flex-col group relative bg-white rounded-3xl p-3 shadow-sm hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 border border-gray-100"
                    onClick={() => setVideoActual(video)}
                  >
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-200 mb-3">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">
                        <Play size={12} className="inline mr-1 mb-0.5" fill="currentColor" />
                        Ver ahora
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-800 px-1 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{video.title}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}