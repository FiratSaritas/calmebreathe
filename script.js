const patterns = {
    relax: [4000, 4000, 6000],
    focus: [4000, 2000, 4000],
    sleep: [4000, 7000, 8000],
    silent: [4000, 4000, 6000]
};
patterns.endless = patterns.relax;

const startLabels = {
    relax: ['Enter Calm', 'Relax Now', 'Find Stillness'],
    focus: ['Get Focused', 'Center Yourself', 'Be Present'],
    sleep: ['Begin Unwinding', 'Ease into Sleep', 'Drift Off'],
    silent: ['Silent Intention', 'Peaceful Breathing', 'Quiet Mind']
};
startLabels.endless = ['Endless Calm', 'Timeless Session', 'Unlimited Peace'];

const moodOptionsEl = document.querySelector('#moodOptions');
const sceneOptionsEl = document.querySelector('#sceneOptions');
const durationOptionsEl = document.querySelector('#durationOptions');
const startButton = document.getElementById('startButton');
const breath = document.getElementById('breath');
const countdown = document.getElementById('countdown');
const preCountdown = document.getElementById('preCountdown');
const doneMessage = document.getElementById('doneMessage');
const sessionScreen = document.getElementById('session');
const welcomeScreen = document.getElementById('welcome');
const infoButton = document.getElementById('infoButton');
const infoModal = document.getElementById('infoModal');
const closeInfo = document.getElementById('closeInfo');

let mood, scene, duration;
let endTime, sessionInterval;

let intentionAudio = new Audio();
let sceneAudio = new Audio();
let hoverAudio = new Audio();
let selectedAudio = new Audio('sounds/selected.mp3');

let allowAudioRestart = true;

let canvas, ctx;
let waves = [];
let animationFrameId;

document.querySelectorAll('.option').forEach(option => {
    option.addEventListener('mouseenter', () => {
        const group = option.parentElement.id;
        let audioPath;

        if (group === 'moodOptions') {
            audioPath = `sounds/${option.dataset.value}.mp3`;
        } else if (group === 'sceneOptions') {
            audioPath = `sounds/${option.dataset.value}.mp3`;
        } else if (group === 'durationOptions') {
            audioPath = `sounds/ticking.mp3`;
        }

        if (audioPath) {
            hoverAudio.src = audioPath;
            hoverAudio.volume = 0.6;
            hoverAudio.currentTime = 0;
            const playPromise = hoverAudio.play();
            if (playPromise) playPromise.catch(e => {}); // Silently catch hover play error
        }
    });
    option.addEventListener('mouseleave', () => {
        hoverAudio.pause();
        hoverAudio.currentTime = 0;
    });

    option.addEventListener('click', () => {
        selectedAudio.currentTime = 0;
        const playPromise = selectedAudio.play();
        if (playPromise) playPromise.catch(e => {}); // Silently catch select play error
    });
});

document.querySelectorAll('.options').forEach(group => {
    group.addEventListener('click', e => {
        const selectedOption = e.target.closest('.option');
        if (!selectedOption) return;

        group.querySelectorAll('.option').forEach(opt => opt.classList.remove('active'));
        selectedOption.classList.add('active');
        updateStartButton();
    });
});

function updateStartButton() {
    const selectedMood = document.querySelector('#moodOptions .active')?.dataset.value;
    const selectedScene = document.querySelector('#sceneOptions .active')?.dataset.value;
    const selectedDuration = document.querySelector('#durationOptions .active')?.dataset.value;

    if (selectedMood && selectedScene && selectedDuration) {
        startButton.disabled = false;
        const currentPatternKey = selectedDuration === 'endless' ? 'endless' : selectedMood;
        const labels = startLabels[currentPatternKey] || startLabels.relax;
        const randomLabel = labels[Math.floor(Math.random() * labels.length)];
        startButton.textContent = randomLabel;
    } else {
        startButton.disabled = true;
        startButton.textContent = "Begin Session";
    }
}

class Wave {
    constructor(amp, freq, initialPhaseOffset, color) {
        this.amp = amp; // Max amplitude for this wave layer
        this.freq = freq; // Frequency of this wave layer
        this.basePhase = Math.random() * Math.PI * 2; // Random static phase offset for this wave
        this.phaseSpeed = (Math.random() * 0.003) + 0.0015; // Randomize speed (0.0015 to 0.0045)
        this.initialPhaseOffset = initialPhaseOffset; // Specific additional offset for layering
        this.color = color;
        this.currentPhase = 0; // This will be incremented to create movement
    }

    update() {
        this.currentPhase += this.phaseSpeed;
    }

    draw() {
        if (!ctx || !canvas) return;
        ctx.beginPath();
        const waveCenterY = canvas.height / 2;
        ctx.moveTo(0, waveCenterY);

        for (let x = 0; x < canvas.width; x++) {
            // Component 1 (Primary)
            let y1 = Math.sin(x * this.freq + this.currentPhase + this.basePhase + this.initialPhaseOffset);
            // Component 2 (Secondary, for texture)
            let y2 = Math.sin(x * (this.freq * 0.65) + (this.currentPhase * 0.75) + this.basePhase + this.initialPhaseOffset + Math.PI / 2.5);

            // Combine components and apply amplitude scaling
            // This makes `this.amp` the overall maximum deviation if components align perfectly.
            let y = waveCenterY + (y1 * this.amp * 0.65) + (y2 * this.amp * 0.35);

            ctx.lineTo(x, y);
        }

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 5; // Adjusted line width
        ctx.stroke();
    }
}

function startSession() {
    const startSound = new Audio('sounds/start.mp3');
    const playPromiseStart = startSound.play();
    if(playPromiseStart) playPromiseStart.catch(e => {});

    mood = document.querySelector('#moodOptions .active')?.dataset.value;
    scene = document.querySelector('#sceneOptions .active')?.dataset.value;
    const durationValue = document.querySelector('#durationOptions .active')?.dataset.value;

    if (!mood || !scene || !durationValue) {
        return;
    }

    if (durationValue === 'endless') {
        duration = 0;
    } else {
        duration = parseInt(durationValue);
    }

    canvas = document.getElementById('waveCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize waves with varied parameters for a layered effect
    waves = [
        new Wave(70, 0.012, 0,    'hsla(200, 70%, 60%, 0.25)'), // Amp, Freq, InitialPhaseOffset, Color
        new Wave(80, 0.009, 0.8,  'hsla(180, 65%, 50%, 0.2)'),
        new Wave(60, 0.015, 1.6,  'hsla(220, 75%, 55%, 0.15)')
    ];

    animateWaves();

    welcomeScreen.classList.remove('active');
    sessionScreen.classList.add('active');

    breath.style.display = 'flex';
    countdown.style.display = 'block';
    doneMessage.classList.remove('show-done');

    let countdownVal = 3;
    preCountdown.textContent = countdownVal;
    playSessionSounds();

    const preCountdownInterval = setInterval(() => {
        countdownVal--;
        if (countdownVal === 0) {
            preCountdown.textContent = '';
            clearInterval(preCountdownInterval);
            const startTime = Date.now();

            if (duration === 0) {
                endTime = Infinity;
                countdown.textContent = "";
            } else {
                endTime = startTime + duration * 60 * 1000;
            }

            const currentPatternKey = durationValue === 'endless' ? 'endless' : mood;
            breathe(patterns[currentPatternKey] || patterns.relax);
        } else {
            preCountdown.textContent = countdownVal;
        }
    }, 1000);
}

function animateWaves() {
    if (!ctx || !canvas) return;
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg').trim();
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    waves.forEach(wave => {
        wave.update();
        wave.draw();
    });

    animationFrameId = requestAnimationFrame(animateWaves);
}

function playSessionSounds() {
    allowAudioRestart = true;

    const intendedIntentionVol = (mood !== 'silent') ? 0.3 : 0;
    const intendedSceneVol = (scene !== 'silent') ? 1.0 : 0;

    [intentionAudio, sceneAudio].forEach(audio => {
        audio.pause();
        if (audio._mainAudioEndedHandler) audio.removeEventListener('ended', audio._mainAudioEndedHandler);
        if (audio._attemptCrossfadeHandler) audio.removeEventListener('timeupdate', audio._attemptCrossfadeHandler);
        audio.src = "";
    });

    if (mood !== 'silent') {
        intentionAudio.src = `sounds/${mood}.mp3`;
        intentionAudio.volume = 0;
        const playPromise = intentionAudio.play();
        if (playPromise) playPromise.catch(error => {});
        setupCrossfade(intentionAudio, () => intendedIntentionVol);
    }

    if (scene !== 'silent') {
        sceneAudio.src = `sounds/${scene}.mp3`;
        sceneAudio.volume = 0;
        const playPromise = sceneAudio.play();
        if (playPromise) playPromise.catch(error => {});
        setupCrossfade(sceneAudio, () => intendedSceneVol);
    }

    if ((mood !== 'silent' && intentionAudio.src) || (scene !== 'silent' && sceneAudio.src)) {
        let fadeDuration = 3000;
        let fadeSteps = 30;
        let currentStep = 0;

        if (window.audioFadeInterval) clearInterval(window.audioFadeInterval);

        window.audioFadeInterval = setInterval(() => {
            currentStep++;
            let progress = currentStep / fadeSteps;

            if (mood !== 'silent' && intentionAudio.src) {
                intentionAudio.volume = Math.min(intendedIntentionVol, intendedIntentionVol * progress);
            }
            if (scene !== 'silent' && sceneAudio.src) {
                sceneAudio.volume = Math.min(intendedSceneVol, intendedSceneVol * progress);
            }

            if (currentStep >= fadeSteps) {
                clearInterval(window.audioFadeInterval);
                if (mood !== 'silent' && intentionAudio.src) intentionAudio.volume = intendedIntentionVol;
                if (scene !== 'silent' && sceneAudio.src) sceneAudio.volume = intendedSceneVol;
            }
        }, fadeDuration / fadeSteps);
    }
}

function setupCrossfade(audioInstance, getTargetVolume) {
    const cloneForCrossfade = new Audio();
    let isCrossfadeInProgress = false;
    let crossfadeIntervalId = null;

    const mainAudioEndedHandler = () => {
        if (!allowAudioRestart) return;
        audioInstance.currentTime = 0;
        const playPromise = audioInstance.play();
        if (playPromise) playPromise.catch(e => {});
    };

    if (audioInstance._mainAudioEndedHandler) audioInstance.removeEventListener('ended', audioInstance._mainAudioEndedHandler);
    audioInstance.addEventListener('ended', mainAudioEndedHandler);
    audioInstance._mainAudioEndedHandler = mainAudioEndedHandler;

    const attemptCrossfadeHandler = () => {
        if (!allowAudioRestart || audioInstance.paused || !audioInstance.src || !audioInstance.duration || audioInstance.duration - audioInstance.currentTime > 2 || isCrossfadeInProgress) {
            return;
        }

        isCrossfadeInProgress = true;
        cloneForCrossfade.src = audioInstance.src;
        cloneForCrossfade.currentTime = 0;
        cloneForCrossfade.volume = 0;

        const playPromise = cloneForCrossfade.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                let fadeSteps = 20;
                let step = 0;
                const targetVolume = getTargetVolume();

                if (crossfadeIntervalId) clearInterval(crossfadeIntervalId);

                crossfadeIntervalId = setInterval(() => {
                    if (!allowAudioRestart && step > 0) {
                        clearInterval(crossfadeIntervalId);
                        cloneForCrossfade.pause();
                        cloneForCrossfade.currentTime = 0;
                        cloneForCrossfade.src = "";
                        isCrossfadeInProgress = false;
                        return;
                    }

                    step++;
                    const progress = step / fadeSteps;

                    cloneForCrossfade.volume = Math.min(targetVolume, targetVolume * progress);
                    audioInstance.volume = Math.max(0, targetVolume * (1 - progress));

                    if (step >= fadeSteps) {
                        clearInterval(crossfadeIntervalId);
                        audioInstance.pause();

                        audioInstance.src = cloneForCrossfade.src;
                        audioInstance.currentTime = 0;
                        audioInstance.volume = cloneForCrossfade.volume;

                        cloneForCrossfade.pause();
                        cloneForCrossfade.src = "";

                        if (allowAudioRestart && audioInstance.src) {
                            const mainPlayPromise = audioInstance.play();
                            if(mainPlayPromise) mainPlayPromise.catch(e => {});
                        } else {
                            audioInstance.pause();
                        }
                        isCrossfadeInProgress = false;
                    }
                }, 100);
            }).catch(error => {
                isCrossfadeInProgress = false;
            });
        } else {
            isCrossfadeInProgress = false;
        }
    };

    if (audioInstance._attemptCrossfadeHandler) audioInstance.removeEventListener('timeupdate', audioInstance._attemptCrossfadeHandler);
    audioInstance.addEventListener('timeupdate', attemptCrossfadeHandler);
    audioInstance._attemptCrossfadeHandler = attemptCrossfadeHandler;
}

function breathe([inTime, holdTime, outTime]) {
    function cycle() {
        if (duration !== 0 && Date.now() >= endTime) {
            return endSession();
        }
        breath.style.transition = `transform ${inTime/1000}s ease-in-out`;
        breath.style.transform = 'scale(1.3)';

        setTimeout(() => {
            if (duration !== 0 && Date.now() >= endTime && !allowAudioRestart) return;
            setTimeout(() => {
                if (duration !== 0 && Date.now() >= endTime && !allowAudioRestart) return;
                breath.style.transition = `transform ${outTime/1000}s ease-in-out`;
                breath.style.transform = 'scale(1)';

                setTimeout(() => {
                    if (allowAudioRestart) {
                        cycle();
                    }
                }, outTime);
            }, holdTime);
        }, inTime);
    }

    if (allowAudioRestart) {
        cycle();
    }

    if (duration !== 0) {
        if (sessionInterval) clearInterval(sessionInterval);
        sessionInterval = setInterval(() => {
            const remaining = Math.max(0, endTime - Date.now());
            if (remaining === 0 && duration !== 0) {
                endSession();
                return;
            }
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            countdown.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }, 1000);
    }
}

function endSession() {
    allowAudioRestart = false;

    if (window.audioFadeInterval) clearInterval(window.audioFadeInterval);

    if (typeof animationFrameId !== 'undefined') {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = undefined;
    }
    if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (typeof sessionInterval !== 'undefined') {
        clearInterval(sessionInterval);
        sessionInterval = undefined;
    }

    [intentionAudio, sceneAudio].forEach(audio => {
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    });

    breath.style.transform = 'scale(1)';
    breath.style.display = 'none';
    countdown.style.display = 'none';
    doneMessage.classList.add('show-done');

    setTimeout(() => {
        doneMessage.classList.remove('show-done');
        sessionScreen.classList.remove('active');
        welcomeScreen.classList.add('active');

        document.querySelectorAll('#moodOptions .active, #sceneOptions .active, #durationOptions .active').forEach(opt => {
            opt.classList.remove('active');
        });
        updateStartButton();
    }, 3000);
}

window.addEventListener('resize', () => {
    if (canvas && sessionScreen.classList.contains('active')) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});

startButton.addEventListener('click', startSession);

infoButton.addEventListener('click', () => {
    infoModal.style.display = 'flex';
});
closeInfo.addEventListener('click', () => {
    infoModal.style.display = 'none';
});
infoModal.addEventListener('click', e => {
    if (e.target === infoModal) {
        infoModal.style.display = 'none';
    }
});

// Initial call to disable button and set text
updateStartButton();