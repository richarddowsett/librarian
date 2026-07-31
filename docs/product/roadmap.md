---
id: roadmap
title: Product Roadmap - Paige AI Librarian
sidebar_label: Roadmap
---

# Product Roadmap: Paige 📚

**Paige** is an AI-powered personal librarian mobile app that lets readers scan, track, complete, and converse with their physical book collection.

## Phase 1: Security & Foundation
* AWS Cognito User Pool Auth
* JWT API Gateway Authorizer
* DynamoDB FGAC (Fine-Grained Access Control by `sub`)

## Phase 2: Functional Core & Mobile UI
* Expo Camera ISBN Barcode Scanner
* Open Library & Google Books Proxy Services
* Personal Collection Storage in DynamoDB

## Phase 3: AI & Advanced Enhancements
* **"Chat with Paige" Conversational AI Companion:** Natural language Q&A over the user's personal library ("Paige, do I own Volume 4?", "What fantasy book should I read next?")
* **Hybrid LLM Series & Author Collection Tracker:** Automatic series & author grouping, missing volume identification, author catalog aggregation (e.g. Stephen King, Lee Child collection tracking), and reading order guidance (Release vs Chronological)
* **Smart AI Recommendations:** Tailored reading suggestions based on shelf preferences and series progress
