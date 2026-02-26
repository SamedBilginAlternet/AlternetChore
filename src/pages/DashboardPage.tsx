import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { format, endOfMonth } from 'date-fns';
import { Assignment, Member, MemberStats, TodayResponse, Holiday } from '../lib/api';
import { supabase } from '../lib/supabase';
import TodayHero from '../components/TodayHero';
import Calendar from '../components/Calendar';
import MemberAvatar from '../components/MemberAvatar';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
    const [todayData, setTodayData] = useState<TodayResponse>({ chore: null, vileda: null });
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [stats, setStats] = useState<MemberStats[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
    const { isAdmin } = useAuth();

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            // Get local today date string (YYYY-MM-DD)
            const now = new Date();
            const today = format(now, 'yyyy-MM-dd');

            // Calculate month boundaries for the query
            // currentMonth is "YYYY-MM"
            const [year, month] = currentMonth.split('-').map(Number);
            const startDate = `${currentMonth}-01`;
            const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

            // Parallel fetch using Supabase
            const [
                { data: todayDataRes },
                { data: assignmentsRes },
                { data: membersRes },
                { data: statsRes },
                { data: holidaysRes }
            ] = await Promise.all([
                // Fetch today's assignments
                supabase.from('assignments').select('*, members(name, color, avatar_emoji, telegram_handle)').eq('date', today),
                // Fetch month's assignments using range
                supabase.from('assignments')
                    .select('*, members(name, color, avatar_emoji, telegram_handle)')
                    .gte('date', startDate)
                    .lte('date', endDate),
                // Fetch members
                supabase.from('members').select('*').order('name'),
                // Fetch stats (RPC)
                supabase.rpc('get_member_stats'),
                // Fetch holidays
                supabase.from('holidays').select('*')
            ]);

            // Transform today's data
            const todayChore = todayDataRes?.find(a => a.type === 'chore');
            const todayVileda = todayDataRes?.find(a => a.type === 'vileda');

            setTodayData({
                chore: todayChore ? { ...todayChore, ...todayChore.members } : null,
                vileda: todayVileda ? { ...todayVileda, ...todayVileda.members } : null
            });

            // Transform assignments (flatten members)
            setAssignments(assignmentsRes?.map(a => ({ ...a, ...a.members })) || []);
            setMembers(membersRes || []);
            setStats(statsRes || []);
            setHolidays(holidaysRes || []);
        } catch (err) {
            console.error('Veri yükleme hatası:', err);
        } finally {
            setLoading(false);
        }
    }, [currentMonth]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAssign = async (date: string, memberId: number) => {
        try {
            const { error } = await supabase.from('assignments').upsert({
                date,
                member_id: memberId,
                type: 'chore',
                created_by: 'manual'
            }, { onConflict: 'date,type' });

            if (error) throw error;
            fetchData();
        } catch (err) {
            console.error('Atama hatası:', err);
        }
    };

    const handleToggleHoliday = async (date: string) => {
        const existing = holidays.find(h => h.date === date);
        try {
            if (existing) {
                await supabase.from('holidays').delete().eq('id', existing.id);
            } else {
                await supabase.from('holidays').insert([{ date, name: 'Tatil' }]);
            }
            fetchData();
        } catch (err) {
            console.error('Tatil hatası:', err);
        }
    };

    const handleUnassign = async (date: string, type: string) => {
        try {
            const query = supabase.from('assignments').delete().eq('date', date);

            if (type !== 'all') {
                query.eq('type', type);
            }

            const { error } = await query;

            if (error) throw error;
            fetchData();
        } catch (err) {
            console.error('Silme hatası:', err);
        }
    };

    const maxChore = Math.max(...stats.map((s) => s.chore_count), 1);
    const maxVileda = Math.max(...stats.map((s) => s.vileda_count), 1);

    return (
        <motion.div
            className="dashboard-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="dashboard-main-content">
                <Calendar
                    assignments={assignments}
                    members={members}
                    holidays={holidays}
                    onAssign={isAdmin ? handleAssign : undefined}
                    onUnassign={isAdmin ? handleUnassign : undefined}
                    onToggleHoliday={isAdmin ? handleToggleHoliday : undefined}
                    onMonthChange={setCurrentMonth}
                />
            </div>

            <aside className="dashboard-sidebar">
                <TodayHero
                    chore={todayData.chore}
                    vileda={todayData.vileda}
                    loading={loading}
                />

                {stats.length > 0 && (
                    <motion.div
                        className="card stats-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="card-header">
                            <h3 className="card-title">📊 Görev Dağılımı</h3>
                        </div>
                        <div className="card-body stats-body">
                            {stats.map((stat, i) => (
                                <motion.div
                                    key={stat.id}
                                    className="stat-row"
                                    initial={{ opacity: 0, x: -15 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.05 }}
                                >
                                    <div className="stat-member">
                                        <MemberAvatar name={stat.name} color={stat.color} size={28} />
                                        <span className="stat-name">{stat.name}</span>
                                    </div>
                                    <div className="stat-bars">
                                        <div className="stat-bar-row">
                                            <div className="stats-bar-container">
                                                <motion.div
                                                    className="stats-bar"
                                                    style={{ backgroundColor: stat.color }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(stat.chore_count / maxChore) * 100}%` }}
                                                    transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
                                                />
                                            </div>
                                            <span className="stat-count">{stat.chore_count}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </aside>
        </motion.div>
    );
}
