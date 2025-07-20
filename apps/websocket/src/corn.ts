import cron from "node-cron"
import WebSocket from "ws";

const WS_URL = "wss://sketchwiz-web-scoket.onrender.com";

cron.schedule("*/5 * * * *", () => {
  console.log("🟢 Pinging WebSocket...");
  const ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    console.log("✅ WS connected");
    ws.send(JSON.stringify({ type: "ping" }));
    setTimeout(() => ws.close(), 5000);
  });

  ws.on("error", (err) => {
    console.error("❌ WS Error:", err.message);
  });

  ws.on("close", () => {
    console.log("🔁 WS Closed");
  });
});
