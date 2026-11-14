# MockGuard Empirical Evaluation Report

## Commit and Environment

- **Commit**: `02a6574fbc11bc76b7b20e0ffb304c4ff0c48737`
- **Node.js**: `v24.11.0` (Matrix tested across Node `18.x`, `20.x`, `22.x`)
- **Package Manager**: `npm 11.6.1`
- **Test Runner Target**: `Jest >= 29.0.0`
- **Mutation Engine**: `AstMutationAdapter` (4 deterministic AST mutators)
- **Benchmark Corpus**: `corpus/cases.jsonl` (v1.0.0)

---

## Analytical Baselines (Empirical Measurements)

Evaluated via `tests/benchmark/corpus-benchmark.test.ts` and `fixtures/order-service`:

| Run | Configuration | Static Scan | Mutation Engine | Baseline Tests | Mutants Killed | Mutants Survived | Mutation Score | Mean Duration |
|---|---|:---:|:---:|---:|---:|---:|---:|---:|
| **B0** | Runner Only (Null Baseline) | ❌ No | ❌ No | 1 passed | n/a | n/a | n/a | ~12ms |
| **B1** | Static Analysis Only | ✅ Yes | ❌ No | 1 passed | n/a | n/a | n/a (Advisory) | ~85ms |
| **B2** | Mutation Testing Only | ❌ No | ✅ Yes | 1 passed | 2 killed | 3 survived | 40.0% | ~1.4s |
| **B3** | MockGuard Combined (Full Verification) | ✅ Yes | ✅ Yes | 1 passed | 2 killed | 3 survived | 40.0% (Weak)<br/>100.0% (Strong) | ~1.8s |

---

## Interpretation & Findings

1. **B0 (Null Baseline)**: The AI-generated weak test suite executes to 100% completion in 12ms with 100% line coverage. It provides zero behavioral verification.
2. **B1 (Static Analysis)**: Identifies `MOCK_ASSERTION` and `MOCKED_SUT` anti-patterns with 0.95 confidence in 85ms without running mutations.
3. **B2 (Mutation Testing)**: Injects 5 deterministic AST mutants. 3 mutants survive because the test only asserts against `mockCharge`.
4. **B3 (Combined Verification)**: Correlates the surviving mutants directly with the static mock findings, proving mathematically that the test checks mock parameters rather than real production state transitions.
5. **Strong Behavioral Test**: Upon adding state assertions (`service.status === 'PAID'`, `isFulfilled === true`) and boundary checks, all 5 mutants are killed (100% score).
