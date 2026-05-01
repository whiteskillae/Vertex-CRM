"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import axios from "axios";
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths 
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, X } from "lucide-react";
import { motion } from "framer-motion";


export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", description: "", type: "note", isPersonal: true });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) setUser(JSON.parse(userData));
    
    const controller = new AbortController();
    fetchItems(controller);
    return () => controller.abort();
  }, [currentMonth]);

  const fetchItems = async (controller?: AbortController) => {
    try {
      const [tasksRes, notesRes] = await Promise.all([
        api.get("tasks", { signal: controller?.signal }),
        api.get("calendar", { signal: controller?.signal })
      ]);
      
      // Handle paginated or direct array responses
      const taskData = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.tasks || []);
      const noteData = Array.isArray(notesRes.data) ? notesRes.data : (notesRes.data.notes || []);

      setTasks(taskData);
      setNotes(noteData);
    } catch (err: any) {
      if (!axios.isCancel(err) && err.name !== "AbortError") console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    try {
      const { data } = await api.post("calendar", {
        ...newNote,
        date: selectedDate,
      });
      setNotes([...notes, data]);
      setIsNoteModalOpen(false);
      setNewNote({ title: "", description: "", type: "note", isPersonal: true });
    } catch (err) {
      console.error(err);
    }
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  return (
    <div className="bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full min-h-[600px] relative">
      <div className="p-4 border-b-2 border-black flex items-center justify-between bg-zinc-50">
        <h3 className="text-sm font-black uppercase flex items-center tracking-widest">
          <CalendarIcon className="mr-3 h-5 w-5" /> {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex space-x-1">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 border-2 border-black hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 border-2 border-black hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 bg-black text-white text-[9px] font-black uppercase text-center py-2 tracking-widest">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 border-b-2 border-black">
        {days.map((day, i) => {
          const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));
          const dayNotes = notes.filter(n => n.date && isSameDay(new Date(n.date), day));
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <div 
              key={i}
              onClick={() => {
                setSelectedDate(day);
                setIsNoteModalOpen(true);
              }}
              className={`min-h-[120px] p-2 border-[1px] border-gray-100 flex flex-col group transition-colors cursor-pointer ${
                !isCurrentMonth ? "bg-gray-50 opacity-30" : "bg-white hover:bg-zinc-50"
              } ${isToday ? "bg-yellow-50/30" : ""}`}
            >
              <span className={`text-[10px] font-black mb-2 flex items-center justify-center w-6 h-6 border-2 transition-all ${
                isToday ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_#16a34a]" : "border-transparent group-hover:border-black"
              }`}>
                {format(day, "d")}
              </span>
              
              <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                {/* Deadlines / Tasks */}
                {dayTasks.map((task, idx) => (
                  <div 
                    key={`t-${idx}`}
                    className={`text-[7px] font-black p-1 border border-black truncate uppercase tracking-tighter ${
                      task.priority === 'urgent' ? 'bg-red-600 text-white' : 
                      task.priority === 'high' ? 'bg-orange-500 text-white' : 'bg-black text-white'
                    }`}
                    title={`Deadline: ${task.title}`}
                  >
                    🚩 {task.title}
                  </div>
                ))}

                {/* Notes */}
                {dayNotes.map((note, idx) => (
                  <div 
                    key={`n-${idx}`}
                    className={`text-[7px] font-bold p-1 border border-black truncate uppercase tracking-tighter ${
                      note.isPersonal ? 'bg-yellow-100 border-dashed' : 'bg-blue-600 text-white'
                    }`}
                  >
                    {note.isPersonal ? "📝" : "📢"} {note.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Note Modal */}
      {isNoteModalOpen && selectedDate && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-4 border-black w-full max-w-sm p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black uppercase tracking-widest italic">
                {format(selectedDate, "MMM dd, yyyy")} - Protocol Log
              </h4>
              <button onClick={() => setIsNoteModalOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleAddNote} className="space-y-3">
              <input 
                type="text" 
                placeholder="ENTRY TITLE..." 
                autoFocus
                className="w-full border-2 border-black p-2 text-xs font-bold uppercase"
                value={newNote.title}
                onChange={e => setNewNote({...newNote, title: e.target.value})}
              />
              <textarea 
                placeholder="ENTRY DETAILS..." 
                className="w-full border-2 border-black p-2 text-xs font-bold h-20"
                value={newNote.description}
                onChange={e => setNewNote({...newNote, description: e.target.value})}
              />
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-[8px] font-black uppercase cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newNote.isPersonal} 
                    onChange={e => setNewNote({...newNote, isPersonal: e.target.checked})}
                    className="w-3 h-3 accent-black"
                  />
                  Personal Note
                </label>
                {user?.role !== 'employee' && (
                  <select 
                    value={newNote.type} 
                    onChange={e => setNewNote({...newNote, type: e.target.value})}
                    className="flex-1 border-2 border-black p-1 text-[8px] font-bold uppercase"
                  >
                    <option value="note">Note</option>
                    <option value="deadline">Deadline Alert</option>
                    <option value="alert">Security Alert</option>
                  </select>
                )}
              </div>

              <button className="w-full py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black border-2 border-black transition-all">
                Sync with Calendar Node
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <div className="p-3 bg-black text-white text-[9px] flex items-center justify-between font-black uppercase tracking-[0.2em]">
        <div className="flex items-center">
          <Clock className="h-3 w-3 mr-2 text-green-500" /> System Time: {format(new Date(), "HH:mm")}
        </div>
        <div className="text-gray-400">
          Node Status: Operational
        </div>
      </div>
    </div>
  );
}

