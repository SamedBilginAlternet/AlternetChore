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
    onAssign?: (date: string, memberId: number, type: 'chore' | 'vileda') => void;
    onUnassign?: (date: string, type: string) => void;
    onToggleHoliday?: (date: string) => void;
    onMonthChange?: (newMonth: string) => void;
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
    const [assignType, setAssignType] = useState<'chore' | 'vileda'>('chore');
    const [deletionSelectDate, setDeletionSelectDate] = useState<string | null>(null);
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

                        const isSunday = day.getDay() === 0;
                        const dbHoliday = holidayMap.get(dateStr);
                        const holiday = !!dbHoliday;

                        let className = 'calendar-day';
                        if (isToday) className += ' today';
                        if (isSunday) className += ' weekend';
                        if (!isCurrentMonth) className += ' other-month';
                        if (isAdmin && onAssign) className += ' admin-mode';
                        if (holiday && isCurrentMonth) className += ' holiday';
                        if (viledaAssignment && isCurrentMonth && !isSunday && !dbHoliday) className += ' vileda-day';

                        return (
                            <motion.div
                                key={dateStr}
                                className={className}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.008, duration: 0.15 }}
                                onClick={() => handleDayClick(dateStr)}
                                style={
                                    chore && isCurrentMonth && !isSunday
                                        ? { backgroundColor: `${chore.color}10` }
                                        : undefined
                                }
                            >
                                <div className="calendar-day-top">
                                    <span className="calendar-day-number">{format(day, 'd')}</span>
                                    {holiday && isCurrentMonth && (
                                        <span className="calendar-holiday-dot" title={dbHoliday?.name || 'Tatil'}>🔴</span>
                                    )}
                                    {viledaAssignment && isCurrentMonth && !isSunday && !dbHoliday && (
                                        <span className="calendar-vileda-dot" title={`Vileda: ${viledaAssignment.name}`}>🧽</span>
                                    )}
                                </div>
                                {holiday && isCurrentMonth ? (
                                    <span className="calendar-holiday-label">Tatil</span>
                                ) : (
                                    <>
                                        {chore && isCurrentMonth && !isSunday && (
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
                                        {viledaAssignment && isCurrentMonth && !isSunday && (
                                            <span className="calendar-vileda-label">
                                                Vileda: {viledaAssignment.name}
                                            </span>
                                        )}
                                    </>
                                )}

                                {/* Admin: toggle holiday or assign */}
                                {isAdmin && isCurrentMonth && !isSunday && onToggleHoliday && (
                                    <button
                                        className="calendar-holiday-toggle"
                                        title={holiday ? 'Tatili kaldır' : 'Tatil yap'}
                                        onClick={(e) => { e.stopPropagation(); onToggleHoliday(dateStr); }}
                                    >
                                        {holiday ? '✖' : '🏖️'}
                                    </button>
                                )}
                                {/* Admin: unassign buttons */}
                                {isAdmin && (chore || viledaAssignment) && isCurrentMonth && !isSunday && !holiday && onUnassign && (
                                    <button
                                        className="calendar-unassign-btn"
                                        title="Atamasını kaldır"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletionSelectDate(dateStr);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '4px',
                                            right: '20px',
                                            padding: '2px 5px',
                                            fontSize: '12px',
                                        }}
                                    >
                                        ✖
                                    </button>
                                )}
                                {selectedDay === dateStr && isAdmin && onAssign && !holiday && (
                                    <>
                                        {/* Modal Overlay */}
                                        <div
                                            className="assign-modal-overlay"
                                            style={{
                                                position: 'fixed',
                                                top: 0,
                                                left: 0,
                                                width: '100vw',
                                                height: '100vh',
                                                background: 'rgba(0,0,0,0.25)',
                                                zIndex: 1000
                                            }}
                                            onClick={() => setSelectedDay(null)}
                                        />
                                        {/* Modal Content */}
                                        <motion.div
                                            className="assign-modal"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            style={{
                                                position: 'fixed',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                zIndex: 1001,
                                                background: 'white',
                                                border: '1px solid #eee',
                                                borderRadius: 12,
                                                padding: 24,
                                                boxShadow: '0 4px 32px #0002',
                                                minWidth: 260,
                                                maxWidth: 340,
                                                maxHeight: 400,
                                                overflowY: 'auto',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 8
                                            }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: 700, fontSize: 18 }}>Atama Yap</span>
                                                <button
                                                    style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', marginLeft: 8 }}
                                                    onClick={() => setSelectedDay(null)}
                                                    title="Kapat"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                                                <span style={{ fontWeight: 600 }}>Atama Tipi:</span>
                                                <button
                                                    className="assign-type-btn"
                                                    style={{ background: assignType === 'chore' ? '#e0f2fe' : '#f3f4f6', borderRadius: 4, padding: '2px 8px', border: 'none', cursor: 'pointer', fontWeight: assignType === 'chore' ? 700 : 400 }}
                                                    onClick={(e) => { e.stopPropagation(); setAssignType('chore'); }}
                                                >
                                                    🧹 Temizlik
                                                </button>
                                                <button
                                                    className="assign-type-btn"
                                                    style={{ background: assignType === 'vileda' ? '#e0f2fe' : '#f3f4f6', borderRadius: 4, padding: '2px 8px', border: 'none', cursor: 'pointer', fontWeight: assignType === 'vileda' ? 700 : 400 }}
                                                    onClick={(e) => { e.stopPropagation(); setAssignType('vileda'); }}
                                                >
                                                    🧽 Vileda
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {members.map((m) => (
                                                    <button
                                                        key={m.id}
                                                        className="assign-option"
                                                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: '1px solid #eee', borderRadius: 4, background: '#fafafa', cursor: 'pointer', fontSize: 16 }}
                                                        onClick={async () => {
                                                            if (onAssign) {
                                                                await onAssign(dateStr, m.id, assignType);
                                                                setSelectedDay(null);
                                                            }
                                                        }}
                                                    >
                                                        <MemberAvatar name={m.name} color={m.color} size={22} />
                                                        <span>{m.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            {/* assignType state declaration was mistakenly here, removed. */}
                            </motion.div>
                        );
                    })}
                </motion.div>
            </AnimatePresence>

            {/* Deletion Type Selection Modal */}
            <AnimatePresence>
                {deletionSelectDate && (
                    <>
                        <div
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                width: '100vw',
                                height: '100vh',
                                background: 'rgba(0,0,0,0.25)',
                                zIndex: 2000
                            }}
                            onClick={() => setDeletionSelectDate(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 2001,
                                background: 'white',
                                border: '1px solid #eee',
                                borderRadius: 12,
                                padding: 24,
                                boxShadow: '0 4px 32px #0002',
                                minWidth: 280,
                                textAlign: 'center'
                            }}
                        >
                            <h3 style={{ margin: '0 0 24px 0', color: '#1f2937' }}>
                                Hangi atamasını silmek istersiniz?
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {/* Get the current chore and vileda for this date */}
                                {(() => {
                                    const choreAssignment = choreMap.get(deletionSelectDate);
                                    const viledaAssignment = viledaMap.get(deletionSelectDate);
                                    return (
                                        <>
                                            {choreAssignment && (
                                                <button
                                                    onClick={() => {
                                                        if (onUnassign) {
                                                            onUnassign(deletionSelectDate, 'chore');
                                                        }
                                                        setDeletionSelectDate(null);
                                                    }}
                                                    style={{
                                                        padding: '12px 16px',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: 6,
                                                        background: '#fafafa',
                                                        cursor: 'pointer',
                                                        fontWeight: 500,
                                                        color: '#374151',
                                                        fontSize: 14
                                                    }}
                                                >
                                                    🧹 Temizlik Atamasını Sil
                                                </button>
                                            )}
                                            {viledaAssignment && (
                                                <button
                                                    onClick={() => {
                                                        if (onUnassign) {
                                                            onUnassign(deletionSelectDate, 'vileda');
                                                        }
                                                        setDeletionSelectDate(null);
                                                    }}
                                                    style={{
                                                        padding: '12px 16px',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: 6,
                                                        background: '#fafafa',
                                                        cursor: 'pointer',
                                                        fontWeight: 500,
                                                        color: '#374151',
                                                        fontSize: 14
                                                    }}
                                                >
                                                    🧽 Vileda Atamasını Sil
                                                </button>
                                            )}
                                        </>
                                    );
                                })()}
                                <button
                                    onClick={() => setDeletionSelectDate(null)}
                                    style={{
                                        padding: '12px 16px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 6,
                                        background: '#f9fafb',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                        color: '#374151',
                                        fontSize: 14,
                                        marginTop: 8
                                    }}
                                >
                                    İptal
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
