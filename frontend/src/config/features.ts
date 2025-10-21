export const FEATURES = {
  // Working features (Phase 1)
  DASHBOARD: true,
  ORDERS: true,
  CUSTOMERS: true,
  REPORTS: true,

  // Coming soon features (show placeholders)
  CAMPAIGNS: false,        // Phase 5 (Months 9-11)
  ALERTS: false,           // Phase 4 (Months 7-8)
  USER_MANAGEMENT: false,  // Phase 2 (Months 3-4)
  SETTINGS: false,         // Phase 2
  AUDIT_LOGS: false        // Phase 2
} as const;

export const FEATURE_PHASES = {
  CAMPAIGNS: { phase: 5, months: "9-11", title: "Marketing Campaigns" },
  ALERTS: { phase: 4, months: "7-8", title: "Email Alerts" },
  USER_MANAGEMENT: { phase: 2, months: "3-4", title: "User Management" },
  SETTINGS: { phase: 2, months: "3-4", title: "Settings" },
  AUDIT_LOGS: { phase: 2, months: "3-4", title: "Audit Logs" }
} as const;
