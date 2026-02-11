ALTER TABLE "user_preferences"
  ADD COLUMN "mahalilahDashboardOnboardingSeenAt" TIMESTAMP(3),
  ADD COLUMN "mahalilahRoomTherapistOnboardingSeenAt" TIMESTAMP(3),
  ADD COLUMN "mahalilahRoomPlayerOnboardingSeenAt" TIMESTAMP(3);
