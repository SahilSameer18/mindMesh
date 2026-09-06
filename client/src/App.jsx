import { useState } from "react";
import { AuthProvider } from "./context/AuthContext.jsx";
import { RoomProvider } from "./context/RoomContext.jsx";
import { useRoom } from "./hooks/useRoom.js";
import { useCanvas } from "./hooks/useCanvas.js";
import { useAIActions } from "./hooks/useAIActions.js";
import InfiniteCanvas from "./components/canvas/InfiniteCanvas.jsx";
import WorkspaceHeader from "./components/ui/WorkspaceHeader.jsx";
import ActiveCommandBar from "./components/command/ActiveCommandBar.jsx";
import ActivityStream from "./components/activity/ActivityStream.jsx";
import EvidenceCard from "./components/activity/EvidenceCard.jsx";
import SpeechIntelligenceController from "./components/meeting/SpeechIntelligenceController.jsx";
import AuthModal from "./components/auth/AuthModal.jsx";
import CommitCallModal from "./components/meeting/CommitCallModal.jsx";
import VisualLightboxModal from "./components/canvas/VisualLightboxModal.jsx";

function Workspace() {
  const { isCommitModalOpen, setIsCommitModalOpen } = useRoom();
  const canvas = useCanvas();
  const aiActivity = useAIActions();
  const [isActivityStreamOpen, setIsActivityStreamOpen] = useState(false);
  const [isSpeechSimOpen, setIsSpeechSimOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      <WorkspaceHeader
        isActivityStreamOpen={isActivityStreamOpen}
        proposedCount={aiActivity.proposedCount}
        onToggleActivityStream={() => setIsActivityStreamOpen((prev) => !prev)}
        isSpeechSimOpen={isSpeechSimOpen}
        onToggleSpeechSim={() => setIsSpeechSimOpen((prev) => !prev)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      <main className="flex-1 w-full h-[calc(100vh-3.5rem)] relative overflow-hidden">
        {/* The 60fps Infinite Interactive Canvas */}
        <InfiniteCanvas canvas={canvas} />

        {/* Phase 4.1: Floating Active Command Bar */}
        <ActiveCommandBar canvas={canvas} />

        {/* Phase 5: Real-Time Speech Intelligence & Simulator Dock */}
        <SpeechIntelligenceController
          isOpen={isSpeechSimOpen}
          onClose={() => setIsSpeechSimOpen(false)}
        />

        {/* Phase 4.3: Collapsible AI Activity Stream Drawer */}
        <ActivityStream
          isOpen={isActivityStreamOpen}
          onClose={() => setIsActivityStreamOpen(false)}
          canvas={canvas}
          aiActivity={aiActivity}
        />

        {/* Phase 4.4: "Why This Exists" Evidence Card Modal */}
        {canvas.inspectingNode && (
          <EvidenceCard
            node={canvas.inspectingNode}
            aiAction={aiActivity.getActionForNode(canvas.inspectingNode)}
            onClose={() => canvas.setInspectingNode(null)}
            onPanToNode={canvas.panToNode}
          />
        )}

        {/* Phase 5: Custom Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />

        {/* Phase 7.1: Generative Visual Lightbox Inspection Modal */}
        {canvas.inspectingVisualNode && (
          <VisualLightboxModal
            node={canvas.inspectingVisualNode}
            onClose={() => canvas.setInspectingVisualNode(null)}
          />
        )}

        {/* Phase 7.2: Celebratory Dual-Source Commit Call Modal */}
        <CommitCallModal
          isOpen={isCommitModalOpen}
          onClose={() => setIsCommitModalOpen(false)}
          canvas={canvas}
        />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <Workspace />
      </RoomProvider>
    </AuthProvider>
  );
}
