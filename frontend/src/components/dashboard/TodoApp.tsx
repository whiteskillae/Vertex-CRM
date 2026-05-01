"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle, Circle, ListTodo, Loader2 } from "lucide-react";
import api from "@/lib/api";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

export default function TodoApp() {
  const [todos, setTodos] = useState<any[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller);
    return () => controller.abort();
  }, []);

  const fetchData = async (controller?: AbortController) => {
    try {
      const [todosRes, tasksRes] = await Promise.all([
        api.get("todos", { signal: controller?.signal }),
        api.get("tasks", { signal: controller?.signal })
      ]);
      setTodos(todosRes.data);
      const taskList = tasksRes.data?.tasks || (Array.isArray(tasksRes.data) ? tasksRes.data : []);
      setAssignedTasks(taskList.filter((t: any) => t.status !== 'completed'));
    } catch (err: any) {
      if (!axios.isCancel(err) && err.name !== "AbortError") console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    try {
      const { data } = await api.post("todos", { text: input });
      setTodos([data, ...todos]);
      setInput("");
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTodo = async (id: string) => {
    try {
      const { data } = await api.put(`todos/${id}`);
      setTodos(todos.map(t => t._id === id ? data : t));
    } catch (err) {
      console.error(err);
    }
  };

  const removeTodo = async (id: string) => {
    try {
      await api.delete(`todos/${id}`);
      setTodos(todos.filter(t => t._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto h-6 w-6" /></div>;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Assigned Tasks Section */}
      <div className="p-4 bg-zinc-900 text-white">
        <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center">
          <CheckCircle className="mr-2 h-3 w-3 text-green-500" /> Assigned Directives
        </h4>
      </div>
      <div className="max-h-[200px] overflow-y-auto p-2 space-y-1 bg-gray-50 border-b-2 border-black">
        {assignedTasks.map((task) => (
          <div key={task._id} className="p-2 border border-black bg-white flex items-center justify-between">
            <span className="text-[9px] font-black uppercase truncate flex-1">{task.title}</span>
            <span className={`text-[7px] font-black px-1 border border-black uppercase ${
              task.priority === 'urgent' ? 'bg-red-600 text-white' : 'bg-gray-100 text-black'
            }`}>
              {task.priority}
            </span>
          </div>
        ))}
        {assignedTasks.length === 0 && (
          <p className="text-[8px] text-center py-4 font-bold text-gray-400 uppercase">No active directives</p>
        )}
      </div>

      <div className="p-4 border-b-2 border-black">
        <h3 className="text-xs font-black uppercase flex items-center">
          <ListTodo className="mr-2 h-4 w-4" /> Personal Nodes
        </h3>
      </div>

      <form onSubmit={addTodo} className="p-3 border-b-2 border-black flex gap-2 bg-gray-50">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="New personal task..."
          className="flex-1 px-3 py-1.5 border-2 border-black focus:outline-none text-[10px] font-bold uppercase"
        />
        <button 
          type="submit"
          className="bg-black text-white p-1.5 border-2 border-black hover:bg-white hover:text-black transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[300px]">
        <AnimatePresence initial={false}>
          {todos.map((todo) => (
            <motion.div 
              key={todo._id}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 10, opacity: 0 }}
              className={`flex items-center p-2 border border-black transition-all ${
                todo.completed ? "bg-gray-50 opacity-40" : "bg-white"
              }`}
            >
              <button onClick={() => toggleTodo(todo._id)} className="mr-2">
                {todo.completed ? (
                  <CheckCircle className="h-4 w-4 text-black" />
                ) : (
                  <Circle className="h-4 w-4 text-black" />
                )}
              </button>
              <span className={`flex-1 text-[9px] font-bold uppercase tracking-tight ${todo.completed ? "line-through" : ""}`}>
                {todo.text}
              </span>
              <button 
                onClick={() => removeTodo(todo._id)}
                className="text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-2 bg-black text-white text-[8px] font-black uppercase text-center tracking-[0.2em]">
        {todos.filter(t => !t.completed).length} Nodes Pending
      </div>
    </div>
  );
}

