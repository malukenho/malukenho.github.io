# malukenho

Página pessoal do Jefersson Nathan: um lugar em miniatura, uma linha do tempo e o céu da hora em que você abre o site.

O único lugar publicado é a Onze-Lieve-Vrouw Onbevlekt Ontvangenkerk, em Ospel, datada de 20 de setembro de 2026. Um toque no modelo abre a linha do tempo; Escape volta à página.

## Acrescentar uma cena

1. Exporte um `.glb` em metros, com a frente virada para **+Z** e a base em **Y = 0**. Guarde em `assets/models/`.
2. Grave um cartaz PNG transparente do mesmo enquadramento em `assets/posters/`. O cartaz aparece na linha do tempo e enquanto o modelo carrega.
3. Acrescente um objeto em `assets/data/scenes.json` (a cena mais recente fica na página inicial):

```json
{
  "id": "2026-12-01-exemplo",
  "date": "2026-12-01",
  "model": "assets/models/exemplo.glb",
  "poster": "assets/posters/exemplo.png",
  "cameraOrbit": "32deg 80deg auto",
  "cameraTarget": "auto auto auto",
  "fieldOfView": "12deg",
  "lat": 51.479,
  "lng": 5.657,
  "category": "rua",
  "sample": false,
  "name": { "pt": "Nome", "en": "Name" },
  "seen": { "pt": "no Nome", "en": "the Name" },
  "where": { "pt": "Helmond", "en": "Helmond" }
}
```

`category` pode ser `rua`, `interior`, `verde` ou `marco`. `seen` entra na frase (“visto por último …”). `lat` / `lng` posicionam o pino no mapa; use um ponto público, não um endereço de casa.

O script `node scripts/build-scenes.mjs` **recria as amostras e reescreve** `scenes.json`. Não o rode depois de acrescentar cenas suas, a menos que queira gerar as amostras de novo.

## Correr localmente

Qualquer servidor estático na raiz do repositório. GitHub Pages publica esta pasta (`index.html`) com o ficheiro `.nojekyll`.

```bash
python3 -m http.server 4173
```

A página abre em inglês. O som não tem mute nem escolha de tema: o primeiro toque ou tecla destrava o áudio Airy e ele permanece ligado. O relógio só muda a hora do céu. Um toque no modelo abre a linha do tempo; Escape volta à página. `#timeline` e `#map` abrem essas vistas.

A igreja de Ospel (`church-day.glb` / `church-night.glb`) troca com o céu. Os dois ficheiros são miniaturas de barro comprimidas com meshopt; de noite as janelas já vêm acesas na textura.

## English

Personal page for Jefersson Nathan: a miniature place, a timeline, and a sky that follows the time of day. The page loads in English. Sound has no mute control and no theme picker; the first gesture unlocks Airy and it stays on. The only published place is Onze-Lieve-Vrouw Onbevlekt Ontvangenkerk in Ospel, dated 20 September 2026, with a day model and a night model. Clicking the model opens the timeline; Escape returns to the page. The day and night churches are compressed clay miniatures (meshopt, WebP), and the night texture already has glowing windows. Add another by dropping a `.glb` plus a poster and an entry in `assets/data/scenes.json`, as above. `node scripts/build-scenes.mjs` regenerates the samples and overwrites that file.
