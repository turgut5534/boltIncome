$(document).ready(function () {
    console.log("Document ready: Setting up event listeners.");

    $('#fetch-income').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent event propagation

        const button = $(this); // Reference the button

        Swal.fire({
            title: "Enter your password",
            input: "password",
            inputAttributes: {
                autocapitalize: "off"
            },
            showCancelButton: true,
            confirmButtonText: "Update",
            showLoaderOnConfirm: true,
            allowOutsideClick: () => !Swal.isLoading() // Prevent closing Swal while loading
        }).then((result) => {
            // Only proceed with the AJAX request if the user provided a valid login
            if (result.isConfirmed) {
                const loginValue = result.value;
                $.ajax({
                    url: 'get-income',
                    type: 'POST',
                    data: { password: loginValue },
                    beforeSend: function() {
                        console.log("Before send: Updating button text.");
                        button.html('Please wait...');
                        button.prop('disabled', true);
                        button.fadeTo(200, 0.5); // Make the button semi-transparent
                    },
                    success: function(response) {
                        // Refresh the page once the request is successful
                        window.location.reload();
                    },
                    error: function(xhr, status, error) {
                        iziToast.error({
                            title: 'Error',
                            message: 'Something went wrong',
                        });
                        button.html('Update'); // Reset button text on error
                        button.prop('disabled', false); // Re-enable the button on error
                        button.fadeTo(200, 1); // Make the button fully visible again
                    }
                });
            }
        });
    });
});
