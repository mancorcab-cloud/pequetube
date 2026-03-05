import React, { useState, useEffect } from 'react';
import {
  Play, Lock, Plus, Trash2, ArrowLeft, AlertCircle,
  User, Shield, Video, CheckSquare, Square, LogOut,
  KeyRound, Eye, EyeOff, RefreshCw, Tag, Pencil
} from 'lucide-react';
import SafeYouTubePlayer from './SafeYouTubePlayer';
import { supabase } from './supabaseClient';

const AVATAR_OPTIONS = [
  { emoji: '🦖', color: 'bg-green-500' },
  { emoji: '🦄', color: 'bg-pink-500' },
  { emoji: '🚀', color: 'bg-blue-500' },
  { emoji: '🐱', color: 'bg-yellow-500' },
  { emoji: '🐼', color: 'bg-teal-500' },
  { emoji: '🚗', color: 'bg-red-500' },
];

const extraerIdYouTube = (urlStr) => {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;
    }
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.slice(1);
    }
  } catch { /* ignore */ }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = urlStr.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

function Spinner({ size = 6, color = 'border-blue-500' }) {
  return (
    <div className={`w-${size} h-${size} border-4 ${color} border-t-transparent rounded-full animate-spin`} />
  );
}

export default function App() {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ─── Data ──────────────────────────────────────────────────────────────────
  const [profiles, setProfiles] = useState([]);
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // ─── Navigation ───────────────────────────────────────────────────────────
  const [currentProfile, setCurrentProfile] = useState(null); // null | 'adult' | profile{}
  const [videoActual, setVideoActual] = useState(null);

  // ─── Child PIN modal ───────────────────────────────────────────────────────
  const [childPinModal, setChildPinModal] = useState(null);
  const [childPinInput, setChildPinInput] = useState('');
  const [errorChildPin, setErrorChildPin] = useState(false);

  // ─── Admin – profile form ─────────────────────────────────────────────────
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmoji, setNuevoEmoji] = useState(AVATAR_OPTIONS[0]);
  const [nuevoPin, setNuevoPin] = useState('');

  // ─── Admin – video form ───────────────────────────────────────────────────
  const [nuevaUrl, setNuevaUrl] = useState('');
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [profilesSeleccionados, setProfilesSeleccionados] = useState([]);
  const [errorVideo, setErrorVideo] = useState('');
  const [videoCategoryId, setVideoCategoryId] = useState('');

  // ─── Admin – category form ────────────────────────────────────────────────
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState('');
  const [nuevaCategoriaEmoji, setNuevaCategoriaEmoji] = useState('🎭');

  // ─── Child – category filter ──────────────────────────────────────────────
  const [categoryFilter, setCategoryFilter] = useState('all');

  // ─── Admin – edit video modal ─────────────────────────────────────────────
  const [editVideoModal, setEditVideoModal] = useState(null);
  const [editVideoTitle, setEditVideoTitle] = useState('');
  const [editVideoCategoryId, setEditVideoCategoryId] = useState('');

  // ─── Change password modal ────────────────────────────────────────────────
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');

  // ─── Edit child PIN modal ─────────────────────────────────────────────────
  const [editPinProfile, setEditPinProfile] = useState(null);
  const [editPinValue, setEditPinValue] = useState('');
  const [editPinConfirm, setEditPinConfirm] = useState('');
  const [editPinError, setEditPinError] = useState('');
  const [showEditPin, setShowEditPin] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  //  AUTH LISTENER
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadData();
    } else {
      setProfiles([]);
      setVideos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════
  async function loadData() {
    setLoadingData(true);
    try {
      const [profilesRes, videosRes, categoriesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at'),
        supabase
          .from('videos')
          .select('*, video_profiles(profile_id)')
          .eq('user_id', session.user.id)
          .order('created_at'),
        supabase
          .from('categories')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at'),
      ]);
      if (profilesRes.data) setProfiles(profilesRes.data);
      if (videosRes.data) {
        setVideos(videosRes.data.map(v => ({
          ...v,
          allowedUsers: (v.video_profiles || []).map(vp => vp.profile_id),
        })));
      }
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } finally {
      setLoadingData(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  AUTH HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  async function handleLogin(e) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    setAuthLoading(false);
    if (error) {
      setAuthError(
        error.message === 'Invalid login credentials'
          ? 'Correu o contrasenya incorrectes.'
          : error.message
      );
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setAuthError('');
    if (authPassword.length < 6) {
      setAuthError('La contrasenya ha de tindre almenys 6 caràcters.');
      return;
    }
    if (authPassword !== authPasswordConfirm) {
      setAuthError('Les contrasenyes no coincidixen.');
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthSuccess("Compte creat! Revisa el teu correu per confirmar-lo i torna ací per a iniciar sessió.");
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
      redirectTo: window.location.origin,
    });
    setAuthLoading(false);
    if (error) {
      setAuthError(error.message);
    } else {
      setAuthSuccess("Correu enviat! Revisa la teua safata d'entrada.");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setCurrentProfile(null);
    setVideoActual(null);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setChangePasswordError('');
    if (newPassword.length < 6) {
      setChangePasswordError('La contrasenya ha de tindre almenys 6 caràcters.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setChangePasswordError('Les contrasenyes no coincidixen.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setChangePasswordError(error.message);
    } else {
      setChangePasswordSuccess('Contrasenya actualitzada!');
      setTimeout(() => {
        setShowChangePassword(false);
        setNewPassword('');
        setNewPasswordConfirm('');
        setChangePasswordSuccess('');
      }, 1500);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PROFILE HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  const handleChildLogin = (profile) => {
    setCategoryFilter('all');
    if (profile.pin) {
      setChildPinModal(profile);
      setChildPinInput('');
      setErrorChildPin(false);
    } else {
      setCurrentProfile(profile);
    }
  };

  const handleVerificarChildPin = (e) => {
    e.preventDefault();
    if (childPinInput === childPinModal.pin) {
      setCategoryFilter('all');
      setCurrentProfile(childPinModal);
      setChildPinModal(null);
      setChildPinInput('');
      setErrorChildPin(false);
    } else {
      setErrorChildPin(true);
      setChildPinInput('');
    }
  };

  async function handleAddProfile(e) {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: session.user.id,
        name: nuevoNombre.trim(),
        emoji: nuevoEmoji.emoji,
        color: nuevoEmoji.color,
        pin: nuevoPin || '',
      })
      .select()
      .single();
    if (!error && data) {
      setProfiles(prev => [...prev, data]);
      setNuevoNombre('');
      setNuevoPin('');
    }
  }

  async function handleDeleteProfile(profileId) {
    await supabase.from('profiles').delete().eq('id', profileId);
    setProfiles(prev => prev.filter(p => p.id !== profileId));
    setVideos(prev => prev.map(v => ({
      ...v,
      allowedUsers: v.allowedUsers.filter(id => id !== profileId),
    })));
  }

  async function handleEditPin(e) {
    e.preventDefault();
    setEditPinError('');
    if (editPinValue && editPinValue.length < 4) {
      setEditPinError('El PIN ha de tindre almenys 4 caràcters.');
      return;
    }
    if (editPinValue && editPinValue !== editPinConfirm) {
      setEditPinError('Els PIN no coincidixen.');
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ pin: editPinValue || '' })
      .eq('id', editPinProfile.id);
    if (!error) {
      setProfiles(prev => prev.map(p =>
        p.id === editPinProfile.id ? { ...p, pin: editPinValue || '' } : p
      ));
      setShowEditPin(false);
      setEditPinProfile(null);
      setEditPinValue('');
      setEditPinConfirm('');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  VIDEO HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  async function handleAddVideo(e) {
    e.preventDefault();
    setErrorVideo('');
    if (!nuevaUrl || !nuevoTitulo) {
      setErrorVideo("Omple l'URL i el Títol.");
      return;
    }
    if (profilesSeleccionados.length === 0) {
      setErrorVideo('Selecciona almenys un xiquet que puga veure el vídeo.');
      return;
    }
    const id = extraerIdYouTube(nuevaUrl);
    if (!id) { setErrorVideo('URL de YouTube no vàlida.'); return; }
    if (videos.some(v => v.id === id)) { setErrorVideo('Este vídeo ja està a la biblioteca.'); return; }

    const thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    const { error: videoError } = await supabase.from('videos').insert({
      id,
      user_id: session.user.id,
      title: nuevoTitulo,
      thumbnail,
      category_id: videoCategoryId || null,
    });
    if (videoError) { setErrorVideo('Error guardant el vídeo.'); return; }

    await supabase.from('video_profiles').insert(
      profilesSeleccionados.map(profileId => ({ video_id: id, profile_id: profileId }))
    );

    setVideos(prev => [...prev, { id, title: nuevoTitulo, thumbnail, category_id: videoCategoryId || null, allowedUsers: profilesSeleccionados }]);
    setNuevaUrl('');
    setNuevoTitulo('');
    setProfilesSeleccionados([]);
    setVideoCategoryId('');
  }

  async function handleDeleteVideo(videoId) {
    await supabase.from('videos').delete().eq('id', videoId);
    setVideos(prev => prev.filter(v => v.id !== videoId));
  }

  function openEditVideo(video) {
    setEditVideoModal(video);
    setEditVideoTitle(video.title);
    setEditVideoCategoryId(video.category_id || '');
  }

  async function handleSaveEditVideo(e) {
    e.preventDefault();
    if (!editVideoTitle.trim()) return;
    const { error } = await supabase
      .from('videos')
      .update({
        title: editVideoTitle.trim(),
        category_id: editVideoCategoryId || null,
      })
      .eq('id', editVideoModal.id);
    if (!error) {
      setVideos(prev => prev.map(v =>
        v.id === editVideoModal.id
          ? { ...v, title: editVideoTitle.trim(), category_id: editVideoCategoryId || null }
          : v
      ));
      setEditVideoModal(null);
    }
  }

  async function handleAddCategory(e) {
    e.preventDefault();
    if (!nuevaCategoriaNombre.trim()) return;
    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: session.user.id,
        name: nuevaCategoriaNombre.trim(),
        emoji: nuevaCategoriaEmoji || '📁',
      })
      .select()
      .single();
    if (!error && data) {
      setCategories(prev => [...prev, data]);
      setNuevaCategoriaNombre('');
      setNuevaCategoriaEmoji('🎭');
    }
  }

  async function handleDeleteCategory(categoryId) {
    await supabase.from('categories').delete().eq('id', categoryId);
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    setVideos(prev => prev.map(v =>
      v.category_id === categoryId ? { ...v, category_id: null } : v
    ));
    if (categoryFilter === categoryId) setCategoryFilter('all');
  }

  const toggleProfile = (profileId) => {
    setProfilesSeleccionados(prev =>
      prev.includes(profileId) ? prev.filter(id => id !== profileId) : [...prev, profileId]
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  LOADING SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center gap-6">
        <h1 className="text-5xl font-black text-gray-800">Peque<span className="text-red-500">Tube</span></h1>
        <Spinner size={8} />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  AUTH SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (!session) {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-gray-800 mb-2">
            Peque<span className="text-red-500">Tube</span>
          </h1>
          <p className="text-gray-500 text-lg">Vídeos segurs per als xiquets</p>
        </div>

        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          {authMode !== 'forgot' && (
            <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
              {[['login', 'Iniciar sessió'], ['register', 'Registrar-se']].map(([mode, label]) => (
                <button key={mode}
                  onClick={() => { setAuthMode(mode); setAuthError(''); setAuthSuccess(''); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${authMode === mode ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {authSuccess ? (
            <div className="space-y-4">
              <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-medium text-center leading-relaxed">
                ✅ {authSuccess}
              </div>
              <button onClick={() => { setAuthMode('login'); setAuthSuccess(''); }}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors">
                Tornar a iniciar sessió
              </button>
            </div>

          ) : authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correu electrònic</label>
                <input type="email" placeholder="pare@exemple.com" required autoFocus
                  className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors"
                  value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contrasenya</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="••••••" required
                    className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors pr-12"
                    value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {authError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
                  <AlertCircle size={16} className="flex-shrink-0" /><p>{authError}</p>
                </div>
              )}
              <button type="submit" disabled={authLoading}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2">
                {authLoading && <Spinner size={5} color="border-white" />}
                Entrar
              </button>
              <button type="button"
                onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccess(''); }}
                className="w-full text-center text-sm text-gray-400 hover:text-blue-500 transition-colors pt-1">
                Has oblidat la contrasenya?
              </button>
            </form>

          ) : authMode === 'register' ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correu electrònic</label>
                <input type="email" placeholder="pare@exemple.com" required autoFocus
                  className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors"
                  value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contrasenya <span className="text-gray-400 font-normal">(mínim 6 caràcters)</span>
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="••••••" required
                    className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors pr-12"
                    value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contrasenya</label>
                <input type="password" placeholder="••••••" required
                  className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors"
                  value={authPasswordConfirm} onChange={e => setAuthPasswordConfirm(e.target.value)} />
              </div>
              {authError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
                  <AlertCircle size={16} className="flex-shrink-0" /><p>{authError}</p>
                </div>
              )}
              <button type="submit" disabled={authLoading}
                className="w-full py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200 disabled:opacity-50 flex items-center justify-center gap-2">
                {authLoading && <Spinner size={5} color="border-white" />}
                Crear compte
              </button>
            </form>

          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <button type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <ArrowLeft size={16} /> Tornar
              </button>
              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-1">Recuperar contrasenya</h3>
                <p className="text-sm text-gray-500">T'enviarem un correu per restablir-la.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correu electrònic</label>
                <input type="email" placeholder="pare@exemple.com" required autoFocus
                  className="w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors"
                  value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
              </div>
              {authError && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
                  <AlertCircle size={16} className="flex-shrink-0" /><p>{authError}</p>
                </div>
              )}
              <button type="submit" disabled={authLoading}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {authLoading && <Spinner size={5} color="border-white" />}
                Enviar correu
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  HOME SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (currentProfile === null) {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black text-gray-800 mb-2 tracking-tight">
            Peque<span className="text-red-500">Tube</span>
          </h1>
          <p className="text-xl text-gray-600 font-medium">Qui està veient hui?</p>
        </div>

        {loadingData ? (
          <Spinner size={10} />
        ) : (
          <div className="flex flex-wrap justify-center gap-8 max-w-4xl">
            {profiles.map(profile => (
              <div key={profile.id} onClick={() => handleChildLogin(profile)}
                className="flex flex-col items-center cursor-pointer group transform transition-transform hover:scale-110">
                <div className={`w-32 h-32 rounded-full ${profile.color} flex items-center justify-center text-6xl shadow-lg border-4 border-white mb-4 group-hover:shadow-xl relative`}>
                  {profile.emoji}
                  {profile.pin && (
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow">
                      <Lock size={14} className="text-gray-500" />
                    </div>
                  )}
                </div>
                <span className="text-2xl font-bold text-gray-700">{profile.name}</span>
              </div>
            ))}
            <div onClick={() => setCurrentProfile('adult')}
              className="flex flex-col items-center cursor-pointer group transform transition-transform hover:scale-110 ml-8">
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center shadow-inner border-4 border-white mb-4">
                <Shield size={48} className="text-gray-500 group-hover:text-gray-700" />
              </div>
              <span className="text-2xl font-bold text-gray-500">Pares</span>
            </div>
          </div>
        )}

        {childPinModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
              <div className="flex flex-col items-center mb-4">
                <div className={`w-20 h-20 rounded-full ${childPinModal.color} flex items-center justify-center text-4xl shadow-lg mb-3`}>
                  {childPinModal.emoji}
                </div>
                <h2 className="text-xl font-bold text-gray-800">{childPinModal.name}</h2>
                <p className="text-gray-500 text-sm">Introduïx la teua contrasenya</p>
              </div>
              <form onSubmit={handleVerificarChildPin}>
                <input type="password" placeholder="••••"
                  className={`w-full text-center text-3xl tracking-[0.4em] p-4 rounded-2xl mb-4 bg-gray-50 border-2 outline-none transition-colors ${errorChildPin ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                  value={childPinInput} onChange={e => setChildPinInput(e.target.value)} autoFocus />
                {errorChildPin && <p className="text-red-500 text-sm mb-3 text-center font-medium">Contrasenya incorrecta.</p>}
                <div className="flex gap-4">
                  <button type="button"
                    onClick={() => { setChildPinModal(null); setErrorChildPin(false); setChildPinInput(''); }}
                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors">
                    Tornar
                  </button>
                  <button type="submit"
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
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

  // ═══════════════════════════════════════════════════════════════════════════
  //  ADMIN PANEL
  // ═══════════════════════════════════════════════════════════════════════════
  if (currentProfile === 'adult') {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
        <div className="max-w-6xl mx-auto">

          <div className="flex flex-wrap items-center justify-between gap-3 mb-8 bg-white p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Shield size={28} /></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Tauler de Control</h1>
                <p className="text-sm text-gray-400">{session.user.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => { setShowChangePassword(true); setChangePasswordError(''); setChangePasswordSuccess(''); }}
                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-xl transition-colors font-medium text-sm">
                <KeyRound size={16} /> Canviar contrasenya
              </button>
              <button onClick={() => setCurrentProfile(null)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl transition-colors font-medium text-sm">
                <ArrowLeft size={16} /> Tornar
              </button>
              <button onClick={handleSignOut}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl transition-colors font-medium text-sm">
                <LogOut size={16} /> Tancar sessió
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-8 lg:col-span-1">

              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                  <User className="text-green-500" /> Crear Perfil de Xiquet
                </h2>
                <form onSubmit={handleAddProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                    <input type="text" placeholder="Ex: Sofia"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                      value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Avatar</label>
                    <div className="flex flex-wrap gap-2">
                      {AVATAR_OPTIONS.map((opt, i) => (
                        <div key={i} onClick={() => setNuevoEmoji(opt)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl cursor-pointer transition-transform ${opt.color} ${nuevoEmoji.emoji === opt.emoji ? 'ring-4 ring-offset-2 ring-gray-800 scale-110' : 'opacity-80 hover:opacity-100'}`}>
                          {opt.emoji}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contrasenya (opcional)</label>
                    <input type="password" placeholder="Deixar buit = sense contrasenya"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      value={nuevoPin} onChange={e => setNuevoPin(e.target.value)} />
                  </div>
                  <button type="submit"
                    className="w-full py-2.5 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
                    <Plus size={18} /> Afegir Perfil
                  </button>
                </form>
                <div className="mt-6 space-y-2">
                  {profiles.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full ${p.color} flex items-center justify-center text-sm`}>{p.emoji}</div>
                        <span className="font-medium text-sm">{p.name}</span>
                        {p.pin
                          ? <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Lock size={10} /> PIN</span>
                          : <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Sense PIN</span>
                        }
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditPinProfile(p); setEditPinValue(''); setEditPinConfirm(''); setEditPinError(''); setShowEditPin(true); }}
                          className="text-gray-400 hover:text-blue-500 p-1" title="Editar contrasenya">
                          <KeyRound size={14} />
                        </button>
                        <button onClick={() => handleDeleteProfile(p.id)} className="text-gray-400 hover:text-red-500 p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                  <Tag className="text-purple-500" /> Temàtiques
                </h2>
                <form onSubmit={handleAddCategory} className="space-y-3 mb-4">
                  <div className="flex gap-2">
                    <input type="text" placeholder="🐉" maxLength={2}
                      className="w-14 p-2.5 text-center text-xl bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={nuevaCategoriaEmoji} onChange={e => setNuevaCategoriaEmoji(e.target.value)} />
                    <input type="text" placeholder="Nom de la temàtica (ex: Pepa Pig)"
                      className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      value={nuevaCategoriaNombre} onChange={e => setNuevaCategoriaNombre(e.target.value)} />
                  </div>
                  <button type="submit"
                    className="w-full py-2 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 text-sm">
                    <Plus size={16} /> Afegir Temàtica
                  </button>
                </form>
                <div className="space-y-2">
                  {categories.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">Encara no hi ha temàtiques.</p>
                  ) : (
                    categories.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{c.emoji}</span>
                          <span className="font-medium text-sm">{c.name}</span>
                          <span className="text-xs text-gray-400">({videos.filter(v => v.category_id === c.id).length})</span>
                        </div>
                        <button onClick={() => handleDeleteCategory(c.id)} className="text-gray-400 hover:text-red-500 p-1">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
                  <Video className="text-red-500" /> Afegir Vídeo Nou
                </h2>
                <form onSubmit={handleAddVideo} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enllaç de YouTube</label>
                    <input type="text" placeholder="https://youtube.com/watch?v=..."
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      value={nuevaUrl} onChange={e => setNuevaUrl(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Títol</label>
                    <input type="text" placeholder="Ex: Aprén els números"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      value={nuevoTitulo} onChange={e => setNuevoTitulo(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Qui pot veure este vídeo?</label>
                    {profiles.length === 0 ? (
                      <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">Primer has de crear un perfil de xiquet.</p>
                    ) : (
                      <div className="space-y-2">
                        {profiles.map(p => (
                          <div key={p.id} onClick={() => toggleProfile(p.id)}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border ${profilesSeleccionados.includes(p.id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
                            {profilesSeleccionados.includes(p.id)
                              ? <CheckSquare className="text-blue-500" size={20} />
                              : <Square className="text-gray-400" size={20} />
                            }
                            <div className={`w-6 h-6 rounded-full ${p.color} flex items-center justify-center text-xs`}>{p.emoji}</div>
                            <span className="font-medium text-sm">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {categories.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Temàtica (opcional)</label>
                      <select
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                        value={videoCategoryId} onChange={e => setVideoCategoryId(e.target.value)}>
                        <option value="">-- Sense temàtica --</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {errorVideo && (
                    <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /><p>{errorVideo}</p>
                    </div>
                  )}
                  <button type="submit" disabled={profiles.length === 0}
                    className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus size={18} /> Guardar Vídeo
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-6 border-b pb-2">
                <h2 className="text-lg font-bold">Biblioteca Global de Vídeos ({videos.length})</h2>
                <button onClick={loadData} className="text-gray-400 hover:text-blue-500 p-1 transition-colors" title="Actualitzar">
                  <RefreshCw size={16} />
                </button>
              </div>
              <div className="space-y-4">
                {videos.length === 0 ? (
                  <p className="text-gray-500 text-center py-12">No hi ha vídeos a la biblioteca.</p>
                ) : (
                  videos.map(video => (
                    <div key={video.id} className="flex gap-4 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                      <img src={video.thumbnail} alt={video.title} className="w-32 h-20 object-cover rounded-lg" />
                      <div className="flex-1 flex flex-col justify-between">
                        <h3 className="font-bold text-gray-800 line-clamp-1">{video.title}</h3>
                        {video.category_id && (() => { const cat = categories.find(c => c.id === video.category_id); return cat ? <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full mt-1">{cat.emoji} {cat.name}</span> : null; })()}
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          <span className="text-xs text-gray-500 mr-1">Visible per a:</span>
                          {video.allowedUsers.length === 0 ? (
                            <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">Cap</span>
                          ) : (
                            video.allowedUsers.map(uid => {
                              const profile = profiles.find(p => p.id === uid);
                              if (!profile) return null;
                              return (
                                <div key={uid} className={`w-5 h-5 rounded-full ${profile.color} flex items-center justify-center text-[10px]`} title={profile.name}>
                                  {profile.emoji}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                      <div className="self-center flex flex-col gap-1">
                        <button onClick={() => openEditVideo(video)}
                          className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil size={18} />
                        </button>
                        <button onClick={() => handleDeleteVideo(video.id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {editVideoModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
              <h2 className="text-xl font-bold mb-1 text-center text-gray-800">✏️ Editar vídeo</h2>
              <div className="mb-5 flex justify-center">
                <img src={editVideoModal.thumbnail} alt={editVideoModal.title}
                  className="w-40 h-24 object-cover rounded-xl shadow" />
              </div>
              <form onSubmit={handleSaveEditVideo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Títol</label>
                  <input type="text" autoFocus
                    className="w-full p-3 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 outline-none transition-colors text-sm"
                    value={editVideoTitle} onChange={e => setEditVideoTitle(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temàtica</label>
                  <select
                    className="w-full p-3 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 outline-none transition-colors text-sm"
                    value={editVideoCategoryId} onChange={e => setEditVideoCategoryId(e.target.value)}>
                    <option value="">-- Sense temàtica --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditVideoModal(null)}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                    Cancel·lar
                  </button>
                  <button type="submit"
                    className="flex-1 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors">
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showChangePassword && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
              <h2 className="text-xl font-bold mb-1 text-center text-gray-800">🔒 Canviar contrasenya</h2>
              <p className="text-gray-500 mb-6 text-center text-sm">Introduïx la nova contrasenya d'accés</p>
              {changePasswordSuccess ? (
                <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm font-medium text-center">
                  ✅ {changePasswordSuccess}
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nova contrasenya</label>
                    <input type="password" placeholder="Mínim 6 caràcters"
                      className="w-full p-3 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 outline-none transition-colors"
                      value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar</label>
                    <input type="password" placeholder="••••••"
                      className="w-full p-3 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 outline-none transition-colors"
                      value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)} />
                  </div>
                  {changePasswordError && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
                      <AlertCircle size={16} /><p>{changePasswordError}</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowChangePassword(false)}
                      className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors">
                      Cancel·lar
                    </button>
                    <button type="submit"
                      className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                      Guardar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {showEditPin && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
              <h2 className="text-xl font-bold mb-1 text-center text-gray-800">
                🔑 Contrasenya de {editPinProfile?.name}
              </h2>
              <p className="text-gray-500 mb-6 text-center text-sm">Deixar buit per a llevar la contrasenya</p>
              <form onSubmit={handleEditPin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova contrasenya</label>
                  <input type="password" placeholder="Buit = sense contrasenya"
                    className="w-full text-center text-xl tracking-[0.3em] p-3 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 outline-none transition-colors"
                    value={editPinValue} onChange={e => setEditPinValue(e.target.value)} autoFocus />
                </div>
                {editPinValue && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar</label>
                    <input type="password" placeholder="••••"
                      className="w-full text-center text-xl tracking-[0.3em] p-3 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 outline-none transition-colors"
                      value={editPinConfirm} onChange={e => setEditPinConfirm(e.target.value)} />
                  </div>
                )}
                {editPinError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
                    <AlertCircle size={16} /><p>{editPinError}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowEditPin(false); setEditPinError(''); }}
                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors">
                    Cancel·lar
                  </button>
                  <button type="submit"
                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
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

  // ═══════════════════════════════════════════════════════════════════════════
  //  CHILD VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  const misVideos = videos.filter(v => v.allowedUsers.includes(currentProfile.id));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <nav className={`text-white px-4 h-16 flex items-center justify-between shadow-md ${currentProfile.color}`}>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setVideoActual(null)}>
          <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
            <span className="text-2xl">{currentProfile.emoji}</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Hola, {currentProfile.name}!</span>
        </div>
        <button onClick={() => { setCurrentProfile(null); setVideoActual(null); }}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors text-sm font-bold backdrop-blur-sm">
          <LogOut size={16} /> Eixir
        </button>
      </nav>

      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl w-full mx-auto">
        {videoActual ? (
          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1">
              <button onClick={() => setVideoActual(null)}
                className="mb-4 flex items-center gap-2 text-gray-600 hover:text-black font-bold transition-colors bg-white px-4 py-2 rounded-full shadow-sm">
                <ArrowLeft size={20} /> Tornar als meus vídeos
              </button>
              <SafeYouTubePlayer
                videoId={videoActual.id}
                hasNext={misVideos.indexOf(videoActual) < misVideos.length - 1}
                hasPrev={misVideos.indexOf(videoActual) > 0}
                onNext={() => { const idx = misVideos.indexOf(videoActual); if (idx < misVideos.length - 1) setVideoActual(misVideos[idx + 1]); }}
                onPrev={() => { const idx = misVideos.indexOf(videoActual); if (idx > 0) setVideoActual(misVideos[idx - 1]); }}
                siblingVideos={misVideos.filter(v => v.id !== videoActual.id)}
                onSelectVideo={video => setVideoActual(video)}
              />
              <h1 className="text-2xl font-bold mt-6 ml-2">{videoActual.title}</h1>
            </div>
            <div className="w-full xl:w-96 flex flex-col gap-4">
              <h3 className="font-bold text-xl mb-2 text-gray-800">Continua veient</h3>
              <div className="space-y-4">
                {misVideos.filter(v => v.id !== videoActual.id).map(video => (
                  <div key={video.id} onClick={() => setVideoActual(video)}
                    className="flex gap-3 cursor-pointer group bg-white p-2 rounded-2xl shadow-sm hover:shadow-md transition-all">
                    <div className="relative w-40 aspect-video rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
          <div>
            <h2 className="text-3xl font-black mb-6 text-gray-800 ml-2">Els teus vídeos favorits</h2>
            {categories.filter(c => misVideos.some(v => v.category_id === c.id)).length > 0 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 flex-nowrap">
                <button onClick={() => setCategoryFilter('all')}
                  className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-all ${categoryFilter === 'all' ? `${currentProfile.color} text-white shadow-md` : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                  ✨ Tots
                </button>
                {categories.filter(c => misVideos.some(v => v.category_id === c.id)).map(c => (
                  <button key={c.id} onClick={() => setCategoryFilter(c.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${categoryFilter === c.id ? `${currentProfile.color} text-white shadow-md` : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                    {c.emoji} {c.name}
                  </button>
                ))}
                {misVideos.some(v => !v.category_id) && (
                  <button onClick={() => setCategoryFilter('none')}
                    className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-all ${categoryFilter === 'none' ? `${currentProfile.color} text-white shadow-md` : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                    📁 Altres
                  </button>
                )}
              </div>
            )}
            {(() => {
              const filtered = categoryFilter === 'all' ? misVideos
                : categoryFilter === 'none' ? misVideos.filter(v => !v.category_id)
                : misVideos.filter(v => v.category_id === categoryFilter);
              return filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-200 p-8 text-center">
                  <Video size={64} className="mb-4 text-gray-300" />
                  <p className="text-xl font-bold text-gray-600">Encara no tens vídeos.</p>
                  <p className="text-md">Demana-li a un adult que t'en afegisca!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filtered.map(video => (
                    <div key={video.id} onClick={() => setVideoActual(video)}
                      className="flex flex-col group relative bg-white rounded-3xl p-3 shadow-sm hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 border border-gray-100">
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-200 mb-3">
                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">
                          <Play size={12} className="inline mr-1 mb-0.5" fill="currentColor" />
                          Veure ara
                        </div>
                      </div>
                      <h3 className="font-bold text-gray-800 px-1 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{video.title}</h3>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
