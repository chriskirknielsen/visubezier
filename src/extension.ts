'use strict';
import * as vscode from 'vscode';

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

    console.log('VisuBezier is now active');

    // Retrieve user config
    const config = vscode.workspace.getConfiguration("visubezier")
    const defaultEasing = config.get("defaulteasingfunction", "linear");
    const defaultDuration = config.get("defaultduration", "1s");

    /* Returns code for the cubic-bezier preview (as a scalable SVG image) */
    function getWebviewContent(easingFunction: string) {
        return `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 320 100" style="enable-background:new 0 0 320 100;" width="320px" height="100px" xml:space="preserve">
            <style type="text/css">
                svg{background-color:#2d2d30;color:#d7d7d7;}
                .st0{fill:none;stroke:currentColor;stroke-miterlimit:10;}
                .st1{fill:currentColor;fill-rule:evenodd;clip-rule:evenodd;animation: anim ${defaultDuration} alternate infinite;}
                .st2{fill:currentColor;font-family:'FiraCode','Courier New',monospace;font-size:12px;}
                .st3{opacity:0.35;fill:none;stroke:currentColor;stroke-miterlimit:10;}
                .default {animation-timing-function: ${defaultEasing};}
                .custom {animation-timing-function: ${easingFunction};}
                @keyframes anim { to { transform: translateX(256px); } }
            </style>
            <line class="st3" x1="15.5" y1="0" x2="15.5" y2="100"/>
            <line class="st3" x1="87.75" y1="0" x2="87.75" y2="100"/>
            <line class="st3" x1="160" y1="0" x2="160" y2="100"/>
            <line class="st3" x1="232.25" y1="0" x2="232.25" y2="100"/>
            <line class="st3" x1="304.5" y1="0" x2="304.5" y2="100"/>
            <line class="st0" x1="-0.5" y1="50.5" x2="319.5" y2="50.5"/>
            <text transform="matrix(1 0 0 1 0 10)" class="st2 default">${defaultEasing}</text>
            <rect x="16" y="15" class="st1 default" width="32" height="32"/>
            <text transform="matrix(1 0 0 1 0 98)" class="st2 custom">${easingFunction}</text>
            <rect x="16" y="54" class="st1 custom" width="32" height="32"/>
        </svg>`;
    }

    function uriSvgOutput(svgContent: string, type: string = 'utf8') {
        var input = svgContent.split("\n").map(i => i.trim()).join('');

        if (type === 'base64') {
            return 'data:image/svg+xml;base64,' + Base64.encode(input);
        }
        
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(input);
    }

    const cubicBezierDecorationType = vscode.window.createTextEditorDecorationType({
        cursor: 'crosshair'
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
	function triggerUpdateDecorations() {
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(updateDecorations, 500);
    }
    function updateDecorations() {
		if (!activeEditor) {
			return;
		}
		const regEx = /((ease(?:-in)?(?:-out)?)|(cubic-bezier\(\s*(-?(?:\d?(?:\.\d+))|\d)\s*,\s*(-?(?:\d?(?:\.\d+))|\d)\s*,\s*(-?(?:\d?(?:\.\d+))|\d)\s*,\s*(-?(?:\d?(?:\.\d+))|\d)\s*\)))/gim; // Matches any easing-function
		const text = activeEditor.document.getText();
		const cubicBeziers: vscode.DecorationOptions[] = [];
		let match;
		while (match = regEx.exec(text)) {
			const startPos = activeEditor.document.positionAt(match.index);
            const endPos = activeEditor.document.positionAt(match.index + match[0].length);
            var uri = '![](' + uriSvgOutput( getWebviewContent( match[0] ), 'base64' ) + ')';
			const decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: uri };
			cubicBeziers.push(decoration);
		}
		activeEditor.setDecorations(cubicBezierDecorationType, cubicBeziers);
	}
}