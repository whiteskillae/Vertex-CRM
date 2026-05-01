"use client";

import { useState, useEffect } from "react";

export type TrashItem = {
  id: string;
  type: "lead" | "task" | "report";
  data: any;
  deletedAt: number;
};

export const useTrash = () => {
  const [trash, setTrash] = useState<TrashItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("crm_trash");
    if (stored) {
      try {
        setTrash(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse trash storage", e);
      }
    }
  }, []);

  // Save to localStorage whenever trash changes
  useEffect(() => {
    localStorage.setItem("crm_trash", JSON.stringify(trash));
  }, [trash]);

  const addToTrash = (item: Omit<TrashItem, "deletedAt">) => {
    const newItem: TrashItem = {
      ...item,
      deletedAt: Date.now(),
    };
    setTrash((prev) => [newItem, ...prev].slice(0, 50)); // Limit to last 50 items
  };

  const removeFromTrash = (id: string) => {
    setTrash((prev) => prev.filter((item) => item.id !== id));
  };

  const clearTrash = () => {
    setTrash([]);
  };

  const getByType = (type: "lead" | "task" | "report") => {
    return trash.filter((item) => item.type === type);
  };

  return {
    trash,
    addToTrash,
    removeFromTrash,
    clearTrash,
    getByType,
  };
};
