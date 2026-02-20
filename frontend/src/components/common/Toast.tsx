import React from 'react';

interface ToastProps {
  msg: string;
  type: 'ok' | 'err';
}

const Toast: React.FC<ToastProps> = ({ msg, type }) => (
  <div className={`ts-toast ${type}`}>{msg}</div>
);

export default Toast;
