---
id: "infrastructure"
title: "AWS Infrastructure & Database Architecture"
sidebar_label: "Infrastructure & DB"
sidebar_position: 3
---

# AWS Infrastructure & Database Architecture ☁️🐘

This document outlines the cloud infrastructure, serverless services, database schema, and deployment pipelines powering the **Librarian** application.

---

## 🏛️ System Architecture Overview

```mermaid
graph TD
    Client["Expo Mobile & Web SPA<br>(React Native / NativeWind)"] --> CDN["CloudFront CDN<br>(Global Edge Hosting)"]
    CDN --> S3["AWS S3 Bucket<br>(Static SPA Web Assets)"]
    Client --> WAF["AWS WAF Web ACL<br>(Rate Limiting & Security)"]
    WAF --> API["API Gateway v2<br>(HTTP API + JWT Authorizer)"]
    API --> Cognito["AWS Cognito<br>(User Pool & Identity Pool)"]
    API --> LambdaBooks["Books Lambda Service<br>(Node.js 20.x)"]
    API --> LambdaGoogle["Google Books Proxy Lambda<br>(Secrets Manager Integration)"]
    API --> LambdaSeries["Series Lambda Service<br>(Node.js 20.x)"]

    LambdaBooks --> Secrets["AWS Secrets Manager<br>(aurora-db-credentials)"]
    LambdaGoogle --> SecretKey["AWS Secrets Manager<br>(google-books-api-key)"]
    LambdaBooks --> Aurora["Amazon Aurora Serverless v2 PostgreSQL<br>(0.5 - 2.0 ACUs)"]
```

---

## 🗄️ Database Schema & Flyway Migrations

The application uses **Amazon Aurora Serverless v2 PostgreSQL** with a normalized relational database design to eliminate book data duplication across users.

### Schema Structure (`backend/migrations/V1__initial_schema.sql`)

```mermaid
erDiagram
    BOOKS ||--o{ USER_BOOKS : "cataloged by"
    USER_BOOKS }o--|| USER_SERIES_STATUS : "tracked in"

    BOOKS {
        uuid id PK
        varchar_20 isbn UK
        text title
        text subtitle
        text_array authors
        text cover_url
        text publisher
        varchar_50 publish_date
        integer page_count
        text description
        text_array categories
        varchar_10 language
        timestamp_tz created_at
    }

    USER_BOOKS {
        uuid id PK
        varchar_128 user_id FK
        uuid book_id FK
        varchar_20 read_status
        integer rating
        text review
        text series_id
        text series_name
        integer series_volume_number
        timestamp_tz date_added
        timestamp_tz date_read
    }

    USER_SERIES_STATUS {
        uuid id PK
        varchar_128 user_id FK
        text series_id
        boolean is_completed
        text_array ignored_volumes
        timestamp_tz updated_at
    }
```

### Internal ISBN Lookup & Deduplication Flow
1. When a user scans or adds a book by ISBN, `addBookForUser` executes `SELECT id FROM books WHERE isbn = $1`.
2. **Hit**: Reuses the existing `books.id` without making an external API request.
3. **Miss**: Queries Google Books API via the backend proxy, inserts a single shared row into `books`, and creates the user junction record in `user_books`.

---

## 🔄 CI/CD Database Deployment Pipeline

Database migrations are managed using **Flyway CLI** embedded directly into the backend deployment workflow ([`.github/workflows/deploy-backend.yml`](file:///Users/richarddowsett/development/librarian/.github/workflows/deploy-backend.yml)):

```yaml
- name: Run Flyway PostgreSQL Database Migrations
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  uses: flyway/flyway-action@v10
  with:
    url: 'jdbc:postgresql://${{ secrets.DB_HOST }}:${{ secrets.DB_PORT || '5432' }}/${{ secrets.DB_NAME || 'librarian' }}'
    user: '${{ secrets.DB_USER }}'
    password: '${{ secrets.DB_PASSWORD }}'
    locations: 'filesystem:backend/migrations'
    command: 'migrate'
```

---

## 🔒 Security & Fine-Grained Access Control

- **Cognito JWT Validation**: API Gateway validates JWT tokens issued by AWS Cognito User Pool before routing requests to backend Lambdas.
- **Backend API Key Shielding**: Google Books API calls execute strictly on backend Lambdas using credentials retrieved from AWS Secrets Manager (`google-books-api-key`). The API key is never exposed to the client.
- **PostgreSQL Scoping**: User library queries filter by `user_id` (Cognito `sub`), ensuring complete data isolation between users.
- **AWS WAF Protection**: Regional Web ACL enforces IP rate-limiting (default 2000 requests per 5 minutes per IP) and protects against common web vulnerabilities.
