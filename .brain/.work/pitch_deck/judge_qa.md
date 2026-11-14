# Judge Q&A

**What is novel?** The combination of AI-test-specific mock analysis, mutation proof, correlation, and developer evidence—not mutation testing itself.

**Why not just run Stryker?** Stryker provides mutation analysis; MockGuard explains the PS #41 failure mode and guides a developer to the behavior assertion.

**Can a surviving mutant be equivalent?** Yes. MockGuard reports possible equivalence and exposes the denominator/exclusions.

**Is this safe on arbitrary repositories?** The local MVP runs selected tests under documented limits. It is not a hardened multi-tenant sandbox.

**Does AI decide the verdict?** No. The verification authority is the deterministic runner and mutation evidence. AI assistance, if enabled, is advisory and re-verified.
