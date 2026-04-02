// These modules are not yet backed by a database table.
// Return empty responses so the frontend shows proper empty states
// instead of misleading hardcoded data.

export const staticCrmService = {
  async listLeads() {
    return [];
  },

  async listDeals() {
    return [];
  },

  async listCompanies() {
    return [];
  },

  async getSalesMetrics() {
    return null;
  },

  async listCommandActions() {
    return [];
  },

  async listThemePreviews() {
    return {};
  },
};
