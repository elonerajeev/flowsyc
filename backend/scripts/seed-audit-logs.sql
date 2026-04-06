-- Seed Audit Logs (run as postgres user)
INSERT INTO "AuditLog" ("userId", "userName", action, entity, "entityId", detail, "createdAt") VALUES 
  ('1', 'Sarah Johnson', 'CREATE', 'Client', '70', 'Created new client Acme Corporation', NOW() - INTERVAL '2 days'),
  ('1', 'Sarah Johnson', 'UPDATE', 'Deal', '15', 'Updated deal stage to negotiation', NOW() - INTERVAL '1 day'),
  ('2', 'Mike Chen', 'CREATE', 'Project', '8', 'Created new project Website Redesign', NOW() - INTERVAL '3 hours'),
  ('2', 'Mike Chen', 'UPDATE', 'Task', '42', 'Marked task as completed', NOW() - INTERVAL '2 hours'),
  ('3', 'Emily Davis', 'CREATE', 'Invoice', 'INV-001', 'Created invoice for Acme Corp', NOW() - INTERVAL '1 hour'),
  ('1', 'Sarah Johnson', 'LOGIN', 'User', '1', 'Logged in from Chrome', NOW() - INTERVAL '30 minutes'),
  ('2', 'Mike Chen', 'UPDATE', 'Project', '8', 'Updated project progress to 45%', NOW() - INTERVAL '15 minutes'),
  ('1', 'Sarah Johnson', 'VIEW', 'Dashboard', '', 'Viewed sales dashboard', NOW() - INTERVAL '5 minutes'),
  ('1', 'Sarah Johnson', 'CREATE', 'TeamMember', '60', 'Added new employee Owen Clark', NOW() - INTERVAL '4 days'),
  ('2', 'Mike Chen', 'UPDATE', 'Client', '78', 'Updated client status to active', NOW() - INTERVAL '1 day'),
  ('3', 'Emily Davis', 'CREATE', 'Invoice', 'INV-002', 'Created invoice for Summit Retail', NOW() - INTERVAL '6 hours'),
  ('1', 'Sarah Johnson', 'DELETE', 'Task', '15', 'Deleted completed task', NOW() - INTERVAL '12 hours');