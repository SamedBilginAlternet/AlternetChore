import React from 'react';

interface MemberAvatarProps {
    name: string;
    color?: string;
    size?: number;
    className?: string;
}

export default function MemberAvatar({ name, color = '#3B82F6', size = 32, className = '' }: MemberAvatarProps) {
    const initial = name ? name.charAt(0).toUpperCase() : '?';

    return (
        <div
            className={`member-avatar ${className}`}
            style={{
                width: size,
                height: size,
                background: `linear-gradient(135deg, ${color}, ${color}dd)`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                color: 'white',
                fontWeight: '700',
                fontSize: size * 0.45,
                flexShrink: 0,
                boxShadow: `0 4px 10px ${color}44`,
                border: '2px solid rgba(255, 255, 255, 0.8)',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
        >
            {initial}
        </div>
    );
}
