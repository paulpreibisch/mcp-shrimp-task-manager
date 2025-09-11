# Deployment Configuration

## Environment Variables
```bash
# MadShrimp Configuration
MADSHRIMP_ENABLED=true
BMAD_STORY_PATH=./docs/stories
BMAD_PRD_PATH=./docs/prd
VERIFICATION_TIMEOUT=30000
AUTO_VERIFY_ENABLED=true
PARALLEL_WORK_INDICATORS=true
```

## Build Configuration
```json
{
  "scripts": {
    "build:madshrimp": "tsc -p src/tools/bmad",
    "dev:viewer": "cd tools/task-viewer && npm run dev",
    "test:integration": "jest --config=jest.integration.config.js"
  }
}
```