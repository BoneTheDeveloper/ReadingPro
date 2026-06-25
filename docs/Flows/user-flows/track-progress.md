# Track Progress

## View Dashboard

1. User opens the Dashboard (`/`) after signing in.
2. The dashboard shows an overview of activity and entry points to other sections.

## View Progress Dashboard

1. User clicks **Progress** in the sidebar.
2. The Progress page (`/progress`) displays:
   - Current streak (consecutive days studied)
   - Total time studied
   - Active study days

## Routes

| Action | Route |
|--------|-------|
| Open dashboard | `/` |
| Open progress | `/progress` |
| Get progress stats | `GET /api/progress/stats` |
