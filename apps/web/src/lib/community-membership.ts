export type CommunityMembershipAccess = {
  status?: string | null
  paidUntil?: Date | string | null
}

export function isMembershipActive(membership?: CommunityMembershipAccess | null): boolean {
  if (!membership) return false
  if (membership.status === 'active') {
    if (!membership.paidUntil) return true
    const paidUntil = typeof membership.paidUntil === 'string'
      ? new Date(membership.paidUntil)
      : membership.paidUntil
    return paidUntil.getTime() > Date.now()
  }
  if (membership.status !== 'cancelled') return false
  if (!membership.paidUntil) return false
  const paidUntil = typeof membership.paidUntil === 'string'
    ? new Date(membership.paidUntil)
    : membership.paidUntil
  return paidUntil.getTime() > Date.now()
}

export function membershipAccessWhere(now: Date = new Date()) {
  return {
    OR: [
      { status: 'active', paidUntil: null },
      { status: 'active', paidUntil: { gt: now } },
      { status: 'cancelled', paidUntil: { gt: now } }
    ]
  }
}
