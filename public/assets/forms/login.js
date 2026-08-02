const notyf = new Notyf({
    duration: 2500,
    position: { x: "center", y: "top" }
});

$(document).ready(function () {

    
    $("#loginForm").validate({
        rules: {
            email: {
                required: true
            },
            password: {
                required: true,
                minlength: 4
            }
        },

        messages: {
            email: {
                required: "Username is required"
            },
            password: {
                required: "Password is required",
                minlength: "Minimum 4 characters"
            }
        },

        highlight: function (element) {
            $(element).addClass("is-invalid").removeClass("is-valid");
        },

        unhighlight: function (element) {
            $(element).removeClass("is-invalid").addClass("is-valid");
        },

        errorPlacement: function (error) {
            notyf.error(error.text());
        },

        submitHandler: function (form) {
            loginRequest(form, "loginBtn", "/api/login","Sign In");
        }
    });
});
