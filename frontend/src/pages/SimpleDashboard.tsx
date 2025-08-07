import React from 'react';

const SimpleDashboard: React.FC = () => {
  console.log('SimpleDashboard rendering...');
  
  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #1e40af, #7c3aed)',
      minHeight: '100vh',
      color: 'white',
      padding: '2rem',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🎙️ Dashboard</h1>
      <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
        <strong>Simple Dashboard is working!</strong>
        <br />
        This is a temporary simple version to test routing.
      </div>
    </div>
  );
};

export default SimpleDashboard;
