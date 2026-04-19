import { A } from './cyclic-A';
import { B } from './cyclic-B';
import { D } from './cyclic-D';
export const C = (): number => 2 + (A.length || 0) + (B.length || 0) + (D.length || 0);
