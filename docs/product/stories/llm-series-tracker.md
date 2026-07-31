---
id: story-llm-series-tracker
title: User Story: LLM-Powered Series Completion & Reading Order
sidebar_label: Story: Series Tracker
---

# User Story: LLM-Powered Series Completion & Reading Order

## 📖 User Stories
* **Series Aggregation:** As a user with multiple books in a series, I want my library to automatically group books by series so that I can see my progress at a glance.
* **Author Collections:** As a collector of specific authors (e.g. Stephen King or Lee Child), I want my library to group all books by the same author into an Author Collection card so that I can track all books I own by that author, including non-series and standalone titles.
* **Missing Volume Identification:** As a collector, I want the app to list missing volumes in a series so that I know which books to acquire next.
* **Reading Order Advisor:** As a reader, I want an AI-recommended reading order (Release vs Chronological) for complex book series so that I can read them in proper sequence.

## 🧪 Gherkin Acceptance Criteria

### Series Completeness Calculation
```gherkin
Given I have scanned 3 out of 7 books in "Harry Potter"
When I view my Series Tracker dashboard
Then the app should group the 3 books under the "Harry Potter" series card
And display a completeness score of "43% (3/7)"
And list the 4 missing volume titles and numbers in correct order
```

### Author Collection Aggregation
```gherkin
Given I have scanned 5 books by "Stephen King" (including both series and standalone novels)
When I switch to the "Author Collections" tab on the Series Tracker screen
Then the app should display an Author Collection card for "Stephen King"
And display the total count of 5 owned books
And show a horizontal scroll view of all 5 owned Stephen King titles with read status indicators
```

### LLM Hybrid Resolution for Messy Metadata
```gherkin
Given I scan a book belonging to a complex universe with incomplete Open Library series metadata
When the backend API processes the series grouping
Then the system detects incomplete series metadata
And dispatches a structured prompt to the LLM
And the LLM returns a validated JSON payload containing total volume count, missing titles, and recommended reading order
```

## 🛠️ Technical Breakdown

### Frontend (Expo / React Native)
* Segmented View Switcher ("Book Series" vs "Author Collections") on the Series screen.
* Series Progress Card component with completion progress bar.
* Author Collection Card component with total books count and horizontal book carousel.
* Accordion view listing Owned vs Missing books.
* Toggle switch between "Release Order" and "Chronological Reading Order".

### Backend (Node.js / TypeScript Lambda)
* `GET /series` endpoint querying DynamoDB for user's books grouped by `seriesId`.
* `GET /authors` or in-memory context aggregation for grouping user books by author.
* Deterministic parser for Open Library / Google Books volume numbers.
* LLM Service module using structured JSON Schema invocation (Gemini / Bedrock) for fallback resolution.

### Security & Data Model
* Scoped DynamoDB access using Cognito `sub` partition key.
* Output sanitization on LLM responses to prevent UI injection vulnerabilities.
