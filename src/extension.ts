'use strict';
import * as vscode from 'vscode';
const path = require('path');

export function activate(context: vscode.ExtensionContext) {
    const Base64 = { // Source: http://www.webtoolkit.info/javascript-base64.html

        // private property
        _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
        
        // public method for encoding
        encode : function (input: string) {
            var output = "";
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
        
                output = output +
                this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
        
            }
        
            return output;
        },
        
        // private method for UTF-8 encoding
        _utf8_encode : function (string: string) {
            string = string.replace(/\r\n/g,"\n");
            var utftext = "";
        
            for (var n = 0; n < string.length; n++) {
        
                var c = string.charCodeAt(n);
        
                if (c < 128) {
                    utftext += String.fromCharCode(c);
                }
                else if((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
                else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
        
            }
        
            return utftext;
        }
    }

    // console.log('VisuBezier is now active');

    // Retrieve user config
    const config = vscode.workspace.getConfiguration("visubezier")
    const defaultEasing = config.get("defaulteasingfunction", "linear");
    const defaultDuration = config.get("defaultduration", "1s");
    const defaultBackground = config.get("defaultbackground", "#2d2d30");
    const defaultColor = config.get("defaultcolor", "#d7d7d7");

    /** Object with `x` and `y` properties, defining the offset coordinates to draw from in an SVG. */
    interface OffsetXY {
        x: number;
        y: number;
    }

    /**
     * Draws the steps path.
     * 
     * @param {number} count The number of steps (non-null positive integer)
     * @param {string} jumpterm The type of jump to be visualised
     * @param {OffsetXY} offset The offset coordinates `x` and `y` for the SVG viewBox
     * @param {number} size The length of a side of the square in which the easing function is painted
     * 
     * @return {string} The `d` attribute for an SVG `<path />` element.
     */
    function getJumpPath(count: number, jumpterm: string, offset: OffsetXY, size: number): string {
        // If there is a need to add or remove a half-step, flag it
        const addHalfStep = (jumpterm === 'jump-both');
        const removeHalfStep = (jumpterm === 'jump-none');

        // Determine which direction to move first
        const firstMove = (['jump-start', 'jump-both'].indexOf(jumpterm) > -1) ? 'y' : 'x';

        // Determine the distance to move for each step
        const stepSize = size / count;
        const stepSizeMinusHalf = size / (count - 1);
        const stepSizePlusHalf = size / (count + 1);

        // Start the path
        let path = `M${offset.x},${offset.y}`;

        for (let s = 0; s < count; s++) {
            let yStepMove = stepSize;
            if (removeHalfStep && firstMove === 'x') { yStepMove = stepSizeMinusHalf; }
            else if (addHalfStep && firstMove === 'y') { yStepMove = stepSizePlusHalf; }

            const isLastStep = (s === (count-1));
            const goRight = `l${stepSize},0`;
            const goUp = `l0,${yStepMove * -1}`; // Since the path is drawn from the bottom-left, we need to use a negative value to move upwards
            let moves = [goRight, goUp];
            if (firstMove === 'y') { moves.reverse(); } // First goUp, then goRight
            if (addHalfStep && isLastStep) { moves.push(goUp); } // Add last half-step
            if (removeHalfStep && isLastStep) { moves[1] = ''; } // Remove last half-step
            path += ` ${moves.join(' ')}`;
        }

        return path;
    }

    /** Keywords to easing/steps mapping. */
    interface Key2Ease {
        [key: string]: string;
    }

    // Keyword to cubic-bezier()
    const keyword2easing: Key2Ease = {
        'linear': '0,0,1,1',
        'ease': '0.25,0.1,0.25,1',
        'ease-in': '0.42,0,1,1',
        'ease-out': '0,0,0.58,1',
        'ease-in-out': '0.42,0,0.58,1'
    };

    // Keyword to steps()
    const keyword2jump: Key2Ease = {
        'step-start': '1,jump-start',
        'step-end': '1,jump-end'
    };

    /**
     * Returns code for the cubic-bezier preview (as an SVG image).
     * 
     * @param {string} easingFunctionInput The easing function or keyword to parse.
     * 
     * @return {string} The SVG element with the animation and the curve/steps preview.
     */
    function getSvgOutput(easingFunctionInput: string): string {
        const bg = defaultBackground;
        const color = defaultColor;
        const svgW = 480;
        const svgH = 100;
        const squareSize = 32;
        const squareMargin = squareSize/2;
        const animationSpanX = squareSize*10;
        const animationOffsetX = animationSpanX - squareSize - squareMargin*2;
        const curvePreviewBoxSize = svgH * .5;
        const curvePreviewHandleRadius = curvePreviewBoxSize * .05;
        const curvePreviewBoxOffsetX = animationSpanX + curvePreviewBoxSize / 2;
        const curvePreviewBoxOffsetY = (svgH - curvePreviewBoxSize) / 2;
        const easingFunction = easingFunctionInput.toLowerCase().trim();
        const pathStart = { x: curvePreviewBoxOffsetX, y: curvePreviewBoxOffsetY + curvePreviewBoxSize };
        const isSteps = (easingFunction.indexOf('step-') > -1 || easingFunctionInput.indexOf('steps(') > -1);
        let svgDrawing: string;

        if (isSteps) {
            let jumps = keyword2jump[easingFunction] || easingFunction.replace('steps(', '').replace(')', ''); // Not the cleanest…
            let jumpData = jumps.split(',');
            let jumpCount = parseInt(jumpData[0], 10);
            let jumpType = (jumpData[1] || 'jump-end').trim();
            if (jumpType === 'start') { jumpType = 'jump-start'; }
            if (jumpType === 'end') { jumpType = 'jump-end'; }
            let jumpPath = getJumpPath(jumpCount, jumpType, pathStart, curvePreviewBoxSize);

            svgDrawing = `<path class="st0" d="${jumpPath}"/>`;
        }
        else {
            let curvePoints = keyword2easing[easingFunction] || easingFunction.replace('cubic-bezier(', '').replace(')', ''); // Not the cleanest…
            let curve = curvePoints.split(',');
            let factor = curvePreviewBoxSize;
            let points = curve.map(n => parseFloat(n) * factor);
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
                    stroke-miterlimit: 10;
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

            <line class="st3" x1="${curvePreviewBoxOffsetX}" x2="${curvePreviewBoxOffsetX + curvePreviewBoxSize}" y1="${curvePreviewBoxOffsetY + curvePreviewBoxSize*.25}" y2="${curvePreviewBoxOffsetY + curvePreviewBoxSize*.25}"/>
            <line class="st3" x1="${curvePreviewBoxOffsetX}" x2="${curvePreviewBoxOffsetX + curvePreviewBoxSize}" y1="${curvePreviewBoxOffsetY + curvePreviewBoxSize*.5}" y2="${curvePreviewBoxOffsetY + curvePreviewBoxSize*.5}"/>
            <line class="st3" x1="${curvePreviewBoxOffsetX}" x2="${curvePreviewBoxOffsetX + curvePreviewBoxSize}" y1="${curvePreviewBoxOffsetY + curvePreviewBoxSize*.75}" y2="${curvePreviewBoxOffsetY + curvePreviewBoxSize*.75}"/>

            <line class="st3" x1="${curvePreviewBoxOffsetX + curvePreviewBoxSize*.25}" x2="${curvePreviewBoxOffsetX + curvePreviewBoxSize*.25}" y1="${curvePreviewBoxOffsetY}" y2="${curvePreviewBoxOffsetY + curvePreviewBoxSize}"/>
            <line class="st3" x1="${curvePreviewBoxOffsetX + curvePreviewBoxSize*.5}" x2="${curvePreviewBoxOffsetX + curvePreviewBoxSize*.5}" y1="${curvePreviewBoxOffsetY}" y2="${curvePreviewBoxOffsetY + curvePreviewBoxSize}"/>
            <line class="st3" x1="${curvePreviewBoxOffsetX + curvePreviewBoxSize*.75}" x2="${curvePreviewBoxOffsetX + curvePreviewBoxSize*.75}" y1="${curvePreviewBoxOffsetY}" y2="${curvePreviewBoxOffsetY + curvePreviewBoxSize}"/>
            
            ${svgDrawing}

            <line class="st3" x1="${squareMargin}" y1="0" x2="${squareMargin}" y2="${svgH}"/>
            <line class="st3" x1="${(animationSpanX - squareMargin)*.25}" y1="0" x2="${(animationSpanX - squareMargin)*.25}" y2="${svgH}"/>
            <line class="st3" x1="${(animationSpanX - squareMargin)*.5}" y1="0" x2="${(animationSpanX - squareMargin)*.5}" y2="${svgH}"/>
            <line class="st3" x1="${(animationSpanX - squareMargin)*.75}" y1="0" x2="${(animationSpanX - squareMargin)*.75}" y2="${svgH}"/>
            <line class="st3" x1="${animationSpanX - squareMargin}" y1="0" x2="${animationSpanX - squareMargin}" y2="${svgH}"/>
            <line class="st0" x1="0" y1="${svgH/2}" x2="${animationSpanX}" y2="${svgH/2}"/>

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
     * 
     * @return Encoded SVG markup output.
     */
    function uriSvgOutput(svgContent: string, type: string = 'utf8'): string {
        var input = svgContent.split("\n").map(i => i.trim()).join('');

        if (type === 'base64') {
            return 'data:image/svg+xml;base64,' + Base64.encode(input);
        }
        
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(input);
    }

    const cubicBezierDecorationType = vscode.window.createTextEditorDecorationType({
        textDecoration: 'underline dotted',
        before: {
            contentIconPath: path.join(context.extensionPath, "src/inline.svg"),
            
            height: '0.8em',
            width: '1em',
            margin: '0px 0.2em 0px 0px',
        }
    });

    let activeEditor = vscode.window.activeTextEditor;
	if (activeEditor) {
		triggerUpdateDecorations();
	}

	vscode.window.onDidChangeActiveTextEditor(editor => {
		activeEditor = editor;
		if (editor) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		if (activeEditor && event.document === activeEditor.document) {
			triggerUpdateDecorations();
		}
	}, null, context.subscriptions);
    
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

        // Strap in, it's gonna be a long RegEx…
		const regEx = /(\:|\s|,)((ease(?:-in)?(?:-out)?)|(cubic-bezier\(\s*((?:(?:\d?(?:\.\d+))|\d))\s*,\s*(-?(?:(?:\d?(?:\.\d+))|\d))\s*,\s*((?:(?:\d?(?:\.\d+))|\d))\s*,\s*(-?(?:(?:\d?(?:\.\d+))|\d))\s*\))|(step-(?:start|end))|steps\(\s*[1-9]\d*(\s*,\s*(start|end|jump-(?:start|end|both|none)))?\s*\))(\s|,|;)/gi; // Matches any easing-function
        const text = activeEditor.document.getText();
		const cubicBeziers: vscode.DecorationOptions[] = [];
		let match;
		while (match = regEx.exec(text)) {
            // console.log(match);
            const offsetStartPos = match.index + match[1].length;
			const startPos = activeEditor.document.positionAt(offsetStartPos);
            const endPos = activeEditor.document.positionAt(offsetStartPos + match[2].length);
            var uri = '![](' + uriSvgOutput( getSvgOutput( match[2].toLowerCase() ), 'base64' ) + ')';
			const decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: uri };
			cubicBeziers.push(decoration);
		}
		activeEditor.setDecorations(cubicBezierDecorationType, cubicBeziers);
	}
}