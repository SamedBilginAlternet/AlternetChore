// Shared Types for Chore Manager

export interface Member {
    id: number;
    name: string;
    telegram_handle: string | null;
    color: string;
    avatar_emoji: string;
    active: boolean;
}

export interface Assignment {
    id: number;
    member_id: number;
    date: string;
    type: 'chore' | 'vileda';
    created_by: string;
    name: string;
    color: string;
    avatar_emoji: string;
    telegram_handle: string | null;
}

export interface TodayResponse {
    chore: Assignment | null;
    vileda: Assignment | null;
}

export interface MemberStats {
    id: number;
    name: string;
    color: string;
    avatar_emoji: string;
    chore_count: number;
    vileda_count: number;
    total_assignments: number;
}

export interface Holiday {
    id: number;
    date: string;
    name: string;
}
