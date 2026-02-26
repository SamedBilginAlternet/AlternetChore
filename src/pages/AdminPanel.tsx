import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Member, MemberStats } from '../lib/api';
import { supabase } from '../lib/supabase';
import MemberAvatar from '../components/MemberAvatar';
import { useAuth } from '../context/AuthContext';

type Tab = 'members' | 'schedule' | 'telegram';

const COLOR_OPTIONS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function AdminPanel() {
    const { isAdmin, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('members');

    // Members state
    const [members, setMembers] = useState<Member[]>([]);
    const [stats, setStats] = useState<MemberStats[]>([]);
    const [newName, setNewName] = useState('');
    const [newTelegram, setNewTelegram] = useState('');
    const [newColor, setNewColor] = useState('#3B82F6');
    const [showAddForm, setShowAddForm] = useState(false);

    // Schedule state
    const [scheduleMonth, setScheduleMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [generating, setGenerating] = useState(false);
    const [scheduleResult, setScheduleResult] = useState<{ chores: any[]; vileda: any[] } | null>(null);

    // Telegram state
    const [testingTelegram, setTestingTelegram] = useState(false);
    const [telegramResult, setTelegramResult] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            navigate('/login');
        }
    }, [isAdmin, authLoading, navigate]);

    const fetchMembers = useCallback(async () => {
        try {
            // Fetch members
            const { data: membersData, error: membersError } = await supabase
                .from('members')
                .select('*')
                .order('name');

            if (membersError) throw membersError;
            setMembers(membersData || []);

            // Fetch stats (This will likely be a View or a separate function later)
            // For now, we'll use the existing API if available, or fetch raw assignments and calculate
            const { data: statsData, error: statsError } = await supabase.rpc('get_member_stats');
            if (!statsError) {
                setStats(statsData);
            }
        } catch (err) {
            console.error('Üye yükleme hatası:', err);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) fetchMembers();
    }, [isAdmin, fetchMembers]);

    const addMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        try {
            const { error } = await supabase.from('members').insert([
                {
                    name: newName,
                    telegram_handle: newTelegram || null,
                    color: newColor,
                    active: true
                }
            ]);
            if (error) throw error;

            setNewName('');
            setNewTelegram('');
            setNewColor('#3B82F6');
            setShowAddForm(false);
            fetchMembers();
        } catch (err) {
            console.error('Üye ekleme hatası:', err);
        }
    };

    const removeMember = async (id: number) => {
        if (!confirm('Bu üyeyi silmek istediğinize emin misiniz?')) return;
        try {
            const { error } = await supabase.from('members').delete().eq('id', id);
            if (error) throw error;
            fetchMembers();
        } catch (err) {
            console.error('Üye silme hatası:', err);
        }
    };

    const toggleMember = async (member: Member) => {
        try {
            const { error } = await supabase
                .from('members')
                .update({ active: !member.active })
                .eq('id', member.id);

            if (error) throw error;
            fetchMembers();
        } catch (err) {
            console.error('Üye güncelleme hatası:', err);
        }
    };

    const generateSchedule = async () => {
        setGenerating(true);
        setScheduleResult(null);
        try {
            const { data, error } = await supabase.functions.invoke('generate-schedule', {
                body: { month: scheduleMonth }
            });
            if (error) throw error;
            setScheduleResult(data);
            fetchMembers(); // Refresh stats
        } catch (err: any) {
            alert(err.message || 'Takvim oluşturma hatası');
        } finally {
            setGenerating(false);
        }
    };

    const testTelegram = async () => {
        setTestingTelegram(true);
        setTelegramResult(null);
        try {
            const { data, error } = await supabase.functions.invoke('telegram-bot', {
                body: { action: 'test' }
            });
            setTelegramResult(!error && data?.success ? 'success' : 'error');
        } catch {
            setTelegramResult('error');
        } finally {
            setTestingTelegram(false);
        }
    };

    const syncFromTelegram = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const { data, error } = await supabase.functions.invoke('telegram-bot', {
                body: { action: 'sync' }
            });
            if (error) throw error;

            const { synced, chatId } = data;
            if (!chatId) {
                setSyncResult('⚠️ Grup chat ID bulunamadı. Önce gruba bir mesaj gönderin.');
            } else if (synced.length === 0) {
                setSyncResult('ℹ️ Yeni üye bulunamadı. Tüm adminler zaten kayıtlı.');
            } else {
                setSyncResult(`✅ ${synced.length} üye senkronize edildi: ${synced.join(', ')}`);
                fetchMembers();
            }
        } catch {
            setSyncResult('❌ Senkronizasyon başarısız oldu.');
        } finally {
            setSyncing(false);
        }
    };

    if (authLoading) {
        return (
            <div className="loading-container">
                <div className="spinner" />
            </div>
        );
    }

    const maxAssignments = Math.max(...stats.map((s) => s.total_assignments), 1);

    return (
        <motion.div
            className="admin-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                ⚙️ Yönetim Paneli
            </motion.h1>
            <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                Üyeleri yönetin, takvim oluşturun ve ayarları yapılandırın.
            </motion.p>

            {/* Tabs */}
            <div className="admin-tabs">
                {(['members', 'schedule', 'telegram'] as Tab[]).map((t) => (
                    <button
                        key={t}
                        className={`admin-tab ${tab === t ? 'active' : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t === 'members' && '👥 Üyeler'}
                        {t === 'schedule' && '📅 Takvim'}
                        {t === 'telegram' && '📱 Telegram'}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* Members Tab */}
                {tab === 'members' && (
                    <motion.div
                        key="members"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 8 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Ekip Üyeleri</h2>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={syncFromTelegram}
                                    disabled={syncing}
                                >
                                    {syncing ? '⏳ Senkronize...' : '🔄 Telegram Sync'}
                                </button>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => setShowAddForm(!showAddForm)}
                                >
                                    {showAddForm ? '✕ İptal' : '+ Üye Ekle'}
                                </button>
                            </div>
                        </div>
                        {syncResult && (
                            <div style={{ padding: '10px 14px', marginBottom: 14, borderRadius: 10, background: 'rgba(248,250,252,0.9)', border: '1px solid #E2E8F0', fontSize: 13 }}>
                                {syncResult}
                            </div>
                        )}

                        <AnimatePresence>
                            {showAddForm && (
                                <motion.form
                                    className="add-member-form"
                                    onSubmit={addMember}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <div className="form-group">
                                        <label>İsim</label>
                                        <input
                                            className="form-input"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="Üye adı"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Telegram Handle</label>
                                        <input
                                            className="form-input"
                                            value={newTelegram}
                                            onChange={(e) => setNewTelegram(e.target.value)}
                                            placeholder="@kullaniciadi"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Renk</label>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {COLOR_OPTIONS.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setNewColor(c)}
                                                    style={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: '50%',
                                                        backgroundColor: c,
                                                        border: newColor === c ? '3px solid #111827' : '2px solid transparent',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    {/* Emoji section removed as per request */}
                                    <button type="submit" className="btn btn-primary">
                                        ✓ Üye Ekle
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>

                        <div className="members-grid">
                            {members.map((member, i) => (
                                <motion.div
                                    key={member.id}
                                    className="member-card"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    style={{ opacity: member.active ? 1 : 0.5 }}
                                >
                                    <div
                                        className="member-avatar-container"
                                        style={{ marginBottom: 16 }}
                                    >
                                        <MemberAvatar name={member.name} color={member.color} size={48} />
                                    </div>
                                    <div className="member-info">
                                        <h3>{member.name}</h3>
                                        <p>
                                            {member.telegram_handle ? `@${member.telegram_handle}` : 'Telegram yok'}
                                            {!member.active && ' • Pasif'}
                                        </p>
                                    </div>
                                    <div className="member-actions">
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => toggleMember(member)}
                                            title={member.active ? 'Pasifleştir' : 'Aktifleştir'}
                                        >
                                            {member.active ? '⏸️' : '▶️'}
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => removeMember(member.id)}
                                            title="Sil"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Schedule Tab */}
                {tab === 'schedule' && (
                    <motion.div
                        key="schedule"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="generate-section">
                            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Takvim Oluştur</h2>
                            <p style={{ color: '#6B7280', fontSize: 14 }}>
                                Seçtiğiniz ay için adil bir görev dağılımı oluşturun. Algoritma son 3 ayı dikkate alarak dengeyi sağlar.
                            </p>

                            <div className="generate-controls">
                                <div className="form-group">
                                    <label>Ay Seçin</label>
                                    <input
                                        type="month"
                                        className="form-input"
                                        value={scheduleMonth}
                                        onChange={(e) => setScheduleMonth(e.target.value)}
                                    />
                                </div>
                                <button
                                    className="btn btn-primary"
                                    onClick={generateSchedule}
                                    disabled={generating}
                                >
                                    {generating ? '⏳ Oluşturuluyor...' : '🎲 Takvim Oluştur'}
                                </button>
                            </div>

                            {scheduleResult && (
                                <motion.div
                                    className="card"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="card-header">
                                        <h3 className="card-title">✅ Takvim Oluşturuldu!</h3>
                                        <span style={{ color: '#6B7280', fontSize: 13 }}>
                                            {scheduleResult.chores.length} görev + {scheduleResult.vileda.length} vileda günü atandı
                                        </span>
                                    </div>
                                    <div className="card-body" style={{ padding: 0, maxHeight: 400, overflow: 'auto' }}>
                                        <table className="stats-table">
                                            <thead>
                                                <tr>
                                                    <th>Tarih</th>
                                                    <th>🧹 Görevli</th>
                                                    <th>🧽 Vileda</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {scheduleResult.chores.map((a: any) => {
                                                    const viledaForDay = scheduleResult.vileda.find((v: any) => v.date === a.date);
                                                    return (
                                                        <tr key={a.date}>
                                                            <td>{new Date(a.date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <MemberAvatar name={a.name} color={a.color} size={24} />
                                                                    <span style={{ fontWeight: 600, color: a.color }}>{a.name}</span>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                {viledaForDay ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <MemberAvatar name={viledaForDay.name} color={viledaForDay.color} size={24} />
                                                                        <span style={{ fontWeight: 600, color: viledaForDay.color }}>{viledaForDay.name}</span>
                                                                    </div>
                                                                ) : (
                                                                    <span style={{ color: '#D1D5DB' }}>—</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            )}

                            {/* Distribution stats */}
                            {stats.length > 0 && (
                                <motion.div
                                    className="card"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <div className="card-header">
                                        <h3 className="card-title">📊 Toplam Dağılım</h3>
                                    </div>
                                    <div className="card-body" style={{ padding: 0 }}>
                                        <table className="stats-table">
                                            <thead>
                                                <tr>
                                                    <th>Üye</th>
                                                    <th>🧹 Görev</th>
                                                    <th>🧽 Vileda</th>
                                                    <th>Oran</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stats.map((stat) => (
                                                    <tr key={stat.id}>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <MemberAvatar name={stat.name} color={stat.color} size={24} />
                                                                <span style={{ fontWeight: 600 }}>{stat.name}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ fontWeight: 700 }}>{stat.chore_count}</td>
                                                        <td style={{ fontWeight: 700 }}>{stat.vileda_count}</td>
                                                        <td>
                                                            <div className="stats-bar-container">
                                                                <div
                                                                    className="stats-bar"
                                                                    style={{
                                                                        backgroundColor: stat.color,
                                                                        width: `${(stat.total_assignments / maxAssignments) * 100}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Telegram Tab */}
                {tab === 'telegram' && (
                    <motion.div
                        key="telegram"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">📱 Telegram Bot Ayarları</h3>
                            </div>
                            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div style={{
                                    padding: 16,
                                    background: '#E0F2FE',
                                    borderRadius: 12,
                                    fontSize: 14,
                                    color: '#1E40AF',
                                    lineHeight: 1.6,
                                }}>
                                    <strong>📋 Telegram Bot Kurulumu:</strong>
                                    <ol style={{ paddingLeft: 20, marginTop: 8 }}>
                                        <li>Telegram'da <strong>@BotFather</strong> ile konuşun</li>
                                        <li><code>/newbot</code> komutu ile yeni bot oluşturun</li>
                                        <li>Bot token'ını <code>.env</code> dosyasına <code>TELEGRAM_BOT_TOKEN</code> olarak ekleyin</li>
                                        <li>Botu gruba ekleyin ve grup chat ID'sini <code>TELEGRAM_CHAT_ID</code> olarak ayarlayın</li>
                                        <li>Sunucuyu yeniden başlatın</li>
                                    </ol>
                                </div>

                                <div style={{
                                    padding: 16,
                                    background: '#F9FAFB',
                                    borderRadius: 12,
                                    fontSize: 14,
                                }}>
                                    <strong>⏰ Otomatik Bildirim:</strong>
                                    <p style={{ color: '#6B7280', marginTop: 4 }}>
                                        Bot her hafta içi sabah 09:00'da (İstanbul saati) günün görevlisini gruba bildirir.
                                    </p>
                                    <p style={{ color: '#6B7280', marginTop: 4, fontStyle: 'italic' }}>
                                        Örnek: "🧹 Bugün sıra @samed sende!"
                                    </p>
                                </div>

                                <button
                                    className="btn btn-primary"
                                    onClick={testTelegram}
                                    disabled={testingTelegram}
                                >
                                    {testingTelegram ? '⏳ Test ediliyor...' : '🧪 Test Bildirimi Gönder'}
                                </button>

                                {telegramResult && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        style={{
                                            padding: 12,
                                            borderRadius: 8,
                                            fontSize: 14,
                                            fontWeight: 500,
                                            background: telegramResult === 'success' ? '#D1FAE5' : '#FEE2E2',
                                            color: telegramResult === 'success' ? '#065F46' : '#991B1B',
                                        }}
                                    >
                                        {telegramResult === 'success'
                                            ? '✅ Test bildirimi başarıyla gönderildi!'
                                            : '❌ Bildirim gönderilemedi. Bot token ve chat ID ayarlarını kontrol edin.'}
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
