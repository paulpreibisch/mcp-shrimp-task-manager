# Update server API endpoints for enhanced task-story integration

## Description
Modify server.js to provide enriched task data with story context and epic hierarchy

## Acceptance Criteria
New endpoints return enriched data, backward compatibility maintained, caching improves performance

## Technical Notes
1. Add /api/tasks/with-stories endpoint
2. Include story and epic IDs in task response
3. Add aggregation endpoint for dashboard stats
4. Implement caching for performance
5. Add proper error handling

## Dependencies
- 53187df8-b054-4f92-9573-9f2284a8a9b7

---
*Generated from Shrimp Task: ab9745fc-d892-427a-98d9-860968d48328*
