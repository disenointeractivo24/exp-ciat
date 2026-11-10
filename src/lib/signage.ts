// The project's official signage ("sostenibilidad señaletica" folder), used as-is on the physical signs of the
// experience. Files are copied to src/assets/senaletica with plain names; each one is loaded once.
import * as THREE from 'three';
import entrada from '../assets/senaletica/entrada_sendero.jpg';
import hDeck from '../assets/senaletica/h_deck.jpg';
import hTorre from '../assets/senaletica/h_torre.jpg';
import hEstablo from '../assets/senaletica/h_establo.jpg';
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
import hLaguna from '../assets/senaletica/h_laguna.jpg';
import hTunel from '../assets/senaletica/h_tunel.jpg';
import hRegreso from '../assets/senaletica/h_regreso.jpg';
import icDeck from '../assets/senaletica/icono_deck.jpg';
import icEstablo from '../assets/senaletica/icono_establo.jpg';
import icLaguna from '../assets/senaletica/icono_laguna.jpg';
import icTorre from '../assets/senaletica/icono_torre.jpg';
import icTunel from '../assets/senaletica/icono_tunel.jpg';
import svgGarza from '../assets/senaletica/extruir_garza.svg';
import svgPato from '../assets/senaletica/extruir_pato.svg';
import svgSilGarza from '../assets/senaletica/silueta_garza.svg';
import svgSilUrutau from '../assets/senaletica/silueta_urutau.svg';

export const SIGNAGE = {
  entrada, hDeck, hTorre, hEstablo, hLaguna, hTunel, hRegreso,
  iconos: { deck: icDeck, establo: icEstablo, laguna: icLaguna, torre: icTorre, tunel: icTunel },
  svg: { garza: svgGarza, pato: svgPato, siluetaGarza: svgSilGarza, siluetaUrutau: svgSilUrutau },
  discos: [disco1, disco2, disco3],
  senalBio, senalPregunta,
  niveles: [nivel1, nivel2, nivel3],
  aves: [{ sil: silUrutau, info: infoUrutau }, { sil: silGarza, info: infoGarza }],
};

/** Pixel aspect (width / height) of each piece, so the physical panels keep the artwork's proportions. */
export const ASPECT = { entrada: 1184 / 2692, horizontal: 1247 / 663, strip: 3242 / 785, nivel: 1, ave: 401 / 701 };

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
