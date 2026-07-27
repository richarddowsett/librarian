---
id: story-cognito-auth-scanner
title: User Story: Cognito Sign-Up & ISBN Scanning
sidebar_label: Story: Auth & Scanner
---

# User Story: Cognito Sign-Up & ISBN Scanning

## User Stories
* **Sign-Up:** As a new user, I want to sign up with my email and password so that I can create a secure account.
* **Verification:** As a new user, I want to verify my email address so that my account is activated.
* **Login:** As a returning user, I want to log in securely so that I can access my library.
* **ISBN Scanning:** As a logged-in user, I want to scan a book's ISBN barcode so that I can quickly add it to my library.

## Gherkin Acceptance Criteria

### Sign-Up
```gherkin
Given I am on the sign-up page
When I enter a valid email and password
And I submit the form
Then my account should be created in Cognito
And I should receive a verification code
```

### ISBN Scanning
```gherkin
Given I am logged in
And I am on the barcode scanner screen
When I point the camera at a valid ISBN barcode
Then the app should extract the ISBN
And fetch book details from the proxy service
And save the book to my DynamoDB library
```

## Technical Breakdown

### Frontend
* Expo React Native application.
* Integrate AWS Amplify for Cognito auth.
* Expo Camera for barcode scanning.

### Backend
* API Gateway with JWT Authorizer.
* Lambda functions for proxying Open Library requests.

### Security
* AWS Cognito User Pools.
* DynamoDB table with partition key `ownerId` (Cognito sub).
