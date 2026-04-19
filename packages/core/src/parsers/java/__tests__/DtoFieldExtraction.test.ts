import { describe, it, expect } from 'vitest';
import { JavaFileParser, extractDtoFields } from '../JavaFileParser.js';
import { isSpringDtoNode, type SpringDtoNodeMetadata } from '../../../graph/types.js';
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

    // Phase 7a-2 — pure DTOs are now `spring-dto` nodes; Phase 7a-12
    // freezes their metadata.fields shape onto SpringDtoField (typeRef).
    const dtoNode = result.nodes.find(n => n.kind === 'spring-dto' && n.label === 'UserResponse');
    expect(dtoNode).toBeDefined();
    expect(dtoNode!.metadata.fields).toEqual([
      { name: 'id', typeRef: 'Long' },
      { name: 'name', typeRef: 'String' },
      { name: 'email', typeRef: 'String' },
      { name: 'createdAt', typeRef: 'String' },
    ]);
  });

  it('should detect a Request DTO and extract fields', () => {
    const content = readFileSync(resolve(fixturesDir, 'CreateUserRequest.java'), 'utf-8');
    const result = parser.parse('/test/CreateUserRequest.java', content, {});

    const dtoNode = result.nodes.find(n => n.kind === 'spring-dto' && n.label === 'CreateUserRequest');
    expect(dtoNode).toBeDefined();
    expect(dtoNode!.metadata.fields).toEqual([
      { name: 'name', typeRef: 'String' },
      { name: 'email', typeRef: 'String' },
      { name: 'password', typeRef: 'String' },
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
    // Pure spring-service node should NOT carry a sibling spring-dto.
    expect(result.nodes.find(n => n.kind === 'spring-dto')).toBeUndefined();
  });
});

describe('SpringDtoNode interface freeze (Phase 7a-12)', () => {
  const parser = new JavaFileParser();

  it('emits the SpringDtoNodeMetadata contract that Phase 8 SignatureStore depends on', () => {
    const content = readFileSync(resolve(fixturesDir, 'UserResponse.java'), 'utf-8');
    const result = parser.parse('/test/dto/UserResponse.java', content, {});

    const dtoNode = result.nodes.find(isSpringDtoNode);
    expect(dtoNode).toBeDefined();

    const meta: SpringDtoNodeMetadata = dtoNode!.metadata;
    expect(typeof meta.fqn).toBe('string');
    expect(meta.fqn.length).toBeGreaterThan(0);
    expect(meta.sourceRef).toMatchObject({ filePath: '/test/dto/UserResponse.java' });
    expect(typeof meta.sourceRef.line).toBe('number');
    expect(Array.isArray(meta.fields)).toBe(true);
    for (const f of meta.fields) {
      expect(typeof f.name).toBe('string');
      expect(typeof f.typeRef).toBe('string');
      // nullable / jsonName are optional but never `null`
      if ('nullable' in f) expect(typeof f.nullable === 'boolean' || f.nullable === undefined).toBe(true);
      if ('jsonName' in f) expect(typeof f.jsonName === 'string' || f.jsonName === undefined).toBe(true);
    }
  });

  it('preserves @JsonProperty / @NotNull / Optional metadata on the frozen field shape', () => {
    const content = `
      package com.example.dto;
      import com.fasterxml.jackson.annotation.JsonProperty;
      import jakarta.validation.constraints.NotNull;
      import java.util.Optional;
      public class CustomerDto {
        @JsonProperty(value = "customer_id")
        @NotNull
        private Long id;

        private Optional<String> nickname;
      }
    `;
    const result = parser.parse('/test/dto/CustomerDto.java', content, {});
    const dto = result.nodes.find(isSpringDtoNode)!;
    expect(dto).toBeDefined();
    const meta = dto.metadata;
    const id = meta.fields.find(f => f.name === 'id')!;
    expect(id.typeRef).toBe('Long');
    expect(id.jsonName).toBe('customer_id');
    expect(id.nullable).toBe(false);
    const nickname = meta.fields.find(f => f.name === 'nickname')!;
    expect(nickname.typeRef).toBe('String');
    expect(nickname.nullable).toBe(true);
  });
});
