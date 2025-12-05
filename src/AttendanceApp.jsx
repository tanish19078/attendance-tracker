import React, { useState, useEffect } from 'react';

// --- Inline Icons (No external dependencies needed) ---
const Icon = ({ d, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{d}</svg>
);

const Icons = {
    Zap: (p) => <Icon {...p} d={<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>} />,
    RotateCcw: (p) => <Icon {...p} d={<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12"/><path d="M3 3v9h9"/></>} />,
    Calendar: (p) => <Icon {...p} d={<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} />,
    Trash2: (p) => <Icon {...p} d={<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></>} />,
    Plus: (p) => <Icon {...p} d={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>} />,
    CheckCircle: (p) => <Icon {...p} d={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>} />,
    AlertTriangle: (p) => <Icon {...p} d={<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} />,
    X: (p) => <Icon {...p} d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />,
    Target: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>} />,
    Book: (p) => <Icon {...p} d={<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>} />,
};

const AttendanceApp = () => {
    const [targetPercentage, setTargetPercentage] = useState(75);
    const [semesterEndDate, setSemesterEndDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 45); 
        return d.toISOString().split('T')[0];
    });
    const [holidays, setHolidays] = useState([]); 
    const [leaves, setLeaves] = useState([]);
    const [newHoliday, setNewHoliday] = useState('');
    const [newLeave, setNewLeave] = useState('');
    
    const [subjects, setSubjects] = useState([
        { id: 1, name: 'Advanced Mathematics', delivered: 20, attended: 15, dl: 0, schedule: [0, 1, 0, 1, 0, 1, 0] }
    ]);

    // --- Persistence ---
    useEffect(() => {
        const saved = localStorage.getItem('attendanceApp_light_v2');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.targetPercentage) setTargetPercentage(data.targetPercentage);
                if (data.semesterEndDate) setSemesterEndDate(data.semesterEndDate);
                if (data.holidays) setHolidays(data.holidays);
                if (data.leaves) setLeaves(data.leaves);
                if (data.subjects) setSubjects(data.subjects);
            } catch(e) {}
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('attendanceApp_light_v2', JSON.stringify({
            targetPercentage, semesterEndDate, holidays, leaves, subjects
        }));
    }, [targetPercentage, semesterEndDate, holidays, leaves, subjects]);

    const handleReset = () => {
        if (window.confirm("Start Fresh?")) {
            setSubjects([]);
            setHolidays([]);
            setLeaves([]);
            setTargetPercentage(75);
            const d = new Date();
            d.setDate(d.getDate() + 45);
            setSemesterEndDate(d.toISOString().split('T')[0]);
        }
    };

    const calculateProjections = (subject) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const end = new Date(semesterEndDate);
        end.setHours(0,0,0,0);
        
        let futureDates = []; 
        let currentDay = new Date(today);
        currentDay.setDate(currentDay.getDate() + 1);

        while (currentDay <= end) {
            const dateString = currentDay.toISOString().split('T')[0];
            const dayOfWeek = currentDay.getDay(); 
            const isHoliday = holidays.includes(dateString);
            const isLeave = leaves.includes(dateString);

            if (!isHoliday && !isLeave) {
                const classesCount = (subject.schedule[dayOfWeek] || 0);
                for (let i = 0; i < classesCount; i++) {
                    futureDates.push(new Date(currentDay));
                }
            }
            currentDay.setDate(currentDay.getDate() + 1);
        }

        const currentEffective = Number(subject.attended) + Number(subject.dl);
        const totalDelivered = Number(subject.delivered);
        const futureClassesCount = futureDates.length;
        const finalTotal = totalDelivered + futureClassesCount;
        
        const requiredTotal = Math.ceil((targetPercentage / 100) * finalTotal);
        const needed = requiredTotal - currentEffective;

        let recommendedDates = [];
        if (needed > 0 && needed <= futureClassesCount) {
            const uniqueFutureDates = [...new Set(futureDates.map(d => d.toISOString().split('T')[0]))].map(d => new Date(d));
            recommendedDates = uniqueFutureDates.slice(0, Math.ceil(needed));
        }

        return {
            currentPct: totalDelivered === 0 ? 0 : ((currentEffective / totalDelivered) * 100).toFixed(1),
            futureClasses: futureClassesCount,
            finalTotal,
            needed,
            requiredTotal,
            currentEffective,
            recommendedDates
        };
    };

    const addDate = (list, setList, val, setVal) => {
        if (val && !list.includes(val)) {
            setList([...list, val].sort());
            setVal('');
        }
    };
    const removeDate = (list, setList, val) => setList(list.filter(d => d !== val));
    
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
            schedule: [0, 1, 1, 1, 1, 1, 0]
        }]);
    };

    const getDayName = (idx) => ['S', 'M', 'T', 'W', 'T', 'F', 'S'][idx];
    const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div className="min-h-screen pb-24 p-4 md:p-8">
            
            {/* --- Navbar --- */}
            <div className="max-w-5xl mx-auto mb-8 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Icons.Book className="w-6 h-6 text-indigo-600" />
                    Attendance Planner
                </h1>
                <button onClick={handleReset} className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-2 text-sm font-medium border border-slate-200 rounded-lg px-3 py-1.5 bg-white hover:bg-slate-50">
                    <Icons.RotateCcw className="w-4 h-4" /> Reset
                </button>
            </div>

            {/* --- Control Center --- */}
            <div className="max-w-5xl mx-auto mb-10">
                <div className="glass-card rounded-2xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Stats Cards */}
                        <div className="col-span-1 md:col-span-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                                <Icons.Target className="w-3 h-3" /> Target %
                            </label>
                            <div className="flex items-end gap-2">
                                <input type="number" value={targetPercentage} onChange={e => setTargetPercentage(Number(e.target.value))} 
                                    className="bg-transparent text-3xl font-bold text-indigo-600 outline-none w-20" />
                                <span className="text-slate-400 font-bold mb-1">%</span>
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-4 bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                                <Icons.Calendar className="w-3 h-3" /> Semester Ends
                            </label>
                            <input type="date" value={semesterEndDate} onChange={e => setSemesterEndDate(e.target.value)} 
                                className="bg-transparent text-slate-700 text-lg font-medium outline-none w-full" />
                        </div>

                        {/* Exception Management */}
                        <div className="col-span-1 md:col-span-5 flex flex-col justify-between">
                            {/* Holidays */}
                            <div className="flex items-center gap-2 mb-3">
                                <input type="date" value={newHoliday} onChange={e => setNewHoliday(e.target.value)} 
                                    className="input-light rounded-lg p-2 text-xs flex-grow" />
                                <button onClick={() => addDate(holidays, setHolidays, newHoliday, setNewHoliday)} 
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3 py-2 rounded-lg text-xs font-bold transition-all">
                                    Holiday
                                </button>
                            </div>
                            {/* Leaves */}
                            <div className="flex items-center gap-2">
                                <input type="date" value={newLeave} onChange={e => setNewLeave(e.target.value)} 
                                    className="input-light rounded-lg p-2 text-xs flex-grow" />
                                <button onClick={() => addDate(leaves, setLeaves, newLeave, setNewLeave)} 
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 px-3 py-2 rounded-lg text-xs font-bold transition-all">
                                    My Leave
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Chips Display */}
                    {(holidays.length > 0 || leaves.length > 0) && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                            {holidays.map(date => (
                                <div key={date} className="text-xs bg-rose-50 text-rose-600 border border-rose-200 px-2 py-1 rounded-md flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                                    {formatDate(date)}
                                    <button onClick={() => removeDate(holidays, setHolidays, date)}><Icons.X className="w-3 h-3 hover:text-rose-800" /></button>
                                </div>
                            ))}
                            {leaves.map(date => (
                                <div key={date} className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-1 rounded-md flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    {formatDate(date)}
                                    <button onClick={() => removeDate(leaves, setLeaves, date)}><Icons.X className="w-3 h-3 hover:text-amber-800" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- Subjects Grid --- */}
            <div className="max-w-5xl mx-auto space-y-6">
                {subjects.map(sub => {
                    const stats = calculateProjections(sub);
                    
                    // Visual States
                    let statusConfig = {
                        color: 'border-l-4 border-l-slate-400',
                        bg: 'bg-slate-50',
                        text: 'text-slate-500',
                        message: 'Calculating...',
                        icon: <Icons.Target className="w-5 h-5" />
                    };

                    if (stats.needed <= 0) {
                        // SAFE
                        const surplus = (stats.currentEffective + stats.futureClasses) - stats.requiredTotal;
                        const safeBunks = Math.min(surplus, stats.futureClasses);
                        statusConfig = {
                            color: 'border-l-4 border-l-emerald-500',
                            bg: 'bg-emerald-50',
                            text: 'text-emerald-700',
                            message: `Safe Zone. You can bunk ${safeBunks} more classes.`,
                            icon: <Icons.CheckCircle className="w-5 h-5 text-emerald-600" />
                        };
                    } else if (stats.needed > stats.futureClasses) {
                        // IMPOSSIBLE
                        const maxPct = stats.finalTotal === 0 ? 0 : (((stats.currentEffective + stats.futureClasses) / stats.finalTotal) * 100).toFixed(1);
                        statusConfig = {
                            color: 'border-l-4 border-l-rose-500',
                            bg: 'bg-rose-50',
                            text: 'text-rose-700',
                            message: `Goal Unreachable. Max possible: ${maxPct}%`,
                            icon: <Icons.AlertTriangle className="w-5 h-5 text-rose-600" />
                        };
                    } else {
                        // WARNING
                        const canBunk = stats.futureClasses - stats.needed;
                        statusConfig = {
                            color: 'border-l-4 border-l-amber-500',
                            bg: 'bg-amber-50',
                            text: 'text-amber-700',
                            message: `Action Required. Attend ${stats.needed} of next ${stats.futureClasses}.`,
                            icon: <Icons.Zap className="w-5 h-5 text-amber-600" />
                        };
                    }

                    return (
                        <div key={sub.id} className={`glass-card rounded-xl overflow-hidden ${statusConfig.color} transition-all hover:translate-y-[-2px]`}>
                            
                            {/* Header Section */}
                            <div className="p-6 flex flex-col md:flex-row gap-6 md:items-start border-b border-slate-100">
                                <div className="flex-grow">
                                    <input 
                                        value={sub.name} 
                                        onChange={e => updateSubjectField(sub.id, 'name', e.target.value)} 
                                        className="bg-transparent text-xl font-bold text-slate-800 w-full outline-none placeholder-slate-300 mb-2" 
                                        placeholder="Subject Name" 
                                    />
                                    <div className="flex items-center gap-3">
                                        <div className={`px-2 py-1 rounded text-xs font-bold ${Number(stats.currentPct) >= targetPercentage ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {stats.currentPct}% Current
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium">
                                            {stats.futureClasses} sessions remaining
                                        </div>
                                    </div>
                                </div>

                                {/* Minimal Inputs */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-center min-w-[80px]">
                                        <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Delivered</div>
                                        <input type="number" value={sub.delivered || ''} onChange={e => updateSubjectField(sub.id, 'delivered', e.target.value)} 
                                            className="w-full bg-transparent text-center font-mono font-bold text-slate-700 outline-none" placeholder="0" />
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-center min-w-[80px]">
                                        <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Attended</div>
                                        <input type="number" value={sub.attended || ''} onChange={e => updateSubjectField(sub.id, 'attended', e.target.value)} 
                                            className="w-full bg-transparent text-center font-mono font-bold text-slate-700 outline-none" placeholder="0" />
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-center min-w-[80px]">
                                        <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">DL / ML</div>
                                        <input type="number" value={sub.dl || ''} onChange={e => updateSubjectField(sub.id, 'dl', e.target.value)} 
                                            className="w-full bg-transparent text-center font-mono font-bold text-slate-700 outline-none" placeholder="0" />
                                    </div>
                                </div>
                            </div>

                            {/* Action & Schedule Footer */}
                            <div className="grid grid-cols-1 md:grid-cols-2">
                                
                                {/* Status Message */}
                                <div className={`p-6 flex flex-col justify-center ${statusConfig.bg}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        {statusConfig.icon}
                                        <span className={`font-bold ${statusConfig.text}`}>{statusConfig.message}</span>
                                    </div>
                                    
                                    {/* Recommendations */}
                                    {stats.needed > 0 && stats.recommendedDates.length > 0 && (
                                        <div className="mt-2">
                                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Upcoming Required Dates:</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {stats.recommendedDates.map((d, i) => (
                                                    <div key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600 shadow-sm">
                                                        {d.toLocaleDateString('en-US', {weekday:'short', day:'numeric'})}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Mini Schedule Editor */}
                                <div className="p-6 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Weekly Schedule</label>
                                            <button onClick={() => setSubjects(subjects.filter(s => s.id !== sub.id))} className="text-slate-400 hover:text-rose-500 transition-colors">
                                                <Icons.Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {sub.schedule.map((count, dayIdx) => (
                                                <div key={dayIdx} className="flex flex-col items-center">
                                                    <span className="text-[9px] text-slate-400 mb-1">{getDayName(dayIdx)}</span>
                                                    <input 
                                                        type="number" min="0" max="5" 
                                                        value={count} 
                                                        onChange={(e) => updateSubjectSchedule(sub.id, dayIdx, e.target.value)} 
                                                        className={`w-full text-center p-1 rounded text-xs font-bold outline-none border transition-colors
                                                            ${count > 0 
                                                                ? 'bg-white border-indigo-200 text-indigo-600 shadow-sm' 
                                                                : 'bg-slate-100 border-transparent text-slate-400'}`} 
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Add Button */}
                <button onClick={addNewSubject} className="w-full py-6 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold uppercase tracking-wider hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 group">
                    <Icons.Plus className="w-5 h-5 group-hover:scale-110 transition-transform" /> Add Subject
                </button>
            </div>
        </div>
    );
};

export default AttendanceApp;
