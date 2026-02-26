import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const EMOJI_POOL = ['🧑‍💻', '🎮', '☕', '🎨', '🚀', '🎯', '💡', '⭐', '🔥', '🏆', '🎸', '🌈'];
const COLOR_POOL = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function sendTelegramMessage(chatId: string, text: string, parseMode?: string) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: parseMode,
        }),
    });
    return response.json();
}

async function upsertMember(user: any) {
    if (user.is_bot) return false;

    const handle = user.username || null;
    const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ');

    if (!displayName) return false;

    // Check by handle or name
    const { data: existing } = await supabase
        .from('members')
        .select('*')
        .or(`telegram_handle.eq.${handle},name.eq.${displayName}`)
        .maybeSingle();

    if (existing) {
        if (!existing.active || existing.telegram_handle !== handle) {
            await supabase
                .from('members')
                .update({ active: true, telegram_handle: handle || existing.telegram_handle })
                .eq('id', existing.id);
        }
        return false;
    }

    // Insert new
    await supabase.from('members').insert([
        {
            name: displayName,
            telegram_handle: handle,
            color: pickRandom(COLOR_POOL),
            avatar_emoji: pickRandom(EMOJI_POOL),
            active: true
        }
    ]);
    return true;
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
        const body = await req.json().catch(() => ({}));
        const { action, message } = body;
        console.log(`Action: ${action}, Message: ${message ? 'Yes' : 'No'}`);

        if (!TELEGRAM_TOKEN) console.error("Missing TELEGRAM_BOT_TOKEN");
        if (!TELEGRAM_CHAT_ID) console.error("Missing TELEGRAM_CHAT_ID");

        // Local manual trigger (Test/Sync)
        if (action === 'test') {
            console.log("Running manual test...");
            const res = await sendTelegramMessage(TELEGRAM_CHAT_ID!, "🧪 Supabase Edge Function üzerinden test bildirimi!");
            console.log(`Telegram response: ${JSON.stringify(res)}`);
            return new Response(JSON.stringify({ success: res.ok, result: res }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        if (action === 'sync') {
            console.log("Running manual sync...");
            const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getChatAdministrators?chat_id=${TELEGRAM_CHAT_ID}`;
            const response = await fetch(url);
            const data = await response.json();

            if (!data.ok) {
                console.error(`Sync failed: ${data.description}`);
                throw new Error(data.description);
            }

            const synced: string[] = [];
            for (const admin of data.result) {
                if (admin.user.is_bot) continue;
                const isNew = await upsertMember(admin.user);
                const name = [admin.user.first_name, admin.user.last_name].filter(Boolean).join(' ');
                synced.push(name + (isNew ? ' (yeni)' : ''));
            }

            return new Response(JSON.stringify({ synced, chatId: TELEGRAM_CHAT_ID }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Cron trigger for daily notification
        if (action === 'daily-notification') {
            console.log("Running daily notification...");
            const today = new Date().toISOString().split('T')[0];
            const { data: assignments } = await supabase
                .from('assignments')
                .select('*, members(name, telegram_handle)')
                .eq('date', today);

            if (!assignments || assignments.length === 0) {
                return new Response("No assignments for today", {
                    status: 200,
                    headers: { ...corsHeaders }
                });
            }

            const chore = assignments.find((a: any) => a.type === 'chore');
            const vileda = assignments.find((a: any) => a.type === 'vileda');

            let text = `📅 *Bugünün Görevleri* (${today})\n\n`;
            if (chore) {
                const handle = chore.members.telegram_handle ? `@${chore.members.telegram_handle}` : chore.members.name;
                text += `🧹 Bugün sıra ${handle} sende!\n`;
            }
            if (vileda) {
                const handle = vileda.members.telegram_handle ? `@${vileda.members.telegram_handle}` : vileda.members.name;
                text += `🧽 Vileda görevi: ${handle}\n`;
            }

            const res = await sendTelegramMessage(TELEGRAM_CHAT_ID!, text, "Markdown");
            return new Response("Notification sent", {
                status: 200,
                headers: { ...corsHeaders }
            });
        }

        // Handle incoming Webhook message
        if (message) {
            console.log("Handling webhook message...");
            const chatId = message.chat.id;
            const text = message.text || "";
            const user = message.from;

            // Auto-register
            if (user) {
                const isNew = await upsertMember(user);
                if (isNew) {
                    await sendTelegramMessage(chatId, `👋 Merhaba ${user.first_name}! Görev sistemine otomatik kaydedildin.`);
                }
            }

            if (text === "/who") {
                const today = new Date().toISOString().split('T')[0];
                const { data: assignments } = await supabase
                    .from('assignments')
                    .select('*, members(name, telegram_handle)')
                    .eq('date', today);

                if (!assignments || assignments.length === 0) {
                    await sendTelegramMessage(chatId, "📅 Bugün için görev ataması yok.");
                } else {
                    const chore = assignments.find((a: any) => a.type === 'chore');
                    const vileda = assignments.find((a: any) => a.type === 'vileda');

                    let responseText = `📅 *Bugünün Görevleri* (${today})\n\n`;
                    if (chore) {
                        const handle = chore.members.telegram_handle ? `@${chore.members.telegram_handle}` : chore.members.name;
                        responseText += `🧹 Görev: *${handle}*\n`;
                    }
                    if (vileda) {
                        const handle = vileda.members.telegram_handle ? `@${vileda.members.telegram_handle}` : vileda.members.name;
                        responseText += `🧽 Vileda: *${handle}*\n`;
                    }
                    await sendTelegramMessage(chatId, responseText, "Markdown");
                }
            }
        }

        return new Response(JSON.stringify({ ok: true }), {
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
