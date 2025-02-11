"use client";
import { WS_URL } from "../Config";


// Create a new WebSocket instance.
const socket:WebSocket = new WebSocket(`${WS_URL}?token=${localStorage.getItem("authorization")}`);

// Attach some basic event handlers.
socket.onopen = () => {
  console.log("WebSocket connection established");
};

socket.onerror = (error) => {
  console.error("WebSocket error:", error);
};

socket.onclose = (event) => {
  console.log("WebSocket connection closed:", event);
};

export default socket;
