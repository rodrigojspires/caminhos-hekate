CREATE TYPE "RegistrationPortal" AS ENUM ('CAMINHOS_DE_HEKATE', 'MAHA_LILAH');

ALTER TABLE "User" ADD COLUMN "registrationPortal" "RegistrationPortal";
