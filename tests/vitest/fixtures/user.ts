export const userProfileFixture = {
  id: "user_test_reader",
  email: "reader@example.test",
  name: "Test Reader",
  avatarUrl: null,
  bio: null,
  targetLevel: "B2" as const,
  tier: "FREE" as const,
  stripeCustomerId: null,
  createdAt: new Date("2026-05-21T00:00:00.000Z"),
  updatedAt: new Date("2026-05-21T00:00:00.000Z"),
};

export function unauthenticatedUserFixture() {
  return null;
}
