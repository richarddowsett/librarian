---
id: "catalog-management"
title: "Library Cataloging & Search User Stories"
sidebar_label: "Cataloging & Search Stories"
sidebar_position: 2
---

# Epic: Cataloging & Search Engine

This Epic covers barcode scanning via the device camera, ISBN metadata retrieval using Open Library, manual catalog additions, review logging, and library catalog searching/filtering.

---

## User Story 1: Barcode Scanning & Auto-Lookup

**As a** book owner,
**I want** to scan a physical book's barcode using my device camera,
**So that** its metadata (title, author, publisher, cover image) is automatically retrieved and cataloged without manual typing.

### Acceptance Criteria

#### Scenario: Successful Camera Barcode Scan and Open Library Match
*   **Given** I have granted camera permissions to Librarian,
*   **When** I point my camera at a book's ISBN barcode,
*   **Then** the scanner detects the ISBN (e.g., `9780545010221`),
*   **And** sends a request to the Open Library API,
*   **And** displays a preview page containing the correct details: "Harry Potter and the Deathly Hallows" by J.K. Rowling,
*   **And** allows me to save the book to my catalog.

#### Scenario: Camera Barcode Scan with No Match
*   **Given** the camera scans a barcode that does not exist in the Open Library database,
*   **When** the API returns a empty result,
*   **Then** Librarian displays a fallback form populated with the scanned ISBN,
*   **And** prompts me to fill in the Title, Author, and other details manually.

---

## User Story 2: Catalog Filtering & Searching

**As a** collector with hundreds of books,
**I want** to search and filter my cataloged library by title, author, and reading status,
**So that** I can immediately locate books and avoid buying duplicates.

### Acceptance Criteria

#### Scenario: Searching by Title or Author keyword
*   **Given** I have 250 cataloged books,
*   **When** I type "Sanderson" in the search box,
*   **Then** the collection instantly filters to display only books where the author is "Brandon Sanderson" or the title contains "Sanderson".

#### Scenario: Filtering by Read Status
*   **Given** I want to choose my next book to read,
*   **When** I toggle the filter option to "Unread",
*   **Then** only books whose `readStatus` is currently marked "Unread" are rendered.

---

## User Story 3: Reading Status & Review Logging

**As a** reader,
**I want** to toggle my progress (Unread, In Progress, Read) and write reviews/ratings,
**So that** I can track my personal opinions and record when I finished reading a book.

### Acceptance Criteria

#### Scenario: Finishing a Book
*   **Given** a book is marked as "In Progress",
*   **When** I change its status to "Read",
*   **Then** the application prompts me for a star rating (1-5) and a written review,
*   **And** automatically defaults the `dateRead` to today's date.

---

## Technical Breakdown

### Frontend (React Native / Expo)
*   Integrate `expo-camera` or an Expo-compatible barcode scanner module.
*   Implement camera permission lifecycle checks (handling blocked or denied permission gracefully).
*   Build a scanner overlay UI with targeting reticle and toggle flashlight controls.
*   Create a Search Bar component with debounce functionality to avoid unnecessary re-renders.
*   Build custom form elements for stars rating (visual interactive stars) and markdown-compatible review text area.

### Integration (Open Library API)
*   Implement client-side HTTP queries to the Open Library Book API:
    `https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&jscmd=data&format=json`
*   Create a data mapper to convert Open Library schemas into internal `Book` schemas.

### Database
*   Create Firestore indices for fields: `ownerId`, `title`, `authors`, `readStatus`, and `dateAdded` to optimize sorting and queries.
