# Docker Consolidation - Agent Orchestration Instructions

## Overview

This document provides the specific instructions for orchestrating the multi-agent implementation of the Docker consolidation project. Use these instructions to initiate each agent's work in the proper sequence.

## Agent Initiation Sequence

### Step 1: Launch Backend Developer Agent

**Mode**: Code
**Objective**: Implement backend static file serving while preserving development workflow

**Instructions**:
```
Implement Phase 1 of the Docker consolidation project as outlined in DOCKER_CONSOLIDATION_IMPLEMENTATION_PLAN.md.

Key tasks:
1. Update server/app.js to serve static frontend files in production mode
2. Configure CORS for same-origin requests in consolidated deployment
3. Add SPA routing fallback for client-side routing
4. Ensure development mode remains unaffected with Docker Compose

Requirements:
- Static files only served when NODE_ENV=production
- API routes must continue to function normally
- Development workflow with docker-compose must be preserved
- Test both development and production modes

Refer to CONSOLIDATED_DOCKER_SETUP.md for specific code examples and implementation details.
```

### Step 2: Launch Frontend Developer Agent

**Mode**: Code  
**Objective**: Update frontend API clients for consolidated deployment

**Instructions**:
```
Implement Phase 2 of the Docker consolidation project as outlined in DOCKER_CONSOLIDATION_IMPLEMENTATION_PLAN.md.

Key tasks:
1. Update frontend/src/services/api-client.ts to use relative paths (/api)
2. Update frontend/src/services/http-client.ts for consolidated deployment
3. Ensure frontend/src/stores/auth.ts uses relative API paths
4. Test API connectivity in both development and consolidated modes

Requirements:
- API clients must work with relative paths in production
- Environment variable fallback must be maintained
- Development mode must continue connecting to backend on port 3001
- Both deployment modes must be fully functional

Coordinate with Backend Developer to ensure API integration works correctly.
```

### Step 3: Launch DevOps Engineer Agent

**Mode**: Code
**Objective**: Create consolidated Docker configuration and deployment files

**Instructions**:
```
Implement Phase 3 of the Docker consolidation project as outlined in DOCKER_CONSOLIDATION_IMPLEMENTATION_PLAN.md.

Key tasks:
1. Create root-level Dockerfile with multi-stage build
2. Create docker-compose.dev.yml for development with live reload
3. Create docker-compose.pi.yml for production Raspberry Pi deployment
4. Create .env.example with consolidated environment variables
5. Update README.md with new deployment instructions

Requirements:
- Multi-stage build must optimize image size
- Development workflow with live reload must be preserved
- Production deployment must work standalone
- Cross-platform compatibility (ARM64/x86_64) must be verified

Ensure all deployment scenarios work correctly with the backend and frontend changes.
```

### Step 4: Launch QA Engineer Agent

**Mode**: Debug/Test
**Objective**: Validate consolidated deployment across all scenarios

**Instructions**:
```
Implement Phase 4 of the Docker consolidation project as outlined in DOCKER_CONSOLIDATION_IMPLEMENTATION_PLAN.md.

Key tasks:
1. Test multi-stage Docker build process
2. Verify cross-platform compatibility (ARM64/x86_64)
3. Validate all functionality in consolidated mode
4. Compare performance and resource usage
5. Update testing documentation

Requirements:
- All existing functionality must be preserved
- Performance must meet requirements
- Cross-platform deployment must be verified
- Development workflow must remain unaffected

Coordinate with all previous agents to validate their deliverables.
```

## Critical Success Factors

### Docker Compose Development Workflow
The development workflow must remain unchanged:
```bash
# Must continue to work exactly as before
docker-compose -f docker-compose.dev.yml up -d
```

### Live Reload Capability
- Frontend hot reload on code changes must be preserved
- Backend hot reload on code changes must be preserved  
- Volume mounts for live development must be maintained

### Deployment Flexibility
- Consolidated single-container deployment must work
- Multi-container development deployment must work
- Both must coexist without conflict

## Coordination Points

### Handoff Verification
Before proceeding to the next agent, verify:
1. **Backend → Frontend**: Backend serves static files correctly in production mode
2. **Frontend → DevOps**: Frontend works in both development and consolidated modes
3. **DevOps → QA**: All deployment scenarios build successfully

### Integration Testing
Each agent should test integration with previous phases:
- Backend Developer: Test static file serving with built frontend
- Frontend Developer: Test API connectivity in consolidated mode
- DevOps Engineer: Test both development and production deployments
- QA Engineer: Comprehensive end-to-end testing

## Risk Management

### Rollback Strategy
If any phase introduces issues:
1. Revert to previous working state
2. Document the specific issue
3. Coordinate fix with relevant agent
4. Retest before proceeding

### Parallel Development Safety
- Development workflow must never be broken
- Hot reload capabilities must be maintained
- Existing functionality must be preserved

## Implementation Timeline Guidance

### Week 1 Focus
- Backend static serving (Backend Developer)
- Frontend API updates (Frontend Developer)
- Basic integration testing

### Week 2 Focus  
- Docker configuration refinement (DevOps Engineer)
- Development workflow validation
- Cross-agent coordination

### Week 3 Focus
- Comprehensive testing (QA Engineer)
- Performance optimization
- Documentation completion

## Quality Gates

Each phase must pass these quality gates before proceeding:

### Backend Phase Complete When:
- [ ] Static files served correctly in production mode
- [ ] API routes function normally
- [ ] Development mode unaffected
- [ ] SPA routing works

### Frontend Phase Complete When:
- [ ] API clients work with relative paths
- [ ] Both deployment modes functional
- [ ] Environment variables handled correctly
- [ ] Integration with backend verified

### DevOps Phase Complete When:
- [ ] Multi-stage build successful
- [ ] Development compose file works
- [ ] Production deployment functional
- [ ] Cross-platform compatibility verified

### QA Phase Complete When:
- [ ] All functionality preserved
- [ ] Performance requirements met
- [ ] Deployment scenarios validated
- [ ] Documentation updated

## Next Action

Begin implementation by launching the **Backend Developer Agent** with the provided instructions to start Phase 1.

The success of this orchestration depends on maintaining the Docker Compose development workflow throughout the implementation process.