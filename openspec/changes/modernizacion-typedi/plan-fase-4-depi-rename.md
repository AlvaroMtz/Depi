# Plan Fase 4: Renombrado completo TypeDI -> Depi con compatibilidad

## Objetivo

Completar el rebranding tecnico y documental de TypeDI a Depi, preservando una ruta de adopcion segura para consumidores existentes.

## Fases y pasos

### Fase 4.1 - Inventario de superficie publica

- Auditar referencias `depi`/`Depi` en codigo, docs, badges, package metadata, ejemplos y CI.
- Separar cambios en categorias: `public API`, `package/distribution`, `documentation`, `repo metadata`.
- Definir tabla de equivalencias (import path, nombre de paquete, mensajes de error, branding).

### Fase 4.2 - Estrategia de compatibilidad

- Mantener `depi` como paquete canonico y definir estrategia de puente para consumidores de `typedi`:
  - opcion A: paquete shim `typedi` que re-exporta `depi`.
  - opcion B: deprecacion de `typedi` con mensaje de migracion automatica.
- Definir ventana de soporte (por ejemplo 2 minor releases) para alias/bridge.
- Publicar politica de versionado: cambio de branding sin break de API en runtime.

### Fase 4.3 - Ejecucion por capas

- Actualizar README, badges, snippets de instalacion/import y ejemplos.
- Alinear nombres en metadata de package (`name`, descripcion, keywords, repo URLs segun decision final).
- Revisar mensajes de errores y salida de consola para branding consistente.

### Fase 4.4 - Migracion asistida

- Crear migration guide corto: `typedi` -> `depi` (instalacion, imports, CI scripts).
- Incluir script/codemod opcional para reemplazo de imports en repos consumidores.
- Publicar notas de release con seccion "No hay cambio funcional" y excepciones si aplican.

## Riesgos y mitigaciones

- Riesgo: confusion de usuarios por coexistencia de nombre viejo/nuevo.
  Mitigacion: alias temporal y mensajes de deprecacion accionables.
- Riesgo: links rotos en docs/badges por rename parcial.
  Mitigacion: checklist de enlaces y validacion automatizada post-cambio.
- Riesgo: impacto en ecosistema (templates, blogs, snippets externos).
  Mitigacion: migration guide breve y comunicado de release con examples before/after.

## Criterios de aceptacion

- [ ] No quedan referencias activas a `TypeDI/typedi` en docs principales ni ejemplos de instalacion/import.
- [ ] Existe estrategia documentada de compatibilidad para consumidores de `typedi`.
- [ ] Release notes incluyen guia de migracion y politica de deprecacion.
- [ ] CI y metadata del proyecto reflejan naming consistente Depi.
