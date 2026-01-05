import type WebSocket from "ws";

type UserSockets = Map<string, Set<WebSocket>>;

const socketsByUser: UserSockets = new Map();

export function trackSocket(userId: string, socket: WebSocket) {
  let set = socketsByUser.get(userId);
  if (!set) {
    set = new Set();
    socketsByUser.set(userId, set);
  }
  set.add(socket);

  socket.on("close", () => {
    const existing = socketsByUser.get(userId);
    if (!existing) return;
    existing.delete(socket);
    if (existing.size === 0) socketsByUser.delete(userId);
  });
}

export function emitToUser(userId: string, payload: unknown) {
  const sockets = socketsByUser.get(userId);
  if (!sockets || sockets.size === 0) return;
  const message = JSON.stringify(payload);
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) {
      socket.send(message);
    }
  }
}

