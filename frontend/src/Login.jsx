import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8000/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('user', JSON.stringify(data.user));
        
        const userRole = data.user.role;
        
        if (userRole === 'admin') {
          navigate('/admin-dashboard');
        } else if (userRole === 'employee') {
          navigate('/employee-dashboard');
        } else if (userRole === 'vendor') {
          navigate('/vendor-dashboard');
        } else {
          navigate('/employee-dashboard');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check if Django server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h1 style={styles.title}>Welcome Back</h1>
        <p style={styles.subtitle}>Sign in to your account</p>

        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Enter your username"
              required
              autoComplete="username"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            style={styles.button}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.registerSection}>
          <p style={styles.registerText}>
            Want to become a vendor?{' '}
            <button
              onClick={() => navigate('/vendor-register')}
              style={styles.registerLink}
            >
              Register here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'url(/Loginbg.png) no-repeat center center fixed',
    backgroundSize: 'cover',
    backgroundColor: '#f5f7fa',
    position: 'relative',
  },
  loginBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)', // More transparent - 65% opacity
    backdropFilter: 'blur(5px)', // Glassmorphism blur effect
    WebkitBackdropFilter: 'blur(10px)', // Safari support
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.2)',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid rgba(20, 16, 16, 0.3)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '8px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '14px',
    color: '#171616',
    marginBottom: '30px',
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(254, 238, 238, 0.95)',
    color: '#c33',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    textAlign: 'center',
    border: '1px solid rgba(204, 51, 51, 0.2)',
  },
  inputGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2d2d2d',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '2px solid rgba(0,0,0,0.15)',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    transition: 'all 0.3s ease',
    WebkitTextFillColor: '#000', // Ensures text is visible in autofill
  },
  button: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#23242a',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(35, 36, 42, 0.3)',
  },
  registerSection: {
    textAlign: 'center',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(0,0,0,0.1)',
  },
  registerText: {
    color: '#181414',
    fontSize: '14px',
    margin: 0,
  },
  registerLink: {
    background: 'none',
    border: 'none',
    color: '#171c23',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'color 0.2s ease',
  },
};