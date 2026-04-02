// client/src/main.jsx
import React    from 'react';
import ReactDOM from 'react-dom/client';
import App      from './App.jsx';

// CSS của bạn (đã có sẵn)
import '../public/css/style.css';   // ← điều chỉnh đường dẫn nếu cần

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
