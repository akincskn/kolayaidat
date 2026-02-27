-- CreateIndex
CREATE INDEX "Apartment_managerId_idx" ON "Apartment"("managerId");

-- CreateIndex
CREATE INDEX "Invite_unitId_idx" ON "Invite"("unitId");

-- CreateIndex
CREATE INDEX "Invite_email_idx" ON "Invite"("email");

-- CreateIndex
CREATE INDEX "Payment_residentId_idx" ON "Payment"("residentId");

-- CreateIndex
CREATE INDEX "Payment_unitId_idx" ON "Payment"("unitId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
