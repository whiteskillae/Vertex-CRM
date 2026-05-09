"use client";

import { useState, useEffect } from "react";

export const ClockDisplay = () => {
  const [time, setTime] = useState("");
  
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    }));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return <>{time || "00:00"}</>;
};
