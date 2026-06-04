export const userProfileFixture = {
  id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
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

export const supabaseAuthUserFixture = {
  id: userProfileFixture.id,
  email: userProfileFixture.email,
  user_metadata: {
    name: userProfileFixture.name,
  },
};

export function unauthenticatedUserFixture() {
  return null;
}
