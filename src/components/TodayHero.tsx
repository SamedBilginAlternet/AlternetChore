import { motion } from 'framer-motion';
import { Assignment } from '../lib/api';
import MemberAvatar from './MemberAvatar';

interface TodayHeroProps {
    chore: Assignment | null;
    vileda: Assignment | null;
    loading: boolean;
}

export default function TodayHero({ chore, vileda, loading }: TodayHeroProps) {
    if (loading) {
        return (
            <div className="today-hero">
                <div className="today-hero-content">
                    <div className="loading-container" style={{ padding: 16 }}>
                        <div className="spinner" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />
                    </div>
                </div>
            </div>
        );
    }

    const isWeekend = !chore && !vileda;

    return (
        <motion.div
            className="today-hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
        >
            <div className="today-hero-content">
                {/* Chore Section */}
                <div className="today-hero-main">
                    <motion.div
                        className="today-hero-avatar-wrapper"
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
                    >
                        {chore ? (
                            <MemberAvatar name={chore.name} color={chore.color} size={84} />
                        ) : (
                            <div className="avatar-placeholder hero-placeholder">🎉</div>
                        )}
                    </motion.div>
                    <div className="today-hero-info">
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 0.9, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            {isWeekend ? 'Günün Durumu' : '🧹 Bugün Sıra Sende!'}
                        </motion.h2>
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            {chore ? chore.name : 'Bugün Görev Yok!'}
                        </motion.h1>
                        {isWeekend && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.85 }}
                                transition={{ delay: 0.6 }}
                            >
                                Tatil / Haftasonu
                            </motion.p>
                        )}
                    </div>
                </div>

                {/* Vileda badge */}
                {/* {vileda && (
                    <motion.div
                        className="today-vileda-badge"
                        initial={{ opacity: 0, scale: 0.8, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                    >
                        <MemberAvatar name={vileda.name} color={vileda.color} size={32} />
                        <div className="vileda-badge-info">
                            <span className="vileda-badge-label">Vileda Günü</span>
                            <span className="vileda-badge-name">{vileda.name}</span>
                        </div>
                    </motion.div>
                )} */}
            </div>
            <motion.div
                className="today-hero-pulse"
                animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 0.1, 0.3],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
        </motion.div>
    );
}
