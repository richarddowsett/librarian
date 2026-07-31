---
id: mvp-cognito-scanner
title: MVP Spec: Cognito Auth & Barcode Scanner
sidebar_label: MVP: Auth & Scanner
sidebar_position: 2
---

# MVP Spec: Cognito Auth & Barcode Scanner

## Objectives
* Provide secure user authentication using AWS Cognito User Pool.
* Implement live ISBN barcode scanning using `expo-camera`.
* Proxy Open Library API requests for book details via AWS Lambda.
* Persist scanned books securely in Amazon Aurora Serverless v2 PostgreSQL (0.5 - 2.0 ACUs) with Flyway SQL migrations and Cognito JWT authorization.

## Target Audience
* Book collectors and readers looking for a personal library management and series tracking application.

## Out of Scope
* Public book sharing / social community feeds (scheduled for future releases).
* AI-driven book recommendations.

## Security Architecture
* **Cognito JWT Validation:** API Gateway uses a JWT authorizer to validate tokens issued by AWS Cognito.
* **PostgreSQL User Isolation:** Shared global `books` table indexed by ISBN and `user_books` junction table isolating user read status, ratings, and reviews by `user_id` matching the Cognito `sub` claim.
