# Api2Class

Herramienta que convierte respuestas JSON de APIs en clases y modelos tipados **sin enviar el JSON a ningún servidor**.

**Pruébala online:** [raulesteveza.github.io/tools/Api2Class](https://raulesteveza.github.io/tools/Api2Class/)

<p align="center">
  <a href="https://raulesteveza.github.io/tools/Api2Class/">
    <img src="docs/images/web_app.png" alt="Versión web de Api2Class: JSON de entrada, estructura detectada editable y código Kotlin generado" width="720">
  </a>
</p>

## Para qué sirve

Cuando una aplicación habla con una API, alguien tiene que escribir los modelos que corresponden a sus respuestas: una clase por objeto, el tipo correcto de cada campo, listas, objetos anidados, campos que a veces no vienen... Hacerlo a mano es lento y es fácil equivocarse.

Api2Class lo hace a partir de una respuesta real:

```text
Pegar el JSON  →  Entender la estructura detectada  →  Ajustarla  →  Generar, copiar o descargar
```

```json
{
  "id": 15,
  "name": "Raul",
  "address": { "city": "Villaluna", "postal_code": "99001" },
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

- **La estructura va antes que el código.** El modelo detectado se muestra como un árbol y se puede editar, así que se ve qué se ha encontrado y el código dice lo que tú has decidido.
- **Los tipos dudosos no se adivinan.** Un campo con valores de tipos distintos queda abierto (`any`), uno que siempre es `null` se queda en `null`, y un array u objeto vacío no dice nada de su contenido; todos se marcan para revisarlos, con cuántos valores de cada tipo se han encontrado.
- **El código generado funciona.** Cada lenguaje y estilo se prueba con entradas reales: el código lee el JSON y lo vuelve a escribir sin cambios (ver [Comportamiento compartido](#comportamiento-compartido)).
- **Los datos no salen del equipo.** No hay servidor: el JSON se analiza en el navegador y el código se genera allí. Ni el JSON pegado ni las ediciones se guardan en ningún sitio, ni siquiera en el navegador.

## Qué hace

### Leer el JSON

- Pégalo, abre un archivo `.json` o suéltalo sobre el editor. Se puede formatear y minificar sin cambiar ningún valor.
- Validación estricta que dice qué se esperaba y dónde: `Línea 3, columna 3 · Se esperaba "," o "}" después de "email"`, con pistas para los fallos habituales al copiar una respuesta (comillas simples, comentarios, comas finales, ceros a la izquierda).
- Los números conservan cómo estaban escritos, así que `29.0` es un float y `29` un integer.

### Detectar la estructura

| Se detecta | Ejemplo |
|---|---|
| Tipos | `string`, `integer`, `float`, `boolean`, `null`, objetos y arrays |
| Fechas, fechas con hora y UUID (desactivable) | `"1990-05-17"` → `date`, `"2026-10-20T09:15:00Z"` → `datetime` |
| Objetos anidados | `address: {...}` → clase `Address` |
| Arrays de objetos, con nombre en singular | `orders: [{...}]` → `Order[]`, `categories` → `Category` |
| Campos opcionales | Faltan en algunos objetos de un array (se analizan todos los elementos, no solo el primero) |
| Campos nullable | `null` en algunos objetos y un valor en otros |
| Enteros y decimales mezclados | `float` |
| Valores de tipos distintos | `any`, con recuento: `integer ×2, string ×1` |
| Objetos con los mismos campos (desactivable) | `billing_address` + `shipping_address` → una sola clase `Address` |
| Nombres de clase repetidos | `address` dentro de `company` → `CompanyAddress` |

### Ajustarla

En el árbol, cada campo se puede incluir o excluir y editar: nombre de la propiedad, tipo (también un mapa genérico en lugar de una clase), opcional y nullable. Las clases y el modelo raíz se pueden renombrar. Las clases que ya nada usa desaparecen del código, y las ediciones se mantienen aunque cambie el JSON.

Los nombres de las propiedades siguen la convención de cada lenguaje, o la que elijas: camelCase, snake_case, PascalCase o como en el JSON. Cuando un nombre no coincide con su clave JSON, el código lo indica (`@JsonProperty`, `@SerialName`, `CodingKeys`, etiquetas `json:"..."`...). Las palabras reservadas y los nombres no válidos se corrigen y se listan: `class` → `class_`, `2fa` → `field_2fa`.

### Generar el código

| Lenguaje | Estilos y librerías |
|---|---|
| **Python** | dataclass y clase normal (con `from_dict` / `to_dict`), Pydantic v2 |
| **Java** | POJO, record, Lombok · Jackson, Gson o sin anotaciones |
| **TypeScript** | interface, type, Zod 4 |
| **C#** | class, record · System.Text.Json o Newtonsoft.Json |
| **Kotlin** | data class · kotlinx.serialization, Gson, Moshi |
| **Dart** | clase con `fromJson` / `toJson` (y `copyWith`), json_serializable, freezed |
| **Swift** | structs `Codable` con `CodingKeys` |
| **Go** | structs con etiquetas `json` |
| **PHP** | clases readonly de PHP 8.1 con `fromArray` / `toArray` |
| **Rust** | structs con serde |
| **Scala 3** | case classes que derivan los codecs de circe |
| **JSON Schema** | draft 2020-12 |
| **Smithy** | IDL 2.0 |

Cada lenguaje incluye un ejemplo de uso. El código se puede copiar, descargar como archivo o, con un archivo por clase, como `.zip`.

### Interfaz

Tres paneles (JSON, estructura, código) que pasan a ser pestañas en pantallas estrechas, tema oscuro, claro o del sistema, e inglés o castellano.

## Versiones

| | Web | Escritorio |
|---|---|---|
| Tecnología | React + TypeScript + Vite | Python + PySide6 |
| Dónde se ejecuta | En el navegador | Aplicación instalable (Windows, macOS, Linux) |
| Estado | Publicada: [raulesteveza.github.io/tools/Api2Class](https://raulesteveza.github.io/tools/Api2Class/) | [Descargar](./desktop/README_es.md#descargar) (compilada y comprobada en macOS) |
| Documentación | [web/README_es.md](./web/README_es.md) | [desktop/README_es.md](./desktop/README_es.md) |

## Comportamiento compartido

Las dos versiones se escriben por separado (TypeScript y Python), pero **se comportan igual**: la carpeta [`shared/`](./shared/README.md) contiene los casos de prueba que definen qué debe hacer cada parte, desde la validación del JSON y el análisis hasta las ediciones y el código exacto que se genera en cada lenguaje y estilo. Los tests de la web y los del escritorio leen los mismos archivos, y los generadores del escritorio se han comparado además con la salida de la web para todas las opciones: idénticos.

El código esperado se comprueba con las herramientas reales: Python (con Pydantic), Java (con Jackson, Gson y Lombok), Dart, Swift, PHP y Rust (con serde) leen cada JSON de ejemplo y lo vuelven a escribir sin cambios, TypeScript pasa `tsc --strict`, Zod acepta cada entrada y los JSON Schema la validan. C#, Kotlin, Go y Scala siguen el comportamiento documentado de cada lenguaje, pero todavía no se han compilado.

## Estructura del repositorio

```
web/                     Versión web (React + TypeScript + Vite)
  src/core/              Lógica sin interfaz: parser JSON, análisis, modelo, ediciones, nombres, avisos
  src/core/generators/   Una carpeta por lenguaje
  src/components/        Interfaz React
desktop/                 Versión de escritorio (Python + PySide6)
  api2class/core/        La misma lógica que web/src/core/, en Python
  api2class/ui/          Interfaz con PySide6
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
