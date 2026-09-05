import { useState } from "react";
import { RoomProvider } from "./context/RoomContext.jsx";
import { useCanvas } from "./hooks/useCanvas.js";
import { useAIActions } from "./hooks/useAIActions.js";
import InfiniteCanvas from "./components/canvas/InfiniteCanvas.jsx";
import WorkspaceHeader from "./components/ui/WorkspaceHeader.jsx";
import ActiveCommandBar from "./components/command/ActiveCommandBar.jsx";
import ActivityStream from "./components/activity/ActivityStream.jsx";
import EvidenceCard from "./components/activity/EvidenceCard.jsx";

function Workspace() {
  const canvas = useCanvas();
  const aiActivity = useAIActions();
  const [isActivityStreamOpen, setIsActivityStreamOpen] = useState(false);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      <WorkspaceHeader
        isActivityStreamOpen={isActivityStreamOpen}
        proposedCount={aiActivity.proposedCount}
        onToggleActivityStream={() => setIsActivityStreamOpen((prev) => !prev)}
      />

      <main className="flex-1 w-full h-[calc(100vh-3.5rem)] relative overflow-hidden">
        {/* The 60fps Infinite Interactive Canvas */}
        <InfiniteCanvas canvas={canvas} />

        {/* Phase 4.1: Floating Active Command Bar */}
        <ActiveCommandBar canvas={canvas} />

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
      </main>
    </div>
  );
}

export default function App() {
  return (
    <RoomProvider>
      <Workspace />
    </RoomProvider>
  );
}
