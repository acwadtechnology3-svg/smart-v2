CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid not null default gen_random_uuid (),
    user_id uuid null,
    subject text not null,
    status text not null default 'open'::text,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null default now(),
    constraint support_tickets_pkey primary key (id),
    constraint support_tickets_status_check check (
        status in ('open', 'closed', 'resolved')
    )
) TABLESPACE pg_default;

CREATE TABLE IF NOT EXISTS public.support_messages (
    id uuid not null default gen_random_uuid (),
    ticket_id uuid null,
    sender_id uuid null,
    message text not null,
    is_admin boolean null default false,
    created_at timestamp with time zone null default now(),
    constraint support_messages_pkey primary key (id),
    constraint support_messages_ticket_id_fkey foreign KEY (ticket_id) references support_tickets (id) on delete CASCADE
) TABLESPACE pg_default;
