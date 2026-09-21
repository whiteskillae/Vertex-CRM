"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <h1 className="text-4xl font-bold tracking-tighter uppercase">CRM</h1>
        <p className="text-[10px] uppercase tracking-[0.5em] mt-2">Loading...</p>
      </div>
    </div>
  );
}
