import { describe, it, expect } from 'vitest';
import { JavaFileParser, extractDtoFields } from '../JavaFileParser.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const fixturesDir = resolve(import.meta.dirname, '../../../__fixtures__');

describe('extractDtoFields', () => {
  it('should extract private fields from a DTO class', () => {
    const content = readFileSync(resolve(fixturesDir, 'UserResponse.java'), 'utf-8');
    const fields = extractDtoFields(content);

    expect(fields).toEqual([
      { type: 'Long', name: 'id' },
      { type: 'String', name: 'name' },
      { type: 'String', name: 'email' },
      { type: 'String', name: 'createdAt' },
    ]);
  });

  it('should extract fields from a Request DTO', () => {
    const content = readFileSync(resolve(fixturesDir, 'CreateUserRequest.java'), 'utf-8');
    const fields = extractDtoFields(content);

    expect(fields).toEqual([
      { type: 'String', name: 'name' },
      { type: 'String', name: 'email' },
      { type: 'String', name: 'password' },
    ]);
  });

  it('should handle generic types like List<String>', () => {
    const content = `
      public class ItemResponse {
        private Long id;
        private List<String> tags;
        private Map<String, Object> metadata;
      }
    `;
    const fields = extractDtoFields(content);

    expect(fields).toEqual([
      { type: 'Long', name: 'id' },
      { type: 'List<String>', name: 'tags' },
      { type: 'Map<String, Object>', name: 'metadata' },
    ]);
  });

  it('should return empty array for class with no private fields', () => {
    const content = `
      public class EmptyDTO {
        public String name;
      }
    `;
    const fields = extractDtoFields(content);
    expect(fields).toEqual([]);
  });
});

describe('JavaFileParser DTO detection', () => {
  const parser = new JavaFileParser();

  it('should detect a Response DTO and extract fields', () => {
    const content = readFileSync(resolve(fixturesDir, 'UserResponse.java'), 'utf-8');
    const result = parser.parse('/test/UserResponse.java', content, {});

    const dtoNode = result.nodes.find(n => n.label === 'UserResponse');
    expect(dtoNode).toBeDefined();
    expect(dtoNode!.metadata.isDto).toBe(true);
    expect(dtoNode!.metadata.fields).toEqual([
      { type: 'Long', name: 'id' },
      { type: 'String', name: 'name' },
      { type: 'String', name: 'email' },
      { type: 'String', name: 'createdAt' },
    ]);
  });

  it('should detect a Request DTO and extract fields', () => {
    const content = readFileSync(resolve(fixturesDir, 'CreateUserRequest.java'), 'utf-8');
    const result = parser.parse('/test/CreateUserRequest.java', content, {});

    const dtoNode = result.nodes.find(n => n.label === 'CreateUserRequest');
    expect(dtoNode).toBeDefined();
    expect(dtoNode!.metadata.isDto).toBe(true);
    expect(dtoNode!.metadata.fields).toEqual([
      { type: 'String', name: 'name' },
      { type: 'String', name: 'email' },
      { type: 'String', name: 'password' },
    ]);
  });

  it('should detect DTO classes with various suffixes', () => {
    const suffixes = ['DTO', 'Dto', 'Request', 'Response', 'VO', 'Summary', 'Detail'];
    for (const suffix of suffixes) {
      const content = `
        package com.example;
        public class User${suffix} {
          private String name;
        }
      `;
      const result = parser.parse(`/test/User${suffix}.java`, content, {});
      const dtoNode = result.nodes.find(n => n.metadata.isDto === true);
      expect(dtoNode, `Expected DTO detection for suffix: ${suffix}`).toBeDefined();
    }
  });

  it('should NOT mark non-DTO classes as DTOs', () => {
    const content = `
      package com.example;
      import org.springframework.stereotype.Service;
      @Service
      public class UserService {
        private String name;
      }
    `;
    const result = parser.parse('/test/UserService.java', content, {});
    const serviceNode = result.nodes.find(n => n.label === 'UserService');
    expect(serviceNode).toBeDefined();
    expect(serviceNode!.metadata.isDto).toBeUndefined();
  });
});
