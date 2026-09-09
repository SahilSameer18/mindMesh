import { useRoom } from "./useRoom.js";

/**
 * Presence selector hook.
 * Exposes peer awareness, cursors, minimap viewports, and presenter broadcast states from RoomContext.
 */
export function usePresence() {
  const {
    peers = [],
    peerCursors = [],
    peerViewports = [],
    activePresenter = null,
    isFollowing = false,
    presenterContestError = null,
    currentUser = null,
    socket = null,
    startPresenting,
    stopPresenting,
    toggleFollowPresenter,
    clearPresenterContestError,
  } = useRoom() || {};

  const isPresenter = activePresenter?.socketId === socket?.id;

  return {
    peers,
    peerCursors,
    peerViewports,
    activePresenter,
    isFollowing,
    isPresenter,
    presenterContestError,
    currentUser,
    startPresenting,
    stopPresenting,
    toggleFollowPresenter,
    clearPresenterContestError,
  };
}

export default usePresence;
