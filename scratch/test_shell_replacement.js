const SHELL_PREFIX = "\u001A::SVAR::";
const SHELL_SUFFIX = "::\u001A";

let text = "cat a | grep b\nif (a || b)\necho $PATH\necho $USER\ncheck status $?";
const shellTokens = [];

text = text.replace(/\$\{([A-Za-z0-9_?#$!*@-]{1,64})\}/g, (match) => {
    const token = `${SHELL_PREFIX}${shellTokens.length}${SHELL_SUFFIX}`;
    shellTokens.push(match);
    return token;
});

text = text.replace(/\$(PATH|USER|HOME|SHELL|TERM|PWD|LANG|LC_[A-Z]+|EDITOR|TEMP|TMP|UID|PID|IFS|OPTARG|OPTIND|HOSTNAME|\?|[0-9]+|\$|!|#|\*|@)\b/g, (match) => {
    const token = `${SHELL_PREFIX}${shellTokens.length}${SHELL_SUFFIX}`;
    shellTokens.push(match);
    return token;
});

text = text.replace(/(^|[\s"'(;,=\\/:|&])\$([a-zA-Z_][a-zA-Z0-9_]*)(?![a-zA-Z0-9_]*\$)/g, (_match, prefix, varName) => {
    const token = `${SHELL_PREFIX}${shellTokens.length}${SHELL_SUFFIX}`;
    shellTokens.push(`$${varName}`);
    return `${prefix}${token}`;
});

text = text.replace(/([a-zA-Z])_(\d+)/g, "$1$2");

for (let i = 0; i < shellTokens.length; i++) {
    text = text.split(`${SHELL_PREFIX}${i}${SHELL_SUFFIX}`).join(shellTokens[i]);
}

console.log("Restored text:\n" + text);
