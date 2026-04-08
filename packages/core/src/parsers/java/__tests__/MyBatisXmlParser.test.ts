import { describe, it, expect } from 'vitest';
import { MyBatisXmlParser } from '../MyBatisXmlParser.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const fixturesDir = resolve(import.meta.dirname, '../../../__fixtures__');

describe('MyBatisXmlParser', () => {
  const parser = new MyBatisXmlParser();

  it('should support .xml files', () => {
    expect(parser.supports('UserMapper.xml')).toBe(true);
    expect(parser.supports('UserMapper.java')).toBe(false);
  });

  it('should skip non-mybatis XML files', () => {
    const result = parser.parse('/test.xml', '<beans></beans>', {});
    expect(result.nodes).toHaveLength(0);
  });

  describe('UserMapper.xml', () => {
    const content = readFileSync(resolve(fixturesDir, 'UserMapper.xml'), 'utf-8');
    const result = parser.parse('/test/UserMapper.xml', content, {});

    it('should create a mybatis-mapper node', () => {
      const mapper = result.nodes.find(n => n.kind === 'mybatis-mapper');
      expect(mapper).toBeDefined();
      expect(mapper!.label).toBe('UserMapper');
      expect((mapper!.metadata as any).namespace).toBe('com.example.mapper.UserMapper');
    });

    it('should extract all SQL statements', () => {
      const stmts = result.nodes.filter(n => n.kind === 'mybatis-statement');
      expect(stmts.length).toBe(5);
      const ids = stmts.map(s => (s.metadata as any).statementId);
      expect(ids).toContain('findById');
      expect(ids).toContain('findByRole');
      expect(ids).toContain('insert');
      expect(ids).toContain('updateEmail');
      expect(ids).toContain('deleteById');
    });

    it('should extract db-table nodes', () => {
      const tables = result.nodes.filter(n => n.kind === 'db-table');
      const names = tables.map(t => (t.metadata as any).tableName);
      expect(names).toContain('users');
      expect(names).toContain('user_roles');
    });

    it('should create mybatis-maps edges from mapper to statements', () => {
      const maps = result.edges.filter(e => e.kind === 'mybatis-maps');
      expect(maps.length).toBe(5);
    });

    it('should create reads-table edges for SELECT statements', () => {
      const reads = result.edges.filter(e => e.kind === 'reads-table');
      expect(reads.length).toBeGreaterThanOrEqual(2); // findById→users, findByRole→users+user_roles
    });

    it('should create writes-table edges for INSERT/UPDATE/DELETE', () => {
      const writes = result.edges.filter(e => e.kind === 'writes-table');
      expect(writes.length).toBeGreaterThanOrEqual(3); // insert→users, updateEmail→users, deleteById→users
    });

    it('should not have errors', () => {
      expect(result.errors).toHaveLength(0);
    });
  });
});
