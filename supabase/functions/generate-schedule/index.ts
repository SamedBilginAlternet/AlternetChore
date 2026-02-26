import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function shuffleArray<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log(`Incoming request: ${req.method}`);
        const { month } = await req.json();
        console.log(`Month to generate: ${month}`);

        if (!month) throw new Error("Month is required (YYYY-MM)");

        // ... rest of the logic ...
        const [year, mon] = month.split('-').map(Number);

        // 1. Get active members
        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('*')
            .eq('active', true);

        if (membersError) throw membersError;
        if (!members || members.length === 0) throw new Error("No active members found");

        // 2. Get holidays
        const { data: holidays } = await supabase
            .from('holidays')
            .select('date')
            .like('date', `${month}%`);
        const holidaySet = new Set(holidays?.map((h: any) => h.date));

        // 3. Generate weekdays
        const daysInMonth = new Date(year, mon, 0).getDate();
        const weekdays: string[] = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, mon - 1, day);
            const dayOfWeek = date.getDay();
            const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(dateStr)) {
                weekdays.push(dateStr);
            }
        }

        const viledaDates = weekdays.filter((_, i) => i % 2 === 0);
        const nonViledaDates = weekdays.filter((_, i) => i % 2 !== 0);

        // 4. Delete existing algorithmic assignments for this month
        await supabase.from('assignments')
            .delete()
            .like('date', `${month}%`)
            .eq('created_by', 'algorithm');

        const newAssignments: any[] = [];
        const memberChoreCounts = new Map<number, number>();
        members.forEach((m: any) => memberChoreCounts.set(m.id, 0));

        // 5. Assign Vileda + Chore (Round-robin)
        const viledaPool = [...members];
        shuffleArray(viledaPool);

        viledaDates.forEach((date, i) => {
            const member = viledaPool[i % viledaPool.length];
            newAssignments.push({ member_id: member.id, date, type: 'vileda', created_by: 'algorithm' });
            newAssignments.push({ member_id: member.id, date, type: 'chore', created_by: 'algorithm' });
            memberChoreCounts.set(member.id, (memberChoreCounts.get(member.id) || 0) + 1);
        });

        // 6. Assign remaining Chore-only days (Fairness based)
        nonViledaDates.forEach(date => {
            const sortedMembers = [...members].sort((a, b) => {
                const countA = memberChoreCounts.get(a.id) || 0;
                const countB = memberChoreCounts.get(b.id) || 0;
                return countA - countB;
            });
            const selectedMember = sortedMembers[0];
            newAssignments.push({ member_id: selectedMember.id, date, type: 'chore', created_by: 'algorithm' });
            memberChoreCounts.set(selectedMember.id, (memberChoreCounts.get(selectedMember.id) || 0) + 1);
        });

        // 7. Bulk Insert
        const { error: insertError } = await supabase.from('assignments').insert(newAssignments);
        if (insertError) throw insertError;

        // Return the generated result formatted for the UI
        const chores = newAssignments.filter(a => a.type === 'chore').map(a => {
            const m = members.find((mem: any) => mem.id === a.member_id);
            return { ...a, name: m?.name, color: m?.color };
        });
        const vileda = newAssignments.filter(a => a.type === 'vileda').map(a => {
            const m = members.find((mem: any) => mem.id === a.member_id);
            return { ...a, name: m?.name, color: m?.color };
        });

        return new Response(JSON.stringify({ chores, vileda }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err: unknown) {
        const error = err as Error;
        console.error(`Error: ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
