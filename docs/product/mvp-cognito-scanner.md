---
id: mvp-cognito-scanner
title: MVP Spec: Cognito Auth & Barcode Scanner
sidebar_label: MVP: Auth & Scanner
---

# MVP Spec: Cognito Auth & Barcode Scanner

## Objectives
* Provide secure user authentication using AWS Cognito.
* Implement ISBN barcode scanning using the Expo Camera.
* Proxy Google Books requests for book details via backend API Gateway.
* Persist scanned books securely in Amazon Aurora Serverless v2 PostgreSQL.

## Target Audience
* Book collectors and readers looking for a personal library management tool.

## Out of Scope
* Social features.
* AI recommendations.

## Security Architecture
* **Cognito JWT Validation:** API Gateway uses a JWT authorizer to validate tokens from Cognito.
* **PostgreSQL User Data Isolation:** User library links and ratings are isolated by `user_id` (Cognito `sub`) in the `user_books` table, referencing shared deduplicated items in the global `books` table.
