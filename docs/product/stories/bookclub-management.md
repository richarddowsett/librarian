---
id: story-bookclub-management
title: User Stories: Book Club Management & Monetization
sidebar_label: Story: Book Club Engine
sidebar_position: 4
---

# User Stories: Book Club Management & Monetization 📖👥

---

## 1. Member Invites & Onboarding

### Story
**As a** Book Club Host,  
**I want to** generate secure, shareable invite links and QR codes,  
**So that** I can easily invite members across social media, email, or in-person meetups.

### Acceptance Criteria (Given / When / Then)

* **Scenario 1: Generating a signed invite link**
  * **Given** an authenticated Host in their active book club dashboard,
  * **When** they click "Share Club Invite",
  * **Then** the system generates a tokenized URL with an expiration timestamp and renders a scannable QR code.

* **Scenario 2: Joining via an invite link**
  * **Given** a prospective member clicks a valid book club invite link,
  * **When** they open the link in Paige (or on the web),
  * **Then** they see the club details, active book pick, and a "Join Club" button.

---

## 2. Democratic Book Selection & Pacing Schedule

### Story
**As a** Book Club Member,  
**I want to** nominate books and vote in club polls,  
**So that** our group democratically selects our next reading pick and receives an automated weekly chapter schedule.

### Acceptance Criteria (Given / When / Then)

* **Scenario 1: Voting in a book pick poll**
  * **Given** an active book selection poll created by the Host,
  * **When** a Member casts their vote before the deadline,
  * **Then** their vote is recorded once and live percentage tallies update for the Host.

* **Scenario 2: Automated Schedule Generation**
  * **Given** a winning book is selected,
  * **When** the Host confirms the reading start date and duration (e.g. 4 weeks),
  * **Then** Paige automatically calculates and publishes weekly chapter milestones (e.g. Week 1: Ch 1–6, Week 2: Ch 7–12).

---

## 3. Chapter-Gated Spoiler-Free Communication

### Story
**As a** Book Club Member,  
**I want** discussion channels to be structured by chapter milestones,  
**So that** I can discuss what I've read without seeing spoilers for future chapters.

### Acceptance Criteria (Given / When / Then)

* **Scenario 1: Posting in a chapter thread**
  * **Given** a member is reading Week 2 (Chapters 7-12),
  * **When** they post in the "Week 2 Discussion" thread,
  * **Then** the message is visible only inside that specific chapter container.

* **Scenario 2: Spoiler tag warning**
  * **Given** a user types a spoiler in general chat,
  * **When** they surround text with spoiler syntax `||spoiler||` or AI spoiler protection flags high-confidence plot points,
  * **Then** the content is visually blurred until another reader taps to reveal it.

---

## 4. Paid Book Club Subscriptions & Monetization

### Story
**As a** Professional Book Club Host / Creator,  
**I want to** set a monthly subscription fee for joining my expert reading group,  
**So that** I can monetize my curatorial work while Paige automatically handles billing and payout split.

### Acceptance Criteria (Given / When / Then)

* **Scenario 1: Creating a paid book club**
  * **Given** a Host with an onboarded Stripe Connect account,
  * **When** they set the club access fee to $15/month,
  * **Then** new members must complete Stripe Checkout before joining the club's chat and schedule.

* **Scenario 2: Automatic platform fee split**
  * **Given** a member pays a $15.00 monthly subscription,
  * **When** payment processes successfully via Stripe Connect,
  * **Then** Paige retains $1.80 (12% platform fee) and transfers $13.20 directly to the Host's connected bank account.

---

## 💻 Technical Task Breakdown

### Frontend (Expo / React Native)
- [ ] Build `ClubInviteModal` component with dynamic QR code rendering via `react-native-qrcode-svg`.
- [ ] Build `BookPollWidget` supporting single and ranked-choice voting UI.
- [ ] Implement `ChapterChatView` with collapsible milestone threads and tap-to-reveal spoiler tags.
- [ ] Integrate Stripe Checkout Webview / PaymentSheet for paid club onboarding.

### Backend (Node.js & AWS Lambda)
- [ ] Implement `POST /clubs/{id}/invite` endpoint generating HMAC-SHA256 tokenized URLs.
- [ ] Implement `POST /clubs/{id}/vote` endpoint with duplicate-vote validation in DynamoDB.
- [ ] Implement `POST /clubs/{id}/checkout` using Stripe Connect `PaymentIntents` with `application_fee_amount`.
- [ ] Set up WebSocket serverless authorizer for real-time chapter chat room routing.

### Security & Database
- [ ] Update `firestore.rules` or DynamoDB IAM FGAC policies to restrict `clubId` data access to confirmed club members.
- [ ] Implement input sanitization middleware against HTML/script injection in message feeds.
