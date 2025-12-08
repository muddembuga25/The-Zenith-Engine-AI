
import React, { useState } from 'react';
import type { RecurringSchedule } from '../types';
import { TrashIcon } from './Icons';

interface ScheduleManagerProps {
    schedules: RecurringSchedule[];
    onAdd: (schedule: Omit<RecurringSchedule, 'id' | 'isEnabled'>) => void;
    onDelete: (id: string) => void;
    onToggle: (id: string, isEnabled: boolean) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({ schedules, onAdd, onDelete, onToggle }) => {
    const [newSchedule, setNewSchedule] = useState<Omit<RecurringSchedule, 'id' | 'isEnabled'>>({ type: 'weekly', days: [], time: '09:00' });
    
    const handleAdd = () => {
        if (newSchedule.days.length === 0 || !newSchedule.time) {
            alert("Please select at least one day and set a time.");
            return;
        }
        onAdd(newSchedule);
        setNewSchedule({ type: 'weekly', days: [], time: '09:00' });
    };
    
    const handleWeekDayToggle = (day: number) => {
        setNewSchedule(prev => {
            const newDays = prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day];
            return { ...prev, days: newDays.sort((a: number, b: number) => a - b) };
        });
    };
    
    const handleMonthDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const days = e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d) && d >= 1 && d <= 31);
        setNewSchedule(prev => ({ ...prev, days: [...new Set(days)].sort((a: number, b: number) => a - b) }));
    };

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const formatSchedule = (schedule: RecurringSchedule) => {
        const time = ` at ${schedule.time}`;
        if (schedule.type === 'weekly') {
            if (schedule.days.length === 7) return `Every day${time}`;
            if (schedule.days.length === 0) return `Weekly (no days selected)${time}`;
            return `Weekly on ${schedule.days.map(d => weekDays[d]).join(', ')}${time}`;
        }
        if (schedule.type === 'monthly') {
            if (schedule.days.length === 0) return `Monthly (no days selected)${time}`;
            return `On day(s) ${schedule.days.join(', ')} of the month${time}`;
        }
        return 'Invalid Schedule';
    };

    return (
        <div className="space-y-8 p-4 bg-panel rounded-lg border border-border-subtle">
            <div>
                <h4 className="text-md font-semibold text-main">Add New Schedule</h4>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Schedule Type</label>
                            <div className="mt-2 grid grid-cols-2 gap-2 bg-panel-light rounded-lg p-1 w-full">
                                <button onClick={() => setNewSchedule(p => ({ ...p, type: 'weekly', days: [] }))} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${newSchedule.type === 'weekly' ? 'bg-brand-primary text-white' : 'text-text-secondary hover:bg-panel'}`}>Weekly</button>
                                <button onClick={() => setNewSchedule(p => ({ ...p, type: 'monthly', days: [] }))} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${newSchedule.type === 'monthly' ? 'bg-brand-primary text-white' : 'text-text-secondary hover:bg-panel'}`}>Monthly</button>
                            </div>
                        </div>
                        {newSchedule.type === 'weekly' ? (
                            <div>
                                <label className="block text-sm font-medium text-text-primary">Day(s) of the Week</label>
                                <div className="mt-2 flex flex-wrap gap-2">{weekDays.map((day, index) => (<button key={day} onClick={() => handleWeekDayToggle(index)} className={`w-10 h-10 text-sm font-semibold rounded-md transition-colors flex items-center justify-center ${newSchedule.days.includes(index) ? 'bg-brand-primary text-white' : 'bg-panel-light text-text-secondary hover:bg-panel'}`}>{day}</button>))}</div>
                            </div>
                        ) : (
                            <div>
                                <label htmlFor="month-days" className="block text-sm font-medium text-text-primary">Day(s) of the Month</label>
                                <input id="month-days" type="text" value={newSchedule.days.join(', ')} onChange={handleMonthDaysChange} placeholder="e.g., 1, 15, 30" className="input-base mt-2 px-3 py-2" />
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-end">
                        <div>
                            <label htmlFor="schedule-time" className="block text-sm font-medium text-text-primary">Time</label>
                            <input id="schedule-time" type="time" value={newSchedule.time} onChange={(e) => setNewSchedule(p => ({ ...p, time: e.target.value }))} className="input-base mt-2 px-3 py-2" />
                        </div>
                        <button onClick={handleAdd} className="btn btn-primary w-full">Add Schedule</button>
                    </div>
                </div>
            </div>
            <div className="mt-6 pt-6 border-t border-border-subtle space-y-3">
                <h4 className="text-md font-semibold text-main">Current Schedules</h4>
                {schedules.length === 0 ? <p className="text-text-secondary text-sm">No schedules set.</p> : (
                    schedules.map(schedule => (
                        <div key={schedule.id} className="bg-panel-light p-3 rounded-lg flex items-center justify-between gap-4 border border-border">
                            <span className="font-medium text-text-secondary text-sm">{formatSchedule(schedule)}</span>
                            <div className="flex items-center gap-4">
                                <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={schedule.isEnabled} onChange={(e) => onToggle(schedule.id, e.target.checked)} /><div className="w-9 h-5 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary"></div></label>
                                <button onClick={() => onDelete(schedule.id)} className="text-red-500 hover:text-red-400 transition-colors"><TrashIcon className="h-5 w-5" /></button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
