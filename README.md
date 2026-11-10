# Deck de descanso · CIAT Palmira

Experiencia 3D interactiva (React + TypeScript + Three.js / React Three Fiber) del deck de observación de biodiversidad junto a la laguna del CIAT.

*«Elevar la mirada, conectar la vida.»*

## Ejecutar

Requiere Node.js 20.19+ (probado con Node 24 en Windows y macOS). Desde la carpeta del proyecto:

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite (por defecto http://localhost:5173) en Chrome, Edge o Safari.

> `node_modules` contiene binarios nativos específicos de cada sistema operativo (Vite/rolldown, lightningcss). No lo copies entre equipos: al mover el proyecto a otro computador, borra `node_modules` y vuelve a ejecutar `npm install`.

Compilación de producción: `npm run build` → carpeta `dist/` (`npm run preview` para servirla).

## Controles

| Acción | Control |
| --- | --- |
| Caminar | `W A S D` / flechas (`Shift` más rápido) |
| Mirar | clic para fijar el ratón, o arrastrar |
| Interactuar | `E` o clic sobre el elemento resaltado |
| Salir / levantarse | `ESC` (o `E`) |
| Día / noche | botón DÍA/NOCHE o `N` |
| Vista órbita | botón Órbita o `V` |
| Rueda | arrastrar/clic en cada disco, o `1` `2` `3` |
| Capas de la baranda | arrastrar la manija, o `←` `→` |
| Etiquetas (sentado) | `O` |
| Red de la vida | `B` |

## Narrativa: seis miradas y una red

El recorrido es un cambio progresivo de perspectiva. Cada estación revela una relación y teje un hilo de la **Red de la vida** (agua, vegetación, aves, insectos, luz y tú). Se abre con el botón inferior derecho o con `B`.

| Mirada | Dónde | Qué se descubre | Conexión |
| --- | --- | --- | --- |
| 1. Pausa | letrero del sendero | invitación a mirar de otra manera | — |
| 2. Mirar abajo | bajo la pérgola + control de hora | la luz filtrada como en un dosel; 3 momentos del día | Luz ↔ Vegetación |
| 3. Mirar a través | capas transparentes de la baranda | quién habita dosel, orilla y superficie | Vegetación ↔ Aves, Agua ↔ Aves, Vegetación ↔ Insectos |
| 4. Conectar | rueda de la biodiversidad | 4 relaciones (orilla, refugio, superficie, profundidad) | Agua ↔ Aves/Insectos/Vegetación |
| 5. Contemplar | banca (≈15 s sentado, con indicaciones guiadas) | detenerse también es cuidar | Tú ↔ Agua |
| 6. Elevar la mirada | mirar al techo bajo la pérgola | el techo es un bosque; tú haces parte de la red | Tú ↔ Vegetación |

Al retomar el sendero aparece la **bitácora de observación** con lo descubierto. La hora del día cambia el texto contextual y el ritmo de la fauna (más garzas en vuelo al amanecer y al atardecer). De noche, el texto explica por qué la luz apunta solo al piso.

## Qué incluye

- **Luz solar**: control de hora 06:15–17:45; el sol recorre la trayectoria de Palmira (3,5° N) y las sombras de hojas y aves salen de recortes geométricos reales del techo perforado.
- **Luz artificial (noche)**: proyectores gobo cálidos dirigidos al piso con tres composiciones (Hojas, Aves, Agua), barandas y mural retroiluminados, LEDs bajos en rampa y bancas, luz que no apunta a la laguna ni a los árboles. Se cambian desde el panel o desde la botonera física del deck.
- **Barandas gráficas** con dos capas transparentes deslizantes sobre rieles visibles.
- **Rueda de la biodiversidad**: tres discos (fauna, vegetación, agua); al alinear símbolos iguales se revela la relación ecológica.
- **Bancas**: modo sentado contemplativo con etiquetas de observación opcionales y ambiente sonoro más presente.
- **Recorrido sugerido** de 6 pasos (se marcan solos), tour guiado y mensaje final al retomar el sendero.
- Sonido ambiente procedural (aves, viento, agua, grillos y ranas de noche) sin archivos externos.

## Versión construible (adultos mayores, a nivel del suelo)

El deck es el descanso antes de la torre de avistamiento. Todo lo que el visitante lee o toca existe físicamente, sin pantallas:

- **Pasaporte de calcos**: seis placas de bronce en relieve (Luz, Vegetación, Aves, Insectos, Agua, Tú) entre 0,75 y 1,1 m. Cada calco llena un nodo de la red impresa en el pasaporte de papel; una conexión aparece cuando sus dos nodos están calcados.
- **Reloj de luz**: un óculo de 14 cm en el techo proyecta un punto de sol que recorre marcas de bronce (10–14 h) en el piso, frente a las bancas (calibrado con la orientación real del sitio).
- **Bancas** con espaldar y apoyabrazos, espacio de 0,9 m entre ellas para silla de ruedas, frente a una **baranda de vidrio con puntos anticolisión para aves** (pasamanos a 1,0 m) y una **guía panorámica** sobre el pasamanos.
- **Banca del mural**, en diagonal hacia la laguna, para conversar.
- **Espejo del dosel** en el centro: una mesa-espejo a 0,78 m que refleja el techo perforado. «Elevar la mirada» sin levantar la cabeza; el visitante se ve a sí mismo dentro del bosque (placa «Tú»).
- **Capas deslizantes** entre 0,85 y 1,45 m (altura de ojos sentado o en silla de ruedas), con las tres paradas impresas en el riel; en esos tramos la baranda es de vidrio hasta 1,47 m, sin pasamanos que cruce la capa.
- **Rueda** con tres discos en fila a 1,05 m; al alinear tres símbolos sube una compuerta de madera y revela la relación impresa.
- **Maqueta táctil** («lo que se ve desde la torre») y **binoculares fijos** a 1,18 m para quien no sube a la torre. La posición de la torre en la maqueta es referencial (`TOWER` en `src/lib/layout.ts`).
- **Proyectores nocturnos**: tres proyectores LED con gobo colgados 10 cm bajo la viga central (x = 0), a ≈2,4 m del piso, apuntando solo al piso: frente a las bancas, zona de las capas y llegada. La botonera de la llegada cambia la composición (Hojas / Aves / Agua).

Zonas: **oeste** descanso (bancas), **este** actividad (capas, maqueta, binoculares, rueda), **centro** espejo, **sur** llegada y botonera.

El control de hora del panel es solo una simulación para la presentación; en sitio, la hora la marca el reloj de luz.

## Exportar a Blender

Con `npm run dev` abierto en el navegador, en la consola: `__exportOBJ()`. Escribe `export/deck_ciat.obj`, `deck_ciat.mtl` y `export/textures/` (gráficas como PNG). Coordenadas en metros, eje Y arriba. Solo el deck (sin terreno ni vegetación); cada pieza es un objeto con nombre (bancas, rueda, placas, techo…). La geometría arquitectónica sale en quads; el techo perforado conserva triángulos alrededor de los recortes.

## Estructura

- `src/lib/` — layout arquitectónico, formas recortadas (`shapes.ts`), texturas procedurales, terreno, colisiones, audio.
- `src/scene/` — entorno, deck, techo perforado, interactivos, vegetación, fauna, cámara/controles.
- `src/ui/HUD.tsx` — interfaz en español.

La calidad de render se ajusta sola (resolución adaptativa) según el rendimiento de la GPU.

## Torre de observación

Al sur del deck, al final del sendero de tablones. Tres niveles (≈10 m) con rampa 1:12 y escaleras de 18 peldaños por tramo; se suben caminando. Datos y superficies en `src/lib/tower.ts`, modelo en `src/scene/Tower.tsx`.

- **Nivel 1 · Descubrir** (+0,45 m, accesible por rampa): terraza de sombras con tres paneles perforados que giran sobre un eje con manija; de noche, un proyector LED detrás de cada panel. Muro ilustrado «Cada sombra revela una forma de vida.» y muro de salida «Elevar la mirada, conectar la vida.».
- **Nivel 2 · Conectar** (+3,75 m): muro de relaciones con cinco capas transparentes (vegetación, agua, ganado, insectos, aves) que se deslizan dentro de un marco; con tres capas correctas se completa la frase de la relación. Se maneja desde los dos lados.
- **Nivel 3 · Elevar** (+7,05 m): anamorfosis de nueve láminas que forman una imagen solo desde el punto marcado en el piso; visor giratorio que nombra lo que señala; guía de orientación en la baranda norte; banca bajo cubierta parcial perforada.

## Ubicación real (plano DWG del CIAT)

`CIAT PLANTAAA.dwg` (capas TPX, metros) se convirtió con LibreDWG (WASM) a `src/data/ciatContext.json`: vías, 183 edificios con su altura, árboles individuales, zonas verdes y cuerpos de agua, ya en coordenadas de la escena. Scripts en `tools/` (`dwg-read.mjs` lee el DWG, `dwg-to-context.mjs` lo transforma; requieren `npm i @mlightcad/libredwg-web` en una carpeta aparte).

- Ubicación: la manzana al oriente de los dos edificios cuadrados grandes del plano. Laguna, deck, torre y sendero de entrada siguen la vista marcada por el usuario: laguna amplia de ~64 × 46 m, deck en su borde norte, torre ~20 m más allá, y el túnel de guadua de ~75 m que arranca sobre la vía sur (conectado al camino principal) y corre por el costado de la laguna hasta el deck. Al otro lado del túnel, todo el potrero hasta el borde del terreno es el corral de las vacas (~70 × 66 m, solo cercas, 14 vacas). El sol sale por el oriente real.
- Contexto en el estilo del proyecto: los árboles del plano usan el mismo modelo de árbol de la escena (hasta 600 m), los edificios siguen huellas y alturas del plano con fachada crema, zócalo de madera y antepecho verde.
- `export/ubicacion_en_plano_DWG.svg` muestra el deck, la torre, el túnel y la laguna dibujados sobre el plano.

## Señalética oficial

Las piezas de `sostenibilidad señaletica/` se copiaron a `src/assets/senaletica/` y se cargan tal cual (`src/lib/signage.ts`), con los paneles a la proporción de cada arte:

| Pieza | Dónde está |
| --- | --- |
| Mupi «entrada sendero» | tótem en la entrada del túnel, junto a la vía |
| Paneles de aves (silueta + «Conócela»): urutau y garza blanca | caras de los dos prismas giratorios del túnel |
| Horizontal «Establo de vacas» | tablero frente a las ventanas del corral, dentro del túnel |
| Horizontal «Deck» / «Torre» | letrero de llegada al deck (frente) / al salir hacia la torre (reverso) |
| Discos 1–3, «Biodiversidad», «¿Qué relación tienen?» | rueda de la biodiversidad: discos, título y franja de instrucciones |
| Niveles 1–3 | torre: tótem del nivel 1 y letreros en el arranque de cada escalera |

| Horizontal «Túnel» | sobre el pórtico de entrada del túnel, hacia la vía |
| Horizontal «Laguna» | donde el túnel se abre a la laguna, del lado de la laguna |
| Horizontal «Regreso» | al pie de la rampa de la torre, para quien baja |
| Íconos de lugares | postes: Túnel (junto al pórtico), Establo (esquina del corral junto a la entrada), Laguna (orilla), Deck + Torre (cruce al final de las gradas) |
| Silueta «extruir pato» (LAGUNA) | recorte flotando en la laguna frente al deck |
| Silueta «extruir garza» (Regreso) | recorte de pie en el cruce deck / torre |
| Siluetas urutau y garza | recortadas en el techo del túnel sobre cada prisma: su sombra dibuja el ave en los tablones («¿Quién proyecta esta silueta?») |

En los recortes con texto, la fuente Sora se reemplaza por una sans-serif común al imprimir la cara.
