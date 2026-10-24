# Prankster Boy Chat

A standalone chat room page (`index.html`) backed by Supabase (project `astrocade-multiplayer`).
It is **not** part of the Astrocade game: Astrocade games cannot make network calls to other servers,
so the chat lives on its own page.

## Run it

It is one static file, no build step.

- **Locally:** open `index.html` in a browser (needs internet access for Supabase and the CDN).
- **Hosting:** upload `chat/` to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages).
  - GitHub Pages: Settings > Pages > deploy from branch, folder `/ (root)`, then open `/chat/`.

## How it works

- Rooms live in `chat_rooms` (`lobby`, `halloween`, `tips`). Add a room with a row insert in the Supabase dashboard.
- Messages live in `chat_messages`. New messages arrive through Supabase Realtime.
- Each browser gets a random `client_id` (stored in `localStorage`) used for the rate limit and for "my message" styling.
- The anon key in `index.html` is public by design. What visitors can do is limited by row level security:
  read visible messages, post new ones. They cannot edit or delete.

## Server-side rules (database triggers)

| Rule | Behavior |
| --- | --- |
| Length | Message 1 to 200 characters, nickname 2 to 20 |
| Links | Messages containing links or common domain endings are rejected |
| Blocked words | Words in `chat_blocked_words` are rejected (message and nickname) |
| Rate limit | At most 1 message per second and 15 per minute per `client_id` |
| Auto-prune | Only the latest 100 messages per room are kept |

## Moderation (Supabase SQL editor)

```sql
-- Hide a message from everyone (kept in the table for review)
update public.chat_messages set hidden = true where id = 123;

-- Add a blocked word (lowercase letters only)
insert into public.chat_blocked_words (word) values ('example');

-- Add a room
insert into public.chat_rooms (id, title) values ('events', 'Events');
```

## Known limits

- Anyone can generate a new `client_id`, so the rate limit slows spam but does not stop a determined abuser.
  For stronger protection, enable Anonymous Sign-ins and CAPTCHA in the Supabase dashboard and tie the limit to the user id.
- The blocked word list is small and does not catch disguised spelling. Extend it for your community.
- Players are children in many cases. Review `hidden` messages regularly and consider restricting chat to approved rooms.
