// Generate she-bang scripts/ojobs
// Copyright 2023 Nuno Aguiar

var tmpl = "#!/usr/bin/env {{openAFPath}}oaf-sb\n\nvar params = processExpr(\" \");\n// sprint(params)\n\n";
var tmplJ = "#!/usr/bin/env {{openAFPath}}ojob-sb\n\n"

var isoJob = false
var isWin = String(java.lang.System.getProperty("os.name")).match(/Windows/)
if (io.fileExists(expr)) {
    if (!expr.endsWith(".js")) isoJob = true
    if (io.readFileString(expr).replace(/\n/g, "").trim().substring(0, 2) == "#!") 
        logWarn("Shebang entry on file '" + expr + "' detected. Ignoring request.");
    else {
        io.writeFileString(expr, templify((isoJob ? tmplJ : tmpl), {
            openAFPath: getOpenAFPath()
        }) + io.readFileString(expr));
        if (!isWin) $sh("chmod u+x " + expr)
                    .prefix("chmod")
                    .get(0)
        log("Pre-appended " + (isoJob ? "oJob" : "OpenAF") + " shebang instructions to file: " + expr);
        if (!isoJob) log("On OpenAF use the 'params' variable to access any parameter you pass executing the script like: " + io.fileInfo(expr).canonicalPath + " abc=123 xzy=aaa");
    }
} else {
    // No file exists
    io.writeFileString(expr, templify((isoJob ? tmplJ : tmpl), {
        openAFPath: getOpenAFPath()
    }));
    if (!isWin) $sh("chmod u+x " + expr)
                .prefix("chmod")
                .get(0)
    log("Generated " + (isoJob ? "oJob" : "OpenAF") + " shebang file: " + expr);
    if (!isoJob) log("On OpenAF use the 'params' variable to access any parameter you pass executing the script like: " + io.fileInfo(expr).canonicalPath + " abc=123 xzy=aaa");
}