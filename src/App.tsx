import { useEffect } from "react";
import "./App.css";

function App() {
  // Throwaway Phase 0 check: proves random-state scramble generation works in
  // the browser. Replaced by src/scramble/ in Phase 2.
  useEffect(() => {
    if (import.meta.env.MODE === "test") return;
    void (async () => {
      const { randomScrambleForEvent } = await import("cubing/scramble");
      const scramble = await randomScrambleForEvent("333");
      console.log("Random-state 3x3 scramble:", scramble.toString());
    })();
  }, []);

  return (
    <main>
      <h1>CubeTimer</h1>
    </main>
  );
}

export default App;
