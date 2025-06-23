// ==UserScript==
// @name             OpenAI TTS Text Reader
// @namespace        http://tampermonkey.net/
// @version          2.6.6 // Version incremented due to model change
// @description      Read selected text with OpenAI's TTS API (gpt-4o-mini-tts model) and adjustable volume and speed. Please enter the apikey before using.
// @description:ar   قراءة النص المحدد باستخدام واجهة برمجة تطبيقات تحويل النص إلى كلام من OpenAI (نموذج gpt-4o-mini-tts) مع إمكانية ضبط مستوى الصوت والسرعة. يرجى إدخال مفتاح الواجهة البرمجية (apikey) قبل الاستخدام.
// @include          *
// @author           wkf16 (Modified by AI assistant for Bahattab)
// @license          MIT
// @grant            GM_xmlhttpRequest
// @grant            GM_registerMenuCommand
// @grant            GM_getValue
// @grant            GM_setValue

// @connect          api.openai.com
// @connect          oai-tts.zwei.de.eu.org

// @antifeature cross-domain This script makes cross-domain API calls to OpenAI's TTS service, which may have implications for data security and privacy.
// @downloadURL https://rawgithubusercontent.deno.dev/waxz/tempermonkey-scripts/main/OpenAI-TTS-Text-Reader.js
// @updateURL https://rawgithubusercontent.deno.dev/waxz/tempermonkey-scripts/main/OpenAI-TTS-Text-Reader.js
// ==/UserScript==

var YOUR_API_KEY = "sk-1234567890";
var YOUR_BASE_URL = "https://oai-tts.zwei.de.eu.org/v1/audio/speech";

(function() {
    'use strict';
    var currentSource = null;
    var isPlaying = false;
    var isProcessing = false;
    var ispanelDisplay = false;
    var audioContext = new AudioContext();
    var gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    var playbackRate = 1;
    var lastSelectedVoice = localStorage.getItem('lastSelectedVoice') || 'nova'; // Default to 'nova'


        // Function to handle TTS
    function handleTTS(selectedText) {
        if (isPlaying) {
            if (currentSource) {
                currentSource.stop();
            }
            isPlaying = false;
        } else {
            if (selectedText) {
                textToSpeech(selectedText);
            } else {
                alert("Please select some text first.");
            }
        }
    }

        // Register context menu command
    GM_registerMenuCommand("Read Selected Text", function() {
        var selectedText = window.getSelection().toString();
        handleTTS(selectedText);
    });



    // Create the button
    var readButton = document.createElement("button");
    styleButton(readButton);
    document.body.appendChild(readButton);

    // Create and add the button text
    var buttonText = document.createElement("span");
    buttonText.textContent = "▶"; // Play icon
    styleButtonText(buttonText);
    readButton.appendChild(buttonText);

    // Create the control panel
    var controlPanel = document.createElement("div");
    styleControlPanel(controlPanel);
    document.body.appendChild(controlPanel);

    // Create and add volume and speed sliders to the control panel
    var volumeControl = createSlider("Volume", 0, 1, 0.5, 0.01, function(value) {
        gainNode.gain.value = value;
    });
    controlPanel.appendChild(volumeControl.wrapper);
    volumeControl.slider.value = 0.5;

    var speedControl = createSlider("Speed", 0.5, 1.5, 1, 0.05, function(value) {
        playbackRate = value;
    });
    controlPanel.appendChild(speedControl.wrapper);
    speedControl.slider.value = 1;

    // Listen for mouseup events to reposition the button
    document.addEventListener('mouseup', function(event) {
        if(isProcessing || isPlaying || ispanelDisplay) return;

        console.log(event)
        var selectedText = window.getSelection().toString();
        if (selectedText) {
            // Get the selection range
            var selection = window.getSelection();
            if (selection.rangeCount > 0) {
                var range = selection.getRangeAt(0);
                var rect = range.getBoundingClientRect();

                // Position the button near the selection
                readButton.style.position = 'absolute'; // Changed to absolute positioning
                readButton.style.left = (event.clientX + window.scrollX - 20) + 'px';
                readButton.style.top = (event.clientY + window.scrollY - 40) + 'px';
                //readButton.style.left = (rect.left + window.scrollX - 25) + 'px';  // Position to the right of the selection
                //readButton.style.top = (rect.top + window.scrollY - 20) + 'px'; // Position slightly above the selection
                readButton.style.display = 'block'; // Show the button
                readButton.style.zIndex = '1000'; // Ensure button is above other content
                console.log("Button positioned at: left=" + readButton.style.left + ", top=" + readButton.style.top);

                // Store selected text for later use
                readButton.selectedText = selectedText;
            }
        } else {
            readButton.style.display = 'none'; // Hide the button if no text is selected
        }
    });

    // Button click event
    readButton.addEventListener('click', function() {
        var selectedText = window.getSelection().toString();
        console.log("Setting gainNode.gain.value to: ", gainNode.gain.value);
        if (isPlaying) {
            if (currentSource) {
                currentSource.stop(); // Stop currently playing audio
            }
            HideSpinner(buttonText); // Reset button to play state
            isPlaying = false; // Ensure state is updated
        } else {
            if (selectedText) {
                textToSpeech(selectedText);
            } else {
                alert("Please select some text first.");
            }
        }
    });

    // Create and style the control panel and sliders
    function createSlider(labelText, min, max, value, step, onChange) {
        var wrapper = document.createElement("div");
        var label = document.createElement("label");
        label.textContent = labelText;
        label.style.color = "white";
        label.style.textAlign = "right";
        label.style.flex = "1";

        var slider = document.createElement("input");
        slider.type = "range";
        slider.min = min;
        slider.max = max;
        slider.step = step;

        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.padding = '8px';

        var styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = `
        input[type='range'] {
            -webkit-appearance: none; appearance: none;
            width: 90%; height: 8px; border-radius: 8px;
            background: rgba(255, 255, 255, 0.2); outline: none;
            margin-right: 10px; margin-left: 0;
        }
        input[type='range']::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none;
            width: 16px; height: 16px; border-radius: 50%;
            background: #4CAF50; cursor: pointer; box-shadow: 0 0 2px #888;
        }
        input[type='range']:focus::-webkit-slider-thumb { background: #ccc; }
        `;
        document.head.appendChild(styleSheet);

        slider.oninput = function() {
            onChange(this.value);
        };
        wrapper.appendChild(label);
        wrapper.appendChild(slider);
        return {
            wrapper: wrapper,
            slider: slider
        };
    }

    // Style the control panel
    function styleControlPanel(panel) {
        panel.style.position = 'fixed';
        panel.style.bottom = '20px';
        panel.style.right = '80px';
        panel.style.width = '250px';
        panel.style.background = 'rgba(0, 0, 0, 0.7)';
        panel.style.borderRadius = '10px';
        panel.style.padding = '10px';
        panel.style.boxSizing = 'border-box';
        panel.style.visibility = 'hidden';
        panel.style.opacity = 0;
        panel.style.transition = 'opacity 0.5s, visibility 0.5s';
        panel.style.display = 'flex';
        panel.style.flexDirection = 'column';
        panel.style.zIndex = '10000';
    }



    // Style the button (OpenAI-inspired)
    function styleButton(button) {
        button.style.width = '30px';   // Slightly smaller
        button.style.height = '30px';  // Slightly smaller
        button.style.borderRadius = '5px'; // Less rounded
        button.style.backgroundColor = '#202123'; // Dark grey background
        button.style.border = '1px solid #545658';  // Subtle border
        button.style.outline = 'none';
        button.style.color = '#fff';    // White text
        button.style.cursor = 'pointer';
        button.style.transition = 'background-color 0.2s ease, border-color 0.2s ease';
        button.style.fontFamily = 'sans-serif'; // Use a basic sans-serif font

        button.addEventListener('mouseover', function() {
            this.style.backgroundColor = '#343536'; // Darker grey on hover
            this.style.borderColor = '#71797E';  // Lighter border on hover
        });

        button.addEventListener('mouseout', function() {
            this.style.backgroundColor = '#202123';
            this.style.borderColor = '#545658';
        });
    }

    function styleButtonText(text) {
        text.style.transition = 'opacity 0.4s ease';
        text.style.opacity = '1';
        text.style.fontSize = "15x"; // Slightly smaller
        text.style.fontWeight = 'bold';
        text.style.textAlign = "center";
        text.style.lineHeight = "30px";
    }

    //https://github.com/waxz/LibreTTS/blob/main/speakers.json
    function createVoiceSelect() {
        var selectWrapper = document.createElement("div");
        var select = document.createElement("select");

        var voice_json = {
            "alloy": "Alloy - 平衡中性",
            "echo": "Echo - 高级人工智能",
            "fable": "Fable - 英式语调",
            "onyx": "Onyx - 威严有力",
            "nova": "Nova - 温暖清晰",
            "shimmer": "Shimmer - 轻快乐观",
            "ash": "Ash - 中性平稳",
            "coral": "Coral - 温暖活力",
            "sage": "Sage - 睿智专业",
            "ballad": "Ballad - 情感丰富",
            "verse": "Verse - 饱满深沉"
        };

        var voices = ["nova", "onyx", "alloy", "echo", "fable", "shimmer"];
        var voiceLabel = document.createElement("label");
        voiceLabel.textContent = "Voice:";
        voiceLabel.style.color = "white";
        voiceLabel.style.marginRight = "5px";
        selectWrapper.appendChild(voiceLabel);
        for (var key in voice_json) {
            if (voice_json.hasOwnProperty(key)) { // Ensure it's a direct property of the object
                var value = voice_json[key];
                console.log("Key: " + key + ", Value: " + value);
                var option = document.createElement("option");
                option.value = key;
                option.textContent = value;
                select.appendChild(option);
            }
        }
        //for (var i = 0; i < voices.length; i++) {
        //    var option = document.createElement("option");
        //    option.value = voices[i];
        //    option.textContent = voices[i].charAt(0).toUpperCase() + voices[i].slice(1);
        //    select.appendChild(option);
        //}
        select.value = lastSelectedVoice; // Set initial value from localStorage
        selectWrapper.appendChild(select);
        styleSelect(selectWrapper, select);
        return {
            wrapper: selectWrapper,
            select: select
        };
    }

    // Style the dropdown
    function styleSelect(wrapper, select) {
        wrapper.style.padding = '5px';
        wrapper.style.marginBottom = '10px';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';

        select.style.flexGrow = '1';
        select.style.padding = '8px 10px';
        select.style.borderRadius = '8px';
        select.style.background = 'rgba(0, 0, 0, 0.7)';
        select.style.border = '2px solid #4CAF50';
        select.style.color = 'white';
        select.style.fontFamily = 'Arial, sans-serif';
        select.style.fontSize = '14px';
        select.style.direction = 'ltr';

        select.onmouseover = function() {
            this.style.backgroundColor = 'rgba(50, 50, 50, 0.5)';
        };
        select.onmouseout = function() {
            this.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        };
        select.onfocus = function() {
            this.style.outline = 'none';
            this.style.boxShadow = '0 0 5px rgba(81, 203, 238, 1)';
        };

        var styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = `
        select option { background: rgba(0, 0, 0, 0.9); color: white; }
        select option:checked { background: #4CAF50; color: white; }
        select option:hover { background: rgba(50, 50, 50, 0.8); color: white; }
        `;
        document.head.appendChild(styleSheet);
    }

    // Add the voice selection dropdown to the control panel
    var voiceSelect = createVoiceSelect();
    controlPanel.appendChild(voiceSelect.wrapper);
     // Save selected voice to localStorage
      voiceSelect.select.addEventListener('change', function() {
         lastSelectedVoice = this.value;
          localStorage.setItem('lastSelectedVoice', lastSelectedVoice);
      });


    function textToSpeech(s) {
        // ----- Modified line -----
        var sModelId = "gpt-4o-mini-tts"; // Changed from "tts-1" to "gpt-4o-mini-tts" for higher quality
        // ----- End of modified line -----
        var sVoiceId = voiceSelect.select.value;
        var API_KEY = YOUR_API_KEY; // Make sure this is set correctly at the top
        var BASE_URL = YOUR_BASE_URL;

        // Ensure API Key is present
        if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE" || API_KEY.length < 10) {
            alert("Please enter a valid OpenAI API key at the beginning of the script.");
            HideSpinner(buttonText);
            return;
        }


        ShowSpinner(buttonText); // Show loading indicator
        isProcessing = true;

        GM_xmlhttpRequest({
            method: "POST",
            url: BASE_URL,
            headers: {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "Authorization": "Bearer " + API_KEY
            },
            data: JSON.stringify({
                model: sModelId, // Now uses "gpt-4o-mini-tts"
                input: s,
                voice: sVoiceId,
                speed: parseFloat(playbackRate)
            }),
            responseType: "arraybuffer",

            onload: function(response) {
                isProcessing = false;
                if (response.status === 200) {
                    // Hide spinner isn't needed here, StopSpinner handles the transition
                    audioContext.decodeAudioData(response.response, function(buffer) {
                        var source = audioContext.createBufferSource();
                        source.buffer = buffer;
                        source.connect(gainNode);
                        source.start(0);
                        currentSource = source; // Save the new audio source
                        isPlaying = true;
                        StopSpinner(buttonText); // Update button text to pause state

                        // Listen for the audio end event
                        source.onended = function() {
                            isPlaying = false;
                            currentSource = null; // Clear the source
                            HideSpinner(buttonText); // Update button text to play state
                        }
                    }, function(e) {
                        console.error("Error decoding audio data: ", e);
                        HideSpinner(buttonText); // Ensure spinner hides on decode error
                        alert("An error occurred while processing the audio.");
                    });
                } else {
                    HideSpinner(buttonText);
                    console.error("Error loading TTS: ", response.status, response.statusText, response.response);
                    try {
                        var errorResponse = JSON.parse(new TextDecoder("utf-8").decode(response.response));
                        console.error("OpenAI Error:", errorResponse);
                        // Check for specific common errors
                        if (response.status === 401) {
                            alert("Authentication error (401). Please check your API key.");
                        } else if (errorResponse.error?.message) {
                            alert("Error from OpenAI: " + errorResponse.error.message);
                        } else {
                            alert("An error occurred while connecting to the text-to-speech service. Code: " + response.status);
                        }
                    } catch (e) {
                        alert("An error occurred while connecting to the text-to-speech service. Code: " + response.status);
                    }
                }
            },
            onerror: function(error) {
                isProcessing = false;
                HideSpinner(buttonText);
                console.error("GM_xmlhttpRequest error: ", error);
                alert("A network error or an API request error occurred.");
            }
        });
    }

    // Delay showing and hiding the control panel
    var panelDisplayDelay = 700;
    var panelHideDelay = 1500;
    var showPanelTimeout, hidePanelTimeout;

    readButton.addEventListener('mouseenter', function() {
        readButton.style.backgroundColor = '#45a049';
        clearTimeout(hidePanelTimeout);
        showPanelTimeout = setTimeout(function() {
            controlPanel.style.visibility = 'visible';
            controlPanel.style.opacity = 1;
        }, panelDisplayDelay);
    });

    readButton.addEventListener('mouseleave', function() {
        readButton.style.backgroundColor = '#4CAF50';
        clearTimeout(showPanelTimeout);
        hidePanelTimeout = setTimeout(function() {
            if (!controlPanel.matches(':hover')) {
                controlPanel.style.visibility = 'hidden';
                controlPanel.style.opacity = 0;
            }
        }, panelHideDelay);
    });

    controlPanel.addEventListener('mouseenter', function() {
        ispanelDisplay = true;
        clearTimeout(hidePanelTimeout);
        controlPanel.style.visibility = 'visible';
        controlPanel.style.opacity = 1;
    });

    controlPanel.addEventListener('mouseleave', function() {
        ispanelDisplay = false;
        hidePanelTimeout = setTimeout(function() {
            controlPanel.style.visibility = 'hidden';
            controlPanel.style.opacity = 0;
        }, panelHideDelay);
    });
    speedControl.slider.addEventListener('input', function() {
        playbackRate = this.value;
    });

    function ShowSpinner(text) {
        text.style.opacity = '0';
        setTimeout(function() {
            text.textContent = "...";
            text.style.opacity = '1';
        }, 400);
        readButton.disabled = true;
    }

    function HideSpinner(text) { // Resets button to 'Play' state
        text.style.opacity = '0';
        setTimeout(function() {
            text.textContent = "▶";
            text.style.opacity = '1';
        }, 400);
        readButton.disabled = false;
    }

    function StopSpinner(text) { // Sets button to 'Stop' state
        text.style.opacity = '0';
        setTimeout(function() {
            text.textContent = "❚❚";
            text.style.opacity = '1';
        }, 400);
        readButton.disabled = false; // Keep button enabled to allow stopping
    }
})();
