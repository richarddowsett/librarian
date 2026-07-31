-- V1__initial_schema.sql
-- Normalized Relational Schema for Librarian App on Amazon Aurora Serverless v2 PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Shared Books Catalog (Global, deduplicated across all users)
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(300) NOT NULL,
  subtitle VARCHAR(300),
  authors TEXT[] NOT NULL DEFAULT '{}',
  cover_url TEXT,
  publisher VARCHAR(200),
  publish_date VARCHAR(50),
  page_count INT DEFAULT 0,
  description TEXT,
  categories TEXT[] DEFAULT '{}',
  language VARCHAR(10),
  work_key VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);

-- 2. User Book Associations (Many-to-Many junction table with user ratings/read status)
CREATE TABLE IF NOT EXISTS user_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(128) NOT NULL,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  read_status VARCHAR(20) NOT NULL DEFAULT 'unread',
  rating INT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  review TEXT,
  series_id VARCHAR(100),
  series_name VARCHAR(200),
  series_volume_number INT,
  date_added TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  date_read TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_user_book UNIQUE (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON user_books(user_id);
CREATE INDEX IF NOT EXISTS idx_user_books_book_id ON user_books(book_id);
CREATE INDEX IF NOT EXISTS idx_user_books_read_status ON user_books(read_status);

-- 3. User Series Status (Completion & ignored volumes tracking)
CREATE TABLE IF NOT EXISTS user_series_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(128) NOT NULL,
  series_id VARCHAR(100) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  ignored_volumes TEXT[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_series UNIQUE (user_id, series_id)
);

CREATE INDEX IF NOT EXISTS idx_user_series_user_id ON user_series_status(user_id, series_id);
