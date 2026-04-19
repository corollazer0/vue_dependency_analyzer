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

  it('should parse Java 17 record components', () => {
    const content = `
      package com.example.dto;
      public record UserDTO(
        Long id,
        String name,
        @JsonProperty("email_addr") String email
      ) {}
    `;
    const fields = extractDtoFields(content);
    expect(fields).toEqual([
      { type: 'Long', name: 'id' },
      { type: 'String', name: 'name' },
      { type: 'String', name: 'email', jsonName: 'email_addr' },
    ]);
  });

  it('should mark fields as non-nullable when @NotNull/@NotBlank/@NotEmpty is present', () => {
    const content = `
      public class UserDTO {
        @NotNull
        private Long id;

        @NotBlank
        private String name;

        @NotEmpty
        private List<String> tags;

        private String comment;
      }
    `;
    const fields = extractDtoFields(content);
    expect(fields.find(f => f.name === 'id')).toMatchObject({ type: 'Long', nullable: false });
    expect(fields.find(f => f.name === 'name')).toMatchObject({ type: 'String', nullable: false });
    expect(fields.find(f => f.name === 'tags')).toMatchObject({ type: 'List<String>', nullable: false });
    expect(fields.find(f => f.name === 'comment')?.nullable).toBeUndefined();
  });

  it('should mark fields as nullable when @Nullable is present', () => {
    const content = `
      public class UserDTO {
        @Nullable
        private String comment;
      }
    `;
    const fields = extractDtoFields(content);
    expect(fields).toEqual([
      { type: 'String', name: 'comment', nullable: true },
    ]);
  });

  it('should unwrap Optional<T> and mark nullable', () => {
    const content = `
      public class UserDTO {
        private Optional<String> nickname;
        private Long id;
      }
    `;
    const fields = extractDtoFields(content);
    expect(fields).toEqual([
      { type: 'String', name: 'nickname', nullable: true },
      { type: 'Long', name: 'id' },
    ]);
  });

  it('should capture @JsonProperty rename for class fields', () => {
    const content = `
      public class UserDTO {
        @JsonProperty("user_id")
        private Long id;

        @JsonProperty(value = "full_name")
        @NotNull
        private String name;
      }
    `;
    const fields = extractDtoFields(content);
    expect(fields[0]).toMatchObject({ name: 'id', type: 'Long', jsonName: 'user_id' });
    expect(fields[1]).toMatchObject({ name: 'name', type: 'String', jsonName: 'full_name', nullable: false });
  });
});

describe('JavaFileParser DTO detection', () => {
  const parser = new JavaFileParser();

  it('should detect a Response DTO and extract fields', () => {
    const content = readFileSync(resolve(fixturesDir, 'UserResponse.java'), 'utf-8');
    const result = parser.parse('/test/UserResponse.java', content, {});

    // Phase 7a-2 — pure DTOs are now `spring-dto` nodes
    const dtoNode = result.nodes.find(n => n.kind === 'spring-dto' && n.label === 'UserResponse');
    expect(dtoNode).toBeDefined();
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

    const dtoNode = result.nodes.find(n => n.kind === 'spring-dto' && n.label === 'CreateUserRequest');
    expect(dtoNode).toBeDefined();
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
      const dtoNode = result.nodes.find(n => n.kind === 'spring-dto');
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
