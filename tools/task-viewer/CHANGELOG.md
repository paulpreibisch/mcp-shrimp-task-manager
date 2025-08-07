# Task Viewer Changelog

All notable changes to the Shrimp Task Viewer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-01-29

### Added
- **Clickable file links**: Related files now open directly in VS Code when project root is specified
- **UUID copy from task badge**: Click task number badge to copy full UUID to clipboard
- **Project root support**: New field when adding profiles to enable VS Code file links
- **Dependencies column**: Shows task dependencies with clickable links to navigate between tasks
- **Actions column**: Copy button that generates AI instruction "Use task manager to complete this shrimp task: [UUID]"
- **Profile rename**: Dedicated rename button in header with modal dialog
- **Task viewer specific changelog**: Separate release notes for task viewer component
- **Visual feedback**: Task badge turns green when UUID copied, hover effects on clickable elements

### Changed
- **Full UUID display**: Task IDs now show complete UUID instead of truncated version
- **Removed copy buttons**: Individual copy buttons next to task IDs removed (copy via task badge instead)
- **Notes column replaced**: Dependencies column now shows instead of Notes
- **Release link**: Now points to task viewer specific changelog in fork
- **Version**: Updated to v2.1.0

### Fixed
- **Profile auto-selection**: New profiles are automatically selected and loaded after creation
- **Busboy import**: Fixed ES module import issues by removing busboy dependency
- **Rename functionality**: Fixed double-click rename (now uses dedicated button and modal)

### Removed
- **Busboy dependency**: Replaced with native Node.js form parsing
- **Notes column**: Replaced by Dependencies column
- **Individual UUID copy buttons**: Functionality moved to task number badge

## [2.0.0] - 2024-01-15

### Added
- Initial release of the standalone Task Viewer
- Web-based interface for viewing Shrimp tasks
- Profile management system
- Auto-refresh functionality
- Drag-and-drop tab reordering
- Search and filter capabilities
- Pagination support
- Task detail view
- Real-time data updates