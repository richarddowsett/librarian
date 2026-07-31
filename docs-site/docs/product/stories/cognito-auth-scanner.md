---
id: "story-cognito-auth-scanner"
title: "User Story: Cognito Sign-Up & ISBN Scanning"
sidebar_label: "Auth & Scanner Story"
sidebar_position: 4
---

# User Story: Cognito Sign-Up & ISBN Scanning

## User Stories
* **Sign-Up:** As a new user, I want to sign up with my email and password so that I can create a secure account.
* **Verification:** As a new user, I want to verify my email address with a 6-digit confirmation code so that my account is activated.
* **Login:** As a returning user, I want to log in securely with my credentials so that I can access my personalized library.
* **ISBN Scanning:** As a logged-in user, I want to scan a book's ISBN barcode using my camera so that I can automatically retrieve metadata and save it to Amazon Aurora Serverless v2 PostgreSQL.

## Gherkin Acceptance Criteria

### Sign-Up & Verification
```gherkin
Given I am on the sign-up tab of the login screen
When I enter a valid email address and strong password
And I submit the account creation form
Then my account should be registered in AWS Cognito User Pool
And a 6-digit confirmation code should be sent to my email
When I enter the correct 6-digit verification code
Then my account status should become CONFIRMED
And I should be able to log in successfully
```

### ISBN Scanning & Persistence
```gherkin
Given I am logged in with a valid Cognito JWT token
And I am on the Barcode Scanner screen
When I scan a valid book ISBN barcode with the camera
Then the app should query the API Gateway Open Library proxy
And retrieve book title, author, cover image, and publisher metadata
When I click "Add to My Library"
Then the book details should be saved to Amazon Aurora Serverless v2 PostgreSQL in the deduplicated `books` table and linked in `user_books` under my Cognito sub identifier
And appear instantly in my book collection
```

## Technical Breakdown

### Frontend
* Expo React Native application with NativeWind styling.
* AWS Cognito IDP REST Service (`app/src/services/cognitoService.ts`).
* Live camera barcode reader (`expo-camera`).

### Backend
* AWS API Gateway v2 with Cognito JWT Authorizer.
* Node.js 20 Lambda services (`books`, `openLibrary`, `series`, `userSeriesStatus`).
* Amazon Aurora Serverless v2 PostgreSQL (0.5 - 2.0 ACUs) with Flyway migrations (`backend/migrations/V1__initial_schema.sql`) integrated in GitHub Actions (`deploy-backend.yml`).

### Security
* AWS Cognito User Pool (`librarian-dev-user-pool`).
* PostgreSQL junction table user data isolation (`user_books.user_id` matching Cognito `sub`).
