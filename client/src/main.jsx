import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Critical React Runtime Error in False Trials:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('cyber_mafia_game_state');
      localStorage.removeItem('cyber_mafia_code_buffers');
      localStorage.removeItem('cyber_mafia_terminal_outputs');
      localStorage.removeItem('cyber_mafia_submitted_answers');
      localStorage.removeItem('cyber_mafia_team_id');
      localStorage.removeItem('cyber_mafia_player_name');
    } catch (_) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#020617',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#0f172a',
            border: '1px solid #e11d48',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ color: '#fb7185', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
              Terminal Anomaly // System Halted
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: '900', color: '#ffffff', marginBottom: '16px' }}>
              FALSE TRIALS // ERROR RECOVERY
            </h1>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px', lineHeight: '1.5' }}>
              A client-side runtime exception occurred:
            </p>
            <div style={{
              backgroundColor: '#020617',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '12px',
              color: '#fda4af',
              fontSize: '11px',
              textAlign: 'left',
              overflowX: 'auto',
              marginBottom: '20px',
              fontFamily: 'monospace'
            }}>
              {this.state.error?.message || String(this.state.error)}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
              >
                Reload Terminal
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#e11d48',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
              >
                Reset Session & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
