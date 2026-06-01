import React, { useState } from 'react';

const TestPage: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Página de Teste</h1>
      <p>Você chegou na página!</p>
      <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>
    </div>
  );
};

export default TestPage;
