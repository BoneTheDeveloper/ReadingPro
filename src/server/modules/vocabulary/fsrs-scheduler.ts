import { fsrs, generatorParameters, Rating, State, type Card, type FSRS, type Grade } from "ts-fsrs";
import type { ReviewRating, VocabularyStatus } from "@/shared/enums";

/** The scheduling columns of a VocabularyItem; names mirror the ts-fsrs Card. */
export type ScheduleState = {
  status: VocabularyStatus;
  dueAt: Date;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReviewAt: Date | null;
};

const STATE: Record<VocabularyStatus, State> = {
  NEW: State.New,
  LEARNING: State.Learning,
  REVIEW: State.Review,
  RELEARNING: State.Relearning,
};

const STATUS: Record<State, VocabularyStatus> = {
  [State.New]: "NEW",
  [State.Learning]: "LEARNING",
  [State.Review]: "REVIEW",
  [State.Relearning]: "RELEARNING",
};

const GRADE: Record<ReviewRating, Grade> = {
  AGAIN: Rating.Again,
  HARD: Rating.Hard,
  GOOD: Rating.Good,
  EASY: Rating.Easy,
};

const DAY_MS = 86_400_000;

/** Library defaults throughout, except the retention target and any stored weights. */
export function createScheduler(settings: { desiredRetention: number; fsrsParams: unknown }): FSRS {
  const w = settings.fsrsParams;
  const hasWeights = Array.isArray(w) && w.length > 0 && w.every((n) => typeof n === "number");
  return fsrs(
    generatorParameters({
      request_retention: settings.desiredRetention,
      ...(hasWeights && { w: w as number[] }),
    }),
  );
}

function elapsedDays(state: ScheduleState, now: Date): number {
  if (!state.lastReviewAt) return 0;
  return Math.max(0, Math.floor((now.getTime() - state.lastReviewAt.getTime()) / DAY_MS));
}

function toCard(state: ScheduleState, now: Date): Card {
  return {
    due: state.dueAt,
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: elapsedDays(state, now),
    scheduled_days: state.scheduledDays,
    learning_steps: state.learningSteps,
    reps: state.reps,
    lapses: state.lapses,
    state: STATE[state.status],
    last_review: state.lastReviewAt ?? undefined,
  };
}

function toScheduleState(card: Card): ScheduleState {
  return {
    status: STATUS[card.state],
    dueAt: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    lastReviewAt: card.last_review ?? null,
  };
}

/** The card state after `rating`, plus whole days since the previous review for the log. */
export function schedule(
  scheduler: FSRS,
  state: ScheduleState,
  rating: ReviewRating,
  now: Date,
): { next: ScheduleState; elapsedDays: number } {
  const { card } = scheduler.next(toCard(state, now), now, GRADE[rating]);
  return { next: toScheduleState(card), elapsedDays: elapsedDays(state, now) };
}

/** When the card would be due after each rating, without changing it. */
export function previewNextDue(
  scheduler: FSRS,
  state: ScheduleState,
  now: Date,
): Record<ReviewRating, Date> {
  const preview = scheduler.repeat(toCard(state, now), now);
  return {
    AGAIN: preview[Rating.Again].card.due,
    HARD: preview[Rating.Hard].card.due,
    GOOD: preview[Rating.Good].card.due,
    EASY: preview[Rating.Easy].card.due,
  };
}

/** The instant of the most recent local midnight in `timeZone`. */
export function startOfDayInTimeZone(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const msIntoDay =
    ((part("hour") * 60 + part("minute")) * 60 + part("second")) * 1000 + now.getMilliseconds();
  return new Date(now.getTime() - msIntoDay);
}
