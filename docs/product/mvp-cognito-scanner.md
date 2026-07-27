---
id: mvp-cognito-scanner
title: MVP Spec: Cognito Auth & Barcode Scanner
sidebar_label: MVP: Auth & Scanner
---

# MVP Spec: Cognito Auth & Barcode Scanner

## Objectives
* Provide secure user authentication using AWS Cognito.
* Implement ISBN barcode scanning using the Expo Camera.
* Proxy Open Library requests for book details.
* Persist scanned books securely in DynamoDB.

## Target Audience
* Book collectors and readers looking for a personal library management tool.

## Out of Scope
* Social features.
* AI recommendations.

## Security Architecture
* **Cognito JWT Validation:** API Gateway will use a JWT authorizer to validate tokens from Cognito.
* **DynamoDB User Isolation:** Data will be isolated by `sub` (or `ownerId`) to ensure users can only access their own data via Fine-Grained Access Control (FGAC).
