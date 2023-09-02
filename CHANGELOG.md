# Changelog

All notable changes to VisuBezier will be documented in this file.

### 1.6.1 - 2023-09-02

-   Fixed parsing of `linear()` with negative values, and rendering of `linear()` with a value greater than `1` which was previously clamped to `1`.

### 1.6.0 - 2023-03-19

-   Added support for [`linear()` syntax](https://jakearchibald.github.io/csswg-drafts/css-easing-2/Overview.html#the-linear-easing-function) easing functions. Animation preview is not yet implemented in VS Code, but the SVG graph is correctly depicted (based on my interpretation of the spec, which I hope to be correct).
-   Added a licence file.
-   Updated the underlying VS Code Extension required files to run with more modern code (Node 18, TypeScript 5, VS Code 1.76+, and other things I hardly understand).
-   Updated the extension's package to patch vulnerabilities.

### [1.5.0] - 2022-12-01

### Added

-   Added a `defaultlanguages` configuration option to only run the extension in relevant languages, overridable by the user if needed. (thanks to [@robole](https://github.com/robole) for the suggestion and to [tjx666](https://github.com/tjx666) for the example file!).

### Changed

-   Patched a few package vulnerabilities.
-   Cleaned up the extension's codebase to a small extent.

## [1.4.0] - 2021-05-20

### Added

-   Support for `steps()` and `step-start`/`step-end` syntax.

### Changed

-   Solid underline changed to a dotted underline.
-   Comments/typings updated.

## [1.3.5] - 2021-05-03

### Changed

-   Patch the security vulnerabilities for `url-parse`.

## [1.3.4] - 2020-07-27

### Added

-   Added an icon before the timing functions that can be previewed.

## [1.3.2] - 2020-07-27

### Changed

-   Fixed the `ease` mapping and allow to detect more than one function per declaration.

## [1.3.1] - 2020-05-02

### Changed

-   Patch the security vulnerabilities for `minimist`.

## [1.3.0] - 2020-05-02

### Changed

-   Fixed some greed in the detection regular expression.

## [1.2.0] - 2020-02-17

### Changed

-   Updated icon
-   Updated extension name
-   Patch the security vulnerabilities for `braces`, `js-yaml` and `fstream`.

## [1.1.2] - 2019-05-03

### Changed

-   Patch the security vulnerabilities for `tar` and `node.extend`.

## [1.1.1] - 2018-09-15

### Changed

-   Improve the regular expression to be less greedy and not detect words like "release".

## [1.1.0] - 2018-09-07

### Added

-   Add a preview of the Bézier curve next to the animation.
-   Add options to customize the foreground and background colors of the animation preview.

### Changed

-   Improve the readability of the SVG markup by separating the values into variables.
-   Change the styling of preview-capable functions from `cursor: crosshair` to `text-decoration: underline`.
