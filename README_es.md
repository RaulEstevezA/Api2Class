# Api2Class

Herramienta que convierte respuestas JSON de APIs en clases y modelos tipados **sin enviar el JSON a ningún servidor**.

**Pruébala online:** [raulesteveza.github.io/tools/Api2Class](https://raulesteveza.github.io/tools/Api2Class/)

<p align="center">
  <a href="https://raulesteveza.github.io/tools/Api2Class/">
    <img src="docs/images/web_app.png" alt="Versión web de Api2Class convirtiendo una respuesta JSON en interfaces de TypeScript" width="720">
  </a>
</p>

## Para qué sirve

Cuando una aplicación habla con una API, alguien tiene que escribir los modelos que corresponden a sus respuestas: una clase por objeto, el tipo correcto de cada campo, listas, objetos anidados, campos que a veces no vienen... Hacerlo a mano es lento y es fácil equivocarse.

Api2Class lo hace a partir de una respuesta real:

```text
Pegar el JSON  →  Revisar la estructura detectada  →  Elegir lenguaje y estilo  →  Copiar o descargar
```

```json
{
  "id": 15,
  "name": "Raul",
  "address": { "city": "Vinaros", "postal_code": "12500" },
  "orders": [{ "id": 101, "total": 29.95 }]
}
```

```text
Root
├── id: integer
├── name: string
├── address: Address
│   ├── city: string
│   └── postal_code: string
└── orders: Order[]
    ├── id: integer
    └── total: float
```

## Filosofía

- **La estructura va antes que el código.** El modelo detectado se muestra como un árbol, así que se ve qué se ha encontrado antes de usar el código generado.
- **Los tipos dudosos no se adivinan.** Un campo con valores de tipos distintos queda abierto (`any`) y uno que siempre es `null` se queda en `null`; los dos se marcan para revisarlos.
- **Los datos no salen del equipo.** No hay servidor: el JSON se analiza en el navegador y el código se genera allí. El JSON pegado no se guarda en ningún sitio, ni siquiera en el navegador.

## Qué hace

### Leer el JSON

- Validación estricta, con la línea y la columna del error y una pista para los fallos habituales al copiar una respuesta: comillas simples, comentarios, comas finales, ceros a la izquierda.
- Los números conservan cómo estaban escritos, así que `29.0` es un float y `29` un integer.

### Detectar la estructura

| Se detecta | Ejemplo |
|---|---|
| Tipos | `string`, `integer`, `float`, `boolean`, `null`, objetos y arrays |
| Objetos anidados | `address: {...}` → clase `Address` |
| Arrays de objetos, con nombre en singular | `orders: [{...}]` → `Order[]`, `categories` → `Category` |
| Campos opcionales | Faltan en algunos objetos de un array |
| Campos nullable | `null` en algunos objetos y un valor en otros |
| Enteros y decimales mezclados | `float` |
| Valores de tipos distintos | `any`, marcado para revisar |
| Nombres de clase repetidos | `address` dentro de `company` → `CompanyAddress` |

### Generar el código

| Lenguaje | Estilo | Detalles |
|---|---|---|
| **Python** | dataclass | Campos en snake_case, `list[...]`, `\| None`; los opcionales valen `None` por defecto |
| **Java** | POJO | Campos privados con getters y setters, `Long` / `Double` / `Boolean`, `List<...>`, `@JsonProperty` de Jackson cuando el nombre no coincide con la clave |
| **TypeScript** | interface | Claves como en el JSON (entre comillas si hace falta), `?` para opcionales, `\| null` para nullable |

Los nombres se adaptan para que sean válidos en cada lenguaje: `class` → `class_`, `2fa` → `_2fa`, `Postal Code` → `postal_code` / `postalCode`. El código se puede copiar o descargar como archivo (`root.py`, `Root.java`, `Root.ts`).

### Próximamente

Editar el modelo antes de generar (renombrar clases y campos, cambiar tipos, marcar campos como opcionales, excluir campos), más estilos (Pydantic, records de Java, types de TypeScript), C#, Dart y Kotlin, y la versión de escritorio.

## Versiones

| | Web | Escritorio |
|---|---|---|
| Tecnología | React + TypeScript + Vite | Python + PySide6 |
| Dónde se ejecuta | En el navegador | Aplicación instalable (Windows, macOS, Linux) |
| Estado | Publicada: [raulesteveza.github.io/tools/Api2Class](https://raulesteveza.github.io/tools/Api2Class/) | Prevista |
| Documentación | [web/README_es.md](./web/README_es.md) | |

## Comportamiento compartido

Las dos versiones se escribirán por separado (TypeScript y Python), pero **tienen que comportarse igual**: la carpeta [`shared/`](./shared/README.md) contiene los casos de prueba que definen qué debe hacer cada parte, desde la validación del JSON hasta el código exacto que se genera en cada lenguaje. Los tests de la web ya los leen; los del escritorio leerán los mismos archivos.

## Estructura del repositorio

```
web/                     Versión web (React + TypeScript + Vite)
  src/core/              Lógica sin interfaz: parser JSON, análisis, modelo, nombres, generadores
  src/core/generators/   Una carpeta por lenguaje
  src/components/        Interfaz React
shared/                  Comportamiento común a ambas versiones
  test-cases/            Casos de prueba en JSON y código generado esperado
docs/                    Imágenes
```

## Sugerencias

Ideas de mejora, errores o algún lenguaje que te gustaría que Api2Class admitiera: escríbeme a [contact.raulesteveza@gmail.com](mailto:contact.raulesteveza@gmail.com).

## Desarrollador

**Raul Estevez**

- [Web personal](https://raulesteveza.github.io/)
- [LinkedIn](https://www.linkedin.com/in/raulesteveza/)

## Licencia

[MIT](./LICENSE)

[Volver al README principal](./README.md)
