// The project's official signage ("sostenibilidad señaletica" folder), used as-is on the physical signs of the
// experience. Files are copied to src/assets/senaletica with plain names; each one is loaded once.
import * as THREE from 'three';
import entrada from '../assets/senaletica/entrada_sendero.png';
import hDeck from '../assets/senaletica/h_deck.png';
import hEstablo from '../assets/senaletica/h_establo.png';
import disco1 from '../assets/senaletica/disco_1.png';
import disco2 from '../assets/senaletica/disco_2.png';
import disco3 from '../assets/senaletica/disco_3.png';
import senalBio from '../assets/senaletica/senal_biodiversidad.png';
import senalPregunta from '../assets/senaletica/senal_pregunta.png';
import nivel1 from '../assets/senaletica/nivel_1.png';
import nivel2 from '../assets/senaletica/nivel_2.png';
import nivel3 from '../assets/senaletica/nivel_3.png';
import silUrutau from '../assets/senaletica/ave_silueta_urutau.png';
import infoUrutau from '../assets/senaletica/ave_info_urutau.png';
import silGarza from '../assets/senaletica/ave_silueta_garza.png';
import infoGarza from '../assets/senaletica/ave_info_garza.png';
import hLaguna from '../assets/senaletica/h_laguna.png';
import hTunel from '../assets/senaletica/h_tunel.png';
import hRegreso from '../assets/senaletica/h_regreso.png';
import icDeck from '../assets/senaletica/icono_deck.png';
import icEstablo from '../assets/senaletica/icono_establo.png';
import icLaguna from '../assets/senaletica/icono_laguna.png';
import icTunel from '../assets/senaletica/icono_tunel.png';
import anFulica from '../assets/senaletica/animal_fulica_tunel.png';
import anGarza from '../assets/senaletica/animal_garza_regreso.png';
import anPato from '../assets/senaletica/animal_pato_laguna.png';
import anUrutau from '../assets/senaletica/animal_urutau_deck.png';
import anVaca from '../assets/senaletica/animal_vaca_establo.png';
import svgSilGarza from '../assets/senaletica/silueta_garza.svg';
import svgSilUrutau from '../assets/senaletica/silueta_urutau.svg';

export const SIGNAGE = {
  entrada, hDeck, hEstablo, hLaguna, hTunel, hRegreso,
  iconos: { deck: icDeck, establo: icEstablo, laguna: icLaguna, tunel: icTunel },
  svg: { siluetaGarza: svgSilGarza, siluetaUrutau: svgSilUrutau },
  /** Wayfinding cut-outs (animal silhouettes with the place name and an arrow), with their pixel aspect. */
  animales: {
    fulica: { url: anFulica, aspect: 1118 / 1016 },
    garza: { url: anGarza, aspect: 1434 / 1696 },
    pato: { url: anPato, aspect: 1124 / 405 },
    urutau: { url: anUrutau, aspect: 900 / 1362 },
    vaca: { url: anVaca, aspect: 1746 / 1052 },
  },
  discos: [disco1, disco2, disco3],
  senalBio, senalPregunta,
  niveles: [nivel1, nivel2, nivel3],
  aves: [{ sil: silUrutau, info: infoUrutau }, { sil: silGarza, info: infoGarza }],
};

/** Pixel aspect (width / height) of each piece, so the physical panels keep the artwork's proportions. */
export const ASPECT = { entrada: 1188 / 2781, horizontal: 1249 / 668, strip: 3242 / 785, nivel: 1, ave: 834 / 1460 };

const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();
export function signTex(url: string) {
  let t = cache.get(url);
  if (!t) {
    t = loader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    cache.set(url, t);
  }
  return t;
}
