import { commandActions, themePreviews } from "../data/crm-static";

// Leads, Deals, Companies, and Sales Metrics need proper database tables
// Return empty arrays so frontend shows proper empty states instead of fake data

export const staticCrmService = {
  async listLeads() {
    // TODO: Add Lead table to database and implement CRUD
    return [];
  },

  async listDeals() {
    // TODO: Add Deal table to database and implement CRUD
    return [];
  },

  async listCompanies() {
    return [];
  },

  async getSalesMetrics() {
    // TODO: Calculate from real invoice/project data
    return null;
  },

  async listCommandActions() {
    return commandActions;
  },

  async listThemePreviews() {
    return themePreviews;
  },
};
