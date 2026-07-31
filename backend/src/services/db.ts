import { Pool, PoolConfig } from 'pg';
import { Book, CreateBookInput, UserSeriesStatus } from '../types';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { fetchBookByISBN } from './googleBooks';

let pool: Pool | null = null;

export async function getDbPool(): Promise<Pool> {
  if (pool) return pool;

  let host = process.env.PGHOST || process.env.DB_HOST || 'localhost';
  let port = parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10);
  let database = process.env.PGDATABASE || process.env.DB_NAME || 'librarian';
  let user = process.env.PGUSER || process.env.DB_USER || 'postgres';
  let password = process.env.PGPASSWORD || process.env.DB_PASSWORD || 'postgres';

  // If running in AWS environment without direct DB env vars, try fetching from Secrets Manager
  if (!process.env.PGHOST && process.env.NODE_ENV !== 'test') {
    try {
      const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'eu-central-1' });
      let secretRes;
      const secretName = process.env.SECRET_ID || `librarian-${process.env.NODE_ENV || 'dev'}-aurora-db-credentials`;
      try {
        secretRes = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
      } catch {
        secretRes = await client.send(new GetSecretValueCommand({ SecretId: 'aurora-db-credentials' }));
      }
      if (secretRes.SecretString) {
        const creds = JSON.parse(secretRes.SecretString);
        host = creds.host || creds.engine || host;
        port = creds.port ? parseInt(creds.port, 10) : port;
        database = creds.dbname || creds.database || database;
        user = creds.username || creds.user || user;
        password = creds.password || password;
      }
    } catch (err) {
      console.warn('SecretsManager lookup for aurora-db-credentials skipped/unresolved:', err);
    }
  }

  const poolConfig: PoolConfig = {
    host,
    port,
    database,
    user,
    password,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };

  pool = new Pool(poolConfig);
  return pool;
}

export function setDbPoolForTesting(testPool: Pool | null) {
  pool = testPool;
}

/**
 * Maps raw SQL join result row to Book object.
 */

function mapRowToBook(row: any): Book {
  return {
    id: row.id,
    ownerId: row.user_id,
    isbn: row.isbn,
    title: row.title,
    subtitle: row.subtitle || null,
    authors: Array.isArray(row.authors) ? row.authors : [],
    coverUrl: row.cover_url || null,
    publisher: row.publisher || null,
    publishDate: row.publish_date || null,
    pageCount: row.page_count ? parseInt(row.page_count, 10) : 0,
    description: row.description || null,
    categories: Array.isArray(row.categories) ? row.categories : [],
    language: row.language || null,
    readStatus: row.read_status,
    rating: row.rating ? parseInt(row.rating, 10) : null,
    review: row.review || null,
    seriesId: row.series_id || null,
    seriesVolumeNumber: row.series_volume_number ? parseInt(row.series_volume_number, 10) : null,
    workId: row.work_key || null,
    dateAdded: row.date_added ? new Date(row.date_added).toISOString() : new Date().toISOString(),
    dateRead: row.date_read ? new Date(row.date_read).toISOString() : null,
  };
}

/**
 * Fetches all books for a specific user.
 */
export async function getBooksByUser(userId: string): Promise<Book[]> {
  const db = await getDbPool();
  const query = `
    SELECT 
      ub.id,
      ub.user_id,
      b.isbn,
      b.title,
      b.subtitle,
      b.authors,
      b.cover_url,
      b.publisher,
      b.publish_date,
      b.page_count,
      b.description,
      b.categories,
      b.language,
      b.work_key,
      ub.read_status,
      ub.rating,
      ub.review,
      ub.series_id,
      ub.series_name,
      ub.series_volume_number,
      ub.date_added,
      ub.date_read
    FROM user_books ub
    JOIN books b ON ub.book_id = b.id
    WHERE ub.user_id = $1
    ORDER BY ub.date_added DESC;
  `;
  const result = await db.query(query, [userId]);
  return result.rows.map(mapRowToBook);
}

/**
 * Adds a book to a user's library.
 * Deduplication logic: Checks internal 'books' table by ISBN first.
 * If missing from internal database, attempts Google Books API fetch before inserting into shared 'books' table.
 */
export async function addBookForUser(userId: string, input: Omit<CreateBookInput, 'ownerId'>): Promise<Book> {
  const db = await getDbPool();
  const cleanIsbn = (input.isbn || '').replace(/[-\s]/g, '').trim().toUpperCase();

  let bookId: string | null = null;

  // 1. Internal Database Search by ISBN first!
  if (cleanIsbn) {
    const existingBookRes = await db.query(`SELECT id FROM books WHERE isbn = $1`, [cleanIsbn]);
    if (existingBookRes.rows.length > 0) {
      bookId = existingBookRes.rows[0].id;
    }
  }

  // 2. If not found in internal database, query Google Books API or use input fields
  if (!bookId) {
    let title = input.title;
    let subtitle = input.subtitle || null;
    let authors = input.authors || ['Unknown Author'];
    let coverUrl = input.coverUrl || null;
    let publisher = input.publisher || null;
    let publishDate = input.publishDate || null;
    let pageCount = input.pageCount || 0;
    let description = input.description || null;
    let categories = input.categories || [];
    let language = input.language || null;
    let workKey: string | null = null;

    if (cleanIsbn) {
      const googleMeta = await fetchBookByISBN(cleanIsbn);
      if (googleMeta) {
        title = googleMeta.title || title;
        subtitle = googleMeta.subtitle || subtitle;
        authors = googleMeta.authors || authors;
        coverUrl = googleMeta.coverUrl || coverUrl;
        publisher = googleMeta.publisher || publisher;
        publishDate = googleMeta.publishDate || publishDate;
        pageCount = googleMeta.pageCount || pageCount;
        description = googleMeta.description || description;
        categories = googleMeta.categories || categories;
        language = googleMeta.language || language;
        workKey = googleMeta.workKey || null;
      }
    }

    const insertBookRes = await db.query(
      `
      INSERT INTO books (isbn, title, subtitle, authors, cover_url, publisher, publish_date, page_count, description, categories, language, work_key)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (isbn) DO UPDATE SET title = EXCLUDED.title
      RETURNING id;
      `,
      [
        cleanIsbn || `NOISBN-${Date.now()}`,
        title,
        subtitle,
        authors,
        coverUrl,
        publisher,
        publishDate,
        pageCount,
        description,
        categories,
        language,
        workKey,
      ]
    );

    bookId = insertBookRes.rows[0].id;
  }

  // 3. Associate book with user in 'user_books' table
  const dateAdded = input.dateAdded ? new Date(input.dateAdded) : new Date();
  const dateRead = input.dateRead ? new Date(input.dateRead) : null;

  const userBookRes = await db.query(
    `
    INSERT INTO user_books (user_id, book_id, read_status, rating, review, series_id, series_name, series_volume_number, date_added, date_read)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (user_id, book_id) DO UPDATE SET
      read_status = EXCLUDED.read_status,
      rating = EXCLUDED.rating,
      review = EXCLUDED.review,
      date_read = EXCLUDED.date_read
    RETURNING id;
    `,
    [
      userId,
      bookId,
      input.readStatus || 'unread',
      input.rating || null,
      input.review || null,
      input.seriesId || null,
      input.seriesName || null,
      input.seriesVolumeNumber || null,
      dateAdded,
      dateRead,
    ]
  );

  const userBookId = userBookRes.rows[0].id;

  // Fetch complete joined record
  const fullRes = await db.query(
    `
    SELECT 
      ub.id, ub.user_id, b.isbn, b.title, b.subtitle, b.authors, b.cover_url, b.publisher, b.publish_date,
      b.page_count, b.description, b.categories, b.language, b.work_key, ub.read_status, ub.rating,
      ub.review, ub.series_id, ub.series_name, ub.series_volume_number, ub.date_added, ub.date_read
    FROM user_books ub
    JOIN books b ON ub.book_id = b.id
    WHERE ub.id = $1;
    `,
    [userBookId]
  );

  return mapRowToBook(fullRes.rows[0]);
}

/**
 * Updates a user's book review or read status.
 */
export async function updateUserBook(userId: string, userBookId: string, updates: Partial<Book>): Promise<Book | null> {
  const db = await getDbPool();

  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.readStatus !== undefined) {
    fields.push(`read_status = $${idx++}`);
    values.push(updates.readStatus);
  }
  if (updates.rating !== undefined) {
    fields.push(`rating = $${idx++}`);
    values.push(updates.rating);
  }
  if (updates.review !== undefined) {
    fields.push(`review = $${idx++}`);
    values.push(updates.review);
  }
  if (updates.dateRead !== undefined) {
    fields.push(`date_read = $${idx++}`);
    values.push(updates.dateRead ? new Date(updates.dateRead) : null);
  }

  if (fields.length === 0) return null;

  values.push(userBookId);
  values.push(userId);

  const query = `
    UPDATE user_books
    SET ${fields.join(', ')}
    WHERE id = $${idx++} AND user_id = $${idx++}
    RETURNING id;
  `;

  const res = await db.query(query, values);
  if (res.rows.length === 0) return null;

  const fullRes = await db.query(
    `
    SELECT 
      ub.id, ub.user_id, b.isbn, b.title, b.subtitle, b.authors, b.cover_url, b.publisher, b.publish_date,
      b.page_count, b.description, b.categories, b.language, b.work_key, ub.read_status, ub.rating,
      ub.review, ub.series_id, ub.series_name, ub.series_volume_number, ub.date_added, ub.date_read
    FROM user_books ub
    JOIN books b ON ub.book_id = b.id
    WHERE ub.id = $1;
    `,
    [userBookId]
  );

  return mapRowToBook(fullRes.rows[0]);
}

/**
 * Deletes a user's book entry.
 */
export async function deleteUserBook(userId: string, userBookId: string): Promise<boolean> {
  const db = await getDbPool();
  const res = await db.query(`DELETE FROM user_books WHERE id = $1 AND user_id = $2;`, [userBookId, userId]);
  return (res.rowCount ?? 0) > 0;
}

/**
 * Fetches user series completion status.
 */
export async function getUserSeriesStatusDb(userId: string, seriesId: string): Promise<UserSeriesStatus | null> {
  const db = await getDbPool();
  const res = await db.query(
    `SELECT id, user_id, series_id, is_completed, ignored_volumes FROM user_series_status WHERE user_id = $1 AND series_id = $2;`,
    [userId, seriesId]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    seriesId: row.series_id,
    isCompleted: row.is_completed,
    ignoredVolumes: Array.isArray(row.ignored_volumes) ? row.ignored_volumes : [],
  };
}

/**
 * Saves user series completion status.
 */
export async function saveUserSeriesStatusDb(userId: string, seriesId: string, isCompleted: boolean, ignoredVolumes: string[]): Promise<UserSeriesStatus> {
  const db = await getDbPool();
  const res = await db.query(
    `
    INSERT INTO user_series_status (user_id, series_id, is_completed, ignored_volumes, updated_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, series_id) DO UPDATE SET
      is_completed = EXCLUDED.is_completed,
      ignored_volumes = EXCLUDED.ignored_volumes,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id, user_id, series_id, is_completed, ignored_volumes;
    `,
    [userId, seriesId, isCompleted, ignoredVolumes]
  );
  const row = res.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    seriesId: row.series_id,
    isCompleted: row.is_completed,
    ignoredVolumes: Array.isArray(row.ignored_volumes) ? row.ignored_volumes : [],
  };
}
