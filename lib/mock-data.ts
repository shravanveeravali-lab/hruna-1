import type { Customer, CurrentDesigner, Review } from "@/types";

// Re-export the shared store's data + accessors so pages that only need a
// read (not a live subscription) can keep importing from "@/lib/mock-data"
// without touching every call site.
export {
  getCustomers,
  getCustomerById,
  getDesigners,
  getVerifiedDesigners,
  getDesignerById,
  getCollections,
  getCollectionsByDesigner,
  getCollectionById,
  getDresses,
  getDressesByDesigner,
  getDressById,
  getPreviousCreationsByDesigner,
  getRequestById,
  getProposalsForRequest,
  getProposalById,
  getProjectById,
  getProjectsByDesigner,
  getProjectsByCustomer,
  getConversationBetween,
  incomingRequestsForDesigner,
  getDesignerVerification,
  getAllDesignerVerifications,
  getDesignerOnboarding,
  getAdminReviewLogForDesigner,
  getAdminReviewLogForCustomer,
  isDesignerPubliclyVisible,
  evaluateTrustedProfessional,
  getPaymentSettings,
  getSubscriptionPlans,
  getSubscriptionPlanByRole,
  getSubscriptionPlanById,
  getUserSubscription,
  getAllUserSubscriptions,
  getPaymentsForUser,
  getAllPayments,
  isSubscriptionRequiredForRole,
  hasActiveSubscriptionAccess,
  getDisputes,
  getDisputeById,
  getAdminNotifications,
} from "./store";

export const currentCustomer: Customer = {
  id: "cust-1",
  name: "Aanya Reddy",
  email: "aanya.reddy@example.com",
  avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&q=80",
  city: "Hyderabad, India",
  phone: "+91 98765 43210",
};

// The logged-in designer for the designer-side app. Matches des-1 (Meera
// Kapoor / Atelier Meera) — the same designer behind the seeded req-1 →
// prop-1 → proj-1 chain, so "your" studio/requests/projects all line up.
export const currentDesigner: CurrentDesigner = {
  id: "des-1",
  name: "Meera Kapoor",
  email: "meera@ateliermeera.com",
  phone: "+91 98200 11223",
  avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&q=80",
};

export const reviews: Review[] = [
  {
    id: "rev-1",
    projectId: "proj-past-1",
    designerId: "des-1",
    customerId: "cust-1",
    rating: 5,
    text: "Meera captured exactly the fit and pastel tone I wanted — the gown was even better than I imagined.",
    date: "2026-07-15",
  },
];

export const getReviewsForDesigner = (id: string) => reviews.filter((r) => r.designerId === id);
