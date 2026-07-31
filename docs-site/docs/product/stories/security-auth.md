---
id: "security-auth"
title: "Secure Identity & Access User Stories"
sidebar_label: "Security & Auth Stories"
sidebar_position: 1
---

# Epic: Secure Identity & Access Management

This Epic covers the implementation of AWS Cognito-powered federated and passwordless authentication, client-side zod schema validation, and secure DynamoDB data isolation rules via IAM Fine-Grained Access Control (FGAC).

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
**I want** database records to be accessible only by their respective owners using AWS IAM Fine-Grained Access Control,
**So that** no user can view, edit, or delete another user's cataloged books or reviews.

### Acceptance Criteria

#### Scenario: Unauthorized Document Retrieval
*   **Given** a malicious user `User_B` attempts to read a book document owned by `User_A`,
*   **When** the DynamoDB request is executed by `User_B` using their Cognito AWS credentials,
*   **Then** AWS IAM denies the operation with an AccessDenied exception because `User_B`'s Cognito sub does not match `User_A`'s partition key (`dynamodb:LeadingKeys`).

#### Scenario: Authorized Document Mutation
*   **Given** `User_A` is authenticated and attempts to update the review content of a book document they own,
*   **When** the update operation is executed with their Cognito AWS credentials,
*   **Then** IAM permits the operation because `User_A`'s Cognito sub matches the `dynamodb:LeadingKeys` condition.

---

## Technical Breakdown

### Frontend (React Native / Expo)
*   Integrate AWS Amplify / `@aws-sdk/client-cognito-identity-provider` SDKs.
*   Setup OAuth 2.0 configuration for Google Sign-In and Apple Sign-In via Cognito User Pool Domain.
*   Create a responsive Login component styled with clean form inputs.
*   Handle Expo deep-linking to capture incoming Cognito authentication tokens on mobile and web.

### Backend & Database (AWS Cognito & DynamoDB)
*   Provision AWS Cognito User Pool with Google & Apple identity providers.
*   Configure Cognito Identity Pool mapping authenticated users to IAM Role `librarian-authenticated-role`.
*   Deploy IAM Policy for DynamoDB Fine-Grained Access Control:
    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "dynamodb:GetItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
            "dynamodb:Query"
          ],
          "Resource": "arn:aws:dynamodb:*:*:table/librarian-books-*",
          "Condition": {
            "ForAllValues:StringEquals": {
              "dynamodb:LeadingKeys": ["${cognito-identity.amazonaws.com:sub}"]
            }
          }
        }
      ]
    }
    ```

### Security & Validation
*   Write client-side schemas using **Zod** to validate standard user details.
*   Deploy **AWS WAF** with IP rate-limiting rules and Managed Rule Sets to protect application endpoints.
