# Layer DSL — Configuration Examples

> Phase 7b-3 / 7b-8. Drop these into your `.vdarc.json` to compile
> layered architecture intent into the same `ArchitectureRule` set
> the RuleEngine evaluates. Hand-written rules in the same
> `(type, from, to)` tuple always win — DSL output is reported as
> `dropped[]` so `vda lint --explain` can surface the conflict
> (and `layerDsl.mode === 'strict'` promotes the conflict to a
> lint error).

## Spring Boot — controller → service → repository

```json
{
  "layers": [
    { "name": "presentation",   "match": ["spring-controller"] },
    { "name": "application",    "match": ["spring-service"] },
    { "name": "infrastructure", "match": ["mybatis-mapper", "mybatis-statement", "db-table"] }
  ],
  "layerRules": [
    { "from": "presentation",   "to": "infrastructure", "policy": "deny",
      "message": "Controllers must go through a service" },
    { "from": "application",    "to": "presentation",   "policy": "deny" }
  ]
}
```

What this compiles to:

| DSL line | ArchitectureRule |
|---|---|
| `presentation → infrastructure (deny)` | `{ type: 'deny-direct', from: ['spring-controller'], to: ['mybatis-mapper','mybatis-statement','db-table'], id: 'layer-dsl:presentation→infrastructure:deny' }` |
| `application → presentation (deny)`     | `{ type: 'deny-direct', from: ['spring-service'], to: ['spring-controller'], id: 'layer-dsl:application→presentation:deny' }` |

## Vue — views → components → composables → stores

```json
{
  "layers": [
    { "name": "views",       "match": ["vue-router-route"] },
    { "name": "components",  "match": ["vue-component"] },
    { "name": "composables", "match": ["vue-composable"] },
    { "name": "stores",      "match": ["pinia-store"] }
  ],
  "layerRules": [
    { "from": "stores",      "to": "components", "policy": "deny",
      "message": "Stores own state, not the UI tree" },
    { "from": "composables", "to": "components", "policy": "deny" },
    { "from": "components",  "to": "views",      "policy": "deny" }
  ]
}
```

## Strict mode — fail on conflicts

```json
{
  "layerDsl": { "mode": "strict" },
  "layers": [ /* … */ ],
  "layerRules": [ /* … */ ]
}
```

Default mode is `lenient`: when a hand-written rule already covers the
same `(type, from, to)` tuple, the DSL line is silently dropped (and
listed in `compileLayerRules({ … }).dropped`). `strict` mode keeps the
drop but flags it with `isError: true` so the consumer can promote it
to a lint failure.

## Tying it all together — `.vdarc.json`

```json
{
  "vueRoot": "frontend/src",
  "springBootRoot": "backend/src/main/java",
  "rules": [
    { "id": "no-cycle", "type": "deny-circular" }
  ],
  "layers": [
    { "name": "presentation", "match": ["spring-controller"] },
    { "name": "application",  "match": ["spring-service"] }
  ],
  "layerRules": [
    { "from": "presentation", "to": "application", "policy": "allow-only" }
  ],
  "layerDsl": { "mode": "lenient" }
}
```

Programmatic use:

```ts
import { mergeWithLayerRules, evaluateRules } from '@vda/core';

const merged = mergeWithLayerRules(config.rules ?? [], config);
const violations = evaluateRules(graph, merged.rules);
if (merged.dropped.length) console.warn('Layer DSL drops:', merged.dropped);
```
