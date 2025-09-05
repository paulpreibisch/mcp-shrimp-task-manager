# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]: "[plugin:vite:import-analysis]"
    - generic [ref=e6]: Failed to parse source for import analysis because the content contains invalid JS syntax. If you are using JSX, make sure to name the file with the .jsx or .tsx extension.
  - generic [ref=e8] [cursor=pointer]: /home/fire/claude/mcp-shrimp-task-manager/tools/task-viewer/src/hooks/useScrollSpy.js:223:20
  - generic [ref=e9]: "221| > 222| {isExpanded ? '▼' : '▶'} 223| </button> | ^ 224| )} 225| <div"
  - generic [ref=e10]:
    - text: "at TransformPluginContext._formatError (file:"
    - generic [ref=e11] [cursor=pointer]: ///home/fire/claude/mcp-shrimp-task-manager/tools/task-viewer/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:49258:41
    - text: ") at TransformPluginContext.error (file:"
    - generic [ref=e12] [cursor=pointer]: ///home/fire/claude/mcp-shrimp-task-manager/tools/task-viewer/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:49253:16
    - text: ") at TransformPluginContext.transform (file:"
    - generic [ref=e13] [cursor=pointer]: ///home/fire/claude/mcp-shrimp-task-manager/tools/task-viewer/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:64243:14
    - text: ") at async PluginContainer.transform (file:"
    - generic [ref=e14] [cursor=pointer]: ///home/fire/claude/mcp-shrimp-task-manager/tools/task-viewer/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:49099:18
    - text: ") at async loadAndTransform (file:"
    - generic [ref=e15] [cursor=pointer]: ///home/fire/claude/mcp-shrimp-task-manager/tools/task-viewer/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:51977:27
    - text: ") at async viteTransformMiddleware (file:"
    - generic [ref=e16] [cursor=pointer]: ///home/fire/claude/mcp-shrimp-task-manager/tools/task-viewer/node_modules/vite/dist/node/chunks/dep-C6uTJdX2.js:62105:24
  - generic [ref=e17]:
    - text: Click outside, press
    - generic [ref=e18]: Esc
    - text: key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e19]: server.hmr.overlay
    - text: to
    - code [ref=e20]: "false"
    - text: in
    - code [ref=e21]: vite.config.js
    - text: .
```