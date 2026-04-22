# Implementation Plan: PRD-05 Spaced Repetition System (SRS)

## 1. Overview
Implement a smart review system using the SM-2 algorithm to help users memorize Concept Cards efficiently. This feature follows Clean Architecture, ensuring logic is decoupled from external services like Firestore.

## 2. Core Layer (Domain Logic)

### 2.1 Entity: `CardProgress`
Create `core/entities/card-progress.entity.ts`:
- `id`: Unique identifier for progress record.
- `cardId`: Link to the Concept Card.
- `userId`: Link to the User.
- `interval`: Days until next review.
- `easeFactor`: 2.5 (default).
- `repetitions`: Sequential successful reviews.
- `nextReviewDate`: Precise timestamp for next appearance.
- `status`: `NEW`, `LEARNING`, `REVIEW`.

### 2.2 Port: `IProgressRepository`
Create `core/ports/progress-repository.port.ts`:
- `getByCardId(userId: string, cardId: string): Promise<CardProgress | null>`
- `save(progress: CardProgress): Promise<void>`
- `getDueCards(userId: string, date: Date): Promise<CardProgress[]>`
- `getStats(userId: string): Promise<{ new: number, learning: number, due: number }>`

### 2.3 Algorithm: SM-2 Simplified
Create `core/utils/sm2.ts`:
- Implement a pure function `calculateNextProgress(current: CardProgress, rating: Rating)` where `Rating` is 0 (Again) to 3 (Easy).

## 3. Use Case Layer

### 3.1 `ReviewCardUseCase`
- **Location**: `core/use-cases/spaced-repetition/review-card.usecase.ts`
- **Logic**:
    1. Fetch existing progress or initialize default.
    2. Apply SM-2 update.
    3. Save via repository.

### 3.2 `GetDueCardsUseCase`
- **Location**: `core/use-cases/spaced-repetition/get-due-cards.usecase.ts`
- **Logic**: Fetch all cards where `nextReviewDate` <= `now`.

### 3.3 `GetSRSStatsUseCase`
- **Location**: `core/use-cases/spaced-repetition/get-srs-stats.usecase.ts`
- **Logic**: Aggregate counts for Dashboard display.

## 4. Infrastructure Layer

### 4.1 Adapter: `FirebaseProgressRepository`
- **Location**: `infrastructure/adapters/firebase-progress-repository.adapter.ts`
- **Collection**: `user_progress` (sub-collection or root collection indexed by `userId`).

### 4.2 Dependency Injection
- Update `infrastructure/di.ts`:
    - Instantiate `FirebaseProgressRepository`.
    - Instantiate Use Cases with logging/monitoring wrappers.

## 5. Presentation Layer (Web/UI)

### 5.1 Dashboard Widget
- Create `app/components/dashboard/SRSStatsWidget.tsx`.
- Displays: "15 cards due today", "5 new cards".

### 5.2 Review Page
- Create `app/review/page.tsx` or similar.
- Flow: Show Front -> Click Reveal -> Show Back + Feedback Buttons (Again, Hard, Good, Easy) -> Animate to next card.

### 5.3 API Routes
- `POST /api/progress/review`: Takes `cardId` and `rating`.
- `GET /api/progress/due`: Returns list of IDs to review.

## 6. Testing Plan

### 6.1 Unit Tests
- `tests/core/utils/sm2.spec.ts`: Verify math for different ratings.
- `tests/core/use-cases/review-card.spec.ts`: Mock repository and verify interaction.

### 6.2 Integration Tests
- Verify Firestore interactions in a development environment.

## 7. Timeline & Milestones
- **Step 1**: Core entities, Ports, and SM-2 Algorithm.
- **Step 2**: Use Cases and Firebase Adapter.
- **Step 3**: UI Components and API Routes.
- **Step 4**: Testing, polish, and bug fixes.
