import { A } from './cyclic-A';
import { B } from './cyclic-B';
import { C } from './cyclic-C';
export const D = (): number => 3 + (A.length || 0) + (B.length || 0) + (C.length || 0);
