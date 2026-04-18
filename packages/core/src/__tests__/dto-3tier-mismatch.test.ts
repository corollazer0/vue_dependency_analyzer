import { describe, it, expect } from 'vitest';
import { DependencyGraph } from '../graph/DependencyGraph.js';
import { TsFileParser } from '../parsers/typescript/TsFileParser.js';
import { JavaFileParser } from '../parsers/java/JavaFileParser.js';
import { MyBatisXmlParser } from '../parsers/java/MyBatisXmlParser.js';
import { DtoFlowLinker } from '../linkers/DtoFlowLinker.js';
import { checkDtoConsistency } from '../analyzers/DtoConsistencyChecker.js';
import type { GraphEdge, ParseResult } from '../graph/types.js';

/**
 * Phase 4-6 — end-to-end fixtures for 3-tier (Vue TS ↔ Spring DTO ↔ DB) drift.
 *
 * Each case wires the full pipeline: TS interface → api-call → Spring
 * endpoint → Spring DTO → MyBatis statement/resultMap → db-table, then
 * exercises DtoFlowLinker + checkDtoConsistency.
 */

const tsParser = new TsFileParser();
const javaParser = new JavaFileParser();
const xmlParser = new MyBatisXmlParser();

interface FileSpec {
  path: string;
  content: string;
  parser: 'ts' | 'java' | 'xml';
}

function buildPipeline(
  files: FileSpec[],
  apiCallSites: Array<{ id: string; filePath: string; url: string; method: string; endpointId: string }>,
): DependencyGraph {
  const graph = new DependencyGraph();

  for (const f of files) {
    let result: ParseResult;
    if (f.parser === 'ts') result = tsParser.parse(f.path, f.content, {});
    else if (f.parser === 'java') result = javaParser.parse(f.path, f.content, {});
    else result = xmlParser.parse(f.path, f.content, {});

    for (const n of result.nodes) graph.addNode(n);
    for (const e of result.edges) graph.addEdge(e);
  }

  // Synthesize api-call-site nodes + api-call edges so the checker walks
  // the frontend→endpoint relation (ApiCallLinker is not re-implemented here).
  for (const s of apiCallSites) {
    graph.addNode({
      id: s.id,
      kind: 'api-call-site',
      label: `${s.method} ${s.url}`,
      filePath: s.filePath,
      metadata: { url: s.url, httpMethod: s.method },
    });
    const edge: GraphEdge = {
      id: `${s.id}:api-call:${s.endpointId}`,
      source: s.id,
      target: s.endpointId,
      kind: 'api-call',
      metadata: {},
    };
    graph.addEdge(edge);
  }

  new DtoFlowLinker().link(graph);
  return graph;
}

describe('3-tier DTO mismatch fixtures (Phase 4-6)', () => {
  it('Case A: backend DTO field has no column in the ResultMap → missing-db flagged', () => {
    const tsContent = `
      export interface OrderDTO {
        orderId: number;
        customerName: string;
        total: number;
        ghostField: string;
      }
    `;
    const dtoJava = `
      package com.example.dto;
      public class OrderDTO {
        private Long orderId;
        private String customerName;
        private java.math.BigDecimal total;
        private String ghostField;
      }
    `;
    const controllerJava = `
      package com.example.controller;
      import com.example.dto.OrderDTO;
      import org.springframework.web.bind.annotation.*;
      @RestController
      @RequestMapping("/api/orders")
      public class OrderController {
        @GetMapping("/")
        public OrderDTO findAll() { return null; }
      }
    `;
    const mapperXml = `<?xml version="1.0" encoding="UTF-8"?>
      <mapper namespace="com.example.mapper.OrderMapper">
        <resultMap id="OrderMap" type="com.example.dto.OrderDTO">
          <id property="orderId" column="order_id"/>
          <result property="customerName" column="customer_name"/>
          <result property="total" column="total_amount"/>
        </resultMap>
        <select id="findAll" resultMap="OrderMap">
          SELECT order_id, customer_name, total_amount FROM orders
        </select>
      </mapper>`;

    const graph = buildPipeline(
      [
        { path: '/src/types/order.ts', content: tsContent, parser: 'ts' },
        { path: '/src/dto/OrderDTO.java', content: dtoJava, parser: 'java' },
        { path: '/src/controller/OrderController.java', content: controllerJava, parser: 'java' },
        { path: '/mapper/OrderMapper.xml', content: mapperXml, parser: 'xml' },
      ],
      [{
        id: 'api-call-site:/src/api.ts:orders',
        filePath: '/src/api.ts',
        url: '/api/orders',
        method: 'GET',
        endpointId: 'spring-endpoint:GET:/api/orders',
      }],
    );

    const mismatches = checkDtoConsistency(graph);
    expect(mismatches.length).toBeGreaterThan(0);
    const m = mismatches.find(x => x.backendDto === 'OrderDTO')!;
    expect(m).toBeDefined();
    expect(m.missingInDb).toEqual(['ghostField']);
    const ghostDetail = m.fieldDetails.find(d => d.name === 'ghostField' && d.issue === 'missing-db');
    expect(ghostDetail).toBeDefined();
    expect(ghostDetail?.severity).toBe('warning');

    // 3-tier dto-flows chain edges should be present
    const chainEdges = graph.getAllEdges().filter(e => e.kind === 'dto-flows' && (e.metadata as any).tier);
    expect(chainEdges.some(e => (e.metadata as any).tier === 'frontend-backend')).toBe(true);
    expect(chainEdges.some(e => (e.metadata as any).tier === 'backend-mapper')).toBe(true);
  });

  it('Case B: TS declares string for a numeric backend field → type-mismatch flagged', () => {
    const tsContent = `
      export interface PaymentResponse {
        paymentId: string;
        amount: number;
      }
    `;
    const dtoJava = `
      package com.example.dto;
      public class PaymentResponse {
        private Long paymentId;
        private java.math.BigDecimal amount;
      }
    `;
    const controllerJava = `
      package com.example.controller;
      import com.example.dto.PaymentResponse;
      import org.springframework.web.bind.annotation.*;
      @RestController
      @RequestMapping("/api/payments")
      public class PaymentController {
        @GetMapping("/{id}")
        public PaymentResponse findById(Long id) { return null; }
      }
    `;
    const mapperXml = `<?xml version="1.0" encoding="UTF-8"?>
      <mapper namespace="com.example.mapper.PaymentMapper">
        <resultMap id="PayMap" type="com.example.dto.PaymentResponse">
          <id property="paymentId" column="payment_id" javaType="Long" jdbcType="BIGINT"/>
          <result property="amount" column="amount" javaType="BigDecimal" jdbcType="DECIMAL"/>
        </resultMap>
        <select id="findById" resultMap="PayMap">
          SELECT payment_id, amount FROM payments WHERE payment_id = #{id}
        </select>
      </mapper>`;

    const graph = buildPipeline(
      [
        { path: '/src/types/payment.ts', content: tsContent, parser: 'ts' },
        { path: '/src/dto/PaymentResponse.java', content: dtoJava, parser: 'java' },
        { path: '/src/controller/PaymentController.java', content: controllerJava, parser: 'java' },
        { path: '/mapper/PaymentMapper.xml', content: mapperXml, parser: 'xml' },
      ],
      [{
        id: 'api-call-site:/src/api.ts:payment',
        filePath: '/src/api.ts',
        url: '/api/payments/1',
        method: 'GET',
        endpointId: 'spring-endpoint:GET:/api/payments/{id}',
      }],
    );

    const mismatches = checkDtoConsistency(graph);
    const m = mismatches.find(x => x.backendDto === 'PaymentResponse')!;
    expect(m).toBeDefined();

    // paymentId: Long vs string is a type-mismatch (Long → number; string not allowed)
    const typeMismatch = m.fieldDetails.find(d => d.name === 'paymentId' && d.issue === 'type-mismatch');
    expect(typeMismatch).toBeDefined();
    expect(typeMismatch?.backendType).toBe('Long');
    expect(typeMismatch?.frontendType).toBe('string');
    expect(typeMismatch?.column).toBe('payment_id');
    expect(typeMismatch?.jdbcType).toBe('BIGINT');
  });

  it('Case C: @NotNull backend field vs optional TS field → nullable-mismatch flagged', () => {
    const tsContent = `
      export interface UserDTO {
        userId: number;
        name?: string;
      }
    `;
    const dtoJava = `
      package com.example.dto;
      import jakarta.validation.constraints.NotNull;
      public class UserDTO {
        @NotNull
        private Long userId;

        @NotNull
        private String name;
      }
    `;
    const controllerJava = `
      package com.example.controller;
      import com.example.dto.UserDTO;
      import org.springframework.web.bind.annotation.*;
      @RestController
      @RequestMapping("/api/users")
      public class UserController {
        @GetMapping("/me")
        public UserDTO me() { return null; }
      }
    `;
    const mapperXml = `<?xml version="1.0" encoding="UTF-8"?>
      <mapper namespace="com.example.mapper.UserMapper">
        <resultMap id="UserMap" type="com.example.dto.UserDTO">
          <id property="userId" column="user_id"/>
          <result property="name" column="name"/>
        </resultMap>
        <select id="me" resultMap="UserMap">
          SELECT user_id, name FROM users
        </select>
      </mapper>`;

    const graph = buildPipeline(
      [
        { path: '/src/types/user.ts', content: tsContent, parser: 'ts' },
        { path: '/src/dto/UserDTO.java', content: dtoJava, parser: 'java' },
        { path: '/src/controller/UserController.java', content: controllerJava, parser: 'java' },
        { path: '/mapper/UserMapper.xml', content: mapperXml, parser: 'xml' },
      ],
      [{
        id: 'api-call-site:/src/api.ts:me',
        filePath: '/src/api.ts',
        url: '/api/users/me',
        method: 'GET',
        endpointId: 'spring-endpoint:GET:/api/users/me',
      }],
    );

    const mismatches = checkDtoConsistency(graph);
    const m = mismatches.find(x => x.backendDto === 'UserDTO')!;
    expect(m).toBeDefined();

    // name: @NotNull Java + optional TS → nullable-mismatch
    expect(m.nullableMismatches).toContain('name');
    const nameDetail = m.fieldDetails.find(d => d.name === 'name' && d.issue === 'nullable-mismatch');
    expect(nameDetail).toBeDefined();
    expect(nameDetail?.backendNullable).toBe(false);
    expect(nameDetail?.optional).toBe(true);

    // userId: @NotNull Java + required TS → no mismatch
    const userIdNull = m.fieldDetails.find(d => d.name === 'userId' && d.issue === 'nullable-mismatch');
    expect(userIdNull).toBeUndefined();
  });
});
