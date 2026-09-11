"use client";

import { useMemo, useSyncExternalStore } from "react";
import { subscribeToStore, getStoreSnapshot } from "./store";
import type {
  Customer,
  Designer,
  Collection,
  Dress,
  PreviousCreation,
  FashionRequest,
  Proposal,
  Project,
  Conversation,
  DesignerRequestInteraction,
  DesignerVerification,
  DesignerOnboardingProfile,
  AdminReviewLogEntry,
  CustomerSavedItem,
  DiaryEntry,
  SubscriptionPlan,
  UserSubscription,
  PaymentRecord,
  PaymentSettings,
  Dispute,
  AdminNotification,
} from "@/types";

interface AppState {
  customers: Customer[];
  designers: Designer[];
  collections: Collection[];
  dresses: Dress[];
  previousCreations: PreviousCreation[];
  requests: FashionRequest[];
  proposals: Proposal[];
  projects: Project[];
  conversations: Conversation[];
  interactions: DesignerRequestInteraction[];
  designerVerifications: DesignerVerification[];
  designerOnboarding: DesignerOnboardingProfile[];
  adminReviewLog: AdminReviewLogEntry[];
  customerSavedItems: CustomerSavedItem[];
  diaryEntries: DiaryEntry[];
  subscriptionPlans: SubscriptionPlan[];
  userSubscriptions: UserSubscription[];
  payments: PaymentRecord[];
  paymentSettings: PaymentSettings;
  disputes: Dispute[];
  adminNotifications: AdminNotification[];
}

// IMPORTANT: this only ever returns a raw slice straight off the store
// (s.requests, s.projects, ...) — never a freshly-built array/object like
// `.filter(...)`. useSyncExternalStore requires getSnapshot to return the
// SAME reference when nothing changed; a `.filter()` inside it would create
// a new array every render and trigger an infinite re-render loop. Anything
// derived (filtered/found) happens afterwards in useMemo, further down.
function useStoreSlice<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(
    subscribeToStore,
    () => selector(getStoreSnapshot()),
    () => selector(getStoreSnapshot())
  );
}

/* ------------------------------------------------------------------ */
/* Reactive hooks — use these on any page where a mutation on THIS     */
/* page must be reflected immediately, without a navigation/remount.  */
/* ------------------------------------------------------------------ */

export function useRequests() {
  return useStoreSlice((s) => s.requests);
}

export function useRequestByIdLive(id: string) {
  const requests = useStoreSlice((s) => s.requests);
  return useMemo(() => requests.find((r) => r.id === id), [requests, id]);
}

export function useProposalsForRequestLive(requestId: string) {
  const proposals = useStoreSlice((s) => s.proposals);
  return useMemo(() => proposals.filter((p) => p.requestId === requestId), [proposals, requestId]);
}

export function useProposals() {
  return useStoreSlice((s) => s.proposals);
}

export function useProjects() {
  return useStoreSlice((s) => s.projects);
}

export function useProjectByIdLive(id: string) {
  const projects = useStoreSlice((s) => s.projects);
  return useMemo(() => projects.find((p) => p.id === id), [projects, id]);
}

export function useProjectsByDesignerLive(designerId: string) {
  const projects = useStoreSlice((s) => s.projects);
  return useMemo(() => projects.filter((p) => p.designerId === designerId), [projects, designerId]);
}

export function useProjectsByCustomerLive(customerId: string) {
  const projects = useStoreSlice((s) => s.projects);
  return useMemo(() => projects.filter((p) => p.customerId === customerId), [projects, customerId]);
}

export function useConversations() {
  return useStoreSlice((s) => s.conversations);
}

export function useConversationByIdLive(id: string) {
  const conversations = useStoreSlice((s) => s.conversations);
  return useMemo(() => conversations.find((c) => c.id === id), [conversations, id]);
}

export function useConversationBetween(customerId: string, designerId: string) {
  const conversations = useStoreSlice((s) => s.conversations);
  return useMemo(
    () => conversations.find((c) => c.customerId === customerId && c.designerId === designerId),
    [conversations, customerId, designerId]
  );
}

export function useCustomerByIdLive(id: string) {
  const customers = useStoreSlice((s) => s.customers);
  return useMemo(() => customers.find((c) => c.id === id), [customers, id]);
}

export function useDesignerByIdLive(id: string) {
  const designers = useStoreSlice((s) => s.designers);
  return useMemo(() => designers.find((d) => d.id === id), [designers, id]);
}

export function useCollectionsByDesignerLive(designerId: string) {
  const collections = useStoreSlice((s) => s.collections);
  return useMemo(() => collections.filter((c) => c.designerId === designerId), [collections, designerId]);
}

export function useDressesByDesignerLive(designerId: string) {
  const dresses = useStoreSlice((s) => s.dresses);
  return useMemo(() => dresses.filter((d) => d.designerId === designerId), [dresses, designerId]);
}

export function usePreviousCreationsByDesignerLive(designerId: string) {
  const previousCreations = useStoreSlice((s) => s.previousCreations);
  return useMemo(() => previousCreations.filter((c) => c.designerId === designerId), [previousCreations, designerId]);
}

export function useInteractionsForDesignerLive(designerId: string) {
  const interactions = useStoreSlice((s) => s.interactions);
  return useMemo(() => interactions.filter((i) => i.designerId === designerId), [interactions, designerId]);
}

export function useInteractionLive(designerId: string, requestId: string) {
  const interactions = useStoreSlice((s) => s.interactions);
  return useMemo(
    () => interactions.find((i) => i.designerId === designerId && i.requestId === requestId),
    [interactions, designerId, requestId]
  );
}

export function useDesignerVerificationLive(designerId: string) {
  const verifications = useStoreSlice((s) => s.designerVerifications);
  return useMemo(() => verifications.find((v) => v.designerId === designerId), [verifications, designerId]);
}

export function useAllDesignerVerificationsLive() {
  return useStoreSlice((s) => s.designerVerifications);
}

export function useDesignerOnboardingLive(designerId: string) {
  const onboarding = useStoreSlice((s) => s.designerOnboarding);
  return useMemo(() => onboarding.find((o) => o.designerId === designerId), [onboarding, designerId]);
}

export function useAdminReviewLogLive(designerId: string) {
  const log = useStoreSlice((s) => s.adminReviewLog);
  return useMemo(() => log.filter((l) => l.designerId === designerId), [log, designerId]);
}

export function useSavedItemsForCustomerLive(customerId: string) {
  const items = useStoreSlice((s) => s.customerSavedItems);
  return useMemo(() => items.filter((i) => i.customerId === customerId), [items, customerId]);
}

export function useIsItemSavedLive(customerId: string, itemType: string, itemId: string) {
  const items = useStoreSlice((s) => s.customerSavedItems);
  return useMemo(
    () => items.some((i) => i.customerId === customerId && i.itemType === itemType && i.itemId === itemId),
    [items, customerId, itemType, itemId]
  );
}

export function useDiaryEntriesForCustomerLive(customerId: string) {
  const entries = useStoreSlice((s) => s.diaryEntries);
  return useMemo(
    () => entries.filter((e) => e.customerId === customerId).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [entries, customerId]
  );
}

export function useDiaryEntryByIdLive(id: string) {
  const entries = useStoreSlice((s) => s.diaryEntries);
  return useMemo(() => entries.find((e) => e.id === id), [entries, id]);
}

export function usePaymentSettingsLive() {
  return useStoreSlice((s) => s.paymentSettings);
}

export function useSubscriptionPlansLive() {
  return useStoreSlice((s) => s.subscriptionPlans);
}

export function useSubscriptionPlanByRoleLive(role: "customer" | "designer") {
  const plans = useStoreSlice((s) => s.subscriptionPlans);
  return useMemo(() => plans.find((p) => p.role === role), [plans, role]);
}

export function useUserSubscriptionLive(userId: string) {
  const subs = useStoreSlice((s) => s.userSubscriptions);
  return useMemo(() => subs.find((s) => s.userId === userId), [subs, userId]);
}

export function useAllUserSubscriptionsLive() {
  return useStoreSlice((s) => s.userSubscriptions);
}

export function useAllPaymentsLive() {
  return useStoreSlice((s) => s.payments);
}

export function useHasActiveSubscriptionAccessLive(userId: string, role: "customer" | "designer") {
  const settings = useStoreSlice((s) => s.paymentSettings);
  const subs = useStoreSlice((s) => s.userSubscriptions);
  return useMemo(() => {
    const required = settings.paymentSystemEnabled && (role === "customer" ? settings.customerSubscriptionsEnabled : settings.designerSubscriptionsEnabled);
    if (!required) return true;
    const sub = subs.find((s) => s.userId === userId);
    if (!sub || sub.status !== "active") return false;
    if (sub.endDate && new Date(sub.endDate).getTime() < Date.now()) return false;
    return true;
  }, [settings, subs, userId, role]);
}

export function useDisputesLive() {
  return useStoreSlice((s) => s.disputes);
}

export function useDisputeByIdLive(id: string) {
  const disputes = useStoreSlice((s) => s.disputes);
  return useMemo(() => disputes.find((d) => d.id === id), [disputes, id]);
}

export function useAdminNotificationsLive() {
  const notifications = useStoreSlice((s) => s.adminNotifications);
  return useMemo(() => [...notifications].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)), [notifications]);
}
