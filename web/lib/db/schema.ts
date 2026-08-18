import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const artists = pgTable(
  'artists',
  {
    user_id: text('user_id').primaryKey(),
    email: text('email'),
    display_name: text('display_name'),
    slug: text('slug'),
    bio: text('bio'),
    profile_image_url: text('profile_image_url'),
    website_url: text('website_url'),
    spotify_url: text('spotify_url'),
    instagram_url: text('instagram_url'),
    bandcamp_url: text('bandcamp_url'),
    public_key: text('public_key').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_artists_slug').on(t.slug)],
);

export const tracks = pgTable(
  'tracks',
  {
    id: text('id').primaryKey(),
    artist_id: text('artist_id')
      .notNull()
      .references(() => artists.user_id),
    title: text('title'),
    name: text('name').notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    type: text('type').notNull(),
    cid: text('cid').notNull(),
    signature: text('signature').notNull(),
    public_key: text('public_key').notNull(),
    storage_url: text('storage_url'),
    producers: text('producers'),
    featuring: text('featuring'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    removed_at: timestamp('removed_at', { withTimezone: true }),
    removed_reason: text('removed_reason'),
  },
  (t) => [
    index('idx_tracks_artist').on(t.artist_id),
    index('idx_tracks_created').on(t.created_at),
  ],
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    admin_id: text('admin_id').notNull(),
    admin_email: text('admin_email').notNull(),
    action: text('action').notNull(),
    target_type: text('target_type').notNull(),
    target_id: text('target_id').notNull(),
    detail: text('detail').notNull(),
  },
  (t) => [index('idx_audit_at').on(t.at)],
);
