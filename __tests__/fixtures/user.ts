export const userProfileFixture = {
  id: "user_test_123",
  email: "reader@example.test",
  name: "Test Reader",
  avatarUrl: null,
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
