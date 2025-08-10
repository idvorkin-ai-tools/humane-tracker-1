import React, { useState, useEffect } from 'react';
import { HabitTracker } from './components/HabitTracker';
import { Login } from './components/Login';
import { auth } from './config/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="App">
      <div className="app-header">
        <div className="user-info">
          <img 
            src={user.photoURL || 'https://via.placeholder.com/32'} 
            alt={user.displayName || 'User'} 
            className="user-avatar"
          />
          <span className="user-name">{user.displayName || user.email}</span>
          <button className="sign-out-btn" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>
      <HabitTracker userId={user.uid} />
    </div>
  );
}

export default App;