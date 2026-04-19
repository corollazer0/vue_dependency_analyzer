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

  describe('OrderMapper.xml — resultMap + resultType', () => {
    const content = readFileSync(resolve(fixturesDir, 'OrderMapper.xml'), 'utf-8');
    const result = parser.parse('/test/OrderMapper.xml', content, {});

    it('should expose resultMaps on the mapper node metadata', () => {
      const mapper = result.nodes.find(n => n.kind === 'mybatis-mapper')!;
      const resultMaps = (mapper.metadata as any).resultMaps;
      expect(Array.isArray(resultMaps)).toBe(true);
      expect(resultMaps).toHaveLength(1);
      const rm = resultMaps[0];
      expect(rm.id).toBe('OrderResultMap');
      expect(rm.type).toBe('com.example.dto.OrderResponse');
      expect(rm.typeSimple).toBe('OrderResponse');
      expect(rm.mappings).toEqual([
        { property: 'orderId', column: 'order_id', javaType: 'Long' },
        { property: 'customerName', column: 'customer_name', javaType: 'String' },
        { property: 'total', column: 'total_amount', javaType: 'BigDecimal', jdbcType: 'DECIMAL' },
        { property: 'createdAt', column: 'created_at', javaType: 'LocalDateTime' },
      ]);
    });

    it('should attach resultMapType + fieldMappings to statement using resultMap=', () => {
      const stmt = result.nodes.find(n => (n.metadata as any).statementId === 'findById')!;
      expect((stmt.metadata as any).resultMapType).toBe('com.example.dto.OrderResponse');
      expect((stmt.metadata as any).resultMapTypeSimple).toBe('OrderResponse');
      const fm = (stmt.metadata as any).fieldMappings;
      expect(fm).toHaveLength(4);
      expect(fm[0]).toMatchObject({ property: 'orderId', column: 'order_id' });
    });

    it('should synthesize column mappings for inline resultType=', () => {
      const stmt = result.nodes.find(n => (n.metadata as any).statementId === 'findShort')!;
      expect((stmt.metadata as any).resultMapTypeSimple).toBe('OrderSummary');
      const fm = (stmt.metadata as any).fieldMappings;
      expect(fm).toEqual([
        { property: 'orderId', column: 'order_id' },
        { property: 'total', column: 'total_amount' },
      ]);
    });

    it('should record parameterType on insert/update statements', () => {
      const stmt = result.nodes.find(n => (n.metadata as any).statementId === 'insert')!;
      expect((stmt.metadata as any).parameterType).toBe('com.example.dto.CreateOrderRequest');
      expect((stmt.metadata as any).parameterTypeSimple).toBe('CreateOrderRequest');
    });
  });

  // Phase 13-1..3 — referencedColumns + dynamicColumnCount on every statement.
  describe('Phase 13: extractStatementColumns', () => {
    it('captures SELECT projection columns + WHERE refs as referencedColumns', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.UserMapper">
  <select id="findByEmail" resultType="com.example.User">
    SELECT id, email, display_name, created_at FROM users WHERE email = #{email} AND active = true
  </select>
</mapper>`;
      const result = new MyBatisXmlParser().parse('/test/UserMapper.xml', xml, {});
      const stmt = result.nodes.find(n => n.kind === 'mybatis-statement')!;
      const cols = (stmt.metadata as any).referencedColumns as string[];
      expect(cols).toEqual(expect.arrayContaining(['id', 'email', 'display_name', 'created_at', 'active']));
      expect((stmt.metadata as any).dynamicColumnCount).toBeUndefined();
    });

    it('counts ${...} placeholders as dynamicColumnCount', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.UserMapper">
  <select id="findOrdered" resultType="com.example.User">
    SELECT id, email FROM users ORDER BY \${order_col}
  </select>
</mapper>`;
      const result = new MyBatisXmlParser().parse('/test/UserMapper.xml', xml, {});
      const stmt = result.nodes.find(n => n.kind === 'mybatis-statement')!;
      expect((stmt.metadata as any).dynamicColumnCount).toBe(1);
    });

    it('unions <if> branch columns into the referenced set', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.UserMapper">
  <select id="findFiltered" resultType="com.example.User">
    SELECT id FROM users
    <where>
      <if test="email != null">AND email = #{email}</if>
      <if test="role != null">AND role = #{role}</if>
    </where>
  </select>
</mapper>`;
      const result = new MyBatisXmlParser().parse('/test/UserMapper.xml', xml, {});
      const stmt = result.nodes.find(n => n.kind === 'mybatis-statement')!;
      const cols = (stmt.metadata as any).referencedColumns as string[];
      expect(cols).toEqual(expect.arrayContaining(['id', 'email', 'role']));
    });

    it('captures INSERT INTO column lists', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mapper namespace="com.example.UserMapper">
  <insert id="create" parameterType="com.example.User">
    INSERT INTO users (id, email, display_name) VALUES (#{id}, #{email}, #{displayName})
  </insert>
</mapper>`;
      const result = new MyBatisXmlParser().parse('/test/UserMapper.xml', xml, {});
      const stmt = result.nodes.find(n => n.kind === 'mybatis-statement')!;
      const cols = (stmt.metadata as any).referencedColumns as string[];
      expect(cols).toEqual(expect.arrayContaining(['id', 'email', 'display_name']));
    });
  });
});
