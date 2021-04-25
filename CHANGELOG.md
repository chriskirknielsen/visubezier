# Changelog
All notable changes to VisuBezier will be documented in this file.

## [1.3.4] - 2020-07-27
### Added
- Added an icon before the timing functions that can be previewed.

## [1.3.2] - 2020-07-27
### Changed
- Fixed the `ease` mapping and allow to detect more than one function per declaration.

## [1.3.1] - 2020-05-02
### Changed
- Patch the security vulnerabilities for `minimist`.

## [1.3.0] - 2020-05-02
### Changed
- Fixed some greed in the detection regular expression.

## [1.2.0] - 2020-02-17
### Changed
- Updated icon
- Updated extension name
- Patch the security vulnerabilities for `braces`, `js-yaml` and `fstream`.

## [1.1.2] - 2019-05-03
### Changed
- Patch the security vulnerabilities for `tar` and `node.extend`.

## [1.1.1] - 2018-09-15
### Changed
- Improve the regular expression to be less greedy and not detect words like "release".

## [1.1.0] - 2018-09-07
### Added
- Add a preview of the Bézier curve next to the animation.
- Add options to customize the foreground and background colors of the animation preview.

### Changed
- Improve the readability of the SVG markup by separating the values into variables.
- Change the styling of preview-capable functions from `cursor: crosshair` to `text-decoration: underline`.