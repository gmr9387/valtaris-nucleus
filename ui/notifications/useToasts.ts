import { useState } from "react";

export const useToasts = () => {
  const [toasts, setToasts] = useState([]);

  const push = (message, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts([...toasts, { id, message, type }]);

    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3000);
  };

  return { toasts, push };
};
