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
  });
});
