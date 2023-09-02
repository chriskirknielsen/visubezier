# VisuBezier

Provides a preview when hovering CSS easing functions in [VS Code](https://github.com/Microsoft/vscode).

## Features

Hover over any CSS easing function to get a preview of the animation, comparing it to a `linear` easing (default).

![Hover to preview](https://raw.githubusercontent.com/chriskirknielsen/visubezier/master/preview.gif)

## Extension Settings

This extension has a few settings:

-   `visubezier.defaulteasingfunction`: Override the default comparison easing function with any valid easing function expressed as a keyword or a `cubic-bezier()` function (default: `linear`).
-   `visubezier.defaultduration`: Override the duration of the animation with any valid duration expressed as `0.5s` or `500ms` (default: `1s`).
-   `visubezier.defaultbackground`: Override the background color for the preview area (default: `#2d2d30`).
-   `visubezier.defaultcolor`: Override the foreground color for the preview elements (default: `#d7d7d7`).
-   `visubezier.defaultlanguages`: Override the list of languages for which you want to activate the preview. (default: `["css","sass","scss","less","postcss","stylus","xml","svg"]`).

## Post-Install Sample

Paste this sample into VS Code after installing to see it in action:

```css
button {
	transition-timing-function: ease;
	transition-timing-function: ease-in;
	transition-timing-function: ease-out;
	transition-timing-function: ease-in-out;
	transition-timing-function: cubic-bezier(0.4, -0.2, 0.42, 1.2);
	transition-timing-function: steps(7);
	transition-timing-function: steps(5, jump-none);
	transition-timing-function: steps(8, jump-both);
	transition-timing-function: steps(4, jump-start);
	transition-timing-function: steps(2, jump-end);
	transition-timing-function: step-start;
	transition-timing-function: step-end;
	transition-timing-function: linear(0, 0.25 25% 75%, 1);
	transition-timing-function: linear(0, 0.063, 0.25, 0.563, 1 36.4%, 0.812, 0.75, 0.813, 1 72.7%, 0.953, 0.938, 0.953, 1 90.9%, 0.984, 1 100% 100%);
	transition-timing-function: ease, steps(3), cubic-bezier(1, 0, 0, 1), linear(0 0%, -0.25, 1.25, 1 100%);
}
```

## Known Issues

-   Easing functions (e.g. `cubic-bezier(...)` and `linear(...)`) containing any values other than numbers are currently ignored (e.g. `calc()` or `var()`).
-   Points with negative values can cause the animation to fall out of the preview area.
-   `linear()` easing function animation preview falls back to rendering as a classic `ease` easing due to VS Code's internal rendering engine not handling the function notation (as of 2023-09-02).

## Release Notes

### 1.6.1

-   Fixed parsing of `linear()` with negative values, and rendering of `linear()` with a value greater than `1` which was previously clamped to `1`.

### 1.6.0

-   Added support for [`linear()` syntax](https://jakearchibald.github.io/csswg-drafts/css-easing-2/Overview.html#the-linear-easing-function). Animation preview is not yet implemented in VS Code, but the SVG graph is correctly depicted (based on my interpretation of the spec, which I hope to be correct).
-   Added a licence file.
-   Updated the underlying VS Code Extension required files to run with more modern code (Node 18, TypeScript 5, VS Code 1.76+, and other things I hardly understand).
-   Updated the extension's package to patch vulnerabilities.

### 1.5.0

-   Added a `defaultlanguages` configuration option to only run the extension in relevant languages, overridable by the user if needed. (thanks to [@robole](https://github.com/robole) for the suggestion and to [tjx666](https://github.com/tjx666) for the example file!).
-   Patched a few package vulnerabilities.

### 1.4.0

-   Added support for `steps()` and `step-start`/`step-end` syntax.
-   Changed solid underline to a dotted underline.
-   Updated comments/typings.

### 1.3.5

-   Patch the security vulnerabilities for `url-parse`.

### 1.3.4

-   Added an icon before the timing functions that can be previewed. Updated the ignored files.

### 1.3.2

-   Fixed the `ease` mapping and allow to detect more than one function per declaration.

### 1.3.1

-   Patch the security vulnerabilities for `minimist`.

### 1.3.0

-   Fixed some greed in the detection regular expression.

### 1.2.0

-   Updated icon and extension name
-   Patch the security vulnerabilities for `braces`, `js-yaml` and `fstream`.

### 1.1.2

-   Patch the security vulnerabilities for `tar` and `node.extend`.

### 1.1.1

-   Change the detection RegExp to be less greedy and not output false positives.

### 1.1.0

-   Add a preview of the Bézier curve next to the animation.

### 1.0.0

-   Initial release of VisuBezier. 🤘
