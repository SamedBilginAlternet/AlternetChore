import { useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isWeekend,
    addMonths,
    subMonths,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import { Assignment, Member, Holiday } from '../lib/api';
import MemberAvatar from './MemberAvatar';
import { useAuth } from '../context/AuthContext';

interface CalendarProps {
    assignments: Assignment[];
    members: Member[];
    holidays: Holiday[];
    onAssign?: (date: string, memberId: number) => void;
    onUnassign?: (date: string, type: string) => void;
    onToggleHoliday?: (date: string) => void;
    onMonthChange?: (newMonth: string) => void; // New prop
}

const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const swipeVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 300 : -300,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        x: direction > 0 ? -300 : 300,
        opacity: 0,
    }),
};

export default function Calendar({ assignments, members, holidays, onAssign, onUnassign, onToggleHoliday, onMonthChange }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [direction, setDirection] = useState(0);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const { isAdmin } = useAuth();

    const goNext = useCallback(() => {
        setDirection(1);
        const nextMonth = addMonths(currentMonth, 1);
        setCurrentMonth(nextMonth);
        setSelectedDay(null);
        if (onMonthChange) onMonthChange(format(nextMonth, 'yyyy-MM'));
    }, [currentMonth, onMonthChange]);

    const goPrev = useCallback(() => {
        setDirection(-1);
        const prevMonth = subMonths(currentMonth, 1);
        setCurrentMonth(prevMonth);
        setSelectedDay(null);
        if (onMonthChange) onMonthChange(format(prevMonth, 'yyyy-MM'));
    }, [currentMonth, onMonthChange]);

    const handleDragEnd = useCallback(
        (_: any, info: PanInfo) => {
            const threshold = 50;
            if (info.offset.x < -threshold) {
                goNext();
            } else if (info.offset.x > threshold) {
                goPrev();
            }
        },
        [goNext, goPrev]
    );

    // Build calendar grid
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    // Build maps for chore and vileda assignments
    const choreMap = new Map<string, Assignment>();
    const viledaMap = new Map<string, Assignment>();
    assignments.forEach((a) => {
        if (a.type === 'vileda') {
            viledaMap.set(a.date, a);
        } else {
            choreMap.set(a.date, a);
        }
    });

    // Build holiday map
    const holidayMap = new Map<string, Holiday>();
    holidays.forEach(h => holidayMap.set(h.date, h));

    const today = new Date();

    const handleDayClick = (dateStr: string) => {
        if (!isAdmin || !onAssign) return;
        setSelectedDay(selectedDay === dateStr ? null : dateStr);
    };

    return (
        <div className="card calendar-container">
            <div className="calendar-header">
                <button className="calendar-nav-btn" onClick={goPrev} aria-label="Önceki ay">
                    ‹
                </button>
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.h2
                        key={format(currentMonth, 'yyyy-MM')}
                        className="calendar-month-title"
                        custom={direction}
                        initial={{ opacity: 0, y: direction * 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: direction * -20 }}
                        transition={{ duration: 0.2 }}
                    >
                        {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                    </motion.h2>
                </AnimatePresence>
                <button className="calendar-nav-btn" onClick={goNext} aria-label="Sonraki ay">
                    ›
                </button>
            </div>

            <div className="calendar-weekdays">
                {weekDays.map((day) => (
                    <div key={day} className="calendar-weekday">
                        {day}
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={format(currentMonth, 'yyyy-MM')}
                    className="calendar-grid"
                    custom={direction}
                    variants={swipeVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={handleDragEnd}
                >
                    {days.map((day, i) => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const chore = choreMap.get(dateStr);
                        const viledaAssignment = viledaMap.get(dateStr);
                        const isToday = isSameDay(day, today);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isWe = isWeekend(day);
                        const dbHoliday = holidayMap.get(dateStr);
                        const holiday = dbHoliday || isWe;

                        let className = 'calendar-day';
                        if (isToday) className += ' today';
                        if (isWe) className += ' weekend';
                        if (!isCurrentMonth) className += ' other-month';
                        if (isAdmin && onAssign) className += ' admin-mode';
                        if (holiday && isCurrentMonth) className += ' holiday';
                        if (viledaAssignment && isCurrentMonth && !isWe && !dbHoliday) className += ' vileda-day';

                        return (
                            <motion.div
                                key={dateStr}
                                className={className}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.008, duration: 0.15 }}
                                onClick={() => handleDayClick(dateStr)}
                                style={
                                    chore && isCurrentMonth && !isWe
                                        ? { backgroundColor: `${chore.color}10` }
                                        : undefined
                                }
                            >
                                <div className="calendar-day-top">
                                    <span className="calendar-day-number">{format(day, 'd')}</span>
                                    {holiday && isCurrentMonth && (
                                        <span className="calendar-holiday-dot" title={dbHoliday?.name || 'Tatil'}>🔴</span>
                                    )}
                                    {viledaAssignment && isCurrentMonth && !isWe && !dbHoliday && (
                                        <span className="calendar-vileda-dot" title={`Vileda: ${viledaAssignment.name}`}>🧽</span>
                                    )}
                                </div>
                                {holiday && isCurrentMonth ? (
                                    <span className="calendar-holiday-label">Tatil</span>
                                ) : (
                                    <>
                                        {chore && isCurrentMonth && !isWe && (
                                            <>
                                                <MemberAvatar name={chore.name} color={chore.color} size={20} className="calendar-day-avatar" />
                                                <span
                                                    className="calendar-day-name"
                                                    style={{ color: chore.color }}
                                                >
                                                    {chore.name}
                                                </span>
                                            </>
                                        )}
                                        {viledaAssignment && isCurrentMonth && !isWe && (
                                            <span className="calendar-vileda-label">
                                                Vileda: {viledaAssignment.name}
                                            </span>
                                        )}
                                    </>
                                )}

                                {/* Admin: toggle holiday or assign */}
                                {isAdmin && isCurrentMonth && !isWe && onToggleHoliday && (
                                    <button
                                        className="calendar-holiday-toggle"
                                        title={holiday ? 'Tatili kaldır' : 'Tatil yap'}
                                        onClick={(e) => { e.stopPropagation(); onToggleHoliday(dateStr); }}
                                    >
                                        {holiday ? '✖' : '🏖️'}
                                    </button>
                                )}
                                {/* Admin: unassign from this day */}
                                {isAdmin && (chore || viledaAssignment) && isCurrentMonth && !isWe && !holiday && onUnassign && (
                                    <button
                                        className="calendar-unassign-btn"
                                        title="Atamayı kaldır"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const type = (chore && viledaAssignment) ? 'all' : (chore ? 'chore' : 'vileda');
                                            onUnassign(dateStr, type);
                                        }}
                                    >
                                        ✖
                                    </button>
                                )}
                                {selectedDay === dateStr && isAdmin && onAssign && !holiday && (
                                    <motion.div
                                        className="assign-dropdown"
                                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {members.map((m) => (
                                            <button
                                                key={m.id}
                                                className="assign-option"
                                                onClick={() => {
                                                    onAssign(dateStr, m.id);
                                                    setSelectedDay(null);
                                                }}
                                            >
                                                <MemberAvatar name={m.name} color={m.color} size={20} />
                                                <span>{m.name}</span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
