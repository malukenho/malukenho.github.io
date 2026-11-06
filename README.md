# malukenho

Página pessoal do Jefersson Nathan: um lugar em miniatura, uma linha do tempo e o céu da hora em que você abre o site.

As cenas de exemplo são dioramas originais (Helmond, interiores genéricos). Não são fotografias nem modelos de outra pessoa. Quando uma cena tiver `sample: true`, a interface marca **amostra**.

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

O som começa mudo. O relógio abre um controle da hora do céu. `#timeline` e `#map` abrem essas vistas.

## English

Personal page for Jefersson Nathan: a miniature place, a timeline, and a sky that follows the time of day. Sample scenes are original dioramas. Add a real one by dropping a `.glb` plus a poster and an entry in `assets/data/scenes.json`, as above. `node scripts/build-scenes.mjs` regenerates the samples and overwrites that file.
