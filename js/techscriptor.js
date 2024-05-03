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
    // console.log(popoverTriggerList);
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
    return event.returnValue = "Are you sure you want to exit?";
};
function getReplacementString(i) {
    return "[#r" + i + "]";
}
function countWords(str) {
    const arr = str.split(' ');
    return arr.filter(word => word !== '').length;
}
function countSentences(str) {
    s = str.match(/[\w|\)][.?!](\s|$)/g);
    if (s == null) {
        return 0;
    }
    return s.length;
}
function updateView() {
    htmlOutput = md.render(editor.getValue());
    var replacements = [];
    const rulesPtBr = {
        "passiveVoice": {
            "regex": /\b((é|foi)|(são|eram)|(está|estava)|(seria|será)|(ser|estar))(\.|\,)?\s(\w+\s)?(\w+(ido|ado))(\s|\.|\,)/g,
            "message": "<em>Voz passiva:</em> Use a voz ativa.",
            "color": "#a0f0a0",
            "summary": " utilizações da voz passiva.",
            "summarySingle": " utilização da voz passiva."
        },
        "thereIsThereAre": {
            "regex": /\bTem (um|uma|alguns|algumas)\b/g,
            "message": "<em>Genérico:</em> Seja preciso.",
            "color": "#f0a0f0",
            "summary": " utilizações de <em>Tem</em>.",
            "summarySingle": " utilização de <em>Tem</em>."
        },
        "genericVerb": {
            "regex": /\b(acontece|muito|muita|ocorre|ocorrem)(s?)/g,
            "message": "<em>Verbo genérico:</em> Use verbos mais precisos.",
            "color": "#f0a0f0",
            "summary": " utilizações de verbos genéricos.",
            "summarySingle": " utilização de verbos genéricos."
        },
        "tooManyWords": {
            "regex": /(\w+\s){50,}/g,
            "message": "Esta frase tem muitas palavras. Considere dividir em frases menores.",
            "color": "#f0f0a0",
            "summary": " frases têm muitas palavras.",
            "summarySingle": " frase tem muitas palavras."
        },
        "repeatedWords": {
            "regex": /\b(\w+)\s+\1\b/g,
            "message": "Evite repetir a mesma palavra consecutivamente.",
            "color": "#f0f0a0",
            "summary": " repetições de palavras.",
            "summarySingle": " repetição de palavras."
        },
        "cliches": {
            "regex": /\b(às vezes|de vez em quando|em um piscar de olhos)\b/g,
            "message": "Evite clichês e expressões muito comuns.",
            "color": "#f0f0a0",
            "summary": " clichês ou expressões comuns.",
            "summarySingle": " clichê ou expressão comum."
        },
        // Adicione mais regras conforme necessário
    };
    var ruleReplacements = {}
    for (var label in rulesPtBr) {
        rule = rulesPtBr[label];
        ruleReplacements[label] = 0;
        htmlOutput = htmlOutput.replaceAll(rule["regex"], function (match) {
            replacements.push(getPopover(match, rule["message"], rule["color"]));
            ruleReplacements[label]++;
            return getReplacementString(replacements.length - 1);
        });
    }
    console.log(ruleReplacements);
    rulesSummary = "";
    for (var label in rulesPtBr) {
        var s = rulesPtBr[label]["summary"];
        if (ruleReplacements[label] == 1) {
            s = rulesPtBr[label]["summarySingle"];
        }
        rulesSummary += `<div class="rounded m-1 p-1 d-inline-block" style="background: ${rulesPtBr[label]["color"]};">
                            <span class="badge bg-secondary"> ${ruleReplacements[label]}</span>" 
                            ${s}  
                        </div>`;
    }
    document.getElementById('mdviewSummary').innerHTML = rulesSummary;
    for (let i = 0; i < replacements.length; i++) {
        htmlOutput = htmlOutput.replace(getReplacementString(i), replacements[i]);
    }
    htmlOutput = htmlOutput.replaceAll("<blockquote>", `<blockquote class="blockquote">`);
    htmlOutput = htmlOutput.replaceAll("<table>", `<table class="table table-bordered table-striped">`);
    document.getElementById('mdview').innerHTML = htmlOutput;
    outputWithoutHtml = htmlOutput.replace(/(<([^>]+)>)/ig, "");
    sentences = countSentences(outputWithoutHtml);
    words = countWords(outputWithoutHtml);
    characters = outputWithoutHtml.length - 1;
    if (characters < 0) {
        characters = 0;
    }
    warnings = replacements.length;
    document.getElementById('sentences').innerHTML = sentences;
    document.getElementById('words').innerHTML = words;
    document.getElementById('characters').innerHTML = characters;
    document.getElementById('warnings').innerHTML = warnings;
    warningsClass = "text-success";
    if (warnings / words > 0.03) {
        warningsClass = "text-warning";
    }
    if (warnings / words > 0.05) {
        warningsClass = "text-danger";
    }
    document.getElementById('warnings').className = warningsClass;
    loadPopovers();
    hljs.highlightAll();
    addEventListener("beforeunload", beforeUnloadListener, { capture: true });
}
updateView();
editor.session.on('change', function (delta) { updateView(); });
