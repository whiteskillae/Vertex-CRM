// This is file of your component
// You can use any dependencies from npm; we import them automatically in package.json

import { cn } from "@/lib/utils";
import { useState } from "react";

export default function DemoComponent() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen w-full bg-[#f9fafb] relative">
      {/* Diagonal Fade Grid Background - Top Left */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #d1d5db 1px, transparent 1px),
            linear-gradient(to bottom, #d1d5db 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)",
        }}
      />
      {/* Your Content/Components */}
      <div className="relative z-10 p-8">
        <h1 className="text-4xl font-bold">Diagonal Fade Grid</h1>
        <button 
          onClick={() => setCount(count + 1)}
          className="mt-4 px-4 py-2 bg-black text-white rounded"
        >
          Count: {count}
        </button>
      </div>
    </div>
  );
}
