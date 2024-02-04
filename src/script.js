document.addEventListener('DOMContentLoaded', function () {
    var link = document.getElementById('baseStyle');
    link.rel = 'stylesheet';
});

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
    let parts = value.split(/([+\-*/])/);

    parts = parts.map(part => {
        if (!isNaN(part.replace(/'/g, '').replace(/\./g, ''))) {
            part = part.replace(/'/g, '');

            let numberParts = part.split('.');
            let integerPart = numberParts[0];

            integerPart = integerPart.split('').reverse().join('')
                .replace(/(\d{3})(?=\d)/g, '$1\'')
                .split('').reverse().join('');

            part = integerPart;
            if (numberParts.length > 1) {
                part += '.' + numberParts[1];
            }
        }
        return part;
    });

    value = parts.join('');

    value = value.replace(/,/g, '.');
    value = value.replace(/(^|[+\-*/])(?=\.)/g, '$10');
    value = value.replace(/(\.\d*)\./g, '$1');
    value = value.replace(/([+\-*/])([+\-*/])+$/g, '$1');
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
        let buttonAnimation = 'button-click 0.2s ease-out';
        if ("=".includes(e.target.innerText)) {
            buttonAnimation = 'button-click-equal 0.5s ease-out';
        }
        else if ("delete".includes(e.target.innerText)) {
            button.classList.remove('fadeDown');
            buttonAnimation = 'button-click-delete 0.5s ease-out';
        }
        button.style.animation = buttonAnimation;

        handleKey(e.target.innerText);
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

function handleKey(key) {

    if (key === '.') {
        clickCount++;
    }
    else {
        clickCount = 0;
    }

    if (clickCount == 10) {
        versionText.classList.add('visible');
    }

    switch (key) {
        case 'delete':
            display.value = '';

            display.style.animation = 'none';
            void display.offsetWidth;
            display.style.animation = 'clear 0.34s';
            break;
        case 'undo':
            undo();
            break;
        case '=':
            calculate();
            break;
        default:
            if (!"+-*/1234567890.,".includes(key)) {
                break;
            }

            if (display.value === "Not valid") {
                display.value = '';
            }

            let lastChar = display.value[display.value.length - 1];
            if ("+-*/".includes(lastChar) && "+-*/".includes(key)) {
                display.value = display.value.slice(0, -1) + key;
            } else {
                if ("+-*/".includes(key)) {
                    if ((display.value === '' || display.value === '0') && "-".includes(key)) {
                        display.value = key;
                    }
                    else if (display.value === '') {
                        display.value = 0;
                        display.value += ' ' + key;
                    }
                    else {
                        display.value += ' ' + key;
                    }
                } else {
                    if (display.value === "" && key === "0") {
                        display.value += key + "" + key;
                    }
                    else if (display.value === "0") {
                        display.value = key;
                    }
                    else {
                        display.value += key;
                    }
                }
            }

            display.value = standardizeDisplayValue(display.value);

            display.scrollLeft = display.scrollWidth;
    }
}

function undo() {
    if (display.value === "Not valid") {
        display.value = '';
    }
    display.value = standardizeDisplayValue(display.value.replace(/ *.$/, ''));
}

function calculate() {
    let result = "Not valid";
    if (display.value != "Not valid") {
        try {
            result = calculateExpression(display.value.replace(/\s/g, ''));
        }
        catch {
            result = "Not valid";
        }

        if (isNaN(result) || !isFinite(result)) {
            result = "Not valid";
        }
        else {
            result = standardizeDisplayValue(result.toString());
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
}

document.addEventListener('keydown', function (event) {
    const calculatorVisible = document.getElementById('storagePopup').classList.contains('visible') === false;
    if (calculatorVisible) {
        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                calculate();
                break;
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
            case '+':
            case '-':
            case '*':
            case '/':
            case '.':
            case ',':
            case '=':
                handleKey(event.key);
                break;
            case 'Backspace':
            case 'Delete':
                undo();
                break;
            default:
                break;
        }
    }
});

function calculateExpression(expression) {
    //console.log('Expression: ' + expression);
    expression = expression.replace(/\s/g, '').replace(/'/g, '');
    expression = expression.replace(/(^|[\+\-\*\/\(])\-/g, '$1~');

    let tokens = expression.match(/(?:\~?\d+\.\d+)|(?:\~?\d+)|[+\-*\/]/g);
    if (!tokens) {
        throw new Error('Invalid expression');
    }

    tokens = tokens.map(token => token.startsWith('~') ? '-' + token.slice(1) : token);

    let applyOperator = (a, b, op) => {
        switch (op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/':
                if (b === 0) throw new Error('Division by zero');
                return a / b;
            default: throw new Error('Unknown operator');
        }
    };

    let evaluate = (values, ops) => {
        let b = values.pop();
        let a = values.pop();
        let op = ops.pop();
        return values.push(applyOperator(a, b, op));
    };

    let values = [];
    let ops = [];
    let precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };

    tokens.forEach(token => {
        //console.log('Token: ' + token);
        if (!isNaN(token)) {
            values.push(parseFloat(token));
        } else {
            while (ops.length && precedence[token] <= precedence[ops[ops.length - 1]]) {
                evaluate(values, ops);
            }
            ops.push(token);
        }
    });

    while (ops.length) {
        evaluate(values, ops);
    }

    return values.pop();
}

function runTests() {
    const testCases = [
        { expression: "-8 + 8", expected: 0 },
        { expression: "-8 + -8", expected: -16 },
        { expression: "-8 - -8", expected: 0 },
        { expression: "-8 - - 8", expected: 0 },
        { expression: "-4 - 4", expected: -8 },
        { expression: "-4-4", expected: -8 },
        { expression: "0 + 1 * 420", expected: 420 },
        { expression: "-247", expected: -247 },
        { expression: "3 + 2 * 2", expected: 7 },
        { expression: "3 * 2 + 2", expected: 8 },
        { expression: "4 / 2 + 6", expected: 8 },
        { expression: "10 - 2 / 2", expected: 9 },
        { expression: "-5 * 5", expected: -25 },
        { expression: "-5.5 * 2", expected: -11 },
        { expression: "2 + -2", expected: 0 },
        { expression: "2 + 2 * -2", expected: -2 },
        { expression: "2.5 * 2", expected: 5 },
        { expression: "3 + 3 * 4 - 6 / 2", expected: 12 },
        { expression: "2 + 2 * 2 / 2 - 2", expected: 2 },
        { expression: "0 - 4.2", expected: -4.2 },
        { expression: "0.5 * 2", expected: 1 },
        { expression: "1 / 0", expected: 'error' },
    ];

    let errors = [];
    testCases.forEach((test, index) => {
        let result;
        try {
            result = calculateExpression(test.expression);
            if (result !== test.expected) {
                errors.push(`Test ${index + 1} failed > Expected ${test.expected} but got ${result}`);
            }
        } catch (error) {
            if (test.expected === 'error') {
                // Correct error was thrown
            } else {
                errors.push(`Test ${index + 1} failed > Unexpected error thrown`);
            }
        }
    });

    if (errors.length > 0) {
        alertPopup('Calculator currently not working as expected (please report the following to us): ' + errors.join(' | '));
        console.error(errors.join(' | '));
    }
}

runTests();

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