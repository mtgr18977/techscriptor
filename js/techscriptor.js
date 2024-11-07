// Inicialização do editor permanece a mesma
var editor = ace.edit("editor");
editor.setTheme("ace/theme/chrome");
editor.session.setMode("ace/mode/markdown");
editor.setOptions({
    fontSize: 14,
    vScrollBarAlwaysVisible: true,
    wrap: true
});

function loadPopovers() {
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (element) {
        return new bootstrap.Popover(element, {
            trigger: 'hover focus',
            html: true
        });
    });
}

function getPopover(text, message, color) {
    return `<span style="background: ${color};" tabindex="0" data-bs-toggle="popover"
            data-bs-trigger="focus" data-bs-placement="top" data-bs-content="${message}">
                ${text}
            </span>`;
}

var md = window.markdownit().use(window.markdownitFootnote);

const beforeUnloadListener = (event) => {
    event.preventDefault();
    return event.returnValue = "Você tem certeza que deseja sair?";
};

function countWords(str) {
    const arr = str.trim().split(/\s+/);
    return arr.filter(word => word !== '').length;
}

function countSentences(str) {
    const matches = str.match(/[^\.!\?]+[\.!\?]+/g);
    return matches ? matches.length : 0;
}

// Regras revisadas e melhoradas
const rulesPtBr = {
    "vozPassiva": {
        "regex": /\b(foi|foram|será|serão|é|são|era|eram|seja|sejam|fosse|fossem)\s+(\w+?)(ado|ido|ada|ida|ados|idos|adas|idas)\b/gi,
        "message": "<em>Voz passiva:</em> Considere usar a voz ativa.",
        "color": "#a0f0a0",
        "summary": " utilizações de voz passiva.",
        "summarySingle": " utilização de voz passiva."
    },
    "expressaoGenerica": {
        "regex": /\b(tem|existem|há)\s+(algum|alguma|alguns|algumas|vários|várias|muitos|muitas)\b/gi,
        "message": "<em>Expressão genérica:</em> Seja mais específico.",
        "color": "#f0a0f0",
        "summary": " expressões genéricas detectadas.",
        "summarySingle": " expressão genérica detectada."
    },
    "verboGenerico": {
        "regex": /\b(acontece|acontecem|ocorre|ocorrem|sucede|sucedem|efetua|efetuam|realiza|realizam)\b/gi,
        "message": "<em>Verbo genérico:</em> Use verbos mais específicos.",
        "color": "#f0a0f0",
        "summary": " utilizações de verbos genéricos.",
        "summarySingle": " utilização de verbo genérico."
    },
    "fraseLonga": {
        "regex": /([^\.\?\!]*[^\.\?\!])/g,
        "message": "Esta frase é muito longa. Considere dividir em sentenças menores.",
        "color": "#f0f0a0",
        "summary": " frases longas detectadas.",
        "summarySingle": " frase longa detectada.",
        "condition": function (match) {
            // Conta palavras na frase
            const wordCount = match.trim().split(/\s+/).length;
            return wordCount > 40; // Exemplo: frases com mais de 40 palavras
        }
    },
    "palavrasRepetidas": {
        "regex": /\b(\w+)\b\s+\b\1\b/gi,
        "message": "Evite repetir a mesma palavra consecutivamente.",
        "color": "#f0f0a0",
        "summary": " repetições de palavras.",
        "summarySingle": " repetição de palavra."
    },
    "cliches": {
        "regex": /\b(a nível de|com certeza|dito isso|ou seja|de certa forma|literalmente)\b/gi,
        "message": "Evite clichês e expressões muito usadas.",
        "color": "#f0f0a0",
        "summary": " clichês detectados.",
        "summarySingle": " clichê detectado."
    },
    // Adicione mais regras conforme necessário
};

function updateView() {
    // Renderiza o Markdown em um elemento DOM
    var mdContent = md.render(editor.getValue());
    var parser = new DOMParser();
    var doc = parser.parseFromString(mdContent, 'text/html');

    var ruleReplacements = {};
    for (var label in rulesPtBr) {
        ruleReplacements[label] = 0;
    }

    function traverseNodes(node) {
        // Se for um nó de texto, aplicar as regras
        if (node.nodeType === Node.TEXT_NODE) {
            var textContent = node.textContent;
            var parent = node.parentNode;

            var hasMatch = false;
            var newContent = document.createDocumentFragment();

            for (var label in rulesPtBr) {
                var rule = rulesPtBr[label];
                var regex = new RegExp(rule.regex); // Criar uma nova instância para evitar problemas com lastIndex
                var lastIndex = 0;
                var match;

                while ((match = regex.exec(textContent)) !== null) {
                    // Se houver uma condição adicional, verificar
                    if (rule.condition && !rule.condition(match[0])) {
                        continue;
                    }

                    hasMatch = true;

                    // Adiciona o texto antes da correspondência
                    if (match.index > lastIndex) {
                        newContent.appendChild(document.createTextNode(textContent.substring(lastIndex, match.index)));
                    }

                    // Cria o elemento com popover
                    var span = document.createElement('span');
                    span.setAttribute('style', `background: ${rule.color};`);
                    span.setAttribute('tabindex', '0');
                    span.setAttribute('data-bs-toggle', 'popover');
                    span.setAttribute('data-bs-trigger', 'focus');
                    span.setAttribute('data-bs-placement', 'top');
                    span.setAttribute('data-bs-content', rule.message);
                    span.textContent = match[0];
                    newContent.appendChild(span);

                    ruleReplacements[label]++;

                    lastIndex = match.index + match[0].length;

                    // Prevenir loops infinitos em regexes vazias
                    if (match.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }
                }

                // Se houve correspondência, adiciona o texto restante
                if (hasMatch) {
                    if (lastIndex < textContent.length) {
                        newContent.appendChild(document.createTextNode(textContent.substring(lastIndex)));
                    }
                    break; // Evita aplicar múltiplas regras no mesmo trecho
                }
            }

            if (hasMatch) {
                parent.replaceChild(newContent, node);
            }
        } else {
            // Se for outro tipo de nó, percorrer os filhos
            var children = Array.from(node.childNodes); // Cria uma cópia da lista de filhos
            for (var i = 0; i < children.length; i++) {
                traverseNodes(children[i]);
            }
        }
    }

    traverseNodes(doc.body);

    // Atualiza o resumo das regras aplicadas
    var rulesSummary = "";
    for (var label in rulesPtBr) {
        var count = ruleReplacements[label];
        var summaryText = count === 1 ? rulesPtBr[label].summarySingle : rulesPtBr[label].summary;
        rulesSummary += `<div class="rounded m-1 p-1 d-inline-block" style="background: ${rulesPtBr[label].color};">
                            <span class="badge bg-secondary">${count}</span>
                            ${summaryText}
                         </div>`;
    }
    document.getElementById('mdviewSummary').innerHTML = rulesSummary;

    // Atualiza o conteúdo do visualizador
    document.getElementById('mdview').innerHTML = doc.body.innerHTML;

    // Atualiza as estatísticas
    var outputText = doc.body.textContent || "";
    var sentences = countSentences(outputText);
    var words = countWords(outputText);
    var characters = outputText.length;
    var warnings = Object.values(ruleReplacements).reduce((a, b) => a + b, 0);

    document.getElementById('sentences').innerHTML = sentences;
    document.getElementById('words').innerHTML = words;
    document.getElementById('characters').innerHTML = characters;
    document.getElementById('warnings').innerHTML = warnings;

    var warningsRatio = warnings / words;
    var warningsClass = "text-success";
    if (warningsRatio > 0.05) {
        warningsClass = "text-danger";
    } else if (warningsRatio > 0.03) {
        warningsClass = "text-warning";
    }
    document.getElementById('warnings').className = warningsClass;

    loadPopovers();
    hljs.highlightAll();
    addEventListener("beforeunload", beforeUnloadListener, { capture: true });
}

// Chama updateView inicialmente e ao mudar o conteúdo do editor
updateView();

let debounceTimer;
editor.session.on('change', function (delta) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateView, 300);
});
