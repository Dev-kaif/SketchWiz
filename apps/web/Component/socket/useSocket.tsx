"use client";

import { useEffect, useState } from "react";
import { WS_URL } from "../Config";

const useSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Ensure this code runs in the browser.
    const token = localStorage.getItem("authorization") || "";
    const newSocket = new WebSocket(`${WS_URL}?token=${token}`);

    setSocket(newSocket);

    // Clean up the socket when the component unmounts.
    return () => {
      newSocket.close();
    };
  }, []);

  return socket;
};

export default useSocket;
