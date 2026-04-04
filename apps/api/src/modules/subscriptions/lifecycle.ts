import { SubscriptionStatus, type Prisma, type SubscriptionOrder } from '@prisma/client';

export const editableSubscriptionStatuses = [
  SubscriptionStatus.draft,
  SubscriptionStatus.quotation,
  SubscriptionStatus.quotation_sent
] as const;

export const followUpSubscriptionStatuses = [
  SubscriptionStatus.confirmed,
  SubscriptionStatus.in_progress,
  SubscriptionStatus.closed,
  SubscriptionStatus.active
] as const;

export const invoiceEligibleSubscriptionStatuses = [
  SubscriptionStatus.confirmed,
  SubscriptionStatus.in_progress,
  SubscriptionStatus.active
] as const;

export const closableSubscriptionStatuses = [
  SubscriptionStatus.confirmed,
  SubscriptionStatus.in_progress,
  SubscriptionStatus.active
] as const;

export const pausableSubscriptionStatuses = [
  SubscriptionStatus.confirmed,
  SubscriptionStatus.in_progress,
  SubscriptionStatus.active
] as const;

export const cancellableSubscriptionStatuses = [
  SubscriptionStatus.draft,
  SubscriptionStatus.quotation,
  SubscriptionStatus.quotation_sent,
  SubscriptionStatus.confirmed,
  SubscriptionStatus.in_progress,
  SubscriptionStatus.active
] as const;

export const deletableSubscriptionStatuses = [
  SubscriptionStatus.draft,
  SubscriptionStatus.quotation,
  SubscriptionStatus.quotation_sent
] as const;

export function defaultQuotationExpiry(from = new Date()) {
  const next = new Date(from);
  next.setDate(next.getDate() + 7);
  return next;
}

export function normalizeSubscriptionStatus(status: SubscriptionStatus | string) {
  return status === SubscriptionStatus.active ? SubscriptionStatus.in_progress : status;
}

export function isEditableSubscriptionStatus(status: SubscriptionStatus | string) {
  return editableSubscriptionStatuses.includes(normalizeSubscriptionStatus(status) as (typeof editableSubscriptionStatuses)[number]);
}

export function isFollowUpEligibleStatus(status: SubscriptionStatus | string) {
  return followUpSubscriptionStatuses.includes(status as (typeof followUpSubscriptionStatuses)[number]);
}

export function isInvoiceEligibleStatus(status: SubscriptionStatus | string) {
  return invoiceEligibleSubscriptionStatuses.includes(status as (typeof invoiceEligibleSubscriptionStatuses)[number]);
}

export function isClosableSubscriptionStatus(status: SubscriptionStatus | string) {
  return closableSubscriptionStatuses.includes(status as (typeof closableSubscriptionStatuses)[number]);
}

export function isPausableSubscriptionStatus(status: SubscriptionStatus | string) {
  return pausableSubscriptionStatuses.includes(status as (typeof pausableSubscriptionStatuses)[number]);
}

export function isCancellableSubscriptionStatus(status: SubscriptionStatus | string) {
  return cancellableSubscriptionStatuses.includes(status as (typeof cancellableSubscriptionStatuses)[number]);
}

export function isDeletableSubscriptionStatus(status: SubscriptionStatus | string) {
  return deletableSubscriptionStatuses.includes(normalizeSubscriptionStatus(status) as (typeof deletableSubscriptionStatuses)[number]);
}

export function shouldMoveToInProgress(subscription: Pick<SubscriptionOrder, 'status' | 'startDate'>, now = new Date()) {
  const normalizedStatus = normalizeSubscriptionStatus(subscription.status);
  return normalizedStatus === SubscriptionStatus.confirmed && Boolean(subscription.startDate && subscription.startDate <= now);
}

export function addInterval(date: Date, count: number, unit: 'day' | 'week' | 'month' | 'year') {
  const next = new Date(date);

  switch (unit) {
    case 'day':
      next.setDate(next.getDate() + count);
      break;
    case 'week':
      next.setDate(next.getDate() + count * 7);
      break;
    case 'month':
      next.setMonth(next.getMonth() + count);
      break;
    case 'year':
      next.setFullYear(next.getFullYear() + count);
      break;
  }

  return next;
}

export function resolveAutoCloseDate(input: {
  startDate: Date;
  autoCloseEnabled: boolean;
  autoCloseAfterCount: number | null;
  autoCloseAfterUnit: 'day' | 'week' | 'month' | 'year' | null;
}) {
  if (!input.autoCloseEnabled || !input.autoCloseAfterCount || !input.autoCloseAfterUnit) {
    return null;
  }

  return addInterval(input.startDate, input.autoCloseAfterCount, input.autoCloseAfterUnit);
}

export async function syncSubscriptionOperationalStatuses(
  client: Prisma.TransactionClient | { subscriptionOrder: { updateMany: (args: Prisma.SubscriptionOrderUpdateManyArgs) => Promise<unknown> } },
) {
  const now = new Date();

  await client.subscriptionOrder.updateMany({
    where: {
      OR: [
        {
          status: SubscriptionStatus.confirmed,
          startDate: { lte: now }
        },
        {
          status: SubscriptionStatus.active
        }
      ],
      expirationDate: null
    },
    data: {
      status: SubscriptionStatus.in_progress
    }
  });

  await client.subscriptionOrder.updateMany({
    where: {
      status: {
        in: [SubscriptionStatus.confirmed, SubscriptionStatus.in_progress, SubscriptionStatus.active, SubscriptionStatus.paused]
      },
      expirationDate: {
        lte: now
      }
    },
    data: {
      status: SubscriptionStatus.closed
    }
  });
}
