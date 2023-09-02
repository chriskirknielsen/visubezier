'use strict';
import * as vscode from 'vscode';
const path = require('path');

export function activate(context: vscode.ExtensionContext) {
	const Base64 = {
		// Source: http://www.webtoolkit.info/javascript-base64.html

		// private property
		_keyStr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',

		// public method for encoding
		encode: function (input: string) {
			var output = '';
			var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
			var i = 0;

			input = Base64._utf8_encode(input);

			while (i < input.length) {
				chr1 = input.charCodeAt(i++);
				chr2 = input.charCodeAt(i++);
				chr3 = input.charCodeAt(i++);

				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;

				if (isNaN(chr2)) {
					enc3 = enc4 = 64;
				} else if (isNaN(chr3)) {
					enc4 = 64;
				}

				output = output + this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) + this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
			}

			return output;
		},

		// private method for UTF-8 encoding
		_utf8_encode: function (string: string) {
			string = string.replace(/\r\n/g, '\n');
			var utftext = '';

			for (var n = 0; n < string.length; n++) {
				var c = string.charCodeAt(n);

				if (c < 128) {
					utftext += String.fromCharCode(c);
				} else if (c > 127 && c < 2048) {
					utftext += String.fromCharCode((c >> 6) | 192);
					utftext += String.fromCharCode((c & 63) | 128);
				} else {
					utftext += String.fromCharCode((c >> 12) | 224);
					utftext += String.fromCharCode(((c >> 6) & 63) | 128);
					utftext += String.fromCharCode((c & 63) | 128);
				}
			}

			return utftext;
		},
	};

	// console.log('VisuBezier is now active');

	// Retrieve user config
	const config = vscode.workspace.getConfiguration('visubezier');
	const defaultEasing = config.get('defaulteasingfunction', 'linear');
	const defaultDuration = config.get('defaultduration', '1s');
	const defaultBackground = config.get('defaultbackground', '#2d2d30');
	const defaultColor = config.get('defaultcolor', '#d7d7d7');
	const defaultLanguages = config.get('defaultlanguages', ['css', 'sass', 'scss', 'less', 'postcss', 'stylus', 'xml', 'svg']);

	/** Object with `x` and `y` properties, defining the offset coordinates to draw from inside an SVG. */
	interface OffsetXY {
		x: number;
		y: number;
	}

	/** Object with the input and output properties, defining a linear function's stop. */
	interface LinearStop {
		input: number;
		output: number | null;
	}

	/**
	 * Draws the steps path.
	 *
	 * @param {number} count The number of steps (non-null positive integer).
	 * @param {string} jumpterm The type of jump to be visualised.
	 * @param {OffsetXY} offset The offset coordinates `x` and `y` for the SVG viewBox.
	 * @param {number} size The length of a side of the square in which the easing function is painted.
	 * @returns {string} The `d` attribute for an SVG `<path />` element.
	 */
	function getJumpPath(count: number, jumpterm: string, offset: OffsetXY, size: number): string {
		// If there is a need to add or remove a half-step, flag it
		const addHalfStep = jumpterm === 'jump-both';
		const removeHalfStep = jumpterm === 'jump-none';

		// Determine which direction to move first
		const firstMove = ['jump-start', 'jump-both'].includes(jumpterm) ? 'y' : 'x';

		// Determine the distance to move for each step
		const stepSize = size / count;
		const stepSizeMinusHalf = size / (count - 1);
		const stepSizePlusHalf = size / (count + 1);

		// Start the path
		let path = `M${offset.x},${offset.y}`;

		for (let s = 0; s < count; s++) {
			let yStepMove = stepSize;
			if (removeHalfStep && firstMove === 'x') {
				yStepMove = stepSizeMinusHalf;
			} else if (addHalfStep && firstMove === 'y') {
				yStepMove = stepSizePlusHalf;
			}

			const isLastStep = s === count - 1;
			const goRight = `h${stepSize}`;
			const goUp = `v${yStepMove * -1}`; // Since the path is drawn from the bottom-left, we need to use a negative value to move upwards
			let moves = [goRight, goUp];
			if (firstMove === 'y') {
				moves.reverse(); // First goUp, then goRight
			}
			if (addHalfStep && isLastStep) {
				moves.push(goUp); // Add last half-step
			}
			if (removeHalfStep && isLastStep) {
				moves[1] = ''; // Remove last half-step
			}
			path += ` ${moves.join(' ')}`;
		}

		return path;
	}

	/**
	 * Rounds a number to a preferred decimal precision.
	 *
	 * @param {number} num Number to round.
	 * @param {number} [precision] Optional. Decimal precision for the returned number. Defaults to 4 decimal places.
	 * @returns {number} Rounded number to the specified decimal precision.
	 */
	function round(num: number, precision: number = 4): number {
		return parseFloat(num.toFixed(precision));
	}

	/**
	 * Takes a percentage such as `42%` and returns its decimal equivalent, e.g. `0.42`.
	 *
	 * @param {string} percent Percentage representation as a string with a `%` unit.
	 * @param {number} [precision] Optional. Decimal precision for the returned number. Defaults to 4 decimal places.
	 * @returns {number} Percentage converted to a decimal value.
	 */
	function percentToDecimal(percent: string, precision: number = 4): number {
		return round(parseFloat(percent.replace('%', '').trim()) / 100, precision);
	}

	/**
	 * Remap a number from one boundary to another.
	 *
	 * @param {Number} number Initial number to map to a new boundaries.
	 * @param {Number} in_min The initial number's lower boundary.
	 * @param {Number} in_max The initial number's upper boundary.
	 * @param {Number} out_min The final number's lower boundary.
	 * @param {Number} out_max The final number's upper boundary.
	 * @return {Number} Remapped number.
	 */
	function remapNumber(number, in_min, in_max, out_min, out_max) {
		return ((number - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
	}

	/**
	 * Clamp a number in a range.
	 *
	 * @param {Number} number The number to clamp.
	 * @param {Number} min The minimum value to return.
	 * @param {Number} max The maximum value to return.
	 * @return {Number} The clamped number.
	 */
	// function clamp(number, min = 0, max = 1) {
	// 	return Math.min(max, Math.max(min, number));
	// }

	/**
	 * Draws the linear stops path.
	 * @param {string[]} stops List of linear stops, e.g. `['0', '0.25 25% 75%', '1'].
	 * @param {OffsetXY} offset The offset coordinates `x` and `y` for the SVG viewBox.
	 * @param {number} size The length of a side of the square in which the easing function is painted.
	 * @returns {string} The `d` attribute for an SVG `<path />` element.
	 */
	function getLinearPath(stops: string[], offset: OffsetXY, size: number): string {
		let path: string = `M${offset.x},${offset.y}`; // Starting point
		let stopsNormalized: LinearStop[] = [];
		let debugPoints: number[][] = [];
		let hasImplicitPositions = false;
		stops.forEach((stop) => {
			const stopData = stop
				.split(' ')
				.map((d) => d.trim())
				.filter((s) => s.length > 0);
			const value = parseFloat(stopData[0]);

			if (stopData.length == 1) {
				// Provide an undefined output so it can be calculated based on context
				hasImplicitPositions = true;
				return stopsNormalized.push({ input: value, output: null });
			} else if (stopData.length == 2) {
				// Set a single point
				const x = percentToDecimal(stopData[1]);
				return stopsNormalized.push({ input: value, output: x });
			} else if (stopData.length == 3) {
				// Draw a flat line if two percentages are provided for a single input
				const x1 = percentToDecimal(stopData[1]);
				const x2 = percentToDecimal(stopData[2]);
				stopsNormalized.push({ input: value, output: x1 });
				stopsNormalized.push({ input: value, output: x2 });
				return;
			}
		});

		let firstStop = stopsNormalized[0];
		let lastStop = stopsNormalized[stopsNormalized.length - 1];

		// If the first value has no output, force it to start at 0
		if (firstStop.output === null) {
			firstStop.output = 0;
		}

		// Ensure the stop list starts with a 0:0% pair if the first value is not 0
		if (firstStop.input > 1 && [0, null].indexOf(firstStop.output) === -1) {
			stopsNormalized.unshift({ input: 0, output: 0 });
		}

		// If the last value has no output, force it to end at 1
		if (lastStop.output === null) {
			lastStop.output = 1;
		}

		// Ensure the stop list ends with a 1:100% pair if the last value is not 1
		if (lastStop.input !== 1) {
			stopsNormalized.push({ input: 1, output: 1 });
		}

		let stopsNormalizedExplicit: any = [];

		if (hasImplicitPositions) {
			const stopCount = stopsNormalized.length;
			const reversedStops = JSON.parse(JSON.stringify(stopsNormalized)).reverse(); // structuredClone simply deadlocked this thing, so gross and old hack it is
			stopsNormalizedExplicit = stopsNormalized.map((stop, index) => {
				if (stop.output === null) {
					// If the stop output is null, calculate its implicit position based on other available values
					const previousExplicitStopIndex = reversedStops.slice(stopCount - index).findIndex((s) => s.output !== null); // Find the first explicit index before the current stop (findLastIndex is not allowed so I shamefully resorted to this)
					const previousExplicitStop = reversedStops[previousExplicitStopIndex + stopCount - index];
					const previousExplicitStopIndexUnreversed = -1 + (previousExplicitStopIndex - index) * -1;
					const previousExplicitOutput = previousExplicitStop.output;

					const nextExplicitStopIndex = stopsNormalized.slice(index + 1).findIndex((s) => s.output !== null) + index + 1; // Find the first explicit input after the current stop
					const nextExplicitStop = stopsNormalized[nextExplicitStopIndex];
					const nextExplicitStopOutput = nextExplicitStop.output;

					const currentImplicitOutput = remapNumber(index, previousExplicitStopIndexUnreversed, nextExplicitStopIndex, previousExplicitOutput, nextExplicitStopOutput);

					stop.output = round(currentImplicitOutput);
				}

				return stop;
			});
		} else {
			stopsNormalizedExplicit = stopsNormalized;
		}

		stopsNormalizedExplicit
			.filter((stop) => stop.output >= 0 && stop.output <= 1)
			.forEach((stop) => {
				const x = stop.output * size;
				const y = stop.input * size;
				debugPoints.push([x, y]);
				path += ` L${offset.x + x},${offset.y - y}`;
			});

		return path;
	}

	/**
	 * Check if the editor's document language is part of the config's list of languages to decorate.
	 * @param {vscode.TextEditor} editor VS Code Editor instance.
	 * @returns {Boolean} Whether to decorate the document or not.
	 */
	function shouldDocumentBeDecorated(editor) {
		const docLang = editor.hasOwnProperty('document') && editor.document.hasOwnProperty('languageId') ? editor.document.languageId : '';
		return docLang && defaultLanguages.includes(docLang);
	}

	/** Keywords to easing/steps mapping. */
	interface Key2Ease {
		[key: string]: string;
	}

	// Keyword to cubic-bezier()
	const keyword2easing: Key2Ease = {
		linear: '0,0,1,1',
		ease: '0.25,0.1,0.25,1',
		'ease-in': '0.42,0,1,1',
		'ease-out': '0,0,0.58,1',
		'ease-in-out': '0.42,0,0.58,1',
	};

	// Keyword to steps()
	const keyword2jump: Key2Ease = {
		'step-start': '1,jump-start',
		'step-end': '1,jump-end',
	};

	/**
	 * Returns code for the cubic-bezier preview (as an SVG image).
	 *
	 * @param {string} easingFunctionInput The easing function or keyword to parse.
	 * @returns {string} The SVG element with the animation and the curve/steps preview.
	 */
	function getSvgOutput(easingFunctionInput: string): string {
		const bg = defaultBackground;
		const color = defaultColor;
		const svgW = 480;
		const svgH = 100;
		const squareSize = 32;
		const squareMargin = squareSize / 2;
		const animationSpanX = squareSize * 10;
		const animationOffsetX = animationSpanX - squareSize - squareMargin * 2;
		const curvePreviewBoxSize = svgH * 0.5;
		const curvePreviewHandleRadius = curvePreviewBoxSize * 0.05;
		const curvePreviewBoxOffsetX = animationSpanX + curvePreviewBoxSize / 2;
		const curvePreviewBoxOffsetY = (svgH - curvePreviewBoxSize) / 2;
		const easingFunction = easingFunctionInput.toLowerCase().trim();
		const pathStart = { x: curvePreviewBoxOffsetX, y: curvePreviewBoxOffsetY + curvePreviewBoxSize };
		const isSteps = easingFunction.includes('step-') || easingFunctionInput.includes('steps(');
		const isLinearFn = easingFunctionInput.includes('linear(');
		let svgDrawing: string;

		if (isSteps) {
			let jumps = keyword2jump[easingFunction] || easingFunction.replace('steps(', '').replace(')', ''); // Not the cleanest…
			let jumpData = jumps.split(',');
			let jumpCount = parseInt(jumpData[0], 10);
			let jumpType = (jumpData[1] || 'jump-end').trim();
			if (jumpType === 'start') {
				jumpType = 'jump-start';
			}
			if (jumpType === 'end') {
				jumpType = 'jump-end';
			}
			let jumpPath = getJumpPath(jumpCount, jumpType, pathStart, curvePreviewBoxSize);

			svgDrawing = `<path class="st0" d="${jumpPath}"/>`;
		} else if (isLinearFn) {
			let points = easingFunction.replace('linear(', '').replace(')', ''); // Not the cleanest…
			let pointsData = points.split(',').map((p) => p.trim());
			let linearPath = getLinearPath(pointsData, pathStart, curvePreviewBoxSize);

			svgDrawing = `<path class="st0" d="${linearPath}"/>`;
		} else {
			let curvePoints = keyword2easing[easingFunction] || easingFunction.replace('cubic-bezier(', '').replace(')', ''); // Not the cleanest…
			let curve = curvePoints.split(',');
			let factor = curvePreviewBoxSize;
			let points = curve.map((n) => parseFloat(n) * factor);
			let curveX1 = points[0] + curvePreviewBoxOffsetX;
			let curveY1 = factor - points[1] + curvePreviewBoxOffsetY;
			let curveX2 = points[2] + curvePreviewBoxOffsetX;
			let curveY2 = factor - points[3] + curvePreviewBoxOffsetY;
			let curvePath = `M${pathStart.x},${pathStart.y} C${curveX1},${curveY1} ${curveX2},${curveY2} ${curvePreviewBoxOffsetX + curvePreviewBoxSize},${curvePreviewBoxOffsetY}`;

			svgDrawing = `<line class="st0" x1="${curvePreviewBoxOffsetX}" y1="${curvePreviewBoxOffsetY + curvePreviewBoxSize}" x2="${curveX1}" y2="${curveY1}"/>
            <line class="st0" x1="${curveX2}" y1="${curveY2}" x2="${curvePreviewBoxOffsetX + curvePreviewBoxSize}" y2="${curvePreviewBoxOffsetY}"/>

            <circle class="st1" cx="${curveX1}" cy="${curveY1}" r="${curvePreviewHandleRadius}"/>
            <circle class="st1" cx="${curveX2}" cy="${curveY2}" r="${curvePreviewHandleRadius}"/>

            <path class="st0" d="${curvePath}" />`;
		}

		let markup = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}px" height="${svgH}px">
            <style>
                svg {
                    background-color: ${bg};
                    color: ${color};
                }
                .st0 {
                    fill: none;
                    stroke: ${color};
                    stroke-width: 2;
                    stroke-miterlimit: 4;
                }
                .st1 {
                    fill: ${color};
                    fill-rule: evenodd;
                    clip-rule: evenodd;
                    alternate infinite;
                }
                .st2 {
                    fill: ${color};
                    font-family: 'FiraCode','Courier New',monospace;
                    font-size: 14px;
                }
                .st3 {
                    opacity: .35;
                    fill: none;
                    stroke: ${color};
                    stroke-miterlimit: 10;
                }
                .anim {
                    animation: anim ${defaultDuration} alternate infinite;
                }
                .default {
                    animation-timing-function: ${defaultEasing};
                }
                .custom {
                    animation-timing-function: ${easingFunction};
                }
                @keyframes anim {
                    to { transform: translateX(${animationOffsetX}px); }
                }        
            </style>

            <rect x="${curvePreviewBoxOffsetX}" y="${curvePreviewBoxOffsetY}" class="st3" width="${curvePreviewBoxSize}" height="${curvePreviewBoxSize}"/>

            <line class="st3" x1="${curvePreviewBoxOffsetX}" x2="${curvePreviewBoxOffsetX + curvePreviewBoxSize}" y1="${curvePreviewBoxOffsetY + curvePreviewBoxSize * 0.25}" y2="${
			curvePreviewBoxOffsetY + curvePreviewBoxSize * 0.25
		}"/>
            <line class="st3" x1="${curvePreviewBoxOffsetX}" x2="${curvePreviewBoxOffsetX + curvePreviewBoxSize}" y1="${curvePreviewBoxOffsetY + curvePreviewBoxSize * 0.5}" y2="${
			curvePreviewBoxOffsetY + curvePreviewBoxSize * 0.5
		}"/>
            <line class="st3" x1="${curvePreviewBoxOffsetX}" x2="${curvePreviewBoxOffsetX + curvePreviewBoxSize}" y1="${curvePreviewBoxOffsetY + curvePreviewBoxSize * 0.75}" y2="${
			curvePreviewBoxOffsetY + curvePreviewBoxSize * 0.75
		}"/>

            <line class="st3" x1="${curvePreviewBoxOffsetX + curvePreviewBoxSize * 0.25}" x2="${
			curvePreviewBoxOffsetX + curvePreviewBoxSize * 0.25
		}" y1="${curvePreviewBoxOffsetY}" y2="${curvePreviewBoxOffsetY + curvePreviewBoxSize}"/>
            <line class="st3" x1="${curvePreviewBoxOffsetX + curvePreviewBoxSize * 0.5}" x2="${
			curvePreviewBoxOffsetX + curvePreviewBoxSize * 0.5
		}" y1="${curvePreviewBoxOffsetY}" y2="${curvePreviewBoxOffsetY + curvePreviewBoxSize}"/>
            <line class="st3" x1="${curvePreviewBoxOffsetX + curvePreviewBoxSize * 0.75}" x2="${
			curvePreviewBoxOffsetX + curvePreviewBoxSize * 0.75
		}" y1="${curvePreviewBoxOffsetY}" y2="${curvePreviewBoxOffsetY + curvePreviewBoxSize}"/>
            
            ${svgDrawing}

            <line class="st3" x1="${squareMargin}" y1="0" x2="${squareMargin}" y2="${svgH}"/>
            <line class="st3" x1="${(animationSpanX - squareMargin) * 0.25}" y1="0" x2="${(animationSpanX - squareMargin) * 0.25}" y2="${svgH}"/>
            <line class="st3" x1="${(animationSpanX - squareMargin) * 0.5}" y1="0" x2="${(animationSpanX - squareMargin) * 0.5}" y2="${svgH}"/>
            <line class="st3" x1="${(animationSpanX - squareMargin) * 0.75}" y1="0" x2="${(animationSpanX - squareMargin) * 0.75}" y2="${svgH}"/>
            <line class="st3" x1="${animationSpanX - squareMargin}" y1="0" x2="${animationSpanX - squareMargin}" y2="${svgH}"/>
            <line class="st0" x1="0" y1="${svgH / 2}" x2="${animationSpanX}" y2="${svgH / 2}"/>

            <text transform="matrix(1 0 0 1 0 10)" class="st2 default">${defaultEasing}</text>
            <rect x="${squareMargin}" y="15" class="st1 anim default" width="${squareSize}" height="${squareSize}"/>

            <text transform="matrix(1 0 0 1 0 98)" class="st2 custom">${easingFunction}</text>
            <rect x="${squareMargin}" y="54" class="st1 anim custom" width="${squareSize}" height="${squareSize}"/>
        </svg>`;

		return markup;
	}

	/**
	 * Return the SVG formatted for URI use.
	 *
	 * @param {string} svgContent The SVG to output.
	 * @param {string} [type] Optional. The encoding for the output. Can be either `utf8` or `base64`. Defaults to `utf8`.
	 * @returns Encoded SVG markup output.
	 */
	function uriSvgOutput(svgContent: string, type: string = 'utf8'): string {
		var input = svgContent
			.split('\n')
			.map((i) => i.trim())
			.join('');

		if (type === 'base64') {
			return 'data:image/svg+xml;base64,' + Base64.encode(input);
		}

		return 'data:image/svg+xml;utf8,' + encodeURIComponent(input);
	}

	const cubicBezierDecorationType = vscode.window.createTextEditorDecorationType({
		textDecoration: 'underline dotted',
		before: {
			contentIconPath: path.join(context.extensionPath, 'src/inline.svg'),

			height: '0.8em',
			width: '1em',
			margin: '0px 0.2em 0px 0px',
		},
	});

	let activeEditor = vscode.window.activeTextEditor;
	if (activeEditor) {
		triggerUpdateDecorations();
	}

	vscode.window.onDidChangeActiveTextEditor(
		(editor) => {
			activeEditor = editor;
			if (editor) {
				const shouldDecorate = shouldDocumentBeDecorated(editor);
				if (shouldDecorate) {
					triggerUpdateDecorations();
				}
			}
		},
		null,
		context.subscriptions
	);

	vscode.workspace.onDidChangeTextDocument(
		(event) => {
			if (activeEditor && event.document === activeEditor.document) {
				triggerUpdateDecorations();
			}
		},
		null,
		context.subscriptions
	);

	var timeout;
	/** Throttle the decorators update. */
	function triggerUpdateDecorations() {
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(updateDecorations, 500);
	}

	/** Update the decorators for any of the supported easing keywords and timing functions. */
	function updateDecorations() {
		if (!activeEditor) {
			return;
		}

		// Strap in, it's gonna be a long RegExp…
		// Detect a colon, a space or a comma before a timing function
		const regExBefore = /(\:|\s|,|"|')/;
		// Detect easing keywords
		const regExKeywords = /linear|(ease(?:-in)?(?:-out)?)|(step-(?:start|end))/;
		// linear function: detect a linear stop list (N %? %?,)
		const regExLinearFn = /(linear\(\s*((?:-?0?(?:\.[0-9]+)?|1)+(?:\s+(?:-?0?(?:\.[0-9]+)?|1)+)?(?:\s+(?:(?:[0-9]{0,2}(?:\.[0-9]+)?|100)%)){0,2}\s?,?\s?)+\s*\))/;
		const regExCubicBezierX = /(?:0?(?:\.[0-9]+)?)|1/; // X-coordinate within [0;1]
		const regExCubicBezierY = /-?(?:(?:[0-9]?(?:\.[0-9]+))|\d+)/; // Y-coodinate within [-inf;+inf]
		// cubic-bezier function: detect a positive number between 0 and 1 for horizontal handle position, detect a positive or negative number for vertical handle position
		const regExCubicBezier = new RegExp(
			`(cubic-bezier\\\(\\\s*(${regExCubicBezierX.source})\\\s*,\\\s*(${regExCubicBezierY.source})\\\s*,\\\s*(${regExCubicBezierX.source})\\\s*,\\\s*(${regExCubicBezierY.source})\\\s*\\\))`
		);
		// steps function: detect a non-null positive integer for steps counts, detect a jumpterm for the steps() function (optional)
		const regExSteps = /(steps\(\s*[1-9][0-9]*(\s*,\s*(start|end|jump-(?:start|end|both|none)))?\s*\))/;
		const regExTypes = [regExKeywords, regExCubicBezier, regExLinearFn, regExSteps].map((regex) => regex.source).join('|');
		// Detect a space, a comma or a semi-colon after a timing function
		const regExAfter = /(\s|,|;|"|')/;
		// Define the global and case-insensitive flags
		const regExFlags = 'gi';
		// Build the final regular expression
		const regEx = new RegExp(regExBefore.source + '(' + regExTypes + ')' + regExAfter.source, regExFlags);
		const text = activeEditor.document.getText();
		const cubicBeziers: vscode.DecorationOptions[] = [];
		let match;
		while ((match = regEx.exec(text))) {
			// console.log(match);
			const offsetStartPos = match.index + match[1].length;
			const startPos = activeEditor.document.positionAt(offsetStartPos);
			const endPos = activeEditor.document.positionAt(offsetStartPos + match[2].length);
			var uri = '![](' + uriSvgOutput(getSvgOutput(match[2].toLowerCase()), 'base64') + ')';
			const decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: uri };
			cubicBeziers.push(decoration);
		}
		activeEditor.setDecorations(cubicBezierDecorationType, cubicBeziers);
	}
}
