---
id: "series-tracking"
title: "Series Tracking & Wishlist User Stories"
sidebar_label: "Series Tracking Stories"
sidebar_position: 3
---

# Epic: Series Tracking & Wishlist Engine

This Epic covers auto-discovering book series using the Open Library API, showing series completion stats, and generating shopping wishlists for missing volumes.

---

## User Story 1: Series Completion Visualization

**As a** book series collector,
**I want** to see a visual checklist of all books in a series,
**So that** I can easily identify which volumes I own, which I have read, and which ones are still missing.

### Acceptance Criteria

#### Scenario: Viewing a Series Page
*   **Given** I own volumes 1, 2, and 4 of "The Lord of the Rings",
*   **When** I open the details page for "The Lord of the Rings" series,
*   **Then** Librarian displays a chronological list of all 4 volumes,
*   **And** marks Volume 1, 2, and 4 as "Owned",
*   **And** marks Volume 3 as "Missing" with a shopping cart icon.

---

## User Story 2: Automatic Series Discovery

**As a** user adding a new book to my library,
**I want** the system to automatically identify if the book is part of a series,
**So that** I don't have to manually search for and link the series information myself.

### Acceptance Criteria

#### Scenario: Cataloging a series book
*   **Given** I scan "Harry Potter and the Sorcerer's Stone",
*   **When** the book is cataloged,
*   **Then** the application queries the Open Library Series structure,
*   **And** links the book to "Harry Potter" series (Volume 1),
*   **And** prompts me: "This book is part of 'Harry Potter'. Would you like to track this series?"

---

## User Story 3: "Missing Volumes" Wishlist

**As a** budget-conscious book shopper,
**I want** a unified list of all missing books from all the series I am tracking,
**So that** I know exactly what to look for when visiting a bookstore.

### Acceptance Criteria

#### Scenario: Accessing the Wishlist
*   **Given** I track three series with missing volumes,
*   **When** I navigate to the "Wishlist" tab,
*   **Then** the application displays a unified list of all missing books, grouped by Series, showing their volume number and cover thumbnails,
*   **And** provides external links to search for or buy the book (e.g., Open Library, Amazon, or Google Books).

---

## Technical Breakdown

### Frontend (React Native / Expo)
*   Build a "Series Detail" screen showing progress bars (e.g. "75% Completed", "3 of 4 volumes owned").
*   Design a grid view showing book card lists containing "Owned", "Read", or "Missing" stickers.
*   Implement a "Wishlist" page aggregating all missing series volumes.

### Metadata Integration (Open Library)
*   Query Open Library's Author or Works metadata to fetch series listings.
*   *Note*: If Open Library API has sparse series linking for certain queries, implement fallback queries checking work tags/classification identifiers.

### Database
*   Write transactions to update the `USER_SERIES_STATUS` table when a new book belonging to a series is added.
*   Store a mapping of `series` details (name, volumes) in Firestore.
