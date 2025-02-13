"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { XCircle, CheckCircle, AlertCircle, Info } from "lucide-react";

interface NotificationProps {
  type?: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
  onClose: () => void;
}

const notificationTypes = {
  success: { icon: <CheckCircle className="text-green-500" />, bg: "bg-green-100", text: "text-green-800" },
  error: { icon: <XCircle className="text-red-500" />, bg: "bg-red-100", text: "text-red-800" },
  warning: { icon: <AlertCircle className="text-yellow-500" />, bg: "bg-yellow-100", text: "text-yellow-800" },
  info: { icon: <Info className="text-blue-500" />, bg: "bg-blue-100", text: "text-blue-800" },
};

const Notification = ({ type = "info", message, duration = 3000, onClose }:NotificationProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`flex items-center ${notificationTypes[type].bg} ${notificationTypes[type].text} p-4 rounded-lg shadow-md`}>
      {notificationTypes[type].icon}
      <span className="ml-2 flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 text-gray-600 hover:text-gray-800">✖</button>
    </div>
  );
};

interface NotificationData {
  id: number;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

interface NotificationContextType {
  addNotification: (type: "success" | "error" | "warning" | "info", message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }:{ children: ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const addNotification = (type: "success" | "error" | "warning" | "info", message: string) => {
    const id = Date.now();
    setNotifications([...notifications, { id, type, message }]);
    setTimeout(() => removeNotification(id), 3000);
  };

  const removeNotification = (id: number) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed z-50 top-5 right-5 space-y-2 w-80">
        {notifications.map((notif) => (
          <Notification key={notif.id} type={notif.type} message={notif.message} onClose={() => removeNotification(notif.id)} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
