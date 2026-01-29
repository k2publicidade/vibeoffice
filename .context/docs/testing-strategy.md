---
status: unfilled
generated: 2026-01-17
---

# Testing Strategy

## Test Types
- Unit: Jest + React Testing Library
- Integration: API endpoints com Supabase
- E2E: Playwright (futuro)

## Running Tests
- Execute: `npm run test`
- Watch: `npm run test -- --watch`
- Coverage: `npm run test -- --coverage`

## Quality Gates
- Mínimo 70% coverage para novas features
- ESLint configurado

## Troubleshooting
- Supabase mocks necessários para testes unitários
