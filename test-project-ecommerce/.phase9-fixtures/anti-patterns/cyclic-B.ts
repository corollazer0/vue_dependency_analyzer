import { A } from './cyclic-A';
import { C } from './cyclic-C';
import { D } from './cyclic-D';
export const B = (): number => 1 + (A.length || 0) + (C.length || 0) + (D.length || 0);
