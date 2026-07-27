import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { Book, SeriesDetails, UserSeriesStatus } from '../types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const BOOKS_TABLE = process.env.BOOKS_TABLE_NAME || 'librarian-dev-books';
const SERIES_TABLE = process.env.SERIES_TABLE_NAME || 'librarian-dev-series';
const USER_SERIES_STATUS_TABLE =
  process.env.USER_SERIES_STATUS_TABLE_NAME || 'librarian-dev-user-series-status';

// ----------------------------------------------------
// BOOKS TABLE OPERATIONS
// ----------------------------------------------------

export async function getBooksByOwner(ownerId: string): Promise<Book[]> {
  const command = new QueryCommand({
    TableName: BOOKS_TABLE,
    KeyConditionExpression: 'ownerId = :ownerId',
    ExpressionAttributeValues: {
      ':ownerId': ownerId,
    },
  });
  const response = await docClient.send(command);
  return (response.Items as Book[]) || [];
}

export async function getBookById(ownerId: string, id: string): Promise<Book | null> {
  const command = new GetCommand({
    TableName: BOOKS_TABLE,
    Key: { ownerId, id },
  });
  const response = await docClient.send(command);
  return (response.Item as Book) || null;
}

export async function putBook(book: Book): Promise<Book> {
  const command = new PutCommand({
    TableName: BOOKS_TABLE,
    Item: book,
  });
  await docClient.send(command);
  return book;
}

export async function deleteBook(ownerId: string, id: string): Promise<boolean> {
  const command = new DeleteCommand({
    TableName: BOOKS_TABLE,
    Key: { ownerId, id },
  });
  await docClient.send(command);
  return true;
}

export async function updateBook(
  ownerId: string,
  id: string,
  updates: Partial<Book>
): Promise<Book | null> {
  const existing = await getBookById(ownerId, id);
  if (!existing) return null;

  const updated: Book = {
    ...existing,
    ...updates,
    ownerId,
    id,
  };

  await putBook(updated);
  return updated;
}

// ----------------------------------------------------
// SERIES TABLE OPERATIONS
// ----------------------------------------------------

export async function getSeriesById(id: string): Promise<SeriesDetails | null> {
  const command = new GetCommand({
    TableName: SERIES_TABLE,
    Key: { id },
  });
  const response = await docClient.send(command);
  return (response.Item as SeriesDetails) || null;
}

export async function getAllSeries(): Promise<SeriesDetails[]> {
  const command = new ScanCommand({
    TableName: SERIES_TABLE,
  });
  const response = await docClient.send(command);
  return (response.Items as SeriesDetails[]) || [];
}

export async function putSeries(series: SeriesDetails): Promise<SeriesDetails> {
  const command = new PutCommand({
    TableName: SERIES_TABLE,
    Item: series,
  });
  await docClient.send(command);
  return series;
}

// ----------------------------------------------------
// USER SERIES STATUS TABLE OPERATIONS
// ----------------------------------------------------

export async function getUserSeriesStatus(
  userId: string,
  seriesId: string
): Promise<UserSeriesStatus | null> {
  const command = new GetCommand({
    TableName: USER_SERIES_STATUS_TABLE,
    Key: { userId, seriesId },
  });
  const response = await docClient.send(command);
  return (response.Item as UserSeriesStatus) || null;
}

export async function getAllUserSeriesStatuses(userId: string): Promise<UserSeriesStatus[]> {
  const command = new QueryCommand({
    TableName: USER_SERIES_STATUS_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
  });
  const response = await docClient.send(command);
  return (response.Items as UserSeriesStatus[]) || [];
}

export async function putUserSeriesStatus(status: UserSeriesStatus): Promise<UserSeriesStatus> {
  const command = new PutCommand({
    TableName: USER_SERIES_STATUS_TABLE,
    Item: status,
  });
  await docClient.send(command);
  return status;
}
