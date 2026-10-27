# Showcase website

Serve this folder over HTTP: `python3 -m http.server 8000 --directory showcase` from the repository root.

- `index.html`: Study 1 and Study 2 condition gallery, with links and iframe snippets for every chart.
- `chart.html?condition=21&technique=confidence_interval`: standalone chart without gallery headings or padding.
- `participant.html`: interactive participant experience and illustrative survey.
- `mfv-trust.html`: minimal two-panel MFV/trust demo. Drag the slider spanning both plots to reveal 1–10 forecasts and matching trust points; starts with two models. The slider also supports arrow keys and Home/End. The MFV shows one blue series with fully opaque forecasts and no aggregate line; the trust curve uses black, with axes labeled “Prediction models” and “Trust.” Fits its iframe, with MFV always on the left.

```html
<iframe src="./mfv-trust.html" title="Multi-model forecasts and trust" width="100%" height="420" style="border:0" loading="lazy"></iframe>
```

The MFV demo reuses bundled D3, `DataProcessor`, `ChartRenderer`, the gallery stylesheet, and City A's history and ten scenarios from the humidity dataset. Trust values in `mfv-trust.js` are illustrative, not study measurements, and flatten around nine models. A larger “Trust” label follows the current point; other text is limited to the trust chart's axis labels and tick values.

All runtime assets are local. See the [repository README](../README.md) for URL parameters and GitHub Pages deployment.
