# InsightUp

InsightUp is an InBody tracking website.

The product goal is to let a user sign in with Google, record InBody measurements over time, and review those measurements in charts that support selective inclusion of records.

## Product Summary

- Sign in with Google.
- Store and review InBody records.
- Visualize overall metrics and segmental body composition in charts.
- Let the user decide which records should be included in chart analysis.
- Support record creation, editing, and deletion.

## Current Core Data Shape

Each InBody record currently follows this structure:

```json
{
  "date": "2026-01-19",
  "height": 165,
  "age": 29,
  "gender": "male",
  "score": 81,
  "weight": 66.1,
  "muscle": 30.5,
  "fat": 11.9,
  "fatPercent": 18.0,
  "visceralFatLevel": 6,
  "bmr": 1508,
  "recommendedCalories": 2140,
  "segmental": {
    "leftArm": { "name": "Left Arm", "muscle": 2.84, "fat": 0.6, "muscleRatio": 96.8, "fatRatio": 119.5 },
    "rightArm": { "name": "Right Arm", "muscle": 3.15, "fat": 0.5, "muscleRatio": 107.4, "fatRatio": 97.0 },
    "trunk": { "name": "Trunk", "muscle": 23.7, "fat": 5.9, "muscleRatio": 101.4, "fatRatio": 154.5 },
    "leftLeg": { "name": "Left Leg", "muscle": 8.34, "fat": 1.9, "muscleRatio": 102.5, "fatRatio": 123.8 },
    "rightLeg": { "name": "Right Leg", "muscle": 8.37, "fat": 1.9, "muscleRatio": 102.8, "fatRatio": 123.5 }
  }
}
```

## Record Input Modes

New records are expected to be added in two stages:

1. Manual input
2. Photo scan

### Stage 1: Manual Input

The user directly enters InBody values into a form.

This mode should remain available even after photo scan is added, because it is the most reliable fallback and is useful for corrections.

### Stage 2: Photo Scan

The user uploads or captures a photo of an InBody result sheet.

The system should extract structured values from the image and present them for confirmation before saving.

Photo scan should be treated as an assisted input flow, not as a fully trusted source of truth.

## Data Trust and User Control

InBody results are not guaranteed to be accurate on every measurement.

Because of that, the charting and data-management flow must support user control over which records are used.

Required behaviors:

- The user can choose whether a record is included in chart analysis.
- The user can add a new record.
- The user can edit an existing record.
- The user can delete a record.
- The user can exclude suspicious measurements without necessarily deleting them.

Recommended product model:

- Keep a per-record inclusion flag such as `isIncludedInCharts`.
- Use soft exclusion for analysis when possible.
- Only delete records when the user explicitly chooses permanent removal.

## Charting Expectations

The main chart is the primary analysis surface.

Expected behavior:

- A single main chart should support switching between overall metrics and segmental views.
- Overall view should include metrics such as weight, muscle, fat, fat percentage, and score.
- Segmental view should include body-part metrics such as muscle mass, fat mass, muscle ratio, and fat ratio.
- The user should be able to toggle visible series in the chart.
- The chart should only include records that the user has chosen to include.

## Authentication

- Google Login is the primary sign-in method.
- Supabase is currently used for authentication.

## Deployment Direction

The current direction is to host both frontend and backend on Fly.io.

Recommended long-term shape:

- Frontend app on Fly.io
- Backend API on Fly.io
- Supabase for authentication and database

## Near-Term Build Priorities

1. Move record data from in-file mock data to persistent storage.
2. Add a record-level inclusion flag for chart participation.
3. Add edit and delete flows for records.
4. Add photo scan ingestion with review-before-save.
5. Split the project into web and API services for Fly.io deployment.
