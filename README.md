# malukenho

Página pessoal do Jefersson Nathan: um lugar em miniatura, uma linha do tempo e o céu da hora em que você abre o site.

Os lugares publicados são a Onze-Lieve-Vrouw Onbevlekt Ontvangenkerk, em Ospel, datada de 20 de setembro de 2026, a Avonturenboerderij Molenwaard, em Groot-Ammers, datada de 3 de outubro de 2026, e o Alexa Centre, em Berlim, datado de 22 de outubro de 2026. A página inicial é o lugar com a data mais recente, por isso o Alexa Centre continua em destaque. Molenwaard entra só com cartazes de dia e de noite, sem modelo. Um toque na imagem abre a linha do tempo; Escape volta à página.

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

`category` pode ser `rua`, `interior`, `verde` ou `marco`. `seen` entra na frase (“visto por último …”). `lat` / `lng` posicionam o pino no mapa; use um ponto público, não um endereço de casa. `with` é opcional e bilingue (`{ "pt": "…", "en": "…" }`). Quando existe, aparece só no cartão da linha do tempo. Uma cena só de cartazes pode omitir `model` e `modelNight`. O hero e a linha do tempo usam `posterNight` e não carregam 3D.

O script `node scripts/build-scenes.mjs` **recria as amostras e reescreve** `scenes.json`. Não o rode depois de acrescentar cenas suas, a menos que queira gerar as amostras de novo.

## Correr localmente

Qualquer servidor estático na raiz do repositório. GitHub Pages publica esta pasta (`index.html`) com o ficheiro `.nojekyll`.

```bash
python3 -m http.server 4173
```

A página abre em inglês. O som não tem mute nem escolha de tema: o primeiro toque ou tecla destrava o áudio Airy e ele permanece ligado. O relógio no canto inferior direito mostra a hora local atual; o céu usa uma hora fixa (efeito visual). Um toque no modelo abre a linha do tempo; Escape volta à página. `#timeline` e `#map` abrem essas vistas.

A igreja de Ospel (`church-day.glb` / `church-night.glb`) e o Alexa Centre (`alexa-day.glb` / `alexa-night.glb`) trocam com o céu. Os ficheiros são miniaturas de barro comprimidas com meshopt; de noite as janelas já vêm acesas na textura.

## English

Personal page for Jefersson Nathan: a miniature place, a timeline, and a sky gradient fixed to a single time of day for the visuals. The clock in the bottom-right shows your current local time. The page loads in English. Sound has no mute control and no theme picker; the first gesture unlocks Airy and it stays on. Published places are Onze-Lieve-Vrouw Onbevlekt Ontvangenkerk in Ospel, dated 20 September 2026, and the Alexa Centre in Berlin, dated 22 October 2026, each with a day model and a night model, plus Avonturenboerderij Molenwaard in Groot-Ammers, dated 3 October 2026, which is stills only (day and night posters, no model). The homepage is the newest date, so the Alexa Centre stays current. Clicking the image opens the timeline; Escape returns to the page. The day and night models are compressed clay miniatures (meshopt, WebP), and the night textures already have glowing windows. The hero and timeline show `posterNight` and do not load 3D. An optional bilingual `with` field shows on the timeline card only. Add another by dropping a `.glb` plus a poster and an entry in `assets/data/scenes.json`, as above, or omit `model` and `modelNight` for a stills-only scene. `node scripts/build-scenes.mjs` regenerates the samples and overwrites that file.
