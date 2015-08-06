(function() {
    var GLOBALS = ["b4w", "$", "jQuery"];
    var result = [];

    for (var prop in window)
        if (GLOBALS.indexOf(prop) == -1 && !(prop in globals_detect_dict))
            result.push(prop);

    if (result.length)
        console.error("globals detected:", result);
})();



