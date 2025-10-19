'use client';

import { useNotifications } from '../hooks/useNotifications';

export default function TestNotifications() {
  const { sendNotification, permission } = useNotifications();

  const handleTestNotification = () => {
    sendNotification(
      'Teste de Notificação', 
      'Esta é uma notificação de teste do Next Finance!'
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Teste de Notificações</h1>
      <p>Status da permissão: <strong>{permission}</strong></p>
      <button 
        onClick={handleTestNotification}
        style={{
          padding: '1rem 2rem',
          background: '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Enviar Notificação de Teste
      </button>
    </div>
  );
}