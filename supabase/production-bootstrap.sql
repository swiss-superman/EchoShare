insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-images',
  'report-images',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table "User" enable row level security;
alter table "Profile" enable row level security;
alter table "Location" enable row level security;
alter table "WaterBody" enable row level security;
alter table "Report" enable row level security;
alter table "ReportImage" enable row level security;
alter table "ReportAIAnalysis" enable row level security;
alter table "Post" enable row level security;
alter table "Comment" enable row level security;
alter table "Organization" enable row level security;
alter table "CleanupEvent" enable row level security;
alter table "Participant" enable row level security;
alter table "Notification" enable row level security;
alter table "StatusHistory" enable row level security;
alter table "ModerationRecord" enable row level security;
alter table "Account" enable row level security;
alter table "Session" enable row level security;
alter table "VerificationToken" enable row level security;
