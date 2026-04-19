import { describe, it, expect } from 'vitest';
import { JavaFileParser } from '../JavaFileParser.js';
import { KotlinFileParser } from '../KotlinFileParser.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const fixturesDir = resolve(import.meta.dirname, '../../../__fixtures__');

describe('JavaFileParser', () => {
  const parser = new JavaFileParser();

  it('should support .java files', () => {
    expect(parser.supports('Foo.java')).toBe(true);
    expect(parser.supports('Foo.ts')).toBe(false);
  });

  describe('UserController.java', () => {
    const content = readFileSync(resolve(fixturesDir, 'UserController.java'), 'utf-8');
    const result = parser.parse('/test/UserController.java', content, {});

    it('should create a spring-controller node', () => {
      const controller = result.nodes.find(n => n.kind === 'spring-controller');
      expect(controller).toBeDefined();
      expect(controller!.label).toBe('UserController');
      expect((controller!.metadata as any).basePath).toBe('/api/users');
    });

    it('should extract all endpoints', () => {
      const endpoints = result.nodes.filter(n => n.kind === 'spring-endpoint');
      expect(endpoints.length).toBeGreaterThanOrEqual(5);

      const paths = endpoints.map(e => (e.metadata as any).path);
      expect(paths).toContain('/api/users');
      expect(paths).toContain('/api/users/{id}');

      const methods = endpoints.map(e => (e.metadata as any).httpMethod);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
    });

    it('should create api-serves edges from controller to endpoints', () => {
      const servesEdges = result.edges.filter(e => e.kind === 'api-serves');
      expect(servesEdges.length).toBeGreaterThanOrEqual(5);
    });

    it('should mirror every api-serves with a reverse api-implements alias (Phase 7a-1)', () => {
      const servesEdges = result.edges.filter(e => e.kind === 'api-serves');
      const implementsEdges = result.edges.filter(e => e.kind === 'api-implements');
      expect(implementsEdges).toHaveLength(servesEdges.length);

      for (const ie of implementsEdges) {
        expect(ie.source.startsWith('spring-endpoint:')).toBe(true);
        expect(ie.target.startsWith('spring-controller:')).toBe(true);
        const paired = servesEdges.find(se => se.source === ie.target && se.target === ie.source);
        expect(paired, `expected paired api-serves for ${ie.id}`).toBeDefined();
        expect(ie.metadata.httpMethod).toBe(paired!.metadata.httpMethod);
        expect(ie.metadata.path).toBe(paired!.metadata.path);
      }
    });

    it('should detect @Autowired injections', () => {
      const injectEdges = result.edges.filter(e => e.kind === 'spring-injects');
      expect(injectEdges.length).toBeGreaterThanOrEqual(1);
      expect(injectEdges[0].metadata).toMatchObject({ injectedType: 'UserService' });
    });

    it('should not produce parse errors', () => {
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Java interface (@Mapper)', () => {
    const content = readFileSync(resolve(fixturesDir, 'UserMapperInterface.java'), 'utf-8');
    const result = parser.parse('/test/UserMapperInterface.java', content, {});

    it('should detect @Mapper interface as spring-service', () => {
      const node = result.nodes.find(n => n.kind === 'spring-service');
      expect(node).toBeDefined();
      expect(node!.metadata.isMapper).toBe(true);
      expect(node!.metadata.className).toBe('UserMapper');
      expect(node!.metadata.fqn).toBe('com.example.mapper.UserMapper');
    });
  });

  describe('Java @Component detection', () => {
    const content = `
package com.example.util;

@Component
public class CacheManager {
    private final RedisTemplate redisTemplate;

    public CacheManager(RedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void evict(String key) {
        redisTemplate.delete(key);
    }
}
`;
    const result = parser.parse('/test/CacheManager.java', content, {});

    it('should detect @Component as spring-service', () => {
      const node = result.nodes.find(n => n.kind === 'spring-service');
      expect(node).toBeDefined();
      expect(node!.label).toBe('CacheManager');
      expect(node!.metadata.isComponent).toBe(true);
      expect(node!.metadata.fqn).toBe('com.example.util.CacheManager');
    });
  });
});

describe('KotlinFileParser', () => {
  const parser = new KotlinFileParser();

  it('should support .kt files', () => {
    expect(parser.supports('Foo.kt')).toBe(true);
    expect(parser.supports('Foo.java')).toBe(false);
  });

  it('should parse a Kotlin controller', () => {
    const content = `
package com.example.demo.controller

import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/products")
class ProductController(private val productService: ProductService) {

    @GetMapping("/list")
    fun getAll(): List<Product> = productService.findAll()

    @PostMapping("/create")
    fun create(@RequestBody product: Product): Product = productService.save(product)
}
`;
    const result = parser.parse('/test/ProductController.kt', content, {});

    const controller = result.nodes.find(n => n.kind === 'spring-controller');
    expect(controller).toBeDefined();
    expect(controller!.label).toBe('ProductController');

    const endpoints = result.nodes.filter(n => n.kind === 'spring-endpoint');
    expect(endpoints).toHaveLength(2);
    expect(endpoints.map(e => (e.metadata as any).path)).toContain('/api/products/list');
    expect(endpoints.map(e => (e.metadata as any).path)).toContain('/api/products/create');

    // Phase 7a-1 — reverse alias edges
    const servesEdges = result.edges.filter(e => e.kind === 'api-serves');
    const implementsEdges = result.edges.filter(e => e.kind === 'api-implements');
    expect(implementsEdges).toHaveLength(servesEdges.length);
    for (const ie of implementsEdges) {
      expect(ie.source.startsWith('spring-endpoint:')).toBe(true);
      expect(ie.target.startsWith('spring-controller:')).toBe(true);
    }
  });

  it('should detect @Service class as spring-service', () => {
    const content = `
package com.example.demo.service

@Service
class UserService(private val userRepository: UserRepository) {
    fun findAll(): List<User> = userRepository.findAll()
}
`;
    const result = parser.parse('/test/UserService.kt', content, {});

    const node = result.nodes.find(n => n.kind === 'spring-service');
    expect(node).toBeDefined();
    expect(node!.label).toBe('UserService');
    expect(node!.metadata.fqn).toBe('com.example.demo.service.UserService');
  });

  it('should detect @Repository interface as spring-service with isRepository', () => {
    const content = `
package com.example.demo.repository

@Repository
interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): User?
}
`;
    const result = parser.parse('/test/UserRepository.kt', content, {});

    const node = result.nodes.find(n => n.kind === 'spring-service');
    expect(node).toBeDefined();
    expect(node!.label).toBe('UserRepository');
    expect(node!.metadata.isRepository).toBe(true);
    expect(node!.metadata.fqn).toBe('com.example.demo.repository.UserRepository');
  });

  it('should detect @Component class as spring-service', () => {
    const content = `
package com.example.demo.component

@Component
class EventPublisher(private val appEventPublisher: ApplicationEventPublisher) {
    fun publish(event: Any) = appEventPublisher.publishEvent(event)
}
`;
    const result = parser.parse('/test/EventPublisher.kt', content, {});

    const node = result.nodes.find(n => n.kind === 'spring-service');
    expect(node).toBeDefined();
    expect(node!.label).toBe('EventPublisher');
    expect(node!.metadata.isComponent).toBe(true);
  });

  it('should detect @Mapper interface as spring-service with isMapper', () => {
    const content = `
package com.example.demo.mapper

@Mapper
interface UserMapper {
    fun toDto(user: User): UserDto
}
`;
    const result = parser.parse('/test/UserMapper.kt', content, {});

    const node = result.nodes.find(n => n.kind === 'spring-service');
    expect(node).toBeDefined();
    expect(node!.label).toBe('UserMapper');
    expect(node!.metadata.isMapper).toBe(true);
    expect(node!.metadata.fqn).toBe('com.example.demo.mapper.UserMapper');
  });

  it('should detect constructor injection and create spring-injects edges', () => {
    const content = `
package com.example.demo.service

@Service
class OrderService(private val userRepository: UserRepository, private val productService: ProductService) {
    fun createOrder(userId: Long): Order = TODO()
}
`;
    const result = parser.parse('/test/OrderService.kt', content, {});

    const injectEdges = result.edges.filter(e => e.kind === 'spring-injects');
    expect(injectEdges).toHaveLength(2);
    const injectedTypes = injectEdges.map(e => (e.metadata as any).injectedType);
    expect(injectedTypes).toContain('UserRepository');
    expect(injectedTypes).toContain('ProductService');
  });

  it('should detect constructor injection for controllers too', () => {
    const content = `
package com.example.demo.controller

@RestController
@RequestMapping("/api/products")
class ProductController(private val productService: ProductService) {

    @GetMapping("/list")
    fun getAll(): List<Product> = productService.findAll()
}
`;
    const result = parser.parse('/test/ProductController.kt', content, {});

    const injectEdges = result.edges.filter(e => e.kind === 'spring-injects');
    expect(injectEdges).toHaveLength(1);
    expect(injectEdges[0].metadata.injectedType).toBe('ProductService');
    expect(injectEdges[0].source).toContain('spring-controller');
  });
});
