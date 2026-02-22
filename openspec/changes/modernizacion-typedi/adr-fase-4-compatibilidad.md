# ADR Fase 4.2 - Estrategia de compatibilidad para rename `typedi` -> `depi`

## Estado

- Fecha: 2026-02-22
- Estado: Aprobado para ejecucion de Fase 4.3+
- Cambio: `modernizacion-typedi`
- Task relacionada: 4.2

## Decision statement

Se adopta una estrategia de compatibilidad con **bridge temporal (opcion A)** para el rename de paquete/import (`typedi` -> `depi`) y una **deprecacion guiada** del nombre legado durante una ventana acotada.

En terminos practicos:

- `depi` sera el paquete canonico y la referencia principal en docs/releases.
- `typedi` se mantendra como shim de re-export hacia `depi` durante la ventana de compatibilidad.
- El shim emitira aviso de deprecacion accionable (instalacion/import de destino y fecha estimada de retiro).

## Opciones consideradas

### Opcion A - Shim package (`typedi` re-exporta `depi`)

Descripcion:

- Publicar o mantener `typedi` como paquete de compatibilidad que re-exporta API publica de `depi`.
- Mantener runtime behavior equivalente y sin divergencia funcional.

Pros:

- Minimiza friccion para consumidores existentes (instalacion/import no rompe de inmediato).
- Reduce riesgo operativo en ecosistema (templates, snippets, lockfiles, CI antiguos).
- Permite migracion progresiva por equipos grandes.

Contras:

- Coste temporal de mantenimiento de 2 superficies de distribucion.
- Riesgo de prolongar adopcion del nombre nuevo si no hay fecha de retiro clara.

### Opcion B - Deprecacion directa sin shim

Descripcion:

- Renombrar a `depi` y marcar `typedi` como deprecado sin puente de re-export.
- Los consumidores deben migrar instalacion/import en un solo salto.

Pros:

- Menor mantenimiento de distribucion.
- Mensaje de mercado mas contundente.

Contras:

- Mayor riesgo de rotura operativa inmediata en consumidores no migrados.
- Mayor carga de soporte y mas probabilidad de churn en adopcion.

## Enfoque elegido y racional

Se elige **Opcion A (shim) con deprecacion temporizada** porque cumple mejor el objetivo del cambio: rebranding sin break funcional de API/runtimes para consumidores activos.

Racional:

1. La Fase 4 busca cambio de naming y distribucion, no cambio semantico de DI.
2. La base instalada de `typedi` es amplia y heterogenea; un corte directo aumenta riesgo sin valor tecnico proporcional.
3. El shim permite medir adopcion de `depi` antes de retirar el alias, con rollback simple si surge impacto inesperado.

## Ventana de compatibilidad y politica SemVer

### Ventana de compatibilidad

- Duracion: **2 minor releases** desde la publicacion del rename (ejemplo: `x.1` y `x.2`).
- Durante la ventana:
  - `depi` es canonico.
  - `typedi` sigue resolviendo la misma API via shim.
  - Se publica advertencia de deprecacion en `typedi` con guia de migracion.
- Cierre de ventana:
  - Retiro del bridge `typedi` en la siguiente **major**.

### Politica SemVer

- Introduccion del rename con shim: **minor** (sin break funcional).
- Cambios de docs/imports canonicos: **minor**.
- Retiro de `typedi` shim: **major**.

Restriccion explicita:

- No se permiten cambios funcionales de API publica en el mismo lote del rename.

## Impacto esperado

### API publica

- Se mantiene compatibilidad funcional de exports entre `typedi` y `depi` durante la ventana.
- Se define migracion de branding de errores (`TypeDIError` -> `DepiError`) con alias temporal para no romper consumidores.

### Package/distribution

- `depi` pasa a ser identidad principal en metadata y docs de instalacion/import.
- `typedi` queda como bridge temporal con deprecacion explicita.
- Los artefactos/scripts de release deben contemplar verificacion de consistencia de branding con whitelist de compatibilidad.

### Documentacion

- Docs principales muestran solo `depi` como ruta canonica.
- Se agrega guia de migracion `typedi` -> `depi` y politica de deprecacion.
- Referencias historicas (changelog, openspec historico) quedan permitidas como excepcion documentada.

### CI/tooling

- Incorporar chequeo de branding para evitar regresiones (`TypeDI`/`typedi` fuera de whitelist).
- Mantener tests de compatibilidad para alias/shim durante la ventana.

## Rollout gates

Gate 1 (antes de 4.3):

- ADR 4.2 aprobada y referenciada en plan/inventario.

Gate 2 (durante 4.3/4.4):

- Metadata y docs canonicas en `depi`.
- Shim `typedi` definido sin divergencia funcional.
- Mensaje de deprecacion con instrucciones accionables.

Gate 3 (antes de release del rename):

- CI verde con checks de branding + tests de compatibilidad.
- Migration guide publicada y enlazada en release notes.

Gate 4 (fin de ventana):

- Medicion de adopcion revisada.
- Decision de retiro validada y calendarizada para major.

## Plan de rollback

Si durante rollout aparecen fallos de adopcion o incompatibilidades relevantes:

1. Mantener `typedi` shim activo y pausar retiro.
2. Revertir cambios de metadata/docs que impidan adopcion segura.
3. Publicar patch correctivo y actualizar guia de migracion.

El rollback no requiere revertir funcionalidad de DI; solo ajustar capa de distribucion/branding.

## Consecuencias para Fase 4.3+

- Se desbloquean decisiones de PKG-01..04, API-02..04, CI-03 del inventario.
- La ejecucion concreta sigue pendiente en tareas 4.3, 4.4 y 4.5.
- Este ADR no autoriza implementar el rename en codigo en 4.2; solo fija la estrategia.
