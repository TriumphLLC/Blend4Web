(function() {
    var form   = null;
    var inputs = [];

    // uses global _export_directory variable
    function submit_cb() {
        var file = "";
        var projects = [];

        for (var i = inputs.length; i--;) {
            var input = inputs[i];

            if (input.type == "checkbox" && input.checked)
                projects.push(input.id)
            else if (input.type == "text")
                file = input.value;
        }

        form.action += projects.join("/") + "/" + _export_directory + file + ".zip/";

        form.innerHTML = "";

        window.open(form.action, "_self");
    }

    function define_inputs() {
        form = document.forms[0];

        if (!form)
            return;

        inputs = form.querySelectorAll('input');

        var button = form.querySelector('button');

        button.addEventListener("click", submit_cb);
    }

    window.addEventListener("load", define_inputs);

}());
