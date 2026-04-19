// Phase 10-10 — synthetic cyclic-cluster fixture (member of 4-node SCC).
// 4-node complete directed cycle (A↔B↔C↔D pairwise) so each member's
// fan-in and fan-out both equal 3, satisfying cyclicClusterMinFan = 3.
import { B } from './cyclic-B';
import { C } from './cyclic-C';
import { D } from './cyclic-D';
export const A = () => B() + C() + D();
