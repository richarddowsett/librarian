---
id: "security-auth"
title: "Secure Identity & Access User Stories"
sidebar_label: "Security & Auth Stories"
sidebar_position: 1
---

# Epic: Secure Identity & Access Management

This Epic covers the implementation of AWS Cognito-powered federated and passwordless authentication, client-side zod schema validation, and secure Amazon Aurora Serverless v2 PostgreSQL user data isolation rules managed via Flyway schema migrations.

---

## User Story 1: Passwordless & Federated Login

**As a** book catalog collector,
**I want** to register and sign in securely using passwordless email links / OTP or standard federated accounts (Google and Apple) via AWS Cognito,
**So that** I don't have to remember another password and can log in instantly on both web and mobile.

### Acceptance Criteria

#### Scenario: Registering/Signing in via Google Federated Login
*   **Given** I am on the login screen,
*   **When** I press the "Continue with Google" button,
*   **Then** a secure AWS Cognito OAuth 2.0 / OIDC Google Sign-In redirect is initiated,
*   **And** upon successful authorization, my user profile is registered/loaded into Cognito User Pool & Identity Pool, and I am redirected to my Library Dashboard.

#### Scenario: Requesting a Passwordless Email Magic Link / OTP
*   **Given** I am on the login screen,
*   **When** I enter a valid email `user@example.com` and press "Send Magic Link",
*   **Then** a secure login verification code / magic link is dispatched via AWS Cognito Custom Auth trigger (Lambda),
*   **And** the application displays a confirmation message asking me to check my inbox.

#### Scenario: Completing Passwordless Login
*   **Given** I have received the Cognito authentication link/code,
*   **When** I complete authentication inside the email or enter the OTP in the app,
*   **Then** the Librarian app validates the token with AWS Cognito User Pool, issues session credentials via Identity Pool, logs me in, and displays my personal dashboard.

---

## User Story 2: User Data Isolation

**As a** security-conscious application owner,
**I want** database records in `user_books` to be isolated strictly by `user_id` matching the user's Cognito `sub`,
**So that** no user can view, edit, or delete another user's personal book status, ratings, or reviews in PostgreSQL.

### Acceptance Criteria

#### Scenario: Unauthorized Record Retrieval
*   **Given** a malicious user `User_B` attempts to read user library records owned by `User_A`,
*   **When** the API query is executed for `User_B` using their Cognito JWT (`sub`),
*   **Then** the query filters strictly by `user_books.user_id = User_B_sub` and denies returning `User_A`'s personal records.

#### Scenario: Authorized Record Mutation
*   **Given** `User_A` is authenticated and attempts to update the review content of a `user_books` record they own,
*   **When** the update operation is executed with their verified Cognito `sub`,
*   **Then** PostgreSQL permits updating the `user_books` row where `user_id = User_A_sub` and `book_id = target_book_id`.

---

## Technical Breakdown

### Frontend (React Native / Expo)
*   Integrate AWS Amplify / `@aws-sdk/client-cognito-identity-provider` SDKs.
*   Setup OAuth 2.0 configuration for Google Sign-In and Apple Sign-In via Cognito User Pool Domain.
*   Create a responsive Login component styled with clean form inputs.
*   Handle Expo deep-linking to capture incoming Cognito authentication tokens on mobile and web.

### Backend & Database (AWS Cognito & Amazon Aurora Serverless v2 PostgreSQL)
*   Provision AWS Cognito User Pool with Google & Apple identity providers.
*   Provision **Amazon Aurora Serverless v2 PostgreSQL** (0.5 - 2.0 ACUs).
*   Manage database migrations using **Flyway SQL migrations** (`backend/migrations/V1__initial_schema.sql`) integrated into GitHub Actions (`deploy-backend.yml`).
*   Implement deduplicated catalog structure:
    *   Global shared `books` table indexed by ISBN.
    *   `user_books` junction table isolating user read status, ratings, and reviews by `user_id` (Cognito `sub`).

### Security & Validation
*   Write client-side schemas using **Zod** to validate standard user details.
*   Deploy **AWS WAF** with IP rate-limiting rules and Managed Rule Sets to protect application endpoints.
