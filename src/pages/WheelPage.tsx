import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Member } from '../lib/api';
import { supabase } from '../lib/supabase';
import LuckWheel from '../components/LuckWheel';

type WheelMode = 'chore' | 'vileda';

export default function WheelPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<WheelMode>('chore');
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<{ success: boolean; name: string } | null>(null);

    useEffect(() => {
        const fetchMembersData = async () => {
            try {
                const { data } = await supabase.from('members')
                    .select('*')
                    .eq('active', true);
                setMembers(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchMembersData();
    }, []);

    const handleResult = async (member: Member) => {
        const today = new Date().toISOString().split('T')[0];
        setSaving(true);
        setSaveResult(null);
        try {
            const { error } = await supabase.from('assignments').upsert({
                date: today,
                member_id: member.id,
                type: mode,
                created_by: 'wheel'
            }, { onConflict: 'date,type' });

            if (error) throw error;
            setSaveResult({ success: true, name: member.name });
        } catch (err) {
            console.error('Save error:', err);
            setSaveResult({ success: false, name: member.name });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="wheel-page">
                <div className="loading-container">
                    <div className="spinner" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="wheel-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <motion.h1
                className="wheel-title"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                🎡 Şans Çarkı
            </motion.h1>
            <motion.p
                className="wheel-subtitle"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                Görev veya vileda atamasını çarkla belirle!
            </motion.p>

            {/* Mode Selector */}
            <motion.div
                className="wheel-mode-selector"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
            >
                <button
                    className={`wheel-mode-btn ${mode === 'chore' ? 'active' : ''}`}
                    onClick={() => setMode('chore')}
                >
                    🧹 Günlük Görev
                </button>
                <button
                    className={`wheel-mode-btn ${mode === 'vileda' ? 'active' : ''}`}
                    onClick={() => setMode('vileda')}
                >
                    🧽 Vileda Günü
                </button>
            </motion.div>

            <LuckWheel members={members} mode={mode} onResult={handleResult} />

            {/* Save status */}
            <AnimatePresence>
                {(saving || saveResult) && (
                    <motion.div
                        className="wheel-save-status"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {saving ? (
                            <span className="wheel-save-saving">⏳ Kaydediliyor...</span>
                        ) : saveResult?.success ? (
                            <span className="wheel-save-success">
                                ✅ {saveResult.name} için {mode === 'vileda' ? 'vileda' : 'görev'} ataması kaydedildi!
                            </span>
                        ) : (
                            <span className="wheel-save-error">
                                ❌ Kayıt başarısız. Tekrar deneyin.
                            </span>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
