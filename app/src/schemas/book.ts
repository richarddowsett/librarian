import { z } from 'zod';

export const readStatusSchema = z.enum(['unread', 'reading', 'read']);
export type ReadStatus = z.infer<typeof readStatusSchema>;

export const bookSchema = z.object({
  id: z.string().optional(),
  ownerId: z.string().min(1, "Owner ID is required"),
  isbn: z
    .string()
    .transform((val) => val.replace(/[- ]/g, ''))
    .refine((val) => /^(97[89])?\d{9}[\dX]$/i.test(val) || val.length === 0, {
      message: "Invalid ISBN (must be a valid 10 or 13 digit ISBN format)",
    }),
  title: z.string().min(1, "Book title is required").max(300, "Title is too long"),
  subtitle: z.string().max(300).optional().nullable(),
  authors: z.array(z.string()).min(1, "At least one author is required"),
  coverUrl: z.string().url("Must be a valid URL").or(z.literal('')).optional().nullable(),
  publisher: z.string().max(200).optional().nullable(),
  publishDate: z.string().optional().nullable(),
  pageCount: z.number().int().nonnegative().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  categories: z.array(z.string()).optional().nullable(),
  language: z.string().max(10).optional().nullable(),
  readStatus: readStatusSchema.default('unread'),
  rating: z.number().min(1).max(5).optional().nullable(),
  review: z.string().max(2000, "Review must be under 2000 characters").optional().nullable(),
  seriesId: z.string().optional().nullable(),
  seriesName: z.string().optional().nullable(),
  seriesVolumeNumber: z.number().int().positive().optional().nullable(),
  workId: z.string().optional().nullable(),
  bookId: z.string().optional().nullable(),
  dateAdded: z.string().datetime().or(z.string()).optional(),
  dateRead: z.string().datetime().or(z.string()).optional().nullable(),
});

export type Book = z.infer<typeof bookSchema>;

export const createBookSchema = bookSchema.omit({ id: true });
export type CreateBookInput = z.infer<typeof createBookSchema>;

export const updateBookReviewSchema = z.object({
  readStatus: readStatusSchema,
  rating: z.number().min(1).max(5).optional().nullable(),
  review: z.string().max(2000).optional().nullable(),
  dateRead: z.string().optional().nullable(),
});
export type UpdateBookReviewInput = z.infer<typeof updateBookReviewSchema>;

export const bookSearchFilterSchema = z.object({
  query: z.string().default(''),
  statusFilter: z.enum(['all', 'unread', 'reading', 'read']).default('all'),
  sortBy: z.enum(['dateAdded', 'title', 'rating', 'author']).default('dateAdded'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type BookSearchFilter = z.infer<typeof bookSearchFilterSchema>;
