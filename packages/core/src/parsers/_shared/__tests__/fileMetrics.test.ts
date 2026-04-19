import { describe, it, expect } from 'vitest';
import {
  countLines,
  topLevelPackage,
  distinctPackageCount,
  distinctJavaPackageCount,
} from '../fileMetrics.js';

describe('fileMetrics', () => {
  it('countLines treats empty content as 0', () => {
    expect(countLines('')).toBe(0);
  });

  it('countLines is newlines + 1', () => {
    expect(countLines('a')).toBe(1);
    expect(countLines('a\nb')).toBe(2);
    expect(countLines('a\nb\n')).toBe(3); // trailing newline counts
  });

  it('topLevelPackage handles plain, scoped, and relative specs', () => {
    expect(topLevelPackage('lodash')).toBe('lodash');
    expect(topLevelPackage('lodash/fp')).toBe('lodash');
    expect(topLevelPackage('@vue/runtime-core')).toBe('@vue/runtime-core');
    expect(topLevelPackage('@vue/runtime-core/foo')).toBe('@vue/runtime-core');
    expect(topLevelPackage('./util')).toBe('.');
    expect(topLevelPackage('../util')).toBe('..');
  });

  it('distinctPackageCount collapses subpath imports', () => {
    expect(distinctPackageCount(['lodash', 'lodash/fp', 'lodash/get'])).toBe(1);
    expect(distinctPackageCount(['lodash', '@vue/runtime-core', '@vue/runtime-core/foo']))
      .toBe(2);
  });

  it('distinctJavaPackageCount counts unique Java top-level packages', () => {
    const src = `
      package com.example.foo;
      import com.example.bar.Baz;
      import com.example.qux.Quux;
      import org.springframework.beans.factory.annotation.Autowired;
      import static java.util.Collections.emptyList;
    `;
    // top-level: com / org / java
    expect(distinctJavaPackageCount(src)).toBe(3);
  });
});
