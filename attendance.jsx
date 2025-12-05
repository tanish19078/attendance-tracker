import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, BookOpen, AlertCircle, CheckCircle, X, RotateCcw, Save } from 'lucide-react';

// --- Utility: Date Helpers ---
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getDayName = (dayIndex) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex];
};

// --- Main Component ---
const AttendanceApp = () => {
  // --- State ---
  // Default to 75% and a date roughly 1 month from now if not set
  const [targetPercentage, setTargetPercentage] = useState(75);
  const [semesterEndDate, setSemesterEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  
  const [holidays, setHolidays] = useState([]); 
  const [newHoliday, setNewHoliday] = useState('');
  
  // Generic Example Data for new users
  const [subjects, setSubjects] = useState([
    { 
      id: 1, 
      name: 'Example Subject (Maths)', 
      delivered: 20, 
      attended: 15, 
      dl: 0, 
      schedule: [0, 1, 0, 1, 0, 1, 0] // Mon, Wed, Fri
    }
  ]);

  // --- Persistence ---
  useEffect(() => {
    const saved = localStorage.getItem('attendanceApp_v4_custom');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.targetPercentage) setTargetPercentage(data.targetPercentage);
        if (data.semesterEndDate) setSemesterEndDate(data.semesterEndDate);
        if (data.holidays) setHolidays(data.holidays);
        if (data.subjects) setSubjects(data.subjects);
      } catch(e) { console.error("Load Error", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('attendanceApp_v4_custom', JSON.stringify({
      targetPercentage, semesterEndDate, holidays, subjects
    }));
  }, [targetPercentage, semesterEndDate, holidays, subjects]);

  // --- Reset Feature ---
  const handleReset = () => {
    if (window.confirm("Start Fresh? This will delete all current subjects and settings.")) {
      setSubjects([]);
      setHolidays([]);
      setTargetPercentage(75);
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setSemesterEndDate(d.toISOString().split('T')[0]);
      localStorage.removeItem('attendanceApp_v4_custom');
    }
  };

  // --- Core Logic: The Simulation ---
  const calculateProjections = (subject) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const end = new Date(semesterEndDate);
    end.setHours(0,0,0,0);

    let futureClasses = 0;
    
    // Start counting from TOMORROW
    const currentDay = new Date(today);
    currentDay.setDate(currentDay.getDate() + 1);

    // Loop through every day until end date
    while (currentDay <= end) {
      const dateString = currentDay.toISOString().split('T')[0];
      const dayOfWeek = currentDay.getDay(); // 0-6
      
      const isHoliday = holidays.includes(dateString);

      if (!isHoliday) {
        futureClasses += (subject.schedule[dayOfWeek] || 0);
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }

    const currentEffective = Number(subject.attended) + Number(subject.dl);
    const totalDelivered = Number(subject.delivered);
    const finalTotal = totalDelivered + futureClasses;
    
    const requiredTotal = Math.ceil((targetPercentage / 100) * finalTotal);
    const needed = requiredTotal - currentEffective;

    return {
      currentPct: totalDelivered === 0 ? 0 : ((currentEffective / totalDelivered) * 100).toFixed(2),
      futureClasses,
      finalTotal,
      needed,
      requiredTotal,
      currentEffective
    };
  };

  // --- Handlers ---
  const addHoliday = () => {
    if (newHoliday && !holidays.includes(newHoliday)) {
      setHolidays([...holidays, newHoliday].sort());
      setNewHoliday('');
    }
  };

  const removeHoliday = (date) => {
    setHolidays(holidays.filter(h => h !== date));
  };

  const updateSubjectSchedule = (id, dayIndex, val) => {
    setSubjects(subjects.map(s => {
      if (s.id !== id) return s;
      const newSchedule = [...s.schedule];
      newSchedule[dayIndex] = Number(val);
      return { ...s, schedule: newSchedule };
    }));
  };

  const updateSubjectField = (id, field, val) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const addNewSubject = () => {
    setSubjects([...subjects, {
      id: Date.now(),
      name: '',
      delivered: 0,
      attended: 0,
      dl: 0,
      schedule: [0, 1, 1, 1, 1, 1, 0] // Default Mon-Fri
    }]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">
      
      {/* --- Top Bar --- */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-600" />
                Attendance Planner
              </h1>
              <p className="text-xs text-slate-400 mt-1">Plan your bunks smartly</p>
            </div>
            
            <button 
              onClick={handleReset}
              className="text-xs flex items-center gap-1 text-slate-400 hover:text-red-600 transition-colors border border-slate-200 rounded px-2 py-1"
            >
              <RotateCcw className="w-3 h-3" /> Reset App
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            {/* Target % */}
            <div className="col-span-1 md:col-span-3">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Target %</label>
              <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-slate-200 shadow-sm">
                <input 
                  type="number" 
                  value={targetPercentage}
                  onChange={e => setTargetPercentage(Number(e.target.value))}
                  className="w-full bg-transparent outline-none font-bold text-indigo-600 text-lg"
                  placeholder="75"
                />
                <span className="text-slate-400 text-sm font-bold">%</span>
              </div>
            </div>

            {/* End Date */}
            <div className="col-span-1 md:col-span-4">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Semester Ends</label>
              <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-slate-200 shadow-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input 
                  type="date" 
                  value={semesterEndDate}
                  onChange={e => setSemesterEndDate(e.target.value)}
                  className="w-full bg-transparent outline-none font-medium text-slate-700"
                />
              </div>
            </div>

            {/* Holiday Manager */}
            <div className="col-span-1 md:col-span-5">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Add Holidays</label>
              <div className="flex gap-2">
                <div className="flex-grow flex items-center gap-2 bg-white rounded-lg p-2 border border-slate-200 shadow-sm">
                  <input 
                    type="date" 
                    value={newHoliday}
                    onChange={e => setNewHoliday(e.target.value)}
                    className="w-full bg-transparent outline-none text-slate-700 text-sm"
                  />
                </div>
                <button 
                  onClick={addHoliday}
                  className="bg-indigo-600 text-white px-4 rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
          
          {/* Holiday Chips */}
          {holidays.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 max-h-16 overflow-y-auto">
              {holidays.map(date => (
                <div key={date} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-md flex items-center gap-1 border border-red-100">
                  <Calendar className="w-3 h-3" />
                  {formatDate(date)}
                  <button onClick={() => removeHoliday(date)} className="hover:text-red-800"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- Subjects List --- */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {subjects.length === 0 && (
          <div className="text-center py-12 opacity-50">
            <BookOpen className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-slate-500">No subjects yet. Add one to start planning!</p>
          </div>
        )}

        {subjects.map(sub => {
          const stats = calculateProjections(sub);
          
          let statusColor = "bg-slate-50 border-slate-200";
          let statusText = "";
          let statusIcon = null;

          if (stats.needed <= 0) {
            const surplus = (stats.currentEffective + stats.futureClasses) - stats.requiredTotal;
            const safeBunks = Math.min(surplus, stats.futureClasses);
            statusColor = "bg-emerald-50 border-emerald-200 text-emerald-800";
            statusText = `Safe! You can bunk ${safeBunks} more classes.`;
            statusIcon = <CheckCircle className="w-5 h-5 text-emerald-600" />;
          } else if (stats.needed > stats.futureClasses) {
            statusColor = "bg-red-50 border-red-200 text-red-800";
            const maxPct = stats.finalTotal === 0 ? 0 : (((stats.currentEffective + stats.futureClasses) / stats.finalTotal) * 100).toFixed(1);
            statusText = `Impossible. Max possible is ${maxPct}%`;
            statusIcon = <AlertCircle className="w-5 h-5 text-red-600" />;
          } else {
            statusColor = "bg-amber-50 border-amber-200 text-amber-800";
            const canBunk = stats.futureClasses - stats.needed;
            statusText = `Must attend ${stats.needed} of next ${stats.futureClasses}. (Bunk limit: ${canBunk})`;
            statusIcon = <AlertCircle className="w-5 h-5 text-amber-600" />;
          }

          return (
            <div key={sub.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              
              {/* Header */}
              <div className="p-4 flex justify-between items-start border-b border-slate-100">
                <div className="flex-grow">
                  <input 
                    value={sub.name}
                    onChange={e => updateSubjectField(sub.id, 'name', e.target.value)}
                    className="text-lg font-bold text-slate-800 placeholder-slate-300 w-full outline-none"
                    placeholder="Subject Name (e.g. Physics)"
                  />
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                     <span className={`font-bold px-1.5 py-0.5 rounded ${Number(stats.currentPct) >= targetPercentage ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                       {stats.currentPct}% Current
                     </span>
                     <span>• {stats.futureClasses} classes left in semester</span>
                  </div>
                </div>
                <button onClick={() => setSubjects(subjects.filter(s => s.id !== sub.id))} className="text-slate-300 hover:text-red-500 p-2">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Data Inputs */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                <div className="p-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Delivered</label>
                  <input type="number" placeholder="0" className="w-full font-mono font-medium text-slate-700 outline-none placeholder-slate-200" 
                    value={sub.delivered || ''} onChange={e => updateSubjectField(sub.id, 'delivered', e.target.value)} />
                </div>
                <div className="p-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Attended</label>
                  <input type="number" placeholder="0" className="w-full font-mono font-medium text-slate-700 outline-none placeholder-slate-200" 
                    value={sub.attended || ''} onChange={e => updateSubjectField(sub.id, 'attended', e.target.value)} />
                </div>
                <div className="p-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">DL / ML</label>
                  <input type="number" placeholder="0" className="w-full font-mono font-medium text-slate-700 outline-none placeholder-slate-200" 
                    value={sub.dl || ''} onChange={e => updateSubjectField(sub.id, 'dl', e.target.value)} />
                </div>
              </div>

              {/* Timetable Configuration */}
              <div className="p-3 bg-slate-50 border-b border-slate-100">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Weekly Schedule (Classes per Day)</label>
                <div className="grid grid-cols-7 gap-1">
                  {sub.schedule.map((count, dayIdx) => (
                    <div key={dayIdx} className="flex flex-col items-center group relative">
                      <span className="text-[10px] text-slate-400 font-medium mb-1">{getDayName(dayIdx)}</span>
                      <input 
                        type="number" 
                        min="0" 
                        max="5"
                        value={count}
                        onChange={(e) => updateSubjectSchedule(sub.id, dayIdx, e.target.value)}
                        className={`w-full text-center p-1 rounded border text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500 transition-all
                          ${count > 0 ? 'bg-white border-indigo-200 text-indigo-600 shadow-sm' : 'bg-transparent border-transparent text-slate-300 hover:bg-slate-200'}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Result Bar */}
              <div className={`p-4 flex items-center gap-3 ${statusColor}`}>
                {statusIcon}
                <span className="text-sm font-medium">{statusText}</span>
              </div>
            </div>
          );
        })}

        {/* Add Subject Button */}
        <button 
          onClick={addNewSubject} 
          className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-medium hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Subject
        </button>
      </div>

    </div>
  );
};

export default AttendanceApp;
