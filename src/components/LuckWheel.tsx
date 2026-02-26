import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Member } from '../lib/api';

interface LuckWheelProps {
    members: Member[];
    mode: 'chore' | 'vileda';
    onResult?: (member: Member) => void;
}

function getContrastColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#111827' : '#FFFFFF';
}

export default function LuckWheel({ members, mode, onResult }: LuckWheelProps) {
    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [winner, setWinner] = useState<Member | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const segmentAngle = 360 / (members.length || 1);

    const confettiPieces = useMemo(() => {
        const colors = ['#3B82F6', '#1E40AF', '#E0F2FE', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
        return Array.from({ length: 50 }, (_, i) => ({
            id: i,
            color: colors[i % colors.length],
            left: `${Math.random() * 100}%`,
            delay: Math.random() * 0.5,
            size: 6 + Math.random() * 8,
            rotation: Math.random() * 360,
        }));
    }, []);

    const spin = useCallback(() => {
        if (spinning || members.length === 0) return;

        setSpinning(true);
        setWinner(null);
        setShowConfetti(false);

        const extraSpins = 5 + Math.random() * 3;
        const randomAngle = Math.random() * 360;
        const totalRotation = rotation + extraSpins * 360 + randomAngle;

        setRotation(totalRotation);

        setTimeout(() => {
            const normalizedAngle = (360 - (totalRotation % 360)) % 360;
            const winnerIndex = Math.floor(normalizedAngle / segmentAngle) % members.length;
            const chosenMember = members[winnerIndex];
            setWinner(chosenMember);
            setSpinning(false);
            setShowConfetti(true);
            onResult?.(chosenMember);

            setTimeout(() => setShowConfetti(false), 3000);
        }, 4000);
    }, [spinning, members, rotation, segmentAngle, onResult]);

    if (members.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🎡</div>
                <h3>Üye Bulunamadı</h3>
                <p>Çarkı döndürmek için önce üye ekleyin.</p>
            </div>
        );
    }

    const size = 320;
    const center = size / 2;
    const radius = size / 2 - 4;

    return (
        <>
            {/* Confetti */}
            <AnimatePresence>
                {showConfetti && (
                    <div className="confetti-container">
                        {confettiPieces.map((piece) => (
                            <motion.div
                                key={piece.id}
                                className="confetti-piece"
                                initial={{
                                    x: `calc(50vw - ${piece.size / 2}px)`,
                                    y: -20,
                                    rotate: 0,
                                    opacity: 1,
                                }}
                                animate={{
                                    y: '100vh',
                                    x: `calc(${piece.left})`,
                                    rotate: piece.rotation + 720,
                                    opacity: [1, 1, 0],
                                }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: 2.5 + Math.random(),
                                    delay: piece.delay,
                                    ease: 'easeOut',
                                }}
                                style={{
                                    position: 'fixed',
                                    left: 0,
                                    width: piece.size,
                                    height: piece.size,
                                    backgroundColor: piece.color,
                                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                                }}
                            />
                        ))}
                    </div>
                )}
            </AnimatePresence>

            <div className="wheel-container">
                {/* Pointer */}
                <div className="wheel-pointer">▼</div>

                {/* Wheel SVG */}
                <motion.svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    animate={{ rotate: rotation }}
                    transition={{
                        duration: 4,
                        ease: [0.2, 0.8, 0.3, 1],
                    }}
                    style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
                >
                    {members.map((member, i) => {
                        const startAngle = i * segmentAngle;
                        const endAngle = startAngle + segmentAngle;
                        const startRad = ((startAngle - 90) * Math.PI) / 180;
                        const endRad = ((endAngle - 90) * Math.PI) / 180;

                        const x1 = center + radius * Math.cos(startRad);
                        const y1 = center + radius * Math.sin(startRad);
                        const x2 = center + radius * Math.cos(endRad);
                        const y2 = center + radius * Math.sin(endRad);

                        const largeArc = segmentAngle > 180 ? 1 : 0;

                        const pathData = [
                            `M ${center} ${center}`,
                            `L ${x1} ${y1}`,
                            `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                            'Z',
                        ].join(' ');

                        const midAngle = ((startAngle + endAngle) / 2 - 90) * (Math.PI / 180);
                        const textRadius = radius * 0.6;
                        const textX = center + textRadius * Math.cos(midAngle);
                        const textY = center + textRadius * Math.sin(midAngle);
                        const textRotation = (startAngle + endAngle) / 2;

                        return (
                            <g key={member.id}>
                                <path d={pathData} fill={member.color} stroke="white" strokeWidth="2" />
                                <text
                                    x={textX}
                                    y={textY}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill={getContrastColor(member.color)}
                                    fontSize="12"
                                    fontWeight="900"
                                    fontFamily="Inter, sans-serif"
                                    transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                                >
                                    {member.name.charAt(0).toUpperCase()} {member.name}
                                </text>
                            </g>
                        );
                    })}

                    {/* Center circle */}
                    <circle cx={center} cy={center} r="24" fill="white" stroke="#D1D5DB" strokeWidth="2" />
                    <text
                        x={center}
                        y={center}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="16"
                    >
                        {mode === 'vileda' ? '🧽' : '🧹'}
                    </text>
                </motion.svg>
            </div>

            {/* Spin Button */}
            <motion.button
                className="wheel-spin-btn"
                onClick={spin}
                disabled={spinning}
                whileHover={!spinning ? { scale: 1.05 } : undefined}
                whileTap={!spinning ? { scale: 0.95 } : undefined}
                animate={
                    !spinning && !winner
                        ? { scale: [1, 1.05, 1] }
                        : undefined
                }
                transition={
                    !spinning && !winner
                        ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                        : undefined
                }
            >
                {spinning ? '🎡 Dönüyor...' : mode === 'vileda' ? '🧽 Vileda Çarkını Çevir!' : '🧹 Görev Çarkını Çevir!'}
            </motion.button>

            {/* Result */}
            <AnimatePresence>
                {winner && !spinning && (
                    <motion.div
                        className="wheel-result"
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        <div
                            className="wheel-result-avatar"
                            style={{
                                width: 80,
                                height: 80,
                                backgroundColor: winner.color,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '40px',
                                fontWeight: 'bold',
                                margin: '0 auto 16px',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                            }}
                        >
                            {winner.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="wheel-result-name">{winner.name}</div>
                        <div className="wheel-result-label">
                            {mode === 'vileda' ? '🧽 Vileda Görevi Seninmiş!' : '🧹 Bugünün Görevlisi!'} 🎉
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
