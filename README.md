# La tecnología es la sociedad por otros medios

Sitio de declaración pública y registro de opiniones frente a la definición de líneas prioritarias de ANID que excluye a las Ciencias Sociales, las Humanidades y las Artes.

Es un sitio estático de **un solo archivo** (`index.html`), sin dependencias ni proceso de compilación. Las opiniones y adhesiones se almacenan en una base de datos Supabase, por lo que son visibles desde cualquier navegador.

## Publicación con GitHub Pages

1. Crea un repositorio (público) y sube `index.html` a la raíz.
2. En el repositorio: **Settings → Pages**.
3. En *Build and deployment*, elige **Deploy from a branch**, rama `main`, carpeta `/ (root)` y guarda.
4. En uno o dos minutos el sitio quedará disponible en `https://<usuario>.github.io/<repositorio>/`.

Cada vez que edites `index.html` y hagas *commit*, el sitio se actualiza solo.

## Base de datos

- La conexión está configurada al inicio del bloque `<script>` de `index.html`:
  - `SUPA_URL`: URL del proyecto Supabase.
  - `SUPA_KEY`: clave pública (*anon key*). Es segura de publicar; solo permite leer y agregar registros.
- Las tablas son `opiniones` y `firmas`, con RLS activado: cualquier visitante puede **leer e insertar**, nadie puede editar ni borrar desde el sitio.
- Para moderar o exportar registros: panel de Supabase → *Table Editor*.
- Si la conexión falla, el sitio lo indica con un aviso y sigue funcionando en modo local (solo ese navegador).

## Estructura del sitio

Declaración (original y espacio reservado para la versión final) · Contexto con el Anexo 4 íntegro (áreas prioritarias) · Registro y muro de opiniones · Diagrama de participación por disciplina y universidad · Firmantes · Preguntas frecuentes · Contacto.

Contacto: viceinvestigacionfahu@usach.cl
