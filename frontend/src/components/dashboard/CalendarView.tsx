"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import axios from "axios";
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths 
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, X, Plus, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isDayViewModalOpen, setIsDayViewModalOpen] = useState(false);
  const [dayTasksView, setDayTasksView] = useState<any[]>([]);
  const [dayNotesView, setDayNotesView] = useState<any[]>([]);
  const [newNote, setNewNote] = useState({ title: "", description: "", type: "note", isPersonal: true });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchItems();
  }, [currentMonth]);

  const fetchItems = async () => {
    try {
      const [tasksRes, notesRes] = await Promise.all([
        api.get("tasks"),
        api.get("calendar")
      ]);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.tasks || []));
      setNotes(Array.isArray(notesRes.data) ? notesRes.data : (notesRes.data.notes || []));
    } catch (err) {
      console.error(err);
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
    } catch (err) { console.error(err); }
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  if (!mounted) return null;

  return (
    <div className="premium-card bg-card overflow-hidden flex flex-col h-full min-h-[600px]">
      {/* Calendar Header */}
      <div className="p-6 border-b border-border flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight">{format(currentMonth, "MMMM yyyy")}</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Enterprise Schedule</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-muted rounded-xl transition-all border border-border"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-muted rounded-xl transition-all border border-border"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 flex-1">
        {days.map((day, i) => {
          const dayTasks = tasks.filter(t => {
            if (!t.dueDate) return false;
            const d = new Date(t.dueDate);
            return !isNaN(d.getTime()) && isSameDay(d, day);
          });
          const dayNotes = notes.filter(n => {
            if (!n.date) return false;
            const d = new Date(n.date);
            return !isNaN(d.getTime()) && isSameDay(d, day);
          });
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <div 
              key={i}
              onClick={() => {
                setSelectedDate(day);
                setDayTasksView(dayTasks);
                setDayNotesView(dayNotes);
                setIsDayViewModalOpen(true);
              }}
              className={`relative min-h-[100px] p-3 border-r border-b border-border flex flex-col group hover:bg-muted/30 transition-all cursor-pointer ${
                !isCurrentMonth ? "opacity-20" : ""
              } ${isToday ? "bg-primary/5" : ""}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                  isToday ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-foreground group-hover:bg-muted"
                }`}>
                  {format(day, "d")}
                </span>
                {(dayTasks.length > 0 || dayNotes.length > 0) && (
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                )}
              </div>
              
              <div className="space-y-1.5 mt-1">
                {dayTasks.slice(0, 2).map((task, idx) => (
                  <div key={idx} className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded-md truncate uppercase tracking-tight">
                    {task.title}
                  </div>
                ))}
                {dayNotes.slice(0, 1).map((note, idx) => (
                  <div key={idx} className="px-2 py-0.5 bg-muted text-muted-foreground text-[9px] font-bold rounded-md truncate uppercase tracking-tight">
                    {note.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Status */}
      <div className="p-4 bg-muted/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <Clock className="w-3.5 h-3.5 text-emerald-500" />
          Protocol Sync Active • {format(new Date(), "HH:mm")}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(isNoteModalOpen || isDayViewModalOpen) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
              onClick={() => { setIsNoteModalOpen(false); setIsDayViewModalOpen(false); }}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative w-full max-w-md bg-card border border-border shadow-2xl rounded-[2rem] overflow-hidden"
            >
              {isDayViewModalOpen && selectedDate && (
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-bold tracking-tight">{format(selectedDate, "MMMM dd")}</h4>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Day Protocols</p>
                    </div>
                    <button onClick={() => setIsDayViewModalOpen(false)} className="p-2 hover:bg-muted rounded-xl transition-all"><X className="w-5 h-5" /></button>
                  </div>

                  <div className="space-y-6 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Active Tasks</h5>
                      {dayTasksView.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No tasks scheduled.</p>
                      ) : (
                        dayTasksView.map((t, i) => (
                          <div key={i} className="p-4 bg-muted/30 border border-border rounded-2xl">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold">{t.title}</span>
                              <span className="text-[9px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-md uppercase">{t.priority}</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => { setIsDayViewModalOpen(false); setIsNoteModalOpen(true); }}
                    className="w-full py-4 bg-primary text-primary-foreground rounded-2xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Protocol Entry
                  </button>
                </div>
              )}

              {isNoteModalOpen && selectedDate && (
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold">New Protocol Note</h4>
                    <button onClick={() => setIsNoteModalOpen(false)}><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={handleAddNote} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Title</label>
                      <input 
                        type="text" 
                        placeholder="Entry subject..." 
                        className="w-full p-4 bg-muted border border-border rounded-2xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all"
                        value={newNote.title}
                        onChange={e => setNewNote({...newNote, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Description</label>
                      <textarea 
                        placeholder="Detailed protocols..." 
                        className="w-full p-4 bg-muted border border-border rounded-2xl text-sm outline-none focus:ring-1 focus:ring-primary transition-all h-32 resize-none"
                        value={newNote.description}
                        onChange={e => setNewNote({...newNote, description: e.target.value})}
                      />
                    </div>
                    <button className="w-full py-4 bg-primary text-primary-foreground rounded-2xl text-xs font-bold uppercase tracking-widest transition-all">
                      Synchronize Node
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
