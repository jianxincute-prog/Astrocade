# Multiplayer with Supabase Realtime (creator guide)

Source: tutorial shared by a veteran Astrocade creator (via the user). Saved verbatim in substance.
Goal: multiplayer in an Astrocade game using Supabase Realtime channels ONLY. No database, no SQL, no file editing, only prompts.

## STEP 1 - Generate multiplayer in Astrocade
Paste this prompt into Astrocade first:

```
Create multiplayer using ONLY Supabase Realtime channels.
Do NOT use SQL, tables, or migrations.

I want the game to:
- join multiplayer rooms
- broadcast events to everyone in the room
- receive events from other players
- sync chat and basic game state
- handle player join and leave
- use realtime.channel() only

At the top of the script, include a connectSupabase() function with
placeholder values for the Project URL and anon key so we can replace them later.
```

Astrocade generates the full multiplayer-ready script.

## STEP 2 - Create your Supabase project
1. Go to https://supabase.com
2. Click New Project, choose the free tier, wait for setup to finish
3. Go to Settings -> API
4. Copy only two things:
   - Project URL (looks like `https://xxxx.supabase.co`)
   - anon (public) key (starts with `eyJ...`)

## STEP 3 - Tell Astrocade to insert the URL + key
Do NOT edit the file manually. Paste this prompt into Astrocade:

```
Replace the Supabase credentials in the connectSupabase() function.

Here are my Supabase values:

Project URL:
<PASTE YOUR SUPABASE PROJECT URL HERE>

Anon Key:
<PASTE YOUR SUPABASE ANON KEY HERE>

Find the lines in the code that look like this:

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

Replace ONLY the two strings above with my real URL and anon key.
Do not change anything else in the file.

Return only the updated connectSupabase() function.
```

## STEP 4 - Join a multiplayer room
1. In the game press the menu FAB (hamburger), it asks for a room name (e.g. `testroom`)
2. Open the game in another browser tab and join the SAME room
3. Expected: connected to multiplayer, other players joining, messages syncing, game state syncing

## Notes (added by Claude, not part of the original guide - unverified)
- The anon key is meant to be public; never use the service_role key in game code.
- Not yet tested in the Astrocade sandbox: the iframe/network policy may block loading supabase-js from a CDN or the realtime websocket. Verify with a small test before building on it.
- Realtime broadcast has no server-side authority, so clients can cheat; keep it for casual/co-op play, not ranked leaderboards.
