# Plan Fase 3: Reduccion de `reflect-metadata` en modo Stage 3

## Objetivo

Eliminar la dependencia operativa de `reflect-metadata` en el camino Stage 3 sin romper compatibilidad legacy (`experimentalDecorators`).

## Fases y pasos

### Fase 3.1 - Delimitar superficies legacy vs Stage 3

- Inventariar puntos de uso de `Reflect.getMetadata` y clasificarlos en: `legacy-only`, `shared`, `candidate-to-remove`.
- Introducir un modulo de feature-gating para metadata (`src/utils/metadata-mode.util.ts`) con API minima: `isLegacyMetadataAvailable()`, `requireLegacyMetadata()`.
- Reemplazar accesos directos a `Reflect.*` por helpers en decoradores para evitar checks duplicados.

### Fase 3.2 - Encapsular metadata Stage 3

- Mover manejo de `Symbol.metadata` y fallbacks a `src/decorators/stage3/metadata.ts`.
- Asegurar que `@Service`, `@Inject`, `@InjectMany` en Stage 3 no llamen `Reflect.getMetadata`.
- Mantener constructor injection explicitamente en modo legacy y documentar error guiado en Stage 3.

### Fase 3.3 - Endurecer pruebas y contratos

- Agregar test matrix para Stage 3 sin `reflect-metadata` (no import, `Reflect.getMetadata` ausente).
- Agregar regression tests para legacy con `reflect-metadata` presente y faltante (warning/errores esperados).
- Verificar que `peerDependenciesMeta.reflect-metadata.optional=true` siga alineado con comportamiento runtime.

### Fase 3.4 - Documentacion y rollout

- Actualizar guia de migracion: que casos siguen requiriendo legacy metadata.
- Agregar tabla de compatibilidad por modo (legacy vs Stage 3) en README.
- Publicar checklist de release para validar bundle y runtime en Node 18/20/22.

## Riesgos y mitigaciones

- Riesgo: desalinear el comportamiento entre tests y runtime real de decoradores Stage 3.
  Mitigacion: ejecutar tests Stage 3 con tsconfig dedicado y sin imports de `reflect-metadata`.
- Riesgo: romper apps legacy por endurecer guards.
  Mitigacion: mantener `requireLegacyMetadata()` solo en paths legacy y cubrir con regresion.
- Riesgo: side effects del polyfill de `Symbol.metadata` en entrypoint.
  Mitigacion: evaluar mover polyfill a modulo explicitamente importado por ruta Stage 3.

## Criterios de aceptacion

- [ ] Stage 3 path (`@Service`, `@Inject`, `@InjectMany` en fields) funciona con `Reflect.getMetadata` ausente.
- [ ] Legacy path mantiene comportamiento actual y errores guiados al faltar `reflect-metadata`.
- [ ] No quedan llamadas directas a `Reflect.getMetadata` fuera de helpers legacy definidos.
- [ ] README y guia de migracion explican claramente cuando `reflect-metadata` es opcional u obligatorio.
