if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/calculator/service-worker.js?v=1.7.8').then(function (registration) {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function (err) {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}

let deferredPrompt;

const installButton = document.getElementById('installButton');

if (installButton) {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installButton.style.display = 'block';
    });

    installButton.addEventListener('click', (e) => {
        //document.getElementById('installButton').style.display = 'none';
        installButton.style.animation = 'click 0.5s';
        installButton.addEventListener('animationend', () => {
            installButton.style.animation = '';
        });
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                installButton.style.animation = 'popNoBackground 0.5s';
            } else {
                installButton.style.animation = 'clear 0.34s';
                deferredPrompt = null;
            }
        });
    });
    installButton.addEventListener('animationend', () => {
        installButton.style.animation = '';
    });

    window.addEventListener('appinstalled', () => {
        installButton.style.display = 'none';
        deferredPrompt = null;
    });
}

let display = document.querySelector('.display');
let buttons = Array.from(document.querySelectorAll('button.calculator-button'));

function standardizeDisplayValue(value) {
    value = value.replace(/,/g, '.');
    value = value.replace(/(^|[+\-*/])(?=\.)/g, '$10');
    value = value.replace(/(\.\d*)\./g, '$1');
    value = value.replace(/([+\-*/])([+\-*/])+$/g, '$1');
    /*value = value.replace(/\.([+\-*         /])/g, '.$1');*/
    value = value.replace(/([+\-*/])\./g, '$10.');
    value = value.replace(/([+\-*/])\s([+\-*/])/g, '$1');
    value = value.replace(/(\d)\s+(\d)/g, '$1$2');
    value = value.replace(/([+\-*/])(\d)/g, '$1 $2');
    value = value.replace(/(\d)([+\-*/])/g, '$1 $2');
    if (value === " ") {
        value = "";
    }
    return value;
}

let clickCount = 0;
const versionText = document.getElementById('versionText');

buttons.forEach(button => {
    button.addEventListener('click', (e) => {
        button.style.animation = 'none';
        void button.offsetWidth;
        $buttonAnimation = 'button-click 0.2s ease-out';
        if ("=".includes(e.target.innerText)) {
            $buttonAnimation = 'button-click-equal 0.5s ease-out';
        }
        else if ("delete".includes(e.target.innerText)) {
            button.classList.remove('fadeDown');
            $buttonAnimation = 'button-click-delete 0.5s ease-out';
        }
        button.style.animation = $buttonAnimation;

        if (e.target.innerText === '.') {
            clickCount++;
        }
        else {
            clickCount = 0;
        }

        if (clickCount == 10) {
            versionText.classList.add('visible');
        }

        switch (e.target.innerText) {
            case 'delete':
                display.value = '';

                display.style.animation = 'none';
                void display.offsetWidth;
                display.style.animation = 'clear 0.34s';
                break;
            case 'undo':
                if (display.value === "Not valid") {
                    display.value = '';
                }
                display.value = standardizeDisplayValue(display.value.replace(/ *.$/, ''));
                break;
            case '=':

                let result = "Not valid";
                if (display.value != "Not valid") {
                    try {
                        result = eval(display.value.replace(/\s/g, ''));
                    }
                    catch {
                        result = "Not valid";
                    }
                    if (isNaN(result) || !isFinite(result)) {
                        result = "Not valid";
                    }
                }

                display.style.animation = 'none';
                void display.offsetWidth;

                if (display.value != result) {
                    display.style.animation = 'pop 0.5s';
                }
                else {
                    display.style.animation = 'border 2s ease-out';
                }
                display.value = result;

                break;
            default:
                if (!"+-*/1234567890.,".includes(e.target.innerText)) {
                    break;
                }

                if (display.value === "Not valid") {
                    display.value = '';
                }

                let lastChar = display.value[display.value.length - 1];
                if ("+-*/".includes(lastChar) && "+-*/".includes(e.target.innerText)) {
                    display.value = display.value.slice(0, -1) + e.target.innerText;
                } else {
                    if ("+-*/".includes(e.target.innerText)) {
                        if (display.value === '') {
                            display.value = 0;
                        }
                        display.value += ' ' + e.target.innerText;
                    } else {
                        if (display.value === "" && e.target.innerText === "0") {
                            display.value += e.target.innerText + "" + e.target.innerText;
                        }
                        else if (display.value === "0") {
                            display.value = e.target.innerText;
                        }
                        else {
                            display.value += e.target.innerText;
                        }
                    }
                }

                display.value = standardizeDisplayValue(display.value);

                display.scrollLeft = display.scrollWidth;
        }
    });
    button.addEventListener('animationend', () => {
        button.style.animation = '';
    });
    button.addEventListener('pointerup', () => {
        button.blur();
    });
    button.addEventListener('touchend', () => {
        button.blur();
    });
});

display.addEventListener('input', (e) => {
    if (e.inputType !== 'deleteContentBackward' && e.inputType !== 'deleteContentForward') {
        e.target.value = e.target.value.replace(/[^0-9+\-*/.,\s]/g, '');
        let lastChar = e.target.value.slice(-1);
        let secondLastChar = e.target.value.slice(-2, -1);
        if ('+-*/'.includes(lastChar) && secondLastChar != ' ') {
            e.target.value = e.target.value.slice(0, -1) + ' ' + lastChar;
        }
        e.target.value = standardizeDisplayValue(e.target.value);
    }
});

display.addEventListener('animationend', () => {
    display.style.animation = '';
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && display.value != 'Not valid' && display.value != '') {
        let result = eval(display.value.replace(/\s/g, ''));
        if (isNaN(result) || !isFinite(result)) {
            result = "Not valid";
        }
        display.value = result;
        display.style.animation = 'pop 0.5s';
    }
});

let scale = parseFloat(localStorage.getItem('friendlyCalculatorScale')) || 1;
document.querySelector('.calculator-wrap').style.transform = `scale(${scale})`;

const increaseButton = document.getElementById("increase");
const decreaseButton = document.getElementById("decrease");

checkScaleButtons();

function checkScaleButtons() {
    increaseButton.disabled = scale >= 1;
    decreaseButton.disabled = scale <= 0.4;
}

increaseButton.addEventListener("click", function () {
    scale += 0.1;
    if (scale > 1) {
        scale = 1;
    }
    document.querySelector('.calculator-wrap').style.transform = `scale(${scale})`;

    checkScaleButtons();

    if (localStorage.getItem('friendlyCalculatorStorageAcknoledgement')) {
        localStorage.setItem('friendlyCalculatorScale', scale);
    }
});

decreaseButton.addEventListener("click", function () {
    scale -= 0.1;
    if (scale < 0.4) {
        scale = 0.4;
    }
    document.querySelector('.calculator-wrap').style.transform = `scale(${scale})`;

    checkScaleButtons();

    if (localStorage.getItem('friendlyCalculatorStorageAcknoledgement')) {
        localStorage.setItem('friendlyCalculatorScale', scale);
    }
});

const sizeButtons = document.querySelector('.sizeButtons');
let sizeButtonsRect = sizeButtons.getBoundingClientRect();
const maxDistance = 400;
document.addEventListener('mousemove', function (e) {
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const distX = Math.abs(mouseX - sizeButtonsRect.left);
    const distY = Math.abs(mouseY - sizeButtonsRect.top - sizeButtonsRect.height * 0.5);

    const distance = Math.hypot(distX, distY);

    const opacity = Math.min(Math.max(1 - distance / maxDistance, 0.4), 1);

    sizeButtons.style.opacity = opacity;
});

window.addEventListener('resize', function () {
    checkScaleOnResize();
});

function checkScaleOnResize() {
    sizeButtonsRect = sizeButtons.getBoundingClientRect();
    let width = window.innerWidth;
    let height = window.innerHeight;

    if (((width < 550 || height < 680) || (width < 680 && height < 590)) && scale != 1) {
        document.querySelector('.calculator-wrap').style.transform = `scale(1)`;

        checkScaleButtons();
    }
    else {
        document.querySelector('.calculator-wrap').style.transform = `scale(${scale})`;
    }
}

window.addEventListener('resize', updateCalculatorSize);

function updateCalculatorSize() {
    var calculator = document.querySelector('.calculator');
    var calculatorWrap = document.querySelector('.calculator-wrap');
    var aspectRatio = calculator.offsetWidth / calculator.offsetHeight;

    if (window.innerHeight < window.innerWidth) {
        calculatorWrap.style.height = '100vh';
        calculatorWrap.style.width = (window.innerHeight * 1 * aspectRatio) + 'px';
    } else {
        calculatorWrap.style.width = '';
        calculatorWrap.style.height = '';
    }
}

window.addEventListener('load', function () {
    updateCalculatorSize();
    checkScaleOnResize();
});

const footer = document.querySelector('#infoBox');
const menuButton = document.getElementById('menu-button');
let footerVisible = false;

footer.style.transform = 'translateY(100%)';
menuButton.style.transform = 'translateY(0)';

menuButton.addEventListener('click', function () {
    if (!footerVisible) {
        footer.style.transform = 'translateY(0)';
        menuButton.style.transform = `translateY(-${footer.offsetHeight}px)`;
    } else {
        footer.style.transform = 'translateY(100%)';
        menuButton.style.transform = 'translateY(0)';
    }

    footerVisible = !footerVisible;
});

const switchThemeButton = document.getElementById('switch-theme');
let themes = Array.from(document.querySelectorAll('.theme'));
let currentThemeIndex = Number(localStorage.getItem('friendlyCalculatorThemeIndex')) || 0;

themes.forEach((theme, index) => theme.disabled = index != currentThemeIndex);

switchThemeButton.addEventListener('click', function (event) {
    event.preventDefault();
    switchThemeButton.style.animation = 'click 0.5s';
    switchThemeButton.addEventListener('animationend', () => {
        switchThemeButton.style.animation = '';
    });
    themes[currentThemeIndex].disabled = true;
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    themes[currentThemeIndex].disabled = false;

    if (localStorage.getItem('friendlyCalculatorStorageAcknoledgement')) {
        localStorage.setItem('friendlyCalculatorThemeIndex', currentThemeIndex);
    }
});

const storagePopup = document.getElementById('storagePopup');
const acceptStoragButton = document.getElementById('acceptStorage');
const declineStoragButton = document.getElementById('declineStorage');

document.addEventListener("DOMContentLoaded", function () {
    updateCalculatorSize();

    if (!localStorage.getItem('friendlyCalculatorStorageAcknoledgement')) {
        storagePopup.classList.remove("initial-hide");
        storagePopup.classList.add('visible');
    }
});

acceptStoragButton.addEventListener('click', function (event) {
    acceptStoragButton.style.animation = 'click 0.5s';
    acceptStoragButton.addEventListener('animationend', () => {
        acceptStoragButton.style.animation = '';
    });
    localStorage.setItem('friendlyCalculatorStorageAcknoledgement', 'true');
    localStorage.setItem('friendlyCalculatorThemeIndex', currentThemeIndex);
    localStorage.setItem('friendlyCalculatorScale', scale);
    storagePopup.classList.remove("initial-hide");
    storagePopup.classList.remove('visible');
});

declineStoragButton.addEventListener('click', function (event) {
    declineStoragButton.style.animation = 'clear 0.34s';
    declineStoragButton.addEventListener('animationend', () => {
        declineStoragButton.style.animation = '';
    });
    localStorage.removeItem('friendlyCalculatorStorageAcknoledgement');
    localStorage.removeItem('friendlyCalculatorThemeIndex');
    localStorage.removeItem('friendlyCalculatorScale');
    storagePopup.classList.remove("initial-hide");
    storagePopup.classList.remove('visible');
});

const openStoragePopupButton = document.getElementById('openStoragePopupButton');
openStoragePopupButton.addEventListener('click', function (event) {
    storagePopup.classList.remove("initial-hide");
    storagePopup.classList.add('visible');
});