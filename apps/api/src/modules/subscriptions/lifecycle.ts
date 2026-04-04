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

export async function syncSubscriptionOperationalStatuses(
  client: Prisma.TransactionClient | { subscriptionOrder: { updateMany: (args: Prisma.SubscriptionOrderUpdateManyArgs) => Promise<unknown> } },
) {
  await client.subscriptionOrder.updateMany({
    where: {
      OR: [
        {
          status: SubscriptionStatus.confirmed,
          startDate: { lte: new Date() }
        },
        {
          status: SubscriptionStatus.active
        }
      ]
    },
    data: {
      status: SubscriptionStatus.in_progress
    }
  });
}
