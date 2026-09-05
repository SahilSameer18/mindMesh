import { RoomProvider } from "./context/RoomContext.jsx";
import { useCanvas } from "./hooks/useCanvas.js";
import InfiniteCanvas from "./components/canvas/InfiniteCanvas.jsx";
import WorkspaceHeader from "./components/ui/WorkspaceHeader.jsx";

function Workspace() {
  const canvas = useCanvas();

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      <WorkspaceHeader />
      <main className="flex-1 w-full h-[calc(100vh-3.5rem)] relative overflow-hidden">
        <InfiniteCanvas canvas={canvas} />
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
