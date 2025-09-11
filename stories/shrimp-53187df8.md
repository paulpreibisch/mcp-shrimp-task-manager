# Integrate story context from BMAD into task display

## Description
Connect BMAD stories data with Shrimp tasks to show story context for each task group

## Acceptance Criteria
Tasks display with correct story context, story information is visible in task groups

## Technical Notes
1. Modify task data structure to include storyId field
2. Create utility function to match tasks with stories
3. Display story title and description above each task group
4. Add story verification status indicator
5. Include story-task linking in API response

## Dependencies
- 73626988-c62f-4424-bc14-7461cd480beb

---
*Generated from Shrimp Task: 53187df8-b054-4f92-9573-9f2284a8a9b7*
