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
| 2. Mirar abajo | bajo el techo de madera calada + control de hora | la luz filtrada como en un dosel; 3 momentos del día | Luz ↔ Vegetación |
| 3. Mirar a través | capas transparentes de la baranda | quién habita dosel, orilla y superficie | Vegetación ↔ Aves, Agua ↔ Aves, Vegetación ↔ Insectos |
| 4. Conectar | rueda de la biodiversidad | 4 relaciones (orilla, refugio, superficie, profundidad) | Agua ↔ Aves/Insectos/Vegetación |
| 5. Contemplar | banca (≈15 s sentado, con indicaciones guiadas) | detenerse también es cuidar | Tú ↔ Agua |
| 6. Elevar la mirada | maqueta del centro | la laguna vista desde arriba; tú haces parte de la red | Tú ↔ Vegetación |

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

El deck es el final del sendero. Todo lo que el visitante lee o toca existe físicamente, sin pantallas:

- **Pasaporte de calcos**: seis placas de bronce en relieve (Luz, Vegetación, Aves, Insectos, Agua, Tú) entre 0,75 y 1,1 m. Cada calco llena un nodo de la red impresa en el pasaporte de papel; una conexión aparece cuando sus dos nodos están calcados.
- **Maqueta táctil en el centro** («la laguna desde arriba»): mesa de 1,4 × 1,0 m a 0,8 m, libre por debajo para usarla sentado o en silla de ruedas desde cualquier lado. Es la estación «Elevar la mirada» y lleva la placa «Tú» en su borde sur.
- **Tres bancas** con espaldar y apoyabrazos alrededor de la maqueta, mirándola (oeste, este y sur), en U simétrica abierta hacia la laguna; 1,2 m libres entre cada banca y la mesa. Barandas de **varas de guadua** (separación menor a 10 cm, pasamanos de madera a 1,0 m) con **guía panorámica** sobre el pasamanos.
- **Capas deslizantes** entre 0,85 y 1,45 m (altura de ojos sentado o en silla de ruedas), con las tres paradas impresas en el riel; en esos tramos las varas de guadua llegan a 0,85 m y la franja de 0,85 a 1,47 m es un vidrio claro con puntos anti-aves enmarcado en guadua (el único vidrio del deck), sin pasamanos ni postes que crucen la capa.
- **Rueda** con tres discos en fila a 1,05 m; al alinear tres símbolos sube una compuerta de madera y revela la relación impresa.
- **Binoculares fijos** a 1,18 m en la esquina noreste.
- **Proyectores nocturnos**: tres proyectores LED con gobo colgados 10 cm bajo la viga central (x = 0), a ≈2,4 m del piso, apuntando solo al piso: frente a las bancas, zona de las capas y llegada. La botonera de la llegada cambia la composición (Hojas / Aves / Agua).

Zonas: **centro** la maqueta, rodeada por la zona de descanso (bancas); en el borde, las capas de la baranda, los binoculares (noreste) y la rueda (sureste); **sur** llegada y botonera.

El control de hora del panel es solo una simulación para la presentación.

## Materiales

El deck usa los mismos materiales que el sendero: columnas de tres guaduas sobre dados de concreto, vigas dobles de guadua, barandas de varas de guadua con pasamanos de madera y un techo de tableros de madera calada (sin aluminio ni policarbonato; el único vidrio es la franja detrás de las capas deslizantes). La sombra la dan los recortes del techo y los árboles.

La salida del sendero tiene el mismo ancho del túnel (3 m): unas gradas bajas suben la loma hasta un descanso de tablones al pie de la rampa del deck.

## Exportar a Blender

Con `npm run dev` abierto en el navegador, en la consola: `__exportOBJ()`. Escribe `export/deck_ciat.obj`, `deck_ciat.mtl` y `export/textures/` (gráficas como PNG). Coordenadas en metros, eje Y arriba. Solo el deck (sin terreno ni vegetación); cada pieza es un objeto con nombre (bancas, rueda, placas, techo…). La geometría arquitectónica sale en quads; el techo perforado conserva triángulos alrededor de los recortes.

## Estructura

- `src/lib/` — layout arquitectónico, formas recortadas (`shapes.ts`), texturas procedurales, terreno, colisiones, audio.
- `src/scene/` — entorno, deck, techo perforado, interactivos, vegetación, fauna, cámara/controles.
- `src/ui/HUD.tsx` — interfaz en español.

La calidad de render se ajusta sola (resolución adaptativa) según el rendimiento de la GPU.

## Ubicación real (plano DWG del CIAT)

`CIAT PLANTAAA.dwg` (capas TPX, metros) se convirtió con LibreDWG (WASM) a `src/data/ciatContext.json`: vías, 183 edificios con su altura, árboles individuales, zonas verdes y cuerpos de agua, ya en coordenadas de la escena. Scripts en `tools/` (`dwg-read.mjs` lee el DWG, `dwg-to-context.mjs` lo transforma; requieren `npm i @mlightcad/libredwg-web` en una carpeta aparte).

- Ubicación: la manzana al oriente de los dos edificios cuadrados grandes del plano. Laguna, deck y sendero de entrada siguen la vista marcada por el usuario: laguna amplia de ~64 × 46 m, deck en su borde norte y el túnel de guadua de ~75 m que arranca sobre la vía sur (conectado al camino principal) y corre por el costado de la laguna hasta el deck. Al otro lado del túnel, todo el potrero hasta el borde del terreno es el corral de las vacas (~70 × 66 m, solo cercas, 14 vacas). El sol sale por el oriente real.
- Contexto en el estilo del proyecto: los árboles del plano usan el mismo modelo de árbol de la escena (hasta 600 m), los edificios siguen huellas y alturas del plano con fachada crema, zócalo de madera y antepecho verde.
- `export/ubicacion_en_plano_DWG.svg` muestra el deck, el túnel y la laguna dibujados sobre el plano (aún incluye la torre retirada).

## Señalética oficial

Las piezas de `sostenibilidad señaletica/` se copiaron a `src/assets/senaletica/` y se cargan tal cual (`src/lib/signage.ts`), con los paneles a la proporción de cada arte:

| Pieza | Dónde está |
| --- | --- |
| Mupi «entrada sendero» | tótem en la entrada del túnel, junto a la vía |
| Paneles de aves (silueta + «Conócela»): urutau y garza blanca | caras de los dos prismas giratorios del túnel |
| Horizontal «Establo de vacas» | tablero frente a las ventanas del corral, dentro del túnel |
| Horizontal «Deck» / «Regreso» | letrero de llegada al deck (frente) / al salir del deck (reverso) |
| Discos 1–3, «Biodiversidad», «¿Qué relación tienen?» | rueda de la biodiversidad: discos, título y franja de instrucciones |

| Horizontal «Túnel» | sobre el pórtico de entrada del túnel, hacia la vía |
| Horizontal «Laguna» | donde el túnel se abre a la laguna, del lado de la laguna |
| Horizontal «Regreso» | al pie de la rampa del deck, para quien sale |
| Íconos de lugares | postes: Túnel (junto al pórtico), Establo (esquina del corral junto a la entrada), Laguna (orilla), Deck (cruce al final de las gradas) |
| Animales recortados (`Señaletica con animales`) | focha «Túnel filtros de luz» junto al pórtico; vaca «Establo» en la esquina del corral; pato «Laguna» flotando frente al deck; urutau «Deck» al inicio de las gradas; garza «Regreso» junto a las gradas, paralela a ellas para que su flecha apunte al túnel |
| Ventanas hacia el corral | marcos para fotos («Recuerda este momento») alrededor de cada ventana |
| Prismas giratorios | tapas redondas y aristas redondeadas (sin puntas); dentro, la escultura del ave en madera pintada |
| Niveles 1–3 del DECK | copiados como `nivel_1..3.png`, todavía sin ubicar |
| Siluetas urutau y garza | recortadas en el techo del túnel sobre cada prisma: su sombra dibuja el ave en los tablones («¿Quién proyecta esta silueta?») |

En los recortes con texto, la fuente Sora se reemplaza por una sans-serif común al imprimir la cara.
