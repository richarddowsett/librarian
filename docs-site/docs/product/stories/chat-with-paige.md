---
id: "story-chat-with-paige"
title: "User Story: Chat with Paige (Conversational AI Librarian)"
sidebar_label: "Story: Chat with Paige"
sidebar_position: 6
---

# User Story: Chat with Paige (Conversational AI Librarian)

## 📖 User Stories
* **Library Natural Language Query:** As a user, I want to ask Paige questions like *"Do I own Volume 4 of Jujutsu Kaisen?"* so that I can quickly check my collection without manual searching.
* **Smart Reading Advice:** As a reader, I want to ask Paige *"What unread book should I read next based on my mood?"* so that I get personalized recommendations from my shelf.
* **Series Completeness Q&A:** As a collector, I want to ask Paige *"What series am I closest to finishing?"* so that I can prioritize my next book purchases.

## 🧪 Gherkin Acceptance Criteria

### Library Inventory Query
```gherkin
Given I have 5 books from "Dune" in my scanned collection
When I open the chat tab and ask Paige "Do I own Chapterhouse: Dune?"
Then Paige queries my PostgreSQL collection via tool calling
And responds in natural language: "Yes, you added Chapterhouse: Dune on July 12th! You currently own 5 out of 6 main Dune novels."
```

### Conversational Recommendation
```gherkin
Given I ask Paige "Recommend a fast-paced thriller from my unread shelf"
When Paige evaluates my collection items flagged as "Unread" with category "Thriller"
Then Paige suggests a specific title with a brief friendly pitch based on book metadata
```

## 🛠️ Technical Breakdown

### Frontend (Expo / React Native)
* Conversational UI screen (`/app/(tabs)/chat.tsx`).
* Chat message bubble list with streaming response support.
* Quick suggestion chips ("Do I own...?", "What should I read next?", "Series progress").

### Backend & AI Logic (Node.js / Lambda / Bedrock or Gemini API)
* `POST /chat` endpoint backed by Function Calling / Tool Use.
* **Library Tool:** `query_user_library(user_id, titleQuery, seriesQuery)` retrieves relevant items from Amazon Aurora Serverless v2 PostgreSQL `user_books` table.
* System prompt persona definition for **Paige**: warm, knowledgeable, concise, and enthusiastic about books.

### Security
* Function calling context is strictly bound to the caller's Cognito JWT token (`sub`), preventing cross-user data exposure.
