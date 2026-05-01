import { cn } from "@/lib/utils";
import { useState } from "react";

export const GradientBlurBg = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen w-full bg-white relative">
      {/* Purple Gradient Grid Right Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #f0f0f0 1px, transparent 1px),
            linear-gradient(to bottom, #f0f0f0 1px, transparent 1px),
            radial-gradient(circle 800px at 100% 200px, #d5c5ff, transparent)
          `,
          backgroundSize: "96px 64px, 96px 64px, 100% 100%",
        }}
      />
      {/* Your Content/Components */}
      <div className="relative z-10 p-8">
        <h1 className="text-4xl font-bold">Gradient Blur Background</h1>
        <button 
          onClick={() => setCount(count + 1)}
          className="mt-4 px-4 py-2 bg-black text-white rounded"
        >
          Count: {count}
        </button>
      </div>
    </div>
  );
};
