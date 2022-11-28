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
	transition-timing-function: ease, steps(3), cubic-bezier(1, 0, 0, 1);
}
```

## Known Issues

-   `cubic-bezier` containing any values other than pure numbers are currently ignored (e.g. `calc()` or `var()`).
-   Points with negative values can cause the animation to fall out of the preview area.

## Release Notes

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
