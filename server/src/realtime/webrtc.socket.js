/**
 * WebRTC signaling relay.
 * The server is a pure pass-through here — it never touches media,
 * only forwards SDP offers/answers and ICE candidates between two
 * specific sockets.
 */
// A socket may only signal a peer that shares its current room — otherwise any
// connected client could send unsolicited SDP/ICE traffic at an arbitrary
// socket id it managed to observe, outside of any room context.
function sharesRoomWith(io, socket, targetSocketId) {
  const roomId = socket.data?.roomId;
  if (!roomId || !targetSocketId) return false;
  const target = io.sockets.sockets.get(targetSocketId);
  return Boolean(target && target.data?.roomId === roomId);
}

export function registerWebRTCSocketHandlers(io, socket) {
  // Relay SDP offer to the specific target peer
  socket.on("webrtc:offer", ({ targetSocketId, offer }) => {
    if (!targetSocketId || !offer || !sharesRoomWith(io, socket, targetSocketId)) return;
    io.to(targetSocketId).emit("webrtc:offer", {
      senderSocketId: socket.id,
      offer,
    });
  });

  // Relay SDP answer back to the offer's sender
  socket.on("webrtc:answer", ({ targetSocketId, answer }) => {
    if (!targetSocketId || !answer || !sharesRoomWith(io, socket, targetSocketId)) return;
    io.to(targetSocketId).emit("webrtc:answer", {
      senderSocketId: socket.id,
      answer,
    });
  });

  // Relay ICE candidates as they trickle in on both sides
  socket.on("webrtc:ice-candidate", ({ targetSocketId, candidate }) => {
    if (!targetSocketId || !candidate || !sharesRoomWith(io, socket, targetSocketId)) return;
    io.to(targetSocketId).emit("webrtc:ice-candidate", {
      senderSocketId: socket.id,
      candidate,
    });
  });

  // Broadcast mic/camera toggle state to the rest of the room (not P2P —
  // this one goes through the server since everyone needs to see it,
  // not just one peer). Room comes from the socket's own join, never the payload.
  socket.on("webrtc:media-state", ({ isMuted, isCameraOn }) => {
    const roomId = socket.data?.roomId;
    if (!roomId) return;
    socket.to(roomId).emit("webrtc:peer-media-state", {
      socketId: socket.id,
      isMuted: !!isMuted,
      isCameraOn: !!isCameraOn,
    });
  });

  // IMPORTANT: "disconnecting" (not "disconnect") — at this point
  // socket.rooms still contains the rooms the socket was in, which
  // "disconnect" would have already cleared. This lets us tell every
  // room this socket was part of that its peer connection should close.
  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room === socket.id) continue; // skip the socket's own private room
      socket.to(room).emit("webrtc:peer-left", { socketId: socket.id });
    }
  });
}

export default registerWebRTCSocketHandlers;


