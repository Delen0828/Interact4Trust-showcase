# Interact4Trust showcase

A static showcase of the interactive humidity visualizations used in Interact4Trust, with a participant experience demo and independently embeddable charts.

- [Live showcase](https://delen0828.github.io/Interact4Trust-showcase/)
- [Participant experience](https://delen0828.github.io/Interact4Trust-showcase/participant.html)

## Run locally

```sh
python3 -m http.server 8000 --directory showcase
```

Open <http://localhost:8000/>. No build, package installation, backend, or external CDN is needed. The website, chart modules, sample humidity data, and bundled D3 are all in `showcase/`.

## Share or embed a chart

Each chart has **Open chart** and **Share / Embed** controls. The sharing dialog provides its standalone URL and ready-to-copy iframe HTML. Study 2 links preserve the selected uncertainty technique.

```html
<iframe
  src="https://delen0828.github.io/Interact4Trust-showcase/chart.html?condition=21&amp;technique=confidence_interval"
  title="Hover: Show one confidence interval"
  width="400"
  height="300"
  style="border:0;max-width:100%"
  loading="lazy"
></iframe>
```

Standalone pages render the same modules as the gallery, without its headings, cards, or outer padding. Axes, hover effects, deliberately degraded low-PIQ interactions, animation timers, and click controls remain part of the chart. Use a 4:3 frame for the chart; conditions 23 and 24 need a 350px frame height at 400px width to accommodate their checkbox controls.

`chart.html?condition=<number>` supports the 16 gallery conditions: `1, 2, 3, 4, 5, 6, 9, 18, 19, 20, 21, 22, 23, 24, 25, 26`. For conditions 21–26, `technique` accepts `confidence_interval`, `ensemble_plot` (default), or `combined_plot`. Gallery tabs can be linked with `#study1` and `#study2`. Optional `data` / `dataset` parameters select a compatible JSON dataset; sharing preserves those parameters.

## Participant demo

`participant.html` demonstrates a hoverable/clickable confidence interval chart, the four prediction questions, a short illustrative survey, and a response summary. It supports keyboard exploration of the dashed forecasts and validates required answers. Responses exist only in page memory; they are not stored or submitted. The sample survey demonstrates the flow rather than reproducing the research questionnaire.

## Deploy

Set **Settings → Pages → Source → GitHub Actions**. Pushing to `main` runs `.github/workflows/pages.yml`, which publishes only `showcase/` at the Pages site root. The workflow uses GitHub's [static Pages deployment actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

This repository contains only the showcase and deployment configuration. Experiment runners, participant records, analyses, notebooks, paper materials, and the source repository's history are excluded. Bundled D3's license is in `showcase/vendor/D3-LICENSE`.

## Verify

Serve the repository root with `python3 -m http.server 8000` and open <http://localhost:8000/tests/verify.html>. The browser runs 32 checks: every chart and all three Study 2 techniques in real iframes, SVG parity with the gallery, hover/click/animation behavior, absence of gallery headings and outer padding, and invalid URL handling. The verification page is excluded from the deployed site.

The participant flow was also checked through required-answer validation, keyboard forecast exploration, slider movement, survey navigation, response summary, restart, and a 390px phone layout.
