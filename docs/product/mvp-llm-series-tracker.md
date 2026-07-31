---
id: mvp-llm-series-tracker
title: MVP Spec: Hybrid LLM Series Tracker & Completeness Advisor
sidebar_label: MVP: LLM Series Tracker
---

# MVP Spec: Hybrid LLM Series Tracker & Completeness Advisor

## 🎯 Objectives
* Automatically organize user library books into logical series (e.g., Harry Potter, The Lord of the Rings, Brandon Sanderson's Cosmere).
* Automatically aggregate books by author to enable "Author Collections" tracking (e.g., collecting all Stephen King or Lee Child standalone novels and series).
* Identify owned volumes vs. missing volumes to calculate series completeness percentage and author collection stats.
* Provide AI-generated reading order recommendations (Release Order vs. Chronological Order).
* Leverage a hybrid strategy: deterministic API metadata parsing first, delegating messy or ambiguous series/author catalog data to an LLM with structured output JSON schema.

## 👤 Target Audience
* Avid readers and collectors managing multi-volume series, manga, graphic novels, or shared universe series.

## 🚫 Out of Scope
* Automatic purchasing/ordering of missing books (affiliate link integration can be added later).
* Real-time multiplayer book sharing or trading.

## 🔒 Security & Performance Architecture
* **Serverless Backend Execution:** Series analysis requests are executed via authenticated API Gateway Lambda functions with Cognito JWT validation.
* **Cost & Latency Optimization:** Deterministic parsing on Open Library/Google Books API metadata runs first. LLM inference (e.g. Gemini via Firebase AI Logic or AWS Bedrock) is invoked only when series metadata is incomplete or ambiguous.
* **Structured Output Enforcement:** LLM outputs strictly follow JSON Schema definitions to prevent parsing errors and guard against prompt injection.
* **Data Isolation:** User series status and completion metrics are scoped strictly by `ownerId` (Cognito `sub`) in DynamoDB.
