import { useContext } from "react";
import { RoomContext } from "../context/roomContextInstance.js";

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within a RoomProvider");
  }
  return context;
}

