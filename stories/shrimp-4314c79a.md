# Fix story display layout

## Description
Change story display from grid layout to vertical panel layout as specified in PRD. Stories should be expandable panels, not cards in a grid.

## Acceptance Criteria
Stories display as vertical list of panels within each epic tab

## Technical Notes
1. Replace line 187 grid div with vertical stack: className='space-y-4'
2. Modify StoryPanel to be a collapsible panel instead of card
3. Add expand/collapse functionality to each story panel
4. Display full story details when expanded
5. Show summary when collapsed
6. Ensure parallel work indicators are visible

## Dependencies
None

---
*Generated from Shrimp Task: 4314c79a-81e3-45a3-823b-abb273b09e51*
